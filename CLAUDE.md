# CLAUDE.md — Fluxion

Idioma del proyecto: **español** (código, comentarios, commits y documentación).

## Proyecto

Fluxion es una plataforma SaaS multi-tenant de gobernanza de IA y gestión de riesgos de sistemas de IA:
inventario de sistemas, clasificación AI Act, análisis de modos de fallo (FMEA), plan de tratamiento,
brechas, evidencias, Declaración de Aplicabilidad ISO/IEC 42001, incidentes y tareas. El detalle
funcional está en [`docs/_inventario.md`](docs/_inventario.md).

### Stack

- **Web:** Next.js 14 (App Router) y TypeScript, Tailwind. Server actions y route handlers
  (`/api/ingest`, `/api/cron`, proxys al servicio de agentes).
- **Base de datos:** Supabase autoalojado (Postgres 15, PostgREST, GoTrue, Vault, Storage, pg_cron,
  pgvector).
- **Servicios Python:** FastAPI y workers con `httpx`. Usan la librería común `fluxion_common`.
- **IA:** OpenAI (GPT) para clasificación, asistente y sugerencias de la SoA. Voyage AI
  (`voyage-law-2`) para los embeddings del RAG.
- **Ficheros:** MinIO (S3) para evidencias y documentos generados; Supabase Storage para avatares,
  logos y adjuntos de tareas.
- **Despliegue:** Dokploy sobre VPS (Docker Swarm + Traefik). Seis servicios desplegados: web,
  agents, renderer, telemetry, connector-mlflow y connector-shadow-ai.

### Estructura del repositorio

```
apps/web/              Next.js: UI, server actions y API
services/agents/       FastAPI: clasificación AI Act y Asistente SGAI (OpenAI + RAG)
services/renderer/     FastAPI + Playwright: HTML → PDF
services/telemetry/    FastAPI: ingesta OTLP de trazas LLM (coste y uso)
services/connector-*/  Workers que publican en la API de ingesta (MLflow, Shadow AI)
packages/py-common/    fluxion_common: cliente de la API de ingesta, telemetría, config
supabase/migrations/   Esquema de BD. FUENTE DE VERDAD
infra/                 Compose de Supabase, backups, migrate.sh, crontab
docs/                  Documentación (ver sección Documentación)
recursos/              Material de diseño, catálogos de origen y SQL legacy. NO es fuente de verdad
tools/                 Comprobaciones estáticas
```

### Comandos habituales

```bash
cd apps/web && npm install && npm run dev   # http://localhost:3000
cd apps/web && npm run build
cd apps/web && npm run lint
./tools/check-server-actions.sh             # los ficheros 'use server' solo exportan funciones async
./tools/check-python.sh                     # nombres indefinidos en Python (requiere pyflakes; PYTHON=… para otro intérprete)

export PYTHONPATH="$PWD/packages/py-common:$PWD/services/agents"
pip install -r services/agents/requirements.txt
uvicorn fluxion_agents.main:app --reload --port 8001
```

No hay tests automatizados. Pasa `check-server-actions.sh` después de tocar cualquier `actions.ts`, y
`check-python.sh` después de tocar Python: los dos fallos que detectan compilan sin error y solo rompen
en ejecución.

### Convenciones de código

- **Migraciones:** `supabase/migrations/<timestamp>_<modulo>_<descripcion>.sql`. Una migración
  aplicada **no se edita nunca**: se corrige con otra nueva. `recursos/db/_legacy/` es histórico y no
  se aplica. Ver [`recursos/db/README.md`](recursos/db/README.md).
- **Multi-tenant:** toda tabla con datos de cliente lleva `organization_id` y RLS. Las escrituras con
  service role filtran por organización a mano.
- **Servicios Python:** `services/<nombre-con-guiones>/fluxion_<nombre_con_guiones_bajos>/`. Los
  Dockerfiles se construyen con contexto en la **raíz** del monorepo.
- **Módulos:** no escriben en la base de datos. Publican por la API de ingesta
  ([`docs/ingesta.md`](docs/ingesta.md)) con una clave `flx_…` y scopes.
- **Secretos:** nunca en ficheros versionados, tampoco en ejemplos de README. Las credenciales de
  conectores y canales van en Supabase Vault.

---

## Documentación

La documentación técnica y de negocio de Fluxion se genera en `docs/` en formato Markdown y se
integrará en la plataforma CloudFramework.

### Ficheros de control

| Fichero | Función |
|---|---|
| `docs/_inventario.md` | Inventario revisado de módulos, vistas, entidades, endpoints, roles e integraciones, con las decisiones de la revisión (§9-§14). Fuente de verdad del alcance |
| `docs/_mapa.md` | Plan de documentos: id, ruta, tipo, audiencia, módulo, ficheros fuente y estado. Solo se generan los documentos que figuran en él |
| `docs/_pendientes.md` | Recopilación de los `TODO` abiertos, para revisión humana |
| `docs/glosario.md` | Terminología oficial. Mientras no exista, la referencia es `docs/_inventario.md` §9 |
| `docs/_plantillas/` | Plantillas `negocio.md`, `vista.md` y `tecnica.md` |

No modifiques `_inventario.md` ni `glosario.md` sin que se pida expresamente: los valida el responsable
del proyecto (Pedro Albarracín). Si al documentar encuentras algo que los contradice, no lo corrijas:
anótalo como `TODO` en `_pendientes.md`.

### Estructura

```
docs/
  indice.md
  glosario.md
  negocio/      # un .md por módulo funcional
  funcional/    # un .md por vista
  tecnica/      # arquitectura, modelo de datos, API, seguridad, despliegue
  _plantillas/
```

Nombres de fichero en minúsculas, kebab-case y sin tildes ni eñes (`evaluacion-riesgos.md`).

### Tipos de documento y audiencia

| Tipo | Audiencia | Código | Contenido |
|---|---|---|---|
| **negocio** | Comerciales: también sirve a responsables de cumplimiento, dirección y clientes | `comercial` | Qué problema resuelve el módulo, flujo de trabajo, roles, relación normativa y disponibilidad. Sin detalles de implementación |
| **funcional** | Técnicos que configuran, soportan o enseñan la aplicación | `tecnica` | Cada vista: propósito, acceso, permisos, campos, acciones, validaciones y estados |
| **tecnica** | Técnicos de desarrollo, integración y operación | `tecnica` | Componentes, modelo de datos, API, dependencias, seguridad, configuración y despliegue |

**No mezcles audiencias.** Si un documento de negocio necesita detalle técnico, enlaza al documento
funcional o técnico correspondiente.

### Reglas de redacción

1. **Usa siempre la plantilla** del tipo correspondiente, con todas sus secciones y en el mismo orden.
   Si una sección no aplica, escribe «No aplica»; no la elimines.
2. **Front-matter YAML obligatorio** en cada documento:
   ```yaml
   ---
   id: NEG-ANALISIS-MODOS-FALLO        # el id de _mapa.md
   titulo: Análisis de modos de fallo (FMEA)
   tipo: negocio | funcional | tecnica
   modulo: analisis-modos-de-fallo     # slug del módulo en _mapa.md
   audiencia: comercial | tecnica
   version: 0.1
   fuente:
     - ruta/al/fichero/fuente
   ---
   ```
   `fuente` lista los ficheros de código de los que se deriva el contenido. Sirve para regenerar solo
   lo que se vea afectado por cambios.
3. **No inventes.** Documenta solo lo que puedas derivar del código, del inventario o del glosario, y
   verifícalo en los ficheros fuente del mapa. No te bases en `docs/modulos/*` ni en `recursos/*` sin
   contrastarlos con el código. Hay tres marcas distintas:
   - Lo que no puedas confirmar: `> TODO: confirmar <qué falta y por qué>`. Va también a
     `_pendientes.md`.
   - Lo decidido pero no implementado (`_inventario.md` §12): `> **Pendiente de implementar.** <qué falta>`.
   - Lo que el responsable ha dejado sin definir (niveles de aprobación, planes):
     `> **Pendiente de definir.** <qué falta>`.
4. **Terminología:** usa exclusivamente los términos de `glosario.md` y evita los sinónimos que
   desaconseja.
   - En los documentos de negocio, solo nombres de negocio, nunca nombres de código («Señales de
     riesgo», no `signals`; «Zona I · Crítico», no `zona_i`).
   - Los módulos se nombran según la estructura objetivo (`_inventario.md` §10), no según
     `lib/modules/registry.ts`.
   - Si necesitas un término nuevo, no lo introduzcas: añádelo como `TODO` en `_pendientes.md`.
5. **Idioma:** español, registro profesional, frases claras. En los documentos funcionales y técnicos,
   los nombres de código (tablas, endpoints, componentes) van en formato `código` y sin traducir.
6. **Enlaces** relativos entre documentos (`../tecnica/modelo-datos.md`). Enlaza el primer uso de cada
   término clave a su entrada del glosario.
7. **Diagramas** en bloques Mermaid. Nada de imágenes generadas ni capturas de pantalla: las pantallas
   se describen con texto, usando las etiquetas visibles (**Configuración › Ajustes › Webhooks**).
8. **Normativa:** cita artículos del AI Act o cláusulas de ISO/IEC 42001 solo cuando la relación sea
   directa y verificable en la funcionalidad. Formato: «AI Act, Art. 73», «ISO/IEC 42001, §6.1.2». Si
   dudas, `TODO`.
9. **Datos sensibles:** no incluyas secretos, credenciales, URLs internas ni datos reales de clientes.
   Usa ejemplos ficticios.

### Alcance

- **No se documentan:** rutas sin uso, código muerto ni tablas legacy (`_inventario.md` §11.1-§11.3).
- **Próximas funcionalidades:** solo aparecen en `docs/negocio/hoja-de-ruta.md`.
- **Seguridad:** los hallazgos de `_inventario.md` §7 quedan fuera de la documentación hasta nueva
  instrucción.
- **Modelos LLM:** el proveedor actual es OpenAI (GPT). La configuración del modelo por organización
  está pendiente de implementar.

### Flujo de trabajo

1. Antes de generar un documento, consulta `_mapa.md` para su ruta, tipo, audiencia y ficheros fuente.
2. Lee los ficheros fuente indicados; no recorras el repositorio entero salvo que se pida.
3. Genera el documento con su plantilla.
4. Al terminar:
   - actualiza su estado en `_mapa.md` (`pendiente` → `borrador`);
   - añade sus `TODO` a `_pendientes.md` con referencia al documento;
   - enlázalo desde `indice.md` si aún no lo está.
5. Trabaja un módulo cada vez salvo indicación contraria. No generes ningún documento sin una
   instrucción explícita. Resume al final qué has generado y qué queda pendiente de confirmar.

El estado `revisado` solo lo asigna el responsable del proyecto.

### Integración en CloudFramework

<!-- TODO: completar cuando se conozca el formato de importación -->
Los requisitos de formato de CloudFramework (front-matter específico, jerarquía, tamaño máximo, soporte
de Mermaid) se aplicarán en un paso final de transformación. No condicionan la redacción de los
documentos fuente.
