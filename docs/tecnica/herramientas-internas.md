---
id: TEC-HERRAMIENTAS
titulo: Herramientas internas
tipo: tecnica
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/package.json
  - apps/web/scripts/README.md
  - apps/web/scripts/seed_causal_relations.ts
  - apps/web/scripts/seed_failure_modes.ts
  - apps/web/scripts/apply-metadata.ts
  - apps/web/scripts/check-evidences.ts
  - apps/web/scripts/check-soa-db.ts
  - apps/web/scripts/inspect-profiles.ts
  - apps/web/scripts/test-soa-insert.ts
  - tools/check-server-actions.sh
  - tools/check-python.sh
  - tools/describe_images.py
---

# Herramientas internas

Scripts del repositorio para desarrollo, comprobación estática y depuración. No forman parte de la
aplicación desplegada ni se ejecutan de forma programada: las tareas recurrentes están en
[Tareas programadas](tareas-programadas.md).

## Componentes

### Scripts de `apps/web`

| Comando | Qué hace |
|---|---|
| `npm run dev` | `next dev`, en `http://localhost:3000` |
| `npm run build` | `next build` |
| `npm run start` | `next start` |
| `npm run lint` | `next lint` con `next/core-web-vitals` y `next/typescript`. Las variables sin usar son error, salvo las que empiezan por `_` |

No hay scripts de test ni de comprobación de tipos.

### Comprobaciones estáticas (`tools/`)

| Script | Qué comprueba | Por qué |
|---|---|---|
| `tools/check-server-actions.sh [raíz]` | En los ficheros `.ts`/`.tsx` versionados que empiezan por `'use server'`, que solo se exporten funciones `async`: marca `export const`, `let`, `var`, `class`, `enum`, `function` sin `async`, `export default` que no sea `async function`, y `export { … }` / `export * from` (no se puede saber si lo exportado es asíncrono) | Una constante exportada desde un fichero `'use server'` compila, pero llega `undefined` al navegador. Ya ocurrió con `TRIAL_DAYS_OPTIONS` y `APPROVAL_OBJECT_TYPES`. Los valores deben ir a `lib/<dominio>/catalog.ts` |
| `tools/check-python.sh` | `pyflakes` sobre `services/*/fluxion_*` y `packages/py-common/fluxion_common`. Solo informa de nombres indefinidos y redefiniciones sin uso | Un nombre sin importar en una anotación pasa la sintaxis, pero el servicio falla al arrancar y Traefik responde 502 |

`CLAUDE.md` indica pasar `check-server-actions.sh` después de tocar cualquier `actions.ts`, y
`check-python.sh` después de tocar Python. Este último requiere `pyflakes`
(`python3 -m pip install pyflakes`); con `PYTHON=/ruta/a/python` se usa otro intérprete, por ejemplo el de
un entorno virtual.

Ambos scripts se pueden ejecutar desde cualquier carpeta del repositorio, funcionan con el bash 3.2 de
macOS y **fallan** (código 2) si no pueden hacer la comprobación: sin ficheros que revisar, sin Python o sin
`pyflakes`. Código 1 = se ha encontrado un problema.

### Scripts de `apps/web/scripts`

Se ejecutan desde `apps/web` con `npx tsx scripts/<script>.ts`, contra la base de datos y con la service
role (`NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).

| Script | Qué hace | Estado |
|---|---|---|
| `seed_failure_modes.ts` | Carga las dimensiones y los modos de fallo desde `recursos/modos_de_fallo/*.json` | Heredado: lo sustituye la migración `00000000000005_seed_compliance.sql` |
| `seed_causal_relations.ts` | Carga familias, nodos y relaciones causales desde `recursos/relaciones_causales/familia_*.json` | Heredado. Además no funciona: escribe en el esquema `public` y la carpeta de origen está vacía |
| `apply-metadata.ts` | Lee una migración heredada y no hace nada más | Obsoleto |
| `check-evidences.ts` | Lista las evidencias y los sistemas de la primera organización | Depuración |
| `check-soa-db.ts` | Lista los controles de la Declaración de Aplicabilidad | Depuración |
| `inspect-profiles.ts` | Muestra las columnas de `fluxion.profiles` | Depuración |
| `test-soa-insert.ts` | Inserta los controles de ISO/IEC 42001 en la primera organización. **Escribe en la base de datos** | Depuración |

> TODO: confirmar la carga de variables de estos scripts. El README dice que leen `.env.local`, pero
> varios usan `dotenv/config`, que lee `.env`.

### Otros

`tools/describe_images.py` envía las imágenes de `recursos/flujo_fluxion/` a OpenAI para describir el
flujo de la interfaz. Es de uso puntual y necesita `OPENAI_API_KEY`.

## Modelo de datos

No aplica.

## API

No aplica.

## Dependencias

| Herramienta | Requiere |
|---|---|
| Scripts de `apps/web` | Node.js, dependencias de `apps/web` (Next.js 14.2) |
| `tools/check-server-actions.sh` | bash 3.2 o superior, git |
| `tools/check-python.sh` | Python 3 con `pyflakes` |
| `apps/web/scripts/*` | `tsx` (con `npx`), acceso a la base de datos |

## Seguridad

- **Service role:** los scripts de `apps/web/scripts` la usan, así que saltan la RLS.
- **Entornos:** no deben ejecutarse contra producción salvo para una tarea concreta. `test-soa-insert.ts`
  modifica datos.

## Configuración

| Variable | Usada por |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | `apps/web/scripts/*` |
| `OPENAI_API_KEY` | `tools/describe_images.py` |

Ver [Configuración](configuracion.md).
