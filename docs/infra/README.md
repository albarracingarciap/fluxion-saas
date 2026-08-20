# Infraestructura

Todo lo que hace falta saber para operar Fluxion y para diagnosticar cuando algo
se rompe un domingo. Escrito a partir de lo que ha costado averiguar, no de lo
que sería bonito documentar.

---

## 1 · Topología

Un único VPS (`srv1622755`, Hostinger) con **Dokploy v0.29.2** orquestando varios
proyectos, no solo Fluxion:

| Proyecto | Qué es |
|---|---|
| `supabase-b235d9` | Supabase self-hosted — base de datos de Fluxion |
| `fluxion-saas` | Aplicación Next.js |
| `agent1` | Servicio FastAPI de agentes (clasificación + asistente) |
| `fluxionconnectormlflow` | Módulo conector de MLflow |
| `mlflow-fluxion-8678pt` | MLflow v3.15.1 + PostgreSQL 18.4 + MinIO |
| `directus-fluxion`, `fluxion-n8n`, `wordpress-aporias`, `moodle-moodlefluxion`, `aigovernance-es`, `fluxion-learning` | Otros proyectos del mismo servidor |

**Consecuencia a tener presente**: la instancia de Supabase es **compartida**.
Un descuido de permisos en un proyecto expone a los demás — ya pasó con las
tablas de Directus, legibles con la clave anónima. Antes del primer cliente real,
Fluxion necesita su propio stack aislado.

### Dominios

| Dominio | Apunta a |
|---|---|
| `fluxion-ai.es` | Aplicación |
| `supabase.fluxion-ai.es` | Kong → API de Supabase |
| `mlflow.fluxion-ai.es` | MLflow (con autenticación básica) |
| `dokploy.fluxion-ai.es` | Panel de Dokploy |

---

## 2 · Rutas y secretos

Dokploy lo gestiona todo; **no existe `/opt/supabase`**.

```
/etc/dokploy/compose/<proyecto>/code/docker-compose.yml   Definición del stack
/etc/dokploy/compose/<proyecto>/code/.env                 Secretos
/etc/dokploy/compose/supabase-b235d9/files/volumes/db/data   Datos de PostgreSQL
/etc/dokploy/schedules/                                    Tareas programadas
/etc/dokploy/traefik/                                      Proxy inverso
```

Las variables **efectivas** de un servicio se consultan siempre en el contenedor,
no en los ficheros:

```bash
docker inspect <contenedor> --format '{{range .Config.Env}}{{println .}}{{end}}'
```

---

## 3 · Supabase self-hosted

PostgreSQL **15.8** (`supabase/postgres:15.8.1.085`). El esquema se migró desde
Supabase Cloud (17.6) mediante volcado lógico; cloud está cancelado.

| Servicio | Versión | Puerto interno |
|---|---|---|
| `supabase-db` | PostgreSQL 15.8 | 5432 |
| `supabase-rest` | PostgREST v14.8 | **3000** |
| `supabase-auth` | GoTrue v2.186.0 | 9999 |
| `supabase-kong` | Kong 3.9.1 | 8000 |
| `supabase-storage` | v1.48.26 | 5000 |
| `supabase-pooler` | Supavisor 2.7.4 | 5432 / 6543 |
| `supabase-studio`, `-meta`, `-realtime`, `-analytics`, `-vector`, `-imgproxy`, `-edge-functions` | | |

**Que PostgREST escuche en el 3000 no es un detalle menor** — ver la sección de
cortafuegos.

### Roles

`postgres` **no es superusuario** en esta instalación (el prompt sale como `=>`).
El superusuario es `supabase_admin` (`=#`).

```bash
docker exec -e PAGER=cat -it supabase-db psql -U supabase_admin -d postgres -P pager=off
```

Los objetos creados desde Studio pertenecen a `supabase_admin`, y `postgres` no
puede modificar sus permisos. Si un `GRANT` o `REVOKE` responde *"no privileges
could be revoked"*, es esto: conéctate como `supabase_admin`.

### Schemas expuestos por PostgREST

```
public, storage, graphql_public, learning, fluxion, compliance, rag
```

Se controla con `PGRST_DB_SCHEMAS` en el servicio `supabase-rest`. Tras cambiar
DDL: `NOTIFY pgrst, 'reload schema';`

### Extensiones

Instaladas: `vector` (0.8.0), `pgcrypto`, `uuid-ossp`, `pg_net`,
`pg_stat_statements`, `pgjwt`, `pg_graphql`, `supabase_vault`, `pg_cron`.

Disponibles sin instalar: `postgres_fdw` (1.1) — hará falta para el plano de datos.

En `shared_preload_libraries` hay además `timescaledb`, `pgaudit`, `pgsodium`,
`plan_filter` y `pg_tle`, por si algún día hacen falta.

### Vault

Las credenciales de sistemas externos (conectores) se cifran con
`supabase_vault`, envueltas en dos funciones `SECURITY DEFINER` propiedad de
`supabase_admin`:

```sql
SELECT fluxion.connector_secret_set('<id de la CONEXIÓN>', 'valor');
SELECT fluxion.connector_secret_get('<id de la CONEXIÓN>');
```

Ojo: reciben el id de la **conexión**, no el del secreto. `connector_secret_set`
devuelve el id del secreto, que no sirve para leer.

---

## 4 · Red y cortafuegos

**Esta sección existe porque una regla mal acotada tumbó la aplicación dos horas.**

### Las tres reglas que hay que saber

**1 · Docker ignora `ufw`.** Los puertos publicados por Docker se saltan las
reglas de UFW, porque Docker inserta las suyas antes en la cadena. El filtrado
efectivo va en `DOCKER-USER`.

**2 · `DOCKER-USER` filtra también el tráfico ENTRE contenedores**, no solo el
que llega de Internet. Una regla como

```bash
iptables -I DOCKER-USER -p tcp --dport 3000 ! -i lo -j DROP     # ❌ MAL
```

corta **Kong → PostgREST**, porque PostgREST escucha justo en el 3000 y ese
tráfico entra por el puente de Docker, no por `lo`. Hay que acotar por interfaz
de entrada pública:

```bash
iptables -I DOCKER-USER -i eth0 -p tcp --dport 3000 -j DROP     # ✅ BIEN
```

**3 · `netfilter-persistent save` congela también las reglas de Docker.** Al
arrancar restaura una foto que puede chocar con las que Docker construye. Para
reglas propias es mejor una unidad de systemd que se ejecute después:

```
/etc/systemd/system/fluxion-firewall.service   (After=docker.service)
```

### Estado actual

- Puerto 3000 (panel de Dokploy) **cerrado desde Internet**, accesible solo por
  `https://dokploy.fluxion-ai.es`.
- `netfilter-persistent` **desactivado**. El fichero antiguo, con la regla mala,
  está en `/root/rules.v4.malo.bak` — no restaurarlo.

---

## 5 · Backups

`/etc/cron.daily/supabase-backup`, diario, retención 14 días, en
`/var/backups/supabase/`:

| Fichero | Qué es |
|---|---|
| `full_<fecha>.dump` | Base de datos completa, formato custom |
| `globals_<fecha>.sql` | Roles y contraseñas — `pg_dump` **no** los incluye |
| `env_supabase_<fecha>.bak` | `.env` del stack de Supabase |
| `env_containers_<fecha>.txt` | Variables efectivas de todos los contenedores |
| `dokploy_config_<fecha>.tar.gz` | `/etc/dokploy` sin volúmenes ni logs |
| `dokploy_db_<fecha>.sql` | Base de datos de Dokploy (usuario `dokploy`) |

**Sin el `.env` y sin los globals, una base restaurada no sirve**: los tokens no
validarían y no podrías regenerar las mismas claves.

Verificar que un volcado es válido:

```bash
pg_restore -l /var/backups/supabase/full_$(date +%Y%m%d).dump | head -20
```

**Copia externa**: `offsite-backup.sh` sube a diario a Backblaze B2
(`fluxion-backups-3f7a`, región `eu-central-003`) **cifrado en el cliente**, y
`offsite-verify.sh` baja el último volcado cada semana, lo descifra y lo abre
con `pg_restore -l`. Ver [`infra/backups/README.md`](../../infra/backups/README.md).

La contraseña de cifrado vive solo en `/etc/fluxion/rclone.conf` y en el gestor
de contraseñas. **Perderla es perder las copias**: Backblaze guarda bloques que
no puede abrir.

La comprobación que importa no es que el cron corriera, sino que haya un
`VERIFICACION OK` reciente:

```bash
grep "VERIFICACION" /var/log/fluxion-offsite.log | tail -5
```

⚠️ **Pendiente y más urgente desde MinIO**: el volumen de objetos
(`/etc/dokploy/compose/fluxion-saas-minio-*/files/minio`) **no entra en este
plan**, que solo cubre PostgreSQL. Desde que una evidencia vive ahí, un volcado
de la base de datos deja de ser un punto de recuperación: son metadatos
apuntando a ficheros que no vuelven. Añadir ese directorio antes de que haya
evidencias de un cliente real.

---

## 6 · Base de datos y migraciones

Ver [`recursos/db/README.md`](../../recursos/db/README.md). En resumen:

- Fuente de verdad: `supabase/migrations/`
- Estado aplicado: `supabase_migrations.schema_migrations`
- Aplicar: `/root/migrate.sh` en el VPS (hace `git pull` de `/root/fluxion-repo`
  y aplica lo pendiente como `supabase_admin`)
- Convención: `<timestamp>_<modulo>_<descripcion>.sql`. Una migración aplicada
  no se edita nunca.

### Comprobación de aislamiento entre organizaciones

Hay **tres organizaciones** en la base de datos (Globalnet, Sintagma, Grupo
Bancario). Eso ya ha causado confusión dos veces —una clave de API y un canal de
Slack creados en la organización equivocada— pero el riesgo real no es ese: es
que una tabla nueva salga con un `organization_id` que no case con el de su
padre, o con una política RLS que no filtre. **Ninguna de las dos cosas produce
un error**: se ven datos de otro cliente, o no se ve nada.

Ejecutar como `supabase_admin` (sin RLS, que es justo lo que queremos comprobar)
después de añadir cualquier tabla con `organization_id`. **Todos los recuentos
deben ser 0.**

```sql
-- Filas cuyo organization_id no coincide con el de la entidad de la que cuelgan.
SELECT 'signals → api_keys' AS rel, count(*) AS fugas
  FROM fluxion.signals s
  JOIN fluxion.api_keys k ON k.id = s.api_key_id
 WHERE k.organization_id <> s.organization_id
UNION ALL
SELECT 'discovered_assets → connections',  count(*)
  FROM fluxion.discovered_assets d
  JOIN fluxion.connector_connections c ON c.id = d.connection_id
 WHERE c.organization_id <> d.organization_id
UNION ALL
SELECT 'ai_incidents → ai_systems', count(*)
  FROM fluxion.ai_incident_systems x
  JOIN fluxion.ai_incidents i  ON i.id = x.incident_id
  JOIN fluxion.ai_systems   sy ON sy.id = x.ai_system_id
 WHERE sy.organization_id <> i.organization_id
    OR x.organization_id  <> i.organization_id
UNION ALL
SELECT 'channel_deliveries → channels', count(*)
  FROM fluxion.channel_deliveries d
  JOIN fluxion.notification_channels c ON c.id = d.channel_id
 WHERE c.organization_id <> d.organization_id
UNION ALL
SELECT 'tasks → ai_systems', count(*)
  FROM fluxion.tasks t
  JOIN fluxion.ai_systems sy ON sy.id = t.system_id
 WHERE sy.organization_id <> t.organization_id
UNION ALL
SELECT 'profiles sin organización', count(*)
  FROM fluxion.profiles WHERE organization_id IS NULL;
```

Y el reparto, para saber en qué organización se está trabajando antes de crear
credenciales:

```sql
SELECT o.name,
       (SELECT count(*) FROM fluxion.profiles     p WHERE p.organization_id = o.id) AS perfiles,
       (SELECT count(*) FROM fluxion.ai_systems   s WHERE s.organization_id = o.id) AS sistemas,
       (SELECT count(*) FROM fluxion.api_keys     k WHERE k.organization_id = o.id AND k.revoked_at IS NULL) AS claves,
       (SELECT count(*) FROM fluxion.ai_incidents i WHERE i.organization_id = o.id) AS incidentes
  FROM fluxion.organizations o ORDER BY o.name;
```

Añadir aquí una línea `UNION ALL` por cada tabla nueva con `organization_id`.

---

## 6 bis · MinIO — almacenamiento de objetos

Servicio `fluxion-saas-minio` en Dokploy. Contenedor
`fluxion-saas-minio-vrfnka-minio-1`, red `fluxion-saas-minio-vrfnka_default`.
Ficheros en `/etc/dokploy/compose/fluxion-saas-minio-*/files/minio`.

**No confundir con el MinIO de MLflow** (`mlflow-fluxion-8678pt-minio-1`). Son
instancias distintas a propósito: compartir la de MLflow habría acoplado la
disponibilidad de las evidencias a los despliegues de un proyecto sin relación.

| Bucket | Contenido | Particularidad |
|---|---|---|
| `fluxion-evidences` | Ficheros de evidencia | Versionado |
| `fluxion-documents` | Documentos regulatorios de C1 | Versionado + bloqueo GOVERNANCE 10 años (Art. 18) |

### Lo que no da error

**MinIO no aplica RLS.** Supabase Storage sí lo hacía: aunque un camino de
código olvidase comprobar la organización, la política lo frenaba. Aquí no hay
nada debajo. El control vive en `lib/evidences/storage-actions.ts`, y el
mecanismo es que **si el usuario no puede ver la fila de `system_evidences` por
RLS, no puede tocar el fichero**. Ninguna ruta se compara a mano.

**El usuario de la aplicación no es root.** `fluxion-app` tiene la política
`fluxion-rw`, limitada a los dos buckets y **sin**
`s3:BypassGovernanceRetention`: no puede borrar un documento regulatorio dentro
de su plazo de retención. Las credenciales de root solo están en el servicio
`fluxion-saas-minio`, nunca en la aplicación.

Modo `GOVERNANCE` y no `COMPLIANCE` porque en *compliance* no lo podría borrar
nadie, ni root, y eso choca con un derecho de supresión del RGPD.

**El bloqueo solo se activa al crear el bucket.** Recrear es la única vía.

### Dos tropiezos reales

**El servicio no era alcanzable desde fuera aunque respondía por dentro**: solo
estaba en la red del compose. Traefik vive en `dokploy-network` y hay que
declararla como `external: true` y unir el servicio a las dos.

**Las subidas desde el navegador necesitan CORS**: `MINIO_API_CORS_ALLOW_ORIGIN`
con el origen exacto, esquema incluido.

### Administración

`minio-init` termina y se apaga, así que no se puede `docker exec` en él. Un
`mc` de usar y tirar:

```bash
docker run --rm --network fluxion-saas-minio-vrfnka_default \
  -e MC_HOST_local="http://fluxion-root:<contraseña>@minio:9000" \
  minio/mc:latest ls --recursive local/fluxion-evidences
```

Las contraseñas se generan sin `/`, `+` ni `=` para poder ir en esa URL sin
escapar nada.

### Comprobación desde fuera

```bash
curl -sI https://minio.fluxion-ai.es/minio/health/live | head -1     # 200
curl -s  https://minio.fluxion-ai.es/fluxion-documents/ | head -3    # AccessDenied
```

Ese `AccessDenied` es el importante. Si sale un listado de objetos, el bucket
está abierto y hay que parar todo.

---

## 7 · Reinicio del servidor

El orden de arranque de los contenedores **no está garantizado**, y eso ha
causado problemas reales.

```bash
# Antes
ls -lh /var/backups/supabase/          # que el backup del día esté
reboot
```

Después, verificar en este orden:

```bash
uname -r                                              # kernel esperado
docker ps --format '{{.Names}}\t{{.Status}}'          # todo Up
iptables -S DOCKER-USER                               # la regla se recargó
```

Y desde fuera:

```bash
curl -sI https://fluxion-ai.es | head -1              # 307
curl -sI https://dokploy.fluxion-ai.es | head -1      # 200
curl -sI --max-time 5 http://<IP>:3000 | head -1      # debe fallar
```

**Y probar el login en el navegador.** Que la página cargue no significa que la
aplicación funcione: el HTML se sirve sin tocar la base de datos.

---

## 8 · Diagnóstico: síntoma → causa

Casos reales, con lo que costó llegar a ellos.

| Síntoma | Causa | Comprobación |
|---|---|---|
| La página carga pero el login no hace nada | El login es una **server action**: `fetch` de Node a Supabase colgado | `docker logs <web>` y buscar `fetch failed` |
| `upstream timed out ... http://172.x.x.x:3000` en Kong | Regla de `DOCKER-USER` bloqueando Kong → PostgREST | `iptables -S DOCKER-USER` |
| PostgREST devuelve 401 rápido pero se cuelga con clave | El 401 lo da **Kong**, sin proxy. Lo que se cuelga es el reenvío | Comparar `/rest/v1/` con y sin `apikey` |
| Conector en `Exited (1)` en bucle | Su `ping()` de arranque falla y no está capturado | `docker service logs <servicio>` |
| Una clave API revocada sigue autenticando | Next.js cachea las respuestas de `fetch`, incluidas las de autorización | Usar siempre `createNoCacheAdminClient` |
| Consultas que devuelven cero filas sin error | Política de RLS que no casa | `SET LOCAL ROLE authenticated` + `request.jwt.claims` y repetir la consulta |
| Una funcionalidad entera no hace nada | Objeto que el `pg_dump` no se llevó | Ver la lista de abajo |

### Lo que un `pg_dump` acotado por schema NO se lleva

Las cuatro nos costaron un fallo en producción:

1. **Extensiones** — faltaba `pg_cron`: las tareas recurrentes nunca se generaban.
2. **Objetos de `public`** — sin `search_chunks`, el agente RAG no podía recuperar.
3. **Triggers sobre `auth`** — sin `on_auth_user_created`, el registro no creaba
   organización ni perfil.
4. **Buckets de `storage`** — sin ellos, fallaban evidencias, logos, avatares y
   adjuntos.

Y con `--no-privileges --no-owner` se pierden todos los `GRANT`: la base restaura
sin errores y PostgREST devuelve *permission denied* en todo.

### El patrón de fondo

Los seis fallos que encontramos en agosto **no daban error**. Un `catch` vacío,
una RLS que filtra todo, un cron que no existe, una caché que sirve datos viejos:
todos parecen funcionar. En un producto de cumplimiento eso es lo peligroso — el
cliente cree que está cubierto y no lo está.

De ahí dos criterios de diseño: **nada de `catch` vacíos**, y **toda comprobación
programada debe dejar rastro de que se ejecutó**, aunque no encuentre nada.

---

## 9 · Deuda conocida

| Asunto | Por qué importa |
|---|---|
| Backups en el mismo servidor | Un fallo de disco se lleva datos y copias |
| Instancia de Supabase compartida con otros proyectos | Radio de impacto y aislamiento antes del primer cliente |
| `moodle-cron` en bucle de reinicio | Ajeno a Fluxion, pero ensucia el diagnóstico |
| Sin límite de peticiones distribuido | El de las claves API es en memoria del proceso; con réplicas deja de ser global |
| Sin `docs/` de recuperación ante desastre | Existe el backup, falta el ensayo de restauración documentado |
