# Copias de seguridad de MinIO

## Por qué existe

`/etc/cron.daily/supabase-backup` copia PostgreSQL. Desde que las evidencias
viven en MinIO, **eso ya no es un punto de recuperación**: restaurar la base
deja filas de `system_evidences` apuntando a objetos que no existen. Los
metadatos sin los ficheros no son evidencia de nada, que es justo lo que un
auditor viene a comprobar.

## Qué hace

| Pieza | Dónde | Retención |
|---|---|---|
| Espejo incremental de los dos buckets | `/var/backups/minio/<bucket>/` | Permanente |
| Instantánea diaria comprimida | `/var/backups/minio/archive/minio_<fecha>.tar.gz` | 14 días |
| Registro | `/var/log/fluxion-minio-backup.log` | — |

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
# ¿Corrió hoy?
grep "$(date +%F)" /var/log/fluxion-minio-backup.log

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

## Pendiente

Todo esto sigue **en el mismo servidor**. Protege contra borrado accidental y
corrupción, no contra perder la máquina. Lo que falta es lo mismo que para
PostgreSQL: destino externo, con la función de Backups de Dokploy o un `rclone`
a un bucket de otro proveedor.
