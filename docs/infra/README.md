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

⚠️ **Pendiente**: los backups siguen en el mismo servidor. Dokploy trae función
propia de copias a proveedor externo (Settings → Backups); es lo que falta.

---

## 6 · Base de datos y migraciones

Ver [`recursos/db/README.md`](../../recursos/db/README.md). En resumen:

- Fuente de verdad: `supabase/migrations/`
- Estado aplicado: `supabase_migrations.schema_migrations`
- Aplicar: `/root/migrate.sh` en el VPS (hace `git pull` de `/root/fluxion-repo`
  y aplica lo pendiente como `supabase_admin`)
- Convención: `<timestamp>_<modulo>_<descripcion>.sql`. Una migración aplicada
  no se edita nunca.

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
