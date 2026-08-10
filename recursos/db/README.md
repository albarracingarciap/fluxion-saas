# Migraciones de base de datos

## Fuente de verdad: `supabase/migrations/`

Todo el esquema vive en [`supabase/migrations/`](../../supabase/migrations/). El estado aplicado
en cada base de datos se consulta en la tabla `supabase_migrations.schema_migrations`.

### Baseline (10 de agosto de 2026)

Extraído del entorno self-hosted, que es la referencia. Seis ficheros:

| Fichero | Contenido |
|---|---|
| `00000000000000_extensions.sql` | uuid-ossp, pg_graphql, pg_net, pg_stat_statements, pgcrypto, pgjwt, supabase_vault, vector, pg_cron |
| `00000000000001_schema.sql` | `pg_dump --schema-only` de `fluxion`, `compliance`, `rag`. Incluye GRANT, OWNER y ALTER DEFAULT PRIVILEGES |
| `00000000000002_public_objects.sql` | `public.search_chunks`, `public.rls_auto_enable`, event trigger `ensure_rls` |
| `00000000000003_auth_storage.sql` | Trigger `on_auth_user_created` + los 4 buckets de Storage y sus políticas |
| `00000000000004_cron_jobs.sql` | Job pg_cron `process-task-recurrences` (cada hora, minuto 5) |
| `00000000000005_seed_compliance.sql` | Catálogo metodológico: 1.757 filas (418 modos de fallo, 120 relaciones causales, 59 plantillas de control…) |

El corpus RAG **no** está en git: ver [`recursos/baseline/rag_corpus.manifest.json`](../baseline/rag_corpus.manifest.json).

### Convención para migraciones nuevas

```
<timestamp>_<modulo>_<descripcion>.sql      p.ej. 20260812093000_connectors_mlflow_assets.sql
```

Timestamp, no entero secuencial: con varios módulos en paralelo no se puede asignar un número
sin coordinación global. Y cada módulo nuevo, en su propio schema (`connectors`, `telemetry`…),
no amontonado en `fluxion`.

Una migración aplicada **no se edita nunca**. Si hay que corregir algo, se escribe una nueva.

---

## `_legacy/` — histórico congelado

Los 103 ficheros numerados (`004_` … `103_`) que construyeron el esquema entre abril y agosto de
2026. **Solo valor documental.** No los apliques ni los edites.

Dos razones por las que no sirven como fuente de verdad:

1. **Tienen drift.** Algunas tablas se crearon desde Supabase Studio sin generar migración, así
   que hay `ALTER TABLE … ADD COLUMN` sin su `CREATE TABLE` previo. Aplicarlos sobre una base
   vacía falla por dependencias rotas.
2. **Numeración con colisiones**: dos `015_`, dos `016_`, y `055` / `055b` / `055c`.

---

## Aprendido en la migración a self-hosted

Un `pg_dump` acotado por schema **no se lleva** cuatro clases de objeto. Las cuatro dieron
problemas en producción y las cuatro están ahora cubiertas por el baseline:

| Se pierde | Consecuencia real observada |
|---|---|
| Extensiones | `pg_cron` faltaba → las tareas recurrentes nunca se generaban |
| Objetos de `public` | Sin `search_chunks` el agente RAG no podía hacer retrieval |
| Triggers sobre `auth` | Sin `on_auth_user_created`, el registro no creaba organización ni perfil |
| Buckets de `storage` | Sin buckets, fallaban evidencias, logos, avatares y adjuntos |

Y con `--no-privileges --no-owner` se pierden además todos los `GRANT`: la base restaura sin
errores y PostgREST devuelve *permission denied* en todo.

### Prerrequisito del fichero 03

`00000000000003_auth_storage.sql` necesita que el stack Supabase haya arrancado al menos una vez:
GoTrue crea `auth.users` y storage-api añade a `storage.buckets` las columnas `public`,
`file_size_limit` y `allowed_mime_types`. Sobre una imagen `supabase/postgres` recién levantada,
sin esos servicios, el `INSERT` de buckets falla.
