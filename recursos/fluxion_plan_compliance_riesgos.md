# Fluxion — Plan de Desarrollo
## Módulo de Compliance y Módulo de Gestión de Riesgos (FMEA)

**Versión:** 1.0  
**Fecha:** Abril 2026  
**Estado:** Diseño aprobado — pendiente de implementación  
**Stack:** Next.js 14 · FastAPI · Supabase (PostgreSQL + pgvector) · Claude API

---

## Contexto del proyecto

Fluxion es una plataforma SaaS B2B multi-tenant de gobierno y gestión de riesgos para sistemas de inteligencia artificial, orientada al mercado regulado europeo (banca, salud, sector público). Su propuesta central es que **un único ciclo de trabajo satisface simultáneamente múltiples marcos normativos**: AI Act, ISO 42001, GDPR/RGPD y DORA.

La plataforma tiene dos módulos funcionales que este documento cubre:

1. **Módulo de Compliance** — gestión de obligaciones normativas, controles y evidencias (naturaleza binaria: se cumple o no se cumple).
2. **Módulo de Gestión de Riesgos (FMEA)** — evaluación probabilística de modos de fallo mediante la metodología R·I·D·E propia de Fluxion (naturaleza gradual: severidad evaluable).

**Distinción crítica de diseño:** estos dos módulos son instrumentos diferentes con lógicas diferentes. El módulo de compliance gestiona *compliance gates* (obligaciones binarias). El módulo FMEA gestiona *riesgos probabilísticos*. Nunca se mezclan. Un mismo sistema puede tener simultáneamente la SoA en verde (compliance gates implementados) y el perfil FMEA en Zona I (riesgos residuales elevados). Ambos estados son correctos y no se contradicen.

---

## Arquitectura general de datos

### Separación de schemas

Toda la base de datos usa dos schemas PostgreSQL con responsabilidades distintas:

- **`compliance`** — Catálogo normativo de plataforma. Solo lectura para tenants. Mantenido y actualizado por Fluxion. Contiene los frameworks, requisitos, controles plantilla y modos de fallo del catálogo FMEA. El tenant nunca escribe aquí.
- **`fluxion`** — Instancias por organización. RLS activo en todas las tablas. Todo dato que pertenece a un tenant vive aquí.
- **`rag`** — Documentos vectorizados para el agente IA. Namespaces separados por regulación.

### Función helper crítica

`fluxion.current_organization_id()` — devuelve el UUID de la organización del usuario autenticado. Todas las políticas RLS la usan como filtro. Ya está implementada en el schema de organizaciones anterior.

---

## PARTE 1 — MÓDULO DE COMPLIANCE

### 1.1 Objetivo funcional

Permite a la organización saber, en cada momento, si sus sistemas IA cumplen con las obligaciones normativas que les aplican. Produce la **Declaración de Aplicabilidad (SoA)** que requiere ISO 42001 §6.1.3(f) y permite demostrar conformidad ante auditores y reguladores.

### 1.2 Modelo conceptual (cuatro capas)

```
Frameworks → Requirements → Controls → Evidence
```

- **Frameworks**: Los marcos normativos activos (AI Act, ISO 42001, GDPR, DORA, y futuros).
- **Requirements**: Las obligaciones y sub-obligaciones concretas de cada framework. Granularidad a nivel de sub-artículo para permitir medir cumplimiento parcial.
- **Controls**: Las medidas que implementa la organización. Un control puede satisfacer requisitos de múltiples frameworks simultáneamente (núcleo del modelo cross-framework).
- **Evidence**: Los artefactos que demuestran que un control está implementado. Una evidencia puede demostrar múltiples controles de múltiples frameworks.

### 1.3 Tablas del schema `compliance` (catálogo, solo lectura)

| Tabla | Descripción |
|-------|-------------|
| `compliance.frameworks` | Un registro por marco normativo activo en la plataforma. Incluye el `rag_namespace` que vincula el framework a su corpus vectorial. |
| `compliance.requirements` | Obligaciones normativas a nivel de sub-artículo. Incluye condiciones de activación en JSONB, nivel de riesgo AI Act al que aplican, y rol (provider/deployer/all). |
| `compliance.control_templates` | Plantillas de controles agnósticas al framework. El mapeo a frameworks está en la tabla siguiente. |
| `compliance.requirement_control_mappings` | Join many-to-many entre requisitos y plantillas de controles. Núcleo del modelo multi-norma. Incluye si el control es suficiente solo o complementario. |

**Política de acceso:** Las cuatro tablas del catálogo son de solo lectura para usuarios autenticados. Solo el `service_role` puede modificarlas (actualizaciones de normativa por parte de Fluxion).

### 1.4 Tablas del schema `fluxion` (instancias por organización)

| Tabla | Descripción |
|-------|-------------|
| `fluxion.controls` | Instancia organizacional de un `control_template`. `system_id NULL` = control a nivel de organización (p.ej. política SGAI ISO 42001). `system_id NOT NULL` = control específico de un sistema IA del inventario. Incluye `compliance_score` (0-100) para cumplimiento parcial. |
| `fluxion.evidences` | Artefactos que demuestran cumplimiento. Pueden aplicar a múltiples sistemas (`applies_to_systems UUID[]`) y referenciar múltiples artículos (`regulatory_refs TEXT[]`). Tienen fecha de caducidad opcional (`valid_until`). |
| `fluxion.evidence_controls` | Join many-to-many entre evidencias y controles. Una evidencia cierra varios controles; un control puede tener varias evidencias. |
| `fluxion.gaps` | Brecha entre obligación y estado real. Ciclo de vida: `auto_detected → confirmed → in_progress → resolved | accepted_risk | not_applicable`. El estado `accepted_risk` requiere justificación documentada obligatoria. |
| `fluxion.risk_assessments` | Evaluaciones formales de riesgo (Art. 9 AI Act, DPIA GDPR Art. 35, ICT Risk DORA, ISO risk). Genera gaps automáticamente si el riesgo residual supera el umbral. |

### 1.5 Motor de obligaciones (FastAPI)

El motor de obligaciones es el servicio que conecta el inventario de sistemas con el catálogo normativo. Se ejecuta en dos momentos:

**Al clasificar un sistema IA:**
1. Lee los atributos del sistema del inventario (nivel de riesgo AI Act, tipo de output, si procesa datos personales, sector, etc.).
2. Consulta `compliance.requirements` filtrando por `applies_to_risk_level`, `applies_to_role` y evaluando las `activation_conditions` JSONB contra los atributos del sistema.
3. Para cada requisito aplicable, obtiene los `control_templates` mapeados via `requirement_control_mappings`.
4. Crea registros en `fluxion.controls` para cada control que aún no exista para ese sistema/organización (respeta el UNIQUE constraint para no duplicar controles cross-framework).
5. Crea registros en `fluxion.gaps` para cada requisito sin control implementado.

**Deduplicación cross-framework:**
Antes de crear un control, el motor verifica si ya existe un control con el mismo `template_id` para ese sistema/organización. Si existe, simplemente vincula el nuevo requisito sin duplicar el control. Esto es lo que elimina el trabajo duplicado al cumplir con múltiples frameworks.

**Cálculo del compliance score:**
```
score = COUNT(controls WHERE status IN ('implemented','verified'))
        / COUNT(controls) * 100
```
Filtrable por framework via JOIN con `requirement_control_mappings`.

### 1.6 Declaración de Aplicabilidad (SoA)

La SoA se genera de forma semi-automática a partir del estado de los controles. No es una tabla editable: es una vista calculada sobre `fluxion.controls`, `compliance.requirements` y `fluxion.evidences`.

Tiene dos vistas:
- **Por sistema**: granularidad para el equipo de compliance (qué controles aplican a qué sistema).
- **Organizacional consolidada**: estado más conservador de cada control a través de todos los sistemas. Esta es la que firma la alta dirección y ve el certificador ISO 42001.

Los estados posibles de cada control en la SoA: `implemented` · `partial` · `planned` · `excluded` · `critical_gap`.

### 1.7 Pipeline RAG (ingesta de regulaciones)

El corpus vectorial que usa el agente de compliance se construye mediante un pipeline de ingesta independiente de la aplicación principal. No es código de la plataforma: es un script de administración que se ejecuta cuando se incorpora o actualiza una regulación.

**Estructura del pipeline:**

```
Fuente (EUR-Lex HTML / PDF / documento) 
  → Fetch + limpieza (eliminación de cabeceras, paginación, columnas paralelas)
  → Parser específico por regulación (extrae artículos con metadatos)
  → Chunking semántico (por artículo/apartado, con overlap de ~100 tokens)
  → Embedding via Voyage AI API (modelo voyage-law-2, 1024 dimensiones)
  → INSERT en rag.documents con vector + metadatos
```

**Tabla de almacenamiento vectorial:**

| Tabla | Descripción |
|-------|-------------|
| `rag.documents` | Chunks de texto regulatorio con su vector de embeddings (pgvector, 1024 dimensiones), namespace, article_ref, chapter, risk_level[], applies_to[], tags[]. Índice HNSW para búsqueda aproximada eficiente. |

**Namespaces por regulación:**
- `ai_act` — EU AI Act 2024/1689 + considerandos + futuros actos delegados
- `iso_42001` — ISO/IEC 42001:2023 + guías interpretativas públicas
- `gdpr` — Reglamento 2016/679 + guidelines EDPB + WP29
- `dora` — Reglamento 2022/2554 + RTS + ITS + EBA guidelines
- Futuros: `mdr_ivdr`, `ens`, `nist_ai_rmf`

**Nota sobre ISO 42001:** Al ser un estándar de pago, el corpus disponible son las guías interpretativas públicas (BSI, AENOR, etc.) más el contenido que el tenant pueda subir con su copia licenciada. El onboarding del módulo ISO 42001 debe contemplar esta vía de subida.

**Decisión pendiente de infraestructura:** Proveedor de embeddings. Voyage AI `voyage-law-2` (1024 dim, especializado en texto legal europeo) vs OpenAI `text-embedding-3-small` (1536 dim). La elección determina la dimensión del campo `vector(N)` en `rag.documents` y no puede cambiarse sin re-embeddar todo el corpus. Debe resolverse antes de la primera ingesta.

---

## PARTE 2 — MÓDULO DE GESTIÓN DE RIESGOS (FMEA)

### 2.1 Objetivo funcional

Permite al responsable del SGAI evaluar el perfil de riesgo probabilístico de cada sistema IA del inventario, obtener su zona de riesgo, gestionar el plan de tratamiento y mantener el ciclo de reevaluación periódica. Implementa la metodología R·I·D·E de Fluxion.

### 2.2 La metodología R·I·D·E (resumen para implementación)

**Fórmula de severidad por defecto:**

```
W = 1.0 + (R + I + D + E) / 12
S_default = round(2 + (W − 1.0) × 7)
```

Donde R, I, D, E ∈ {0, 1, 2, 3} y S_default ∈ {2…9}.

**Los cuatro criterios:**
- **R — Exposición regulatoria**: cuántos marcos normativos con sanción directa referencian el tipo de daño. 0 = ninguno; 1 = referencia indirecta; 2 = referencia directa sin sanción automática; 3 = referencia directa con sanción explícita o prohibición.
- **I — Irreversibilidad del daño**: 0 = completamente reversible; 1 = reversible con esfuerzo; 2 = parcialmente irreversible; 3 = irreversible o con efectos sistémicos duraderos.
- **D — Dificultad de detección estructural**: 0 = detectable de forma inmediata y automática; 1 = detectable con instrumentación básica; 2 = requiere instrumentación especializada; 3 = estructuralmente difícil de detectar (el fallo puede estar activo durante períodos prolongados sin señal observable).
- **E — Extensión del impacto**: 0 = impacto individual y acotado; 1 = impacto sobre grupos limitados; 2 = impacto sobre grupos amplios o con efectos secundarios; 3 = sistémico sobre colectivos protegidos o amplificación masiva.

**S_default=9** solo es alcanzable cuando al menos tres de los cuatro criterios puntúan al máximo simultáneamente. Es una restricción intencional.

**Los tres valores de severidad (distinción crítica):**

| Valor | Qué es | Quién lo produce | Cuándo actualiza la zona |
|-------|--------|-----------------|--------------------------|
| `S_default` | Prior calculado por R·I·D·E. Propiedad del modo de fallo en abstracto. No depende del sistema. | Fluxion (catálogo) | Nunca — es inmutable |
| `S_actual` | Severidad evaluada por el responsable del SGAI para el sistema concreto. Incorpora ocurrencia y detectabilidad reales. | Evaluador humano | Inmediatamente al cambiar |
| `S_residual` | Proyección de S_actual una vez implementado el control planificado. | Plan de tratamiento | Solo cuando la evidencia está verificada y aprobada |

**Regla de oro:** La zona nunca cambia por la intención de mitigar. Cambia cuando la evidencia que verifica el control está cargada y validada. `S_residual` no es `S_actual` hasta ese momento.

### 2.3 Las seis dimensiones de riesgo

El catálogo contiene ~353 modos de fallo distribuidos en seis dimensiones:

| Dimensión | Descripción | Notas |
|-----------|-------------|-------|
| **Técnica** | Modos de fallo del comportamiento del modelo: precisión, robustez, deriva, explicabilidad, fallos en IA generativa. | Incluye el único ítem con S_default=9 del catálogo: confabulación de referencias en contextos de decisión. |
| **Seguridad** | Amenazas externas sobre el sistema: adversarial attacks, envenenamiento de datos, exfiltración, inyección de prompts. | En sistemas agénticos: escalada de privilegios, movimiento lateral, inyección en contenido procesado. |
| **Ética** | Sesgos, discriminación, falta de transparencia, manipulación, impacto sobre grupos vulnerables. | Alcanza S=9. Incluye proxy-bias (variables aparentemente neutras que correlacionan con características protegidas). |
| **Gobernanza** | Ausencia de supervisión humana efectiva, cadena de responsabilidad difusa, ausencia de documentación, fallos en el ciclo de vida. | La distinción entre supervisión nominal y efectiva es relevante para Art. 14 AI Act. |
| **ROI** | Riesgo de que el sistema no genere el valor económico proyectado: costes inesperados, obsolescencia, adopción deficiente. | El criterio R es estructuralmente bajo (~0) para casi todos los ítems de esta dimensión. Techo de S_default=6. |
| **Legal Tipo B** | Riesgos legales probabilísticos: litigio civil, disputas de PI, responsabilidad por actos de agentes autónomos. | Techo de S_default=8. Legal Tipo A (binario) NO está en este catálogo — va al módulo de compliance. |

**Sobre GenAI/agéntico:** No es una séptima dimensión. Es una capa transversal que activa modos de fallo específicos dentro de cada dimensión cuando el sistema tiene los atributos correspondientes en el inventario.

### 2.4 Sistema de zonas (dos ejes)

La zona se calcula tomando el resultado más restrictivo de dos ejes independientes.

**Eje 1 — Severidad máxima individual:**

| Zona | Condición |
|------|-----------|
| I — Inaceptable | S_actual = 9 en cualquier dimensión |
| II — Condicionado | S_actual = 8 en cualquier dimensión |
| III — Vigilado | S_actual = 7 en cualquier dimensión |
| IV — Aceptable | S_max ≤ 6 en todas las dimensiones |

**Eje 2 — Perfil agregado:**

| Zona | Condición |
|------|-----------|
| I | ≥ 3 modos de fallo con S_actual ≥ 8 en ≥ 2 dimensiones distintas |
| II | ≥ 5 modos de fallo con S_actual ≥ 7 en ≥ 3 dimensiones distintas |
| III | ≥ 8 modos de fallo con S_actual ≥ 6 en ≥ 2 dimensiones distintas |
| IV | Ningún trigger agregado activado |

**Zona final = MAX(eje1, eje2)** — la más restrictiva.

**Suelo mínimo por clasificación AI Act (anula el resultado FMEA si es más favorable):**

| Clasificación AI Act | Suelo mínimo |
|---------------------|--------------|
| Riesgo inaceptable (Art. 5) | Zona I permanente |
| Alto riesgo (Anexo III/II) | Mínimo Zona II |
| Riesgo limitado (Art. 50) | Mínimo Zona III |
| Riesgo mínimo | Zona IV disponible |

**La zona es una función calculada, no un campo almacenado.** Se recalcula en tiempo real sobre los S_actual vigentes. Cualquier cambio de S_actual (por nueva evaluación o por evidencia verificada) recalcula la zona automáticamente.

**Perfiles de apetito organizacional:**

| Perfil | Zona I | Zona II | Zona III |
|--------|--------|---------|---------|
| Conservador (default) | Sin excepciones | Sin excepciones | Sin excepciones |
| Moderado | Sin excepciones | Sin excepciones | Permite aceptar con justificación reforzada |
| Amplio | Sin excepciones | Sin excepciones | Solo disponible para sistemas de riesgo mínimo AI Act |

Zona I y Zona II son inviolables en todos los perfiles. El perfil solo opera en Zona III.

### 2.5 Tablas del schema `compliance` para el catálogo FMEA (solo lectura)

| Tabla | Descripción |
|-------|-------------|
| `compliance.risk_dimensions` | Las seis dimensiones de riesgo: técnica, seguridad, ética, gobernanza, roi, legal_b. Incluye nombre, descripción y orden de visualización. |
| `compliance.failure_modes` | El catálogo de ~353 modos de fallo. Cada ítem tiene su dimensión, los cuatro valores R/I/D/E, el W calculado y el S_default resultante. Incluye las condiciones de activación (JSONB): qué atributos del sistema IA activan este modo de fallo. Incluye también `rag_chunk_ids` para que el agente recupere contexto directamente. |
| `compliance.failure_mode_causal_relations` | Las ~120 relaciones causales seed del grafo causal (Anexo B del libro). Cada relación tiene tipo, mecanismo explicativo, condición de activación y nivel de confianza. |

### 2.6 Tablas del schema `fluxion` para el módulo FMEA

| Tabla | Descripción |
|-------|-------------|
| `fluxion.fmea_evaluations` | Evaluación FMEA de un sistema en un momento concreto. Cabecera del proceso: estado (draft/in_review/approved), evaluador, aprobador, fecha de aprobación y fecha de próxima revisión. Una evaluación puede tener varias versiones (histórico). |
| `fluxion.fmea_items` | Un ítem por cada modo de fallo activo en la evaluación. Contiene S_default (copiado del catálogo en el momento de activación), S_actual (evaluado por el responsable), S_residual (proyección del plan), ocurrencia (O) y detectabilidad real (D_real) del sistema concreto, y la justificación narrativa del evaluador. |
| `fluxion.treatment_plans` | Plan de tratamiento asociado a una evaluación FMEA. Cabecera con nivel de aprobación requerido, aprobador, fecha de aprobación y plazo máximo de implementación (90 días para Zona II). |
| `fluxion.treatment_actions` | Acciones individuales del plan de tratamiento. Cada acción tiene la opción elegida (mitigar/aceptar/transferir/evitar/diferir), el modo de fallo al que aplica, el S_residual objetivo, el owner y el plazo. Una acción completada con evidencia verificada actualiza el S_actual del ítem correspondiente. |
| `fluxion.reevaluation_triggers` | Registro de los disparadores de reevaluación detectados. Tipo de disparador (regulatorio/incidente/cambio_sistema/periódico), nivel de alcance (N1/N2/N3), estado (detectado/notificado/procesado) y referencia al sistema o evaluación afectada. |
| `fluxion.causal_graph_instances` | Instancia del grafo causal para un sistema concreto. Nodos activos (subset de `failure_modes` activados para ese sistema), con sus propiedades de centralidad calculadas (grado de entrada, grado de salida, betweenness). Permite identificar nodos pivote y atractores de daño para ese sistema específico. |

### 2.7 Lógica de activación de modos de fallo

El mecanismo de filtrado determina qué modos de fallo del catálogo son relevantes para un sistema concreto. Se basa en los atributos del sistema registrados en el inventario (`fluxion.ai_systems`).

**Atributos del inventario que activan modos de fallo:**
- `ai_act_risk_level` — activa modos de fallo por nivel de riesgo
- `output_type` (clasificación, generación, decisión, recomendación...) — activa modos de fallo específicos por tipo de output
- `is_generative` (boolean) — activa el bloque de modos de fallo de IA generativa
- `is_agentic` (boolean) — activa el bloque de modos de fallo de sistemas agénticos (escalada de privilegios, movimiento lateral, inyección de instrucciones, etc.)
- `processes_personal_data` (boolean) — activa modos de fallo de privacidad y proxy-bias
- `affects_protected_groups` (boolean) — activa modos de fallo éticos de mayor severidad
- `uses_third_party_model` (boolean) — activa modos de fallo de dependencia de proveedor y riesgo DORA Art. 28
- `sector` — activa modos de fallo sectoriales del módulo activo

**Nota crítica:** El filtro no modifica S_default. S_default es inmutable. El filtro solo decide si el modo de fallo entra o no entra en la evaluación. La comparabilidad entre sistemas depende de que S_default sea el mismo denominador común para todos.

### 2.8 Ciclo de evaluación completo

```
1. FILTRADO
   Atributos del sistema → Modos de fallo activos
   (Motor FastAPI, lectura de compliance.failure_modes + activation_conditions)

2. PRE-POBLACIÓN
   Para cada modo activo → crear fmea_items con S_default copiado del catálogo
   El evaluador ve la lista pre-poblada con S_default como punto de partida

3. EVALUACIÓN
   El evaluador revisa cada ítem y asigna:
   - O (ocurrencia): probabilidad real en este sistema
   - D_real (detectabilidad real): capacidad de detección con los controles actuales
   - S_actual: ajuste sobre S_default considerando O y D_real
   - Justificación narrativa (requerida si S_actual difiere significativamente de S_default)

4. CÁLCULO DE ZONA
   Zona = MAX(zona_eje1, zona_eje2, suelo_ai_act)
   (función calculada en tiempo real, nunca almacenada como campo editable)

5. APROBACIÓN
   Nivel 1 (Zona IV/III): Responsable del SGAI
   Nivel 2 (Zona II): Responsable del SGAI + Director de Riesgos (CRO)
   Nivel 3 (Zona I): Alta dirección con firma en acta de comité

6. PLAN DE TRATAMIENTO
   Para cada modo de fallo en zona no aceptable → elegir opción:
   - Mitigar: implementar control que reduce S_actual → S_residual objetivo
   - Aceptar: justificación documentada + condiciones de revisión (solo Zona III/IV)
   - Transferir: seguro, contrato con tercero, SLA con proveedor
   - Evitar: rediseño o retirada del sistema
   - Diferir: retraso justificado con plazo máximo definido
   
   Zona II: plan debe aprobarse y comenzar en ≤ 90 días
   Zona I: despliegue bloqueado hasta que la zona cambie

7. EVIDENCIA Y CIERRE
   Evidencia cargada → validada por evaluador → S_residual pasa a S_actual
   La zona se recalcula automáticamente
   Si la zona mejora, el comité de IA registra el cambio en acta

8. REEVALUACIÓN PERIÓDICA
   N1 (ítem): revisión de modos de fallo específicos cuando hay cambio menor
   N2 (sistema): reevaluación completa de un sistema (incidente, cambio significativo, normativa)
   N3 (inventario): reevaluación del inventario completo (revisión anual por la dirección)
   
   Cuatro tipos de disparador:
   - Regulatorio: cambio normativo que afecta a activation_conditions o valores R del catálogo
   - Incidente: evento en producción que activa un modo de fallo o revela uno no previsto
   - Cambio de sistema: actualización del modelo, cambio de proveedor, nuevo caso de uso
   - Periódico: cadencia adaptativa por zona (Zona I: mensual; Zona II: trimestral; Zona III: semestral; Zona IV: anual)
```

### 2.9 Grafo causal

El grafo causal es una funcionalidad avanzada que identifica las relaciones de causalidad entre modos de fallo para priorizar los controles con mayor apalancamiento sistémico.

**Conceptos clave:**
- **Nodo pivote**: modo de fallo que aparece en el mayor número de cadenas causales. Mitigarlo interrumpe múltiples cadenas simultáneamente.
- **Atractor de daño**: nodo con muchos inputs y pocos outputs. Señala dónde converge el daño si no se interviene aguas arriba.
- **Fuente preventiva**: nodo con pocos inputs y muchos outputs. Mitigarlo tiene mayor apalancamiento preventivo.

El grafo se construye sobre las ~120 relaciones causales seed del catálogo (`compliance.failure_mode_causal_relations`) filtradas por los modos de fallo activos para el sistema concreto. Las propiedades de centralidad se calculan y almacenan en `fluxion.causal_graph_instances` para cada evaluación.

---

## PARTE 3 — AGENTE IA DE COMPLIANCE Y RIESGOS

### 3.1 Arquitectura del agente

El agente sigue el patrón orquestador + agentes especializados ya definido en la arquitectura general de Fluxion.

**Agentes especializados relevantes para estos módulos:**
- **Agente AI Act** — RAG sobre `rag.documents` namespace `ai_act`. Clasifica sistemas, interpreta obligaciones, argumenta casos ambiguos de clasificación.
- **Agente ISO 42001** — RAG sobre `rag.documents` namespace `iso_42001`. Asiste en la evaluación de controles y la generación de la SoA.
- **Agente GDPR** — RAG sobre namespace `gdpr`. Evalúa si aplica Art. 22, Art. 35, proxy-bias.
- **Agente DORA** — RAG sobre namespace `dora`. Activo solo con módulo bancario.
- **Agente FMEA** — No usa RAG primariamente. Asiste al evaluador en la justificación de S_actual, sugiere modos de fallo no activados que podrían ser relevantes, y genera el narrativo del informe de evaluación.

### 3.2 Casos de uso del agente en estos módulos

**En el módulo de compliance:**
- Clasificar un sistema IA (tres capas: heurística frontend → FastAPI determinista → agente RAG para casos ambiguos).
- Responder preguntas del tipo "¿por qué este artículo aplica a mi sistema?" con cita directa del texto regulatorio.
- Generar el borrador de la SoA a partir del estado de controles.
- Detectar inconsistencias entre la SoA y el perfil FMEA.

**En el módulo FMEA:**
- Pre-rellenar la justificación narrativa de S_actual sugerida para cada modo de fallo activo.
- Identificar modos de fallo del catálogo no activados que el evaluador debería considerar dado el contexto del sistema.
- Generar el informe ejecutivo de evaluación FMEA para presentar al comité de IA.
- Identificar nodos pivote y atractores de daño en el grafo causal del sistema.

### 3.3 Streaming del agente

El agente transmite sus respuestas al frontend mediante SSE (Server-Sent Events). El flujo es:

```
FastAPI → INSERT en agent_messages → Supabase Realtime → frontend
```

Las tablas `fluxion.agent_sessions` y `fluxion.agent_messages` ya están definidas en el schema de la plataforma.

---

## PARTE 4 — DOCUMENTOS GENERADOS

### 4.1 Tipos de documento

Los documentos que genera la plataforma para estos módulos se clasifican en tres categorías con lógicas de generación distintas:

| Tipo | Descripción | Mecanismo |
|------|-------------|-----------|
| **Auto-generados** | Se producen directamente de los datos del inventario y la evaluación sin decisión organizacional. | Query + template. Sin agente. |
| **Asistidos por agente** | Requieren decisiones organizacionales que el agente ayuda a articular pero no puede tomar solo. | Agente + revisión humana. |
| **Registros vivos** | Documentos que se actualizan continuamente con el estado del sistema. | Vistas calculadas. |

**Auto-generados:**
- Informe de clasificación AI Act (resultado del motor de clasificación).
- Lista de modos de fallo activos para un sistema (output del mecanismo de filtrado).
- Tabla de S_default del catálogo filtrada por sistema.

**Asistidos por agente:**
- Declaración de Aplicabilidad SoA (agente propone estado de cada control, responsable revisa y aprueba).
- Plan de tratamiento (agente sugiere opciones y S_residual objetivo, evaluador decide).
- Informe ejecutivo de evaluación FMEA para comité de IA.
- AISIA (Evaluación de Impacto del Sistema de IA) — se nutre del análisis FMEA.

**Registros vivos:**
- Perfil de riesgo del sistema (zona actual + evolución histórica de S_actual por dimensión).
- Estado de compliance por framework (porcentaje de controles en cada estado).
- Cuadro de mando de compliance del inventario completo.

### 4.2 Tablas de documentos

| Tabla | Descripción |
|-------|-------------|
| `fluxion.generated_documents` | Registro de todos los documentos generados. Tipo, sistema al que aplica, versión, estado (draft/in_review/approved/superseded), fecha de generación, generado_por (user/agent), y referencia a Supabase Storage para el fichero. |
| `fluxion.document_approvals` | Cadena de aprobaciones de un documento. Permite trazabilidad completa para auditoría: quién aprobó qué y cuándo. |

---

## PARTE 5 — NOTIFICACIONES Y ALERTAS

### 5.1 Eventos que generan alertas

| Evento | Urgencia | Destinatario |
|--------|----------|--------------|
| Nuevo modo de fallo con S_actual=9 detectado | Crítica | Responsable SGAI + CRO |
| Sistema pasa a Zona I | Crítica | Alta dirección |
| Plan de tratamiento Zona II sin aprobar a 75 días | Alta | Responsable SGAI |
| Evidencia próxima a caducar (30 días) | Media | Gestor de evidencias |
| Nuevo disparador de reevaluación detectado | Media | Responsable SGAI |
| Actualización de catálogo FMEA disponible | Informativa | Responsable SGAI |
| Revisión periódica vencida | Alta | Responsable SGAI |

### 5.2 Tabla de notificaciones

| Tabla | Descripción |
|-------|-------------|
| `fluxion.notifications` | Ya definida en el schema anterior. Los módulos de compliance y FMEA usan los tipos existentes añadiendo los específicos de estos módulos. |

---

## PARTE 6 — ORDEN DE IMPLEMENTACIÓN RECOMENDADO

### Fase 1 — Infraestructura de datos (sin UI)

1. Crear schema `compliance` con las cuatro tablas del catálogo normativo.
2. Ejecutar seed inicial de `frameworks` (AI Act, ISO 42001, GDPR, DORA).
3. Crear las tablas `compliance.risk_dimensions` y `compliance.failure_modes` con el catálogo completo de ~353 modos de fallo.
4. Crear `compliance.failure_mode_causal_relations` con las 120 relaciones seed.
5. Crear las tablas `fluxion.*` del módulo de compliance (controls, evidences, evidence_controls, gaps, risk_assessments).
6. Crear las tablas `fluxion.*` del módulo FMEA (fmea_evaluations, fmea_items, treatment_plans, treatment_actions, reevaluation_triggers, causal_graph_instances).
7. Crear las tablas de documentos (generated_documents, document_approvals).
8. Aplicar RLS a todas las tablas del schema `fluxion`.
9. Crear schema `rag` con tabla `rag.documents` (dimensión del vector según proveedor de embeddings elegido).

### Fase 2 — Motor de obligaciones y clasificación (FastAPI, sin UI)

1. Endpoint de clasificación AI Act (heurística + reglas deterministas).
2. Motor de obligaciones: activación de controles y gaps al clasificar un sistema.
3. Motor de filtrado FMEA: activación de modos de fallo por atributos del sistema.
4. Función de cálculo de zona (eje1 + eje2 + suelo AI Act).
5. Tests de las fórmulas R·I·D·E y del sistema de zonas.

### Fase 3 — Pipeline RAG (script de administración)

1. Implementar clase base `RegulatoryIngestor` con métodos compartidos (chunk, embed, store).
2. Implementar adaptador para AI Act (EUR-Lex HTML).
3. Implementar adaptador para GDPR (EUR-Lex HTML + guidelines EDPB).
4. Implementar adaptador para DORA (EUR-Lex HTML + RTS EBA).
5. Ejecutar primera ingesta y validar calidad de chunks.
6. ISO 42001: implementar vía de subida de documento por el tenant.

### Fase 4 — UI del módulo de compliance

1. Vista de obligaciones por sistema (lista de controles con estado y owner).
2. Gestión de evidencias (subida, vinculación a controles, fecha de caducidad).
3. Vista de gaps (con ciclo de vida completo: detectado → resuelto/aceptado).
4. Generación de SoA (vista organizacional consolidada + vista por sistema).
5. Cuadro de mando de compliance (KPIs por framework, evolución temporal).

### Fase 5 — UI del módulo FMEA

1. Wizard de evaluación FMEA (lista de modos de fallo activos pre-poblados con S_default).
2. Interfaz de evaluación ítem por ítem (asignación de S_actual con justificación).
3. Vista de zona calculada en tiempo real (muestra cómo cambia la zona al modificar S_actual).
4. Plan de tratamiento (selección de opción por modo de fallo, S_residual objetivo, owner, plazo).
5. Workflow de aprobación (con niveles diferenciados por zona).
6. Visualización del grafo causal (nodos pivote y atractores de daño del sistema).
7. Dashboard FMEA (perfil de riesgo del sistema, evolución histórica de zona).

### Fase 6 — Agente IA

1. Agente AI Act (clasificación + interpretación de obligaciones).
2. Agente FMEA (asistencia en evaluación + generación de informes).
3. Agentes ISO 42001 y GDPR.
4. Integración de streaming SSE en la UI de evaluación y compliance.

### Fase 7 — Documentos y notificaciones

1. Generación auto-asistida de SoA completa.
2. Generación del informe ejecutivo FMEA.
3. Generación de la AISIA desde los datos del FMEA.
4. Sistema de alertas por eventos críticos (Zona I, evidencias por caducar, planes vencidos).
5. Integración con n8n para workflows de notificación y aprobación externa.

---

## PARTE 7 — RESTRICCIONES Y DECISIONES DE DISEÑO CRÍTICAS

### 7.1 Restricciones absolutas (no negociables)

1. **S=9 activa Zona I sin excepción.** No existe perfil de apetito organizacional que lo evite. No existe combinación de baja ocurrencia y alta detectabilidad que lo compense.

2. **La zona no se almacena como campo editable.** Se calcula en tiempo real. Cualquier intento de cachear la zona introduce riesgo de inconsistencia cuando cambia una evidencia o un S_actual.

3. **S_residual ≠ S_actual hasta que la evidencia esté verificada.** El plan de tratamiento puede decir que la mitigación reducirá S de 8 a 5, pero el sistema sigue en Zona II hasta que la evidencia que verifica esa mitigación esté cargada y aprobada.

4. **S_default es inmutable.** Pertenece al catálogo de plataforma. El evaluador ajusta S_actual; nunca modifica S_default. Si un evaluador discrepa con S_default, ajusta S_actual y documenta la razón.

5. **Legal Tipo A no entra en el catálogo FMEA.** Las obligaciones binarias van al módulo de compliance como compliance gates. Incluirlas en el FMEA contamina el perfil de riesgo.

6. **El suelo AI Act no puede perforarse.** Un sistema de alto riesgo AI Act nunca puede estar en Zona IV aunque el FMEA lo produzca. El suelo mínimo es Zona II.

### 7.2 Decisiones de diseño pendientes

| Decisión | Impacto | Urgencia |
|----------|---------|----------|
| Proveedor de embeddings (Voyage AI voyage-law-2 vs OpenAI text-embedding-3-small) | Dimensión del campo `vector(N)` en `rag.documents`. No reversible sin re-embeddar. | Alta — resolver antes de primera ingesta |
| Subdominio Supabase self-hosted en producción | Configuración de entorno, variables de conexión | Media |
| Estrategia de backups en VPS | Operaciones, RTO/RPO | Media |
| Estructura del repositorio (monorepo vs repos separados) | CI/CD, despliegue | Media |

### 7.3 Integraciones externas previstas

| Integración | Módulo | Descripción |
|-------------|--------|-------------|
| n8n workflow: alertas críticas | FMEA | Notificación automática a CRO/dirección cuando S_actual=9 |
| n8n workflow: aprobaciones | Compliance + FMEA | Solicitud de aprobación de plan de tratamiento Zona I/II |
| n8n workflow: informes periódicos | Compliance | Envío automático del informe mensual al comité de IA |
| n8n workflow: sync Jira | FMEA | Creación de tickets de remediación desde acciones del plan de tratamiento |

---

## Glosario de términos metodológicos

| Término | Definición |
|---------|-----------|
| **FMEA** | Failure Mode and Effects Analysis. Metodología de análisis de riesgos probabilísticos adaptada por Fluxion para sistemas IA. |
| **Modo de fallo** | Ítem individual del catálogo FMEA. Forma concreta en que un sistema IA puede producir daño. Nunca llamar "riesgo" a secas. |
| **S_default** | Prior de severidad calculado por R·I·D·E. Rango 2-9. Inmutable. Propiedad del modo de fallo en abstracto. |
| **S_actual** | Severidad evaluada para el sistema concreto. Es el único valor que determina la zona. |
| **S_residual** | Proyección de S_actual tras el control planificado. No es S_actual hasta que la evidencia está verificada. |
| **Zona** | Resultado de clasificar el perfil de riesgo de un sistema. Cuatro valores: I (Inaceptable), II (Condicionado), III (Vigilado), IV (Aceptable). Función calculada, no campo. |
| **Nodo pivote** | Modo de fallo con mayor número de apariciones en cadenas causales. Mayor apalancamiento sistémico. |
| **Atractor de daño** | Nodo con muchos inputs y pocos outputs en el grafo causal. Punto de convergencia del daño. |
| **Fuente preventiva** | Nodo con pocos inputs y muchos outputs. Mayor apalancamiento preventivo. |
| **SoA** | Statement of Applicability. Declaración de Aplicabilidad ISO 42001. Vista calculada sobre el estado de los controles. |
| **AISIA** | Evaluación de Impacto del Sistema de IA. ISO 42001 §6.1.4. Se nutre del FMEA. |
| **Legal Tipo A** | Obligación normativa binaria. Va al módulo de compliance como compliance gate. Nunca al FMEA. |
| **Legal Tipo B** | Riesgo legal probabilístico. Va al catálogo FMEA como modo de fallo evaluable. |
| **Compliance gate** | Control normativo binario del módulo de compliance. Cumple o no cumple. Sin gradación. |
| **Suelo AI Act** | Zona mínima que impone la clasificación AI Act, independientemente del resultado FMEA. |
| **SGAI** | Sistema de Gestión de IA. Marco organizacional ISO 42001. No usar "sistema de gobernanza". |
| **Responsable del SGAI** | Rol que ejecuta la metodología. Puede ser DPO con mandato expandido, CAIO, Director de Riesgos Tecnológicos. No usar "DPO" como sinónimo. |

---

*Documento generado para guiar la implementación de los módulos de Compliance y Gestión de Riesgos de Fluxion. Para dudas sobre la metodología R·I·D·E, consultar `fluxion_texto_consolidado_v1.docx`. Para la arquitectura general de la plataforma, consultar los documentos de capas 0-5.*
