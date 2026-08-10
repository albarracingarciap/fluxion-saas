# Scripts de desarrollo

Utilidades puntuales que se ejecutan a mano contra la base de datos. Viven aquí
porque usan `@supabase/supabase-js` y `dotenv` de `apps/web/node_modules` y leen
`apps/web/.env.local`.

Se ejecutan desde `apps/web`:

```bash
npx tsx scripts/<script>.ts
```

| Script | Qué hace | Estado |
|---|---|---|
| `seed_causal_relations.ts` | Carga `recursos/relaciones_causales/` en `compliance` | **Superado** por `supabase/migrations/00000000000005_seed_compliance.sql` |
| `seed_failure_modes.ts` | Carga `recursos/modos_de_fallo/` en `compliance` | **Superado** por la misma migración |
| `apply-metadata.ts` | Aplicaba la migración legacy 016 a mano | **Obsoleto**: usar `/root/migrate.sh` |
| `check-evidences.ts` | Inspección ad-hoc de evidencias | Depuración |
| `check-soa-db.ts` | Inspección ad-hoc del SoA | Depuración |
| `inspect-profiles.ts` | Inspección ad-hoc de perfiles | Depuración |
| `test-soa-insert.ts` | Prueba de inserción de controles ISO 42001 | Depuración |

Los tres primeros están cubiertos por el sistema de migraciones y se pueden
borrar cuando quieras: siguen en el historial de git. Se conservan de momento
porque las rutas quedaron arregladas y no estorban.

**No añadas aquí nada que deba ejecutarse de forma recurrente.** Eso va a
`infra/schedules/` o a una migración.
