# Copias de seguridad de MinIO

## Por qué existe

`/etc/cron.daily/supabase-backup` copia PostgreSQL. Desde que las evidencias
viven en MinIO, **eso ya no es un punto de recuperación**: restaurar la base
deja filas de `system_evidences` apuntando a objetos que no existen. Los
metadatos sin los ficheros no son evidencia de nada, que es justo lo que un
auditor viene a comprobar.

## Qué hace

| Pieza                                 | Dónde                                             | Retención  |
| ------------------------------------- | ------------------------------------------------- | ---------- |
| Espejo incremental de los dos buckets | `/var/backups/minio/<bucket>/`                    | Permanente |
| Instantánea diaria comprimida         | `/var/backups/minio/archive/minio_<fecha>.tar.gz` | 14 días    |
| Registro                              | `/var/log/fluxion-minio-backup.log`               | —          |

**El espejo se hace sin `--remove`.** Un espejo que replica borrados no es una
copia de seguridad: es una segunda copia del mismo error. Si alguien borra un
objeto del bucket, aquí se conserva hasta que rote el archivo.

**Y el espejo solo no basta**, por lo mismo: si un objeto se corrompe y se
sincroniza, el espejo queda corrupto también. De ahí la instantánea diaria, que
es lo que permite volver al estado de antenoche.

## Instalación

### 1 · Usuario de solo lectura

El script no debe poder borrar nada. Ni por error, ni si alguien se lleva sus
credenciales.

```bash
BACKUP_SECRET=$(openssl rand -base64 32 | tr -d '/+=')
echo "guarda esto: $BACKUP_SECRET"


# --entrypoint sh es obligatorio: el punto de entrada de la imagen es `mc`, de
# modo que sin esto el intérprete recibe `mc sh` y no lo reconoce.
docker run --rm -i \
  --network fluxion-saas-minio-vrfnka_default \
  -e MC_HOST_local="http://fluxion-root:<contraseña-root>@minio:9000" \
  --entrypoint sh \
  minio/mc:latest -s <<EOF
set -e
cat > /tmp/ro.json <<'POLICY'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket", "s3:GetBucketLocation"],
      "Resource": ["arn:aws:s3:::fluxion-evidences", "arn:aws:s3:::fluxion-documents"]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject", "s3:GetObjectVersion"],
      "Resource": ["arn:aws:s3:::fluxion-evidences/*", "arn:aws:s3:::fluxion-documents/*"]
    }
  ]
}
POLICY
mc admin user add      local fluxion-backup "$BACKUP_SECRET"
mc admin policy create local fluxion-ro /tmp/ro.json
mc admin policy attach local fluxion-ro --user fluxion-backup
mc admin user info     local fluxion-backup
EOF
```

### 2 · Configuración

```bash
mkdir -p /etc/fluxion
cat > /etc/fluxion/minio-backup.env <<EOF
MINIO_HOST=minio.fluxion-ai.es
MINIO_BACKUP_KEY=fluxion-backup
MINIO_BACKUP_SECRET=$BACKUP_SECRET
EOF
chmod 600 /etc/fluxion/minio-backup.env
```

### 3 · Script y prueba manual

```bash
cp infra/backups/minio-backup.sh /usr/local/bin/
chmod +x /usr/local/bin/minio-backup.sh

/usr/local/bin/minio-backup.sh
tail -10 /var/log/fluxion-minio-backup.log
```

### 4 · Programación

Junto al de Supabase, con `cron.daily`:

```bash
ln -s /usr/local/bin/minio-backup.sh /etc/cron.daily/minio-backup
run-parts --test /etc/cron.daily | grep minio
```

⚠️ `run-parts` **ignora los ficheros con punto en el nombre**, así que el enlace
va sin `.sh`. Es la forma más común de instalar un cron diario que no se ejecuta
nunca y no avisa de ello.

## Verificación

```bash
# ¿Corrió hoy, y terminó bien?
grep "$(date +%F)" /var/log/fluxion-minio-backup.log
grep -c "fin (estado 0)" /var/log/fluxion-minio-backup.log

# ¿Existe la instantánea de hoy? El espejo puede ir bien y esto fallar.
ls -lh /var/backups/minio/archive/minio_$(date +%Y%m%d).tar.gz

# ¿Cuadra el número de objetos con lo que hay en la base de datos?
find /var/backups/minio/fluxion-evidences -type f | wc -l
```

```sql
SELECT count(*) FROM fluxion.system_evidences
 WHERE storage_path IS NOT NULL AND storage_backend = 's3';
```

Los dos números deben coincidir. Si el espejo tiene **más**, es lo esperado:
conserva objetos borrados del bucket. Si tiene **menos**, hay ficheros sin
copiar y eso sí es un problema.

## Restauración

```bash
docker run --rm \
  -e MC_HOST_fx="https://fluxion-root:<contraseña-root>@minio.fluxion-ai.es" \
  -v /var/backups/minio:/backup \
  minio/mc:latest cp --recursive /backup/fluxion-evidences/ fx/fluxion-evidences/
```

Con las credenciales de **root**, no las de backup: son de solo lectura.

Sobre `fluxion-documents` la restauración puede fallar por la retención
GOVERNANCE si el objeto ya existe. Es el comportamiento correcto —un documento
regulatorio no se sobrescribe—; para reemplazarlo hay que usar un usuario con
`s3:BypassGovernanceRetention`, que hoy no tiene nadie.

## Copia externa cifrada (Backblaze B2)

Lo anterior protege contra un borrado accidental y contra la corrupcion. Esto
protege contra perder la maquina.

| Pieza               | Cuando                      | Que hace                                                          |
| ------------------- | --------------------------- | ----------------------------------------------------------------- |
| `offsite-backup.sh` | Diario, tras la copia local | Sube cifrado a B2 y comprueba que llego                           |
| `offsite-verify.sh` | Semanal                     | Baja el ultimo volcado, lo descifra y lo abre con `pg_restore -l` |

### La contrasena de cifrado

El cifrado es **del lado del cliente**: Backblaze guarda bloques que no puede
abrir. Eso simplifica mucho la conversacion cuando un cliente pregunte donde
acaban sus evidencias.

**Si pierdes la contrasena, las copias son irrecuperables.** Ni Backblaze ni
nadie puede leerlas. Guardala en el gestor de contrasenas y en un sitio fisico:
es el unico dato de esta infraestructura cuya perdida no tiene arreglo.

### Instalacion

**1 · Clave de aplicacion en B2**, acotada al bucket, con lectura y escritura y
**sin permiso de borrado**. Una credencial robada del VPS no debe poder vaciar
las copias; el script solo sube y lista.

**2 · Configuracion**

```bash
mkdir -p /etc/fluxion
PASS=$(openssl rand -base64 32 | tr -d '/+=')
SALT=$(openssl rand -base64 24 | tr -d '/+=')
echo "GUARDA ESTO EN SITIO SEGURO:"; echo "  pass: $PASS"; echo "  salt: $SALT"

OBS_PASS=$(docker run --rm rclone/rclone:latest obscure "$PASS")
OBS_SALT=$(docker run --rm rclone/rclone:latest obscure "$SALT")

cat > /etc/fluxion/rclone.conf <<EOF
[b2]
type = b2
account = 003777e9116d8f40000000001
key = K003la4q/n3xJj1Qqsju130YIxyQb20
hard_delete = false

[b2crypt]
type = crypt
remote = b2:fluxion-backups-3f7a/fluxion
filename_encryption = standard
directory_name_encryption = true
password = $OBS_PASS
password2 = $OBS_SALT
EOF
chmod 600 /etc/fluxion/rclone.conf

cat > /etc/fluxion/offsite.env <<'EOF'
REMOTO=b2crypt
ORIGEN_PG=/var/backups/supabase
ORIGEN_MINIO=/var/backups/minio/archive
EOF
chmod 600 /etc/fluxion/offsite.env
```

`filename_encryption = standard` cifra tambien los nombres: sin eso, quien vea
el bucket sabria que hay un volcado de PostgreSQL de cada dia y de que tamano.

**3 · Scripts y programacion**

```bash
cp infra/backups/offsite-backup.sh infra/backups/offsite-verify.sh /usr/local/bin/
chmod +x /usr/local/bin/offsite-*.sh

/usr/local/bin/offsite-backup.sh
tail -10 /var/log/fluxion-offsite.log

ln -s /usr/local/bin/offsite-backup.sh /etc/cron.daily/zz-offsite-backup
ln -s /usr/local/bin/offsite-verify.sh /etc/cron.weekly/offsite-verify
```

El prefijo `zz-` no es capricho: `run-parts` ejecuta por orden alfabetico y la
copia externa tiene que ir **despues** de las locales, o subira la del dia
anterior. Y sin punto en el nombre, que `run-parts` los ignora.

**4 · Ciclo de vida del bucket**

En B2 → _Configuracion del ciclo de vida_, borrar ficheros pasados 180 dias. Sin
esa regla, el bucket crece para siempre — hoy son centimos, pero es la clase de
gasto que se descubre a los dos anos.

Y en _Object Lock_, una retencion por defecto de 30 dias en modo **governance**:
protege contra ransomware sin dejarte sin salida si algun dia hay que corregir
algo con la clave maestra.

### Verificacion

```bash
grep "VERIFICACION" /var/log/fluxion-offsite.log | tail -5
```

Debe haber un `VERIFICACION OK` de la ultima semana. **Ese es el unico mensaje
del log que demuestra que hay copia**: los demas solo dicen que se subieron
ficheros.

### Restauracion

```bash
docker run --rm -v /etc/fluxion/rclone.conf:/config/rclone/rclone.conf:ro   -v /tmp/restore:/restore rclone/rclone:latest   copy b2crypt:supabase/full_20260820.dump /restore
```

`rclone` descifra al vuelo. A partir de ahi, el volcado se restaura como
cualquier otro (ver `recursos/db/README.md`).

## Pendiente

Todo esto sigue **en el mismo servidor**. Protege contra borrado accidental y
corrupción, no contra perder la máquina. Lo que falta es lo mismo que para
PostgreSQL: destino externo, con la función de Backups de Dokploy o un `rclone`
a un bucket de otro proveedor.
