# Stack propio de Supabase

Guion de la separación. Se escribe antes de tocar nada porque el paso donde uno
improvisa es el paso donde se pierde algo.

**Estado**: fase 0, mediciones previas.

---

## Por qué

La instancia de Supabase es **compartida** con Directus, WordPress, Moodle, n8n
y proyectos de aprendizaje. Tres consecuencias:

**La línea base no describe la instancia.** Las migraciones cubren `compliance`,
`fluxion`, `rag` y ahora `telemetry`. En esa base de datos viven además
`learning` y los objetos de Directus. No se puede reconstruir el conjunto desde
el repositorio, y `supabase_migrations.schema_migrations` es una tabla de una
base compartida.

**Un restore es todo o nada** sobre proyectos que no tienen relación entre sí.

**Un descuido de permisos en un proyecto expone a los demás.** Ya pasó: las
tablas de Directus eran legibles con la clave anónima.

Nada de esto es urgente hoy. Todo lo es el día que haya un cliente real.

## Qué NO es

**No es una migración.** Es levantar un stack vacío, correr `migrate.sh` y
llevarse los datos. La diferencia importa: el esquema no se copia, se
reconstruye desde el repositorio, y de paso se vuelve a ejercitar la línea base
—que es un activo que se pudre si no se usa.

Y se queda atrás lo que no es de Fluxion: `learning`, Directus, y cualquier cosa
que haya aparecido en `public` sin pasar por una migración. Eso es la poda.

---

## Fase 0 · Medir antes de mover

Sin esto no se puede decidir nada. Ejecutar como `supabase_admin`:

```sql
-- Tamaño por esquema: qué pesa de verdad
SELECT n.nspname AS esquema,
       pg_size_pretty(sum(pg_total_relation_size(c.oid))) AS tamano,
       count(*) AS relaciones
  FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
 WHERE c.relkind IN ('r','p','m')
 GROUP BY n.nspname ORDER BY sum(pg_total_relation_size(c.oid)) DESC;

-- El corpus RAG: lo único que cuesta dinero regenerar
SELECT count(*) AS documentos FROM rag.documents;
SELECT count(*) AS fragmentos,
       pg_size_pretty(pg_total_relation_size('rag.chunks')) AS tamano
  FROM rag.chunks;

-- Usuarios: sus UUID son la clave ajena de profiles.user_id
SELECT count(*) FROM auth.users;
SELECT count(*) FROM auth.identities;

-- Ficheros que siguen en Supabase Storage (las evidencias ya están en MinIO)
SELECT bucket_id, count(*), pg_size_pretty(sum((metadata->>'size')::bigint)) AS tamano
  FROM storage.objects GROUP BY bucket_id;

-- Secretos del Vault: hay que reintroducirlos a mano, no viajan
SELECT 'conectores' AS origen, count(*) FROM fluxion.connector_connections WHERE secret_id IS NOT NULL
UNION ALL
SELECT 'canales', count(*) FROM fluxion.notification_channels WHERE secret_id IS NOT NULL;

-- Trabajos de pg_cron que deben existir después
SELECT jobname, schedule FROM cron.job ORDER BY jobname;
```

## Fase 1 · Qué se lleva

Tres categorías, y la tercera es una decisión.

**Lo que no se puede regenerar:**
- `rag.documents` y `rag.chunks` — los *embeddings* costaron dinero
- `auth.users` y `auth.identities` — los UUID son clave ajena de `profiles`
- Los ficheros de `storage.objects` que queden (logos y avatares)

**Lo que no viaja aunque se copie:**
- Los secretos del Vault. `supabase_vault` cifra con una clave de instancia; las
  filas se restauran con buen aspecto y al descifrar devuelven basura. Se
  reintroducen a mano con `connector_secret_set` y `channel_secret_set`.

**Lo que hay que decidir:** el resto de datos de Fluxion —sistemas, FMEA, planes
de tratamiento, incidentes, expedientes, telemetría, decisiones humanas—.

Recomendación: **llevárselo todo**. Es un `pg_dump --data-only` de cuatro
esquemas y evita reconstruir a mano meses de escenarios de prueba. La
alternativa —empezar limpio— solo compensa si esos datos estorban.

## Fase 2 · Levantar el stack vacío

Servicios recortados. `analytics` y `vector` son el mayor ahorro de memoria y no
se usan.

⚠️ En el compose oficial, `kong` y `rest` declaran `depends_on: analytics`. Al
quitar el servicio **no arranca nada**, con un error que no menciona analytics.
Hay que quitar también las dependencias.

Dominio provisional `supabase2.fluxion-ai.es` para poder probar sin tocar el
actual.

## Fase 3 · Esquema desde el repositorio

```bash
/root/migrate.sh   # apuntando a la instancia nueva
```

Y las dos cosas que no están en las migraciones:

- `PGRST_DB_SCHEMAS` con `public, storage, graphql_public, fluxion, compliance,
  rag, telemetry` — **sin `learning`**, que es de otro proyecto
- `NOTIFY pgrst, 'reload schema';`

Comprobar que `cron.job` tiene los trabajos: `pg_cron` vive fuera del esquema y
ya desapareció una vez sin que nadie se enterara.

## Fase 4 · Datos

Orden: primero `auth`, luego los esquemas de Fluxion, porque `profiles.user_id`
apunta a `auth.users`.

```bash
# En la instancia antigua
pg_dump -U supabase_admin -d postgres --data-only \
  -t 'auth.users' -t 'auth.identities' -f auth_data.sql

pg_dump -U supabase_admin -d postgres --data-only \
  -n fluxion -n compliance -n rag -n telemetry -f fluxion_data.sql
```

Al restaurar, desactivar los disparadores durante la carga:

```sql
SET session_replication_role = replica;   -- antes
-- \i los ficheros
SET session_replication_role = DEFAULT;   -- después
```

Sin eso, los disparadores de la propia aplicación se ejecutan durante la carga y
generan notificaciones, entradas de historial y estados derivados que no
corresponden a lo que se está restaurando.

## Fase 5 · Secretos y ficheros

- Reintroducir cada secreto del Vault **y leerlo** para comprobarlo
- Copiar los objetos de Storage que queden
- El `JWT_SECRET` es nuevo, así que `ANON_KEY` y `SERVICE_ROLE_KEY` cambian:
  hay que actualizarlos en `fluxion-saas`, `agent1`, los conectores, el servicio
  de telemetría y el `.env.local` de desarrollo
- Las contraseñas de los usuarios sobreviven (bcrypt en `auth.users`), pero
  **todas las sesiones abiertas mueren**

## Fase 6 · Probar antes de cambiar

Un despliegue de prueba de la aplicación contra la instancia nueva, y recorrer:

- Login
- Subir un adjunto a una tarea
- Una consulta al asistente (RAG)
- El expediente del Anexo IV de un sistema
- `/api/cron/incident-deadlines` a mano
- El conector de MLflow y el de Shadow AI

**Que la página cargue no significa que la aplicación funcione**: el HTML se
sirve sin tocar la base de datos. Está escrito en la sección 7 de
`docs/infra/README.md` y sigue siendo verdad.

## Fase 7 · Cambio y marcha atrás

Variables de entorno en los servicios, y `supabase.fluxion-ai.es` al Kong nuevo.

**La instancia antigua se queda parada, no se borra**, un par de semanas. Es la
marcha atrás, y no cuesta nada tenerla ahí.
