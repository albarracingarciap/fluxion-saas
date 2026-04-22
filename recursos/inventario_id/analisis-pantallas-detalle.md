# Análisis de pantallas — Detalle de sistema IA
## Fluxion · Inventario de Sistemas

> Documento de diseño y arquitectura de datos.
> Analiza las 5 vistas del detalle de un sistema IA, su función y los requerimientos de datos fuera de `fluxion.ai_systems`.

---

## Estructura general de la pantalla

Todas las vistas comparten un **frame fijo** compuesto por:

- **Topbar global** — breadcrumb `Inventario / Motor de Scoring Crediticio`, botones `Exportar PDF`, `Abrir agente`, `+ Nueva evidencia`
- **Header del sistema** — nombre, badges de clasificación (Alto Riesgo · Producción · Interno · Crédito y financiación · Plazo: 90 días), y 4 KPIs: Compliance %, Obligaciones, Próximo plazo, Responsable
- **Banner del agente** — pregunta proactiva pendiente de respuesta del usuario
- **Tabs de navegación** — Obligaciones AI Act · Ficha técnica · ISO 42001 · Historial · Evidencias
- **Panel lateral derecho** — persistente en todas las vistas: donut de compliance, barras por artículo, acciones rápidas, dependencias externas, sistemas relacionados

### Qué datos del frame fijo vienen de `ai_systems`

| Elemento | Columna en `ai_systems` |
|---|---|
| Nombre del sistema | `name` |
| Badge Alto Riesgo | `aiact_risk_level` |
| Badge Producción | `status` |
| Badge Interno | `provider_origin` |
| Badge dominio | `domain` |
| Responsable | `ai_owner` + `responsible_team` |
| Próximo plazo (90d) | calculado desde `next_audit_date` o plazo regulatorio externo |

### Qué datos del frame fijo **NO** vienen de `ai_systems`

| Elemento | Origen necesario |
|---|---|
| **Compliance %** (32%) | Calculado agregando el estado de todas las obligaciones → tabla `fluxion.obligations` |
| **Número de obligaciones** (8 · 1 OK · 2 parcial · 5 gap) | Agregado desde `fluxion.obligations` |
| **Próximo plazo regulatorio** (Ago 2025 · GPAI) | Tabla `fluxion.regulatory_deadlines` — no es la auditoría interna, es el plazo del AI Act |
| **Barras por artículo** (Art. 9, 11, 14, 15, 13) | `fluxion.obligations` agrupado por `article_ref` |
| **Acciones rápidas** (Generar doc, Evaluar riesgos...) | Configuración de acciones disponibles por nivel de riesgo — tabla de configuración o hardcoded |
| **Dependencias externas** (Core Banking API, Azure ML, Bureau) | Tabla `fluxion.system_dependencies` |
| **Sistemas relacionados** (Detección de Fraude) | Tabla `fluxion.system_dependencies` o `fluxion.system_relations` |
| **Banner del agente** (pregunta pendiente) | Tabla `fluxion.agent_messages` / `fluxion.agent_sessions` |

---

## Vista 1 — Obligaciones AI Act

### Función y utilidad

Es la vista principal de compliance normativo del sistema. Responde a la pregunta: **¿qué obliga el AI Act a este sistema y en qué estado está cada obligación?**

La pantalla tiene tres bloques:

**Bloque de clasificación** — muestra el resultado del análisis del agente: nivel de riesgo (Alto Riesgo), fundamento jurídico exacto (Anexo III, Sección 5(b)), fecha de evaluación, justificación narrativa completa y referencias normativas como chips clicables (Anexo III · 5(b), Art. 22 GDPR, DORA Art. 28, EBA Guidelines ML).

**Tabla de obligaciones aplicables** — cada fila es una obligación con: semáforo de estado (rojo/amarillo/verde), nombre de la obligación, referencia exacta al artículo, estado textual (Sin implementar / Parcial / Implementado), barra de progreso con porcentaje, y botón de acción (Resolver / Ver). El resumen superior muestra el recuento: 5 gaps · 2 parciales · 1 implementado.

**Botón "Revisar clasificación"** — permite al DPO iniciar una revisión manual de la clasificación automática del agente.

### Datos que vienen de `ai_systems`

| Dato | Columna |
|---|---|
| Nivel de riesgo mostrado | `aiact_risk_level` |
| Fundamento jurídico | `aiact_risk_basis` |
| Justificación narrativa | `aiact_risk_reason` |
| Fecha de clasificación | `aiact_classified_at` |
| Lista de obligaciones aplicables (referencia) | `aiact_obligations[]` |

### Datos que **NO** están en `ai_systems` — requieren tabla propia

El array `aiact_obligations[]` en `ai_systems` es solo la lista de obligaciones aplicables (texto). El **estado de implementación de cada obligación** es una entidad independiente con ciclo de vida propio. Necesita:

```
fluxion.obligations
  id                  UUID PK
  organization_id     UUID FK organizations
  ai_system_id        UUID FK ai_systems
  article_ref         TEXT          -- 'Art. 9', 'Art. 14', etc.
  obligation_name     TEXT          -- 'Gestión de Riesgos'
  description         TEXT
  status              ENUM('gap', 'partial', 'implemented', 'not_applicable')
  progress_pct        SMALLINT      -- 0-100
  assigned_to         UUID FK profiles
  due_date            DATE
  notes               TEXT
  last_reviewed_at    TIMESTAMPTZ
  created_at          TIMESTAMPTZ
  updated_at          TIMESTAMPTZ
```

Los **chips de referencias normativas adicionales** (Art. 22 GDPR, DORA Art. 28, EBA Guidelines ML) implican una tabla de referencias cruzadas entre sistemas y normativas:

```
fluxion.system_regulatory_refs
  id              UUID PK
  ai_system_id    UUID FK ai_systems
  regulation      TEXT    -- 'RGPD', 'DORA', 'EBA', 'ISO42001'
  article_ref     TEXT    -- 'Art. 22'
  label           TEXT    -- 'Art. 22 GDPR'
  url             TEXT    -- enlace al texto oficial
```

Los **plazos regulatorios** (Ago 2025 · GPAI) no son fechas de auditoría interna sino fechas de aplicación del reglamento vinculadas al nivel de riesgo del sistema:

```
fluxion.regulatory_deadlines
  id              UUID PK
  organization_id UUID FK organizations
  ai_system_id    UUID FK ai_systems
  regulation      TEXT
  milestone       TEXT    -- 'GPAI en producción', 'Sistemas alto riesgo'
  deadline_date   DATE
  days_remaining  INT     -- columna generada o calculada en query
  status          ENUM('urgent', 'upcoming', 'ok', 'overdue')
```

---

## Vista 2 — Ficha técnica

### Función y utilidad

Vista de **consulta de los atributos técnicos y operativos** del sistema registrados en el wizard. Es esencialmente un read-only del formulario de registro, organizado en pares clave-valor. Incluye un botón `⇔ Editar` para abrir el wizard en modo edición.

Los campos mostrados son: descripción, dominio, tipo de output, afecta a personas, modelo base, datos de entrenamiento, proveedor/origen, responsable técnico, fecha de despliegue, entornos activos, documentación existente, revisión humana.

### Datos que vienen de `ai_systems`

Prácticamente todos los datos de esta vista proceden directamente de columnas de `ai_systems`:

| Campo mostrado | Columna |
|---|---|
| Descripción | `description` |
| Dominio de aplicación | `domain` |
| Tipo de output | `output_type` |
| ¿Afecta a personas? | `affects_persons` |
| Modelo base | `base_model` |
| Datos de entrenamiento | `training_data_doc` + texto libre |
| Proveedor / origen | `provider_origin` + `external_provider` |
| Responsable técnico | `tech_lead` |
| Fecha de despliegue | `deployed_at` + `version` |
| Entornos activos | `active_environments[]` |
| Documentación existente | `has_tech_doc` |
| Revisión humana | `has_human_oversight` + `oversight_type` |

### Datos que **NO** están en `ai_systems`

Los datos de entrenamiento mostrados en la ficha ("Histórico de créditos 2015-2022 · ~2.1M registros · Fuente: Core Banking") son más ricos de lo que cabe en la columna `training_data_doc` (que es un enum). Se necesita un campo de texto libre enriquecido o una tabla de datasets:

```
fluxion.training_datasets
  id              UUID PK
  ai_system_id    UUID FK ai_systems
  name            TEXT          -- 'Histórico de créditos 2015-2022'
  record_count    BIGINT        -- 2_100_000
  source          TEXT          -- 'Core Banking'
  date_range      DATERANGE
  is_documented   BOOLEAN
  bias_analysis   BOOLEAN
  notes           TEXT
```

El campo `Documentación existente — Parcial · falta documentación Anexo IV completa` incluye un comentario cualitativo que no tiene columna en `ai_systems`. Podría ir en `mitigation_notes` pero semánticamente debería ser parte de la obligación correspondiente en `fluxion.obligations`.

---

## Vista 3 — ISO 42001

### Función y utilidad

Muestra la **evaluación de madurez del sistema contra los controles relevantes de ISO/IEC 42001:2023**. No es una evaluación organizativa global (esa está en el dashboard) sino una evaluación específica de este sistema.

Cada fila es un control ISO con: código del control (A.5.1, A.6.1, A.10.1, A.3.2), nombre, badge de severidad (Crítico / Importante), nivel de madurez actual como fracción (Nivel 1/3, Nivel 2/3), descripción del gap encontrado, y barra de progreso visual.

El header muestra el resumen global: `Madurez org. 28%`.

### Datos que vienen de `ai_systems`

Solo el `iso_42001_score` (28%) procede directamente de `ai_systems`. El resto no existe en la tabla.

### Datos que **NO** están en `ai_systems` — requieren tabla propia

Los controles ISO evaluados, su estado y los gaps identificados son una entidad independiente:

```
fluxion.iso_controls
  id              UUID PK
  organization_id UUID FK organizations
  ai_system_id    UUID FK ai_systems
  control_ref     TEXT          -- 'A.5.1', 'A.6.1', 'A.10.1'
  control_name    TEXT          -- 'Evaluación de impacto'
  severity        ENUM('critical', 'important', 'recommended')
  current_level   SMALLINT      -- 1, 2, 3 (madurez CMM)
  max_level       SMALLINT      -- generalmente 3
  gap_description TEXT          -- hallazgo del agente
  progress_pct    SMALLINT      -- 0-100 (derivado de current/max)
  evaluated_at    TIMESTAMPTZ
  evaluated_by    UUID          -- profile o NULL si fue el agente
```

El nivel de madurez `Nivel 1/3` usa un modelo de madurez tipo CMM de 3 niveles. Esto podría estar embebido en la tabla anterior o tener su propia taxonomía:

```
-- Podría ser una tabla de referencia para la descripción de cada nivel
fluxion.iso_maturity_levels
  control_ref     TEXT
  level           SMALLINT      -- 1, 2, 3
  description     TEXT          -- qué significa ese nivel para ese control
```

---

## Vista 4 — Historial

### Función y utilidad

Muestra el **ciclo de vida completo del sistema** como una línea de tiempo vertical. Combina eventos pasados (completados) con hitos futuros planificados (pendientes). Es el registro de auditoría narrativo del sistema.

Los eventos mostrados son:
- Sistema registrado en inventario — DPO · Ana García · 14 Mar 2025 · Completado
- Clasificación AI Act completada — Agente IA · 15 Mar 2025 · Completado · badge `Alto Riesgo · Anexo III.5(b)`
- Gap analysis iniciado — DPO · 16 Mar 2025 · En curso
- Remediación: documentación técnica — Pendiente · Sprint 2 · Equipo ML
- Remediación: supervisión humana — Pendiente · Sprint 3 · Operaciones
- Registro en base de datos EU — Pendiente · Antes Ago 2026
- Revisión final de compliance — Pendiente · Jul 2026

### Datos que vienen de `ai_systems`

`created_at`, `updated_at` y `aiact_classified_at` pueden generar los primeros eventos. El resto no existe en `ai_systems`.

### Datos que **NO** están en `ai_systems` — requieren tabla propia

Esta vista es esencialmente un `audit_log` combinado con un `roadmap` de hitos:

```
fluxion.system_events
  id              UUID PK
  organization_id UUID FK organizations
  ai_system_id    UUID FK ai_systems
  event_type      ENUM(
                    'registered',         -- registro inicial
                    'classified',         -- clasificación AI Act
                    'gap_analysis',       -- gap analysis iniciado/completado
                    'remediation',        -- acción de remediación
                    'evidence_added',     -- nueva evidencia subida
                    'review',             -- revisión periódica
                    'certification',      -- hito de certificación
                    'deadline',           -- plazo regulatorio
                    'agent_action'        -- acción del agente IA
                  )
  title           TEXT          -- 'Clasificación AI Act completada'
  description     TEXT
  status          ENUM('completed', 'in_progress', 'pending', 'overdue')
  actor_type      ENUM('user', 'agent', 'system')
  actor_id        UUID          -- FK profiles si actor_type = 'user'
  actor_label     TEXT          -- 'Ana García', 'Agente IA', 'DPO'
  meta            JSONB         -- badges extra como {risk:'Alto Riesgo', basis:'Anexo III.5(b)'}
  planned_date    DATE          -- para eventos futuros
  sprint          TEXT          -- 'Sprint 2', 'Sprint 3'
  occurred_at     TIMESTAMPTZ   -- para eventos pasados
  created_at      TIMESTAMPTZ
```

Los eventos `completed` con `occurred_at` son el log de auditoría. Los eventos `pending` con `planned_date` son el roadmap. La misma tabla sirve para ambos, simplificando las queries.

---

## Vista 5 — Evidencias

### Función y utilidad

Es el **repositorio documental de cumplimiento** del sistema. Cada evidencia es un documento que respalda una o varias obligaciones del AI Act. Es la vista más crítica desde el punto de vista auditor: sin evidencias, no hay compliance demostrable.

La pantalla tiene dos secciones principales:

**Lista de evidencias** — cada fila muestra: icono de tipo de archivo (PDF, XLSX, DOCX), nombre del documento, metadatos (formato · fecha · autor), chip de artículo al que aplica (Art. 13, Art. 15, Art. 11), badge de validez (Válida / Incompleta), botón Ver.

**Alerta de gaps sin evidencia** — `⚠ 5 obligaciones sin evidencia` con descripción de qué obligaciones no tienen documentos asociados y el deadline.

### Datos que vienen de `ai_systems`

Ninguno directamente. `has_tech_doc` en `ai_systems` es un enum (si/parcial/no) que se deriva del estado de las evidencias, no al revés.

### Datos que **NO** están en `ai_systems` — requieren tabla propia

Las evidencias son la entidad más compleja, ya referenciada en el contexto del proyecto:

```
fluxion.evidences
  id                UUID PK
  organization_id   UUID FK organizations
  ai_system_id      UUID FK ai_systems
  obligation_id     UUID FK obligations   -- a qué obligación aplica
  article_refs      TEXT[]                -- ['Art. 11', 'Art. 13'] (puede aplicar a varios)
  name              TEXT                  -- 'Política de IA corporativa'
  file_type         TEXT                  -- 'pdf', 'docx', 'xlsx'
  file_url          TEXT                  -- URL en Supabase Storage
  file_size_kb      INT
  validity_status   ENUM('valid', 'incomplete', 'expired', 'pending_review')
  uploaded_by       UUID FK profiles
  uploaded_at       TIMESTAMPTZ
  reviewed_by       UUID FK profiles
  reviewed_at       TIMESTAMPTZ
  expiry_date       DATE                  -- algunas evidencias caducan
  notes             TEXT
  created_at        TIMESTAMPTZ
```

Los archivos físicos van en **Supabase Storage** bajo un bucket con estructura:
```
evidences/{organization_id}/{ai_system_id}/{evidence_id}.{ext}
```

---

## Resumen: tablas adicionales necesarias

| Tabla | Función | Vistas que la consumen |
|---|---|---|
| `fluxion.obligations` | Estado de cada obligación AI Act por sistema | Obligaciones AI Act, frame (KPIs), Evidencias |
| `fluxion.regulatory_deadlines` | Plazos regulatorios del AI Act por sistema | Frame (próximo plazo), Obligaciones AI Act |
| `fluxion.system_regulatory_refs` | Referencias cruzadas a otras normativas (DORA, RGPD, EBA) | Obligaciones AI Act |
| `fluxion.iso_controls` | Evaluación de controles ISO 42001 por sistema | ISO 42001 |
| `fluxion.system_events` | Ciclo de vida y roadmap (log de auditoría + hitos futuros) | Historial |
| `fluxion.evidences` | Repositorio documental de cumplimiento | Evidencias, Obligaciones AI Act |
| `fluxion.system_dependencies` | Dependencias externas (APIs, proveedores TIC) | Panel lateral (todas las vistas) |
| `fluxion.agent_sessions` | Sesiones del agente IA | Banner del agente (todas las vistas) |
| `fluxion.agent_messages` | Mensajes y preguntas del agente | Banner del agente (todas las vistas) |
| `fluxion.training_datasets` | Datasets de entrenamiento detallados | Ficha técnica |

---

## Nota sobre el banner del agente

El banner superior `El agente necesita tu input` es la pieza arquitectónicamente más singular. Aparece en **todas las vistas** y representa una pregunta proactiva del agente que interrumpe el flujo normal de trabajo.

Los tres botones de respuesta rápida (`Sí, existe un proceso` / `No, es automático` / `Responder con más detalle →`) son respuestas pre-formateadas que el agente usa para completar su evaluación de la obligación Art. 14.

Esto implica que `fluxion.agent_messages` necesita un campo `quick_replies JSONB` con las opciones, y que al hacer clic en uno de los botones se hace un INSERT en `agent_messages` con el role `user` y el texto de la respuesta elegida, que el agente procesa en la siguiente vuelta del streaming.

El estado `Pendiente` del badge indica que hay mensajes del agente sin respuesta en `agent_sessions` para este sistema — lo que genera la notificación en el badge `11` del nav lateral.
