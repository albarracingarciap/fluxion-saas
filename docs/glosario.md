---
id: GEN-GLOSARIO
titulo: Glosario
tipo: glosario
modulo: transversal
audiencia: comercial, tecnica
version: 0.1
fuente:
  - docs/_inventario.md
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
  - supabase/migrations/20260818170000_incidents_core.sql
  - supabase/migrations/20260911090000_rol_cadena_de_valor.sql
  - apps/web/lib/fmea/domain.ts
  - apps/web/lib/fmea/treatment-plan.ts
  - apps/web/lib/gaps/data.ts
  - apps/web/lib/types/auth.ts
  - apps/web/lib/auth/role-labels.ts
  - apps/web/lib/governance/functions.ts
  - supabase/migrations/20261020090000_roles_multiples.sql
  - supabase/migrations/20261020130000_gobierno_designaciones_comites.sql
  - supabase/migrations/20261019090000_plan_control_libre.sql
  - docs/producto/plan-resolucion-gaps.md
  - docs/producto/cuestionario-preliminar-reglas.md
  - apps/web/lib/modules/registry.ts
  - apps/web/app/(app)/inventario/[id]/fmea/[evaluationId]/evaluar/fmea-evaluation-client.tsx
  - apps/web/app/(app)/inventario/[id]/aisia/[assessmentId]/aisia-wizard-client.tsx
  - supabase/migrations/20261020150100_aprobaciones_politicas_defecto.sql
---

# Glosario

Terminología oficial de Fluxion. Toda la documentación usa estos términos y evita los sinónimos marcados como «No usar».

Cada entrada tiene cinco campos:
- **Definición:** qué significa en Fluxion.
- **No usar:** sinónimos desaconsejados.
- **En el código:** entidad, tabla o valor donde se refleja. Solo para documentos funcionales y técnicos; en los de negocio no se cita.
- **Normativa:** referencia al AI Act (Reglamento (UE) 2024/1689) o a ISO/IEC 42001:2023, cuando la relación es directa.
- **TODO:** solo cuando hay algo que confirmar.

Los artículos del AI Act se citan según su texto oficial en español. Las cláusulas de ISO/IEC 42001 se citan por número.

---

## 1. Sistema de IA e inventario

### Sistema de IA
- **Definición:** sistema basado en máquinas que la organización desarrolla, adquiere o usa y que, a partir de datos de entrada, genera predicciones, contenidos, recomendaciones o decisiones. Es el objeto central de Fluxion: todo lo demás (clasificación, obligaciones, riesgos, evidencias) se refiere a un sistema de IA.
- **No usar:** «modelo» (un sistema puede contener varios modelos), «aplicación IA», «caso de uso», «activo IA».
- **En el código:** `fluxion.ai_systems`.
- **Normativa:** AI Act, Art. 3.1 (definición de sistema de IA).

### Inventario de sistemas de IA
- **Definición:** registro centralizado de todos los sistemas de IA de la organización, con sus datos técnicos, de uso y de gobierno.
- **No usar:** «registro de modelos», «catálogo de IA», «portfolio».
- **En el código:** vista `/inventario`; tabla `fluxion.ai_systems`.
- **Normativa:** ISO/IEC 42001 no exige un inventario con ese nombre, pero es la base del contexto (§4) y de la evaluación de riesgos (§6.1.2).
- > TODO: confirmar si se quiere citar una cláusula concreta de ISO/IEC 42001 para el inventario.

### Código del sistema
- **Definición:** identificador legible que la organización asigna a cada sistema de IA y que aparece en informes y listados.
- **No usar:** «ID interno», «referencia del sistema».
- **En el código:** `ai_systems.internal_id` (único por organización). También existe `ai_systems.code`.
- > TODO: confirmar cuál de los dos campos ve el usuario como «Código del sistema».

### Ficha del sistema
- **Definición:** vista de detalle de un sistema de IA. Reúne sus datos, su clasificación, sus obligaciones, sus modos de fallo, sus evidencias, su plan de tratamiento y su historial.
- **No usar:** «detalle del sistema», «perfil del sistema».
- **En el código:** vista `/inventario/[id]`.

### Historial del sistema
- **Definición:** registro cronológico de los eventos de un sistema de IA: alta, cambios, reclasificaciones, señales recibidas.
- **No usar:** «log», «auditoría del sistema».
- **En el código:** `fluxion.ai_system_history`.

### Descubrimiento de inventario
- **Definición:** módulo que detecta sistemas de IA en fuentes externas y los propone para incorporarlos al inventario. Tiene dos fuentes: Conector MLflow y Detección de IA no declarada.
- **No usar:** «conectores» (como nombre del módulo), «discovery».
- **En el código:** módulos `connector-mlflow` y `shadow-ai`; tabla `fluxion.discovered_assets`.

### Sistema detectado pendiente de alta
- **Definición:** sistema de IA que una fuente de descubrimiento ha encontrado y que todavía no está en el inventario. La organización decide si lo vincula a un sistema existente, lo da de alta o lo ignora.
- **No usar:** «descubrimiento», «activo descubierto», «asset».
- **En el código:** `fluxion.discovered_assets`, con `status` ∈ `pending`, `linked`, `ignored`.

### Conector MLflow
- **Definición:** fuente de Descubrimiento de inventario que lee el registro de modelos de MLflow de la organización y publica en Fluxion los modelos registrados y sus promociones.
- **No usar:** «Conector MLOps».
- **En el código:** `services/connector-mlflow`; tipo de conexión `mlflow` en `fluxion.connector_connections`.

### Detección de IA no declarada
- **Definición:** fuente de Descubrimiento de inventario que analiza los repositorios de código de la organización (GitHub, GitLab) para encontrar usos de IA que no figuran en el inventario: librerías, llamadas a proveedores, ficheros de modelo y credenciales. No guarda código ni valores de secretos.
- **No usar:** «Shadow AI» (salvo entre paréntesis la primera vez), «IA en la sombra».
- **En el código:** `services/connector-shadow-ai`; `fluxion.shadow_ai_findings`.

### Hallazgo de IA no declarada
- **Definición:** cada evidencia concreta de uso de IA encontrada en un repositorio. Tipos: librería, endpoint, credencial o fichero de modelo.
- **No usar:** «finding», «alerta de shadow AI».
- **En el código:** `fluxion.shadow_ai_findings.finding_type` ∈ `library`, `endpoint`, `credential`, `model_file`.

---

## 2. Marco normativo y clasificación

### AI Act
- **Definición:** Reglamento (UE) 2024/1689 de inteligencia artificial. Es el marco principal de la clasificación y de las obligaciones de Fluxion.
- **No usar:** «Ley de IA» a secas, «RIA».
- > TODO: confirmar si se prefiere «Reglamento de IA» como nombre en español en los documentos de negocio.

### ISO/IEC 42001
- **Definición:** norma internacional de sistemas de gestión de la inteligencia artificial. Fluxion la usa para la Declaración de Aplicabilidad, la evaluación de impacto y el enfoque de gestión de riesgos.
- **No usar:** «ISO 42001» sin «IEC» en documentos formales (en la interfaz se admite la forma corta), «la ISO de IA».

### SGAI (Sistema de gestión de la IA)
- **Definición:** conjunto de políticas, procesos y responsabilidades con que la organización gobierna sus sistemas de IA. Fluxion es la herramienta que lo soporta.
- **No usar:** «AIMS» (salvo entre paréntesis), «sistema de gestión IA» sin artículo.
- **En el código:** rol `sgai_manager`; Asistente SGAI.
- **Normativa:** ISO/IEC 42001, §4.4.

### Marco aplicable
- **Definición:** cada marco normativo que la organización ha declarado aplicable: AI Act, ISO/IEC 42001, RGPD, DORA, etc.
- **No usar:** «módulo normativo».
- **En el código:** `organizations.normative_modules` (decisión 31 del inventario).
- > TODO: confirmar la lista cerrada de marcos aplicables y dónde se seleccionan en la interfaz.

### Rol en la cadena de valor
- **Definición:** papel que tiene la organización respecto a un sistema de IA según el AI Act. Determina qué obligaciones le aplican. Un sistema puede tener varios.
- **No usar:** «tipo de operador», «rol AI Act».
- **En el código:** enum `fluxion.value_chain_role`; `ai_systems.value_chain_roles`; `compliance.obligations.applies_to_roles`.
- **Normativa:** AI Act, Art. 3.8 (operador).

| Término | Valor en el código | Normativa |
|---|---|---|
| Proveedor | `provider` | AI Act, Art. 3.3 |
| Responsable del despliegue | `deployer` | AI Act, Art. 3.4 |
| Representante autorizado | `authorised_representative` | AI Act, Art. 3.5 |
| Importador | `importer` | AI Act, Art. 3.6 |
| Distribuidor | `distributor` | AI Act, Art. 3.7 |

No usar: «usuario» para responsable del despliegue (término de borradores anteriores del AI Act), «fabricante» para proveedor.

### Clasificación AI Act
- **Definición:** proceso que determina el nivel de riesgo AI Act de un sistema de IA y, con él, sus obligaciones. Puede hacerla el Asistente de clasificación AI Act, el motor de reglas o una persona, y cada clasificación queda versionada.
- **No usar:** «categorización», «scoring AI Act».
- **En el código:** `fluxion.classification_events` (`method` ∈ `initial`, `rules_engine`, `ai_agent`, `manual_review`); `ai_systems.aiact_risk_level`.
- **Normativa:** AI Act, Art. 5, 6 y 50; Anexo III.

### Reclasificación
- **Definición:** nueva clasificación de un sistema ya clasificado. Si cambia el conjunto de obligaciones, la organización concilia las diferencias (acepta, excluye o conserva cada obligación).
- **No usar:** «recálculo».
- **En el código:** `fluxion.classification_events` con `status` `pending_reconciliation`; `fluxion.classification_diffs`.

### Nivel de riesgo AI Act
- **Definición:** categoría de riesgo de un sistema de IA según el AI Act.
- **No usar:** «nivel de riesgo» a secas (se confunde con la zona de riesgo del FMEA), «riesgo regulatorio».
- **En el código:** enum `fluxion.aiact_risk_level`.

| Término | Valor | Normativa |
|---|---|---|
| Práctica prohibida | `prohibited` | AI Act, Art. 5 |
| Alto riesgo | `high` | AI Act, Art. 6 y Anexo III |
| Riesgo limitado (obligaciones de transparencia) | `limited` | AI Act, Art. 50 |
| Riesgo mínimo | `minimal` | Sin obligaciones específicas |
| Pendiente de clasificar | `pending` | — |

- **Modelo de IA de uso general (GPAI)** no es un nivel de riesgo: es una categoría aparte (ver «Categoría GPAI»). Un sistema basado en un modelo GPAI se clasifica por lo que hace (decisión DP-10 y D3, 2026-10-20).
- > **Pendiente de implementar.** El campo todavía admite el valor `gpai`; deja de usarse con el nuevo cuestionario preliminar (B13), que migra esos sistemas a `is_gpai` y a «Pendiente de clasificar».

### Categoría GPAI
- **Definición:** relación de un sistema u organización con los modelos de IA de uso general, independiente del nivel de riesgo. Valores: **Proveedor de modelo GPAI** (la organización desarrolla un modelo GPAI y lo introduce en el mercado), **con riesgo sistémico** (sí, no o sin determinar) y **Sistema basado en un modelo GPAI de terceros** (usa el modelo de otro, por ejemplo por API; es informativo y no genera obligaciones de proveedor de modelo).
- **No usar:** «nivel GPAI», «riesgo GPAI».
- **En el código:** `ai_systems.is_gpai` (proveedor de modelo GPAI). Los demás indicadores llegan con B13.
- **Normativa:** AI Act, Art. 3.63, 51, 53 y 55.

### Ámbito del AI Act
- **Definición:** si un sistema queda sujeto al AI Act. Valores: **Dentro del ámbito**, **Fuera del ámbito** (con su motivo, por ejemplo uso puramente personal o fines exclusivamente militares) y **No es un sistema de IA** (no cumple la definición del Art. 3.1). Solo los sistemas dentro del ámbito tienen nivel de riesgo.
- **No usar:** «exento», «no aplica» a secas.
- **En el código:** campo de ámbito aparte del nivel de riesgo (decisión DP-10). Se crea con el nuevo cuestionario preliminar (B13).
- **Normativa:** AI Act, Art. 2 y Art. 3.1.

### Obligación
- **Definición:** requisito normativo concreto que aplica a un sistema de IA según su nivel de riesgo AI Act y el rol de la organización en la cadena de valor. Fluxion lo sugiere y la organización lo acepta, lo resuelve o lo excluye.
- **No usar:** «requisito» (reservado para el catálogo `compliance.requirements`, sin uso), «deber».
- **En el código:** catálogo `compliance.obligations` (códigos `AI-ACT-ART…`); por sistema, `fluxion.system_obligations` con `status` ∈ `suggested`, `pending`, `in_progress`, `resolved`, `blocked`, `excluded`.
- **Normativa:** cada obligación referencia su artículo (`compliance.obligations.article`).

---

## 3. Riesgo

### Riesgo
- **Definición:** en Fluxion, posibilidad de que un sistema de IA cause un daño, medida mediante sus modos de fallo. El riesgo de un sistema se expresa con su zona de riesgo.
- **No usar:** «amenaza», «vulnerabilidad» (son tipos de causa, no el riesgo).
- **Normativa:** AI Act, Art. 3.2 y Art. 9 (sistema de gestión de riesgos); ISO/IEC 42001, §6.1.2.

### Modo de fallo
- **Definición:** forma concreta en que un sistema de IA puede fallar y causar daño (por ejemplo, «deriva del modelo» o «inyección de prompts»). Fluxion mantiene un catálogo de modos de fallo y activa en cada sistema los que le aplican.
- **No usar:** «riesgo» (un riesgo se materializa a través de uno o varios modos de fallo), «vector de riesgo», «amenaza».
- **En el código:** catálogo `compliance.failure_modes`; por sistema, `fluxion.system_failure_modes`.

### Dimensión de riesgo
- **Definición:** cada una de las seis áreas en que se agrupan los modos de fallo.
- **No usar:** «categoría de riesgo», «tipo de riesgo».
- **En el código:** `compliance.risk_dimensions`.

| Término | Valor | Descripción del catálogo |
|---|---|---|
| Técnica | `tecnica` | Riesgos técnicos y de rendimiento |
| Seguridad | `seguridad` | Riesgos de seguridad y ciberataques |
| Ética | `etica` | Riesgos éticos y sesgos |
| Gobernanza | `gobernanza` | Riesgos de gobernanza y procesos |
| ROI | `roi` | Riesgos de retorno de inversión |
| Legal tipo B | `legal_b` | Riesgos legales y de propiedad intelectual |

- > TODO: confirmar el nombre de negocio de «Legal tipo B», que no se explica en el código, y el de «ROI».

### Origen normativo del modo de fallo
- **Definición:** marco del que procede un modo de fallo: AI Act, ISO/IEC 42001, ISO/IEC 27001, RGPD, otra norma, buena práctica o negocio.
- **No usar:** «fuente».
- **En el código:** `compliance.failure_modes.origin`; `compliance.failure_mode_norm_refs`.

### Familia causal
- **Definición:** cadena típica de causas y efectos que agrupa modos de fallo relacionados. Hay ocho, de la A a la H. Por ejemplo, la A es «Drift y calidad de datos → sesgo → discriminación».
- **No usar:** «cluster», «grupo de riesgos».
- **En el código:** `compliance.causal_families`.

### Relación causal
- **Definición:** vínculo entre dos nodos del grafo causal que indica que uno causa, amplifica, habilita o se correlaciona con otro.
- **No usar:** «dependencia».
- **En el código:** `compliance.causal_relationships`, con `type` ∈ `causes`, `amplifies`, `enables`, `correlates`.

### Grafo causal
- **Definición:** red de nodos y relaciones causales que muestra cómo se encadenan los modos de fallo.
- **No usar:** «mapa de riesgos».
- **En el código:** `compliance.causal_nodes`, `compliance.causal_relationships`; vista `/datos/catalogo-causal`.

### Criterios R.I.D.E.
- **Definición:** cuatro criterios, puntuados de 0 a 3, con los que el catálogo calcula la severidad por defecto de cada modo de fallo:
  - **R:** exposición regulatoria.
  - **I:** irreversibilidad del daño.
  - **D:** dificultad de detección estructural.
  - **E:** extensión del impacto.
- **No usar:** «RIDE» sin puntos en textos formales.
- **En el código:** `compliance.failure_modes.r_value`, `i_value`, `d_value`, `e_value`, `w_calculated`.
- > TODO: confirmar la fórmula de cálculo. `recursos/fluxion_plan_compliance_riesgos.md` define `S_default = round(2 + (W − 1) × 7)` con `W = 1 + (R+I+D+E)/12`, pero la acción de alta de `/datos/modos-de-fallo` tiene un comentario que duda de la fórmula y no la calcula.

### Severidad por defecto (S_default)
- **Definición:** gravedad de un modo de fallo en abstracto, independiente del sistema, en una escala de 2 a 9. La fija el catálogo y no cambia.
- **No usar:** «severidad base», «impacto».
- **En el código:** `compliance.failure_modes.s_default`; `fmea_items.s_default_frozen`.

### Ocurrencia (O)
- **Definición:** probabilidad de que un modo de fallo se produzca en el sistema concreto, en una escala de 1 a 5. Etiquetas: 1-2 «Improbable», 3 «Moderado», 4-5 «Probable».
- **No usar:** «probabilidad» a secas, «frecuencia».
- **En el código:** `fmea_items.o_value`.

### Detectabilidad real (D_real)
- **Definición:** facilidad con que la organización detectaría el modo de fallo en el sistema concreto, según la observabilidad, el testing y los controles que tiene hoy. Escala de 1 a 5, donde un valor alto significa más difícil de detectar. Etiquetas: 1-2 «Detectable», 3 «Moderado», 4-5 «Difícil de detectar».
- **No usar:** «detección», «D» a secas (se confunde con el criterio D de R.I.D.E.).
- **En el código:** `fmea_items.d_real_value`.

### Severidad actual (S_actual)
- **Definición:** gravedad de un modo de fallo en el sistema concreto, evaluada por una persona a partir de la severidad por defecto, la ocurrencia y la detectabilidad real. Escala de 2 a 9. Fluxion sugiere un valor, y apartarse mucho de la severidad por defecto exige justificación.
- **No usar:** «severidad evaluada», «riesgo actual».
- **En el código:** `fmea_items.s_actual`; `calculateSuggestedSActual` en `lib/fmea/domain.ts`.

### Severidad residual (S_residual)
- **Definición:** severidad prevista de un modo de fallo una vez implantado el control planificado. Solo cuenta para la zona de riesgo cuando la evidencia del control está verificada.
- **No usar:** «riesgo residual» (en `ai_systems.residual_risk` designa otra cosa: una valoración global declarada en la ficha).
- **En el código:** `fmea_items.s_residual`; `treatment_actions`.

### Zona de riesgo
- **Definición:** nivel de riesgo de un sistema de IA según su análisis de modos de fallo. Se calcula con dos criterios, la severidad actual más alta y el perfil agregado (cuántos modos superan ciertos umbrales y en cuántas dimensiones), y nunca queda por debajo del suelo AI Act. La zona determina el nivel de aprobación, la frecuencia de revisión y el plazo del plan de tratamiento.
- **No usar:** «nivel de riesgo» (reservado para el AI Act), «semáforo», «score».
- **En el código:** `FmeaZone` en `lib/fmea/domain.ts`; `fmea_evaluations.cached_zone`.

| Término | Valor | Color | Nivel de aprobación | Revisión | Plazo por defecto |
|---|---|---|---|---|---|
| Zona I · Crítico | `zona_i` | rojo | Nivel 3 · Dirección | mensual | 30 días |
| Zona II · Alto | `zona_ii` | naranja | Nivel 2 · Comité | trimestral | 90 días |
| Zona III · Moderado | `zona_iii` | cian | Nivel 1 · Responsable | semestral | 180 días |
| Zona IV · Aceptable | `zona_iv` | verde | Nivel 1 · Responsable | anual | 365 días |

### Suelo AI Act
- **Definición:** zona de riesgo mínima que impone el nivel de riesgo AI Act, sea cual sea el resultado del análisis de modos de fallo:
  - Práctica prohibida → Zona I.
  - Alto riesgo → Zona II.
  - Riesgo limitado → Zona III.
  - Resto → Zona IV.
- **No usar:** «mínimo regulatorio».
- **En el código:** `getAiActZoneFloor` en `lib/fmea/domain.ts`; `treatment_plans.ai_act_floor`.

### Activación de modos de fallo
- **Definición:** selección automática, por reglas o por IA, o manual de los modos de fallo del catálogo que aplican a un sistema de IA según sus características.
- **No usar:** «asignación de riesgos».
- **En el código:** `fluxion.system_failure_modes.activation_source` ∈ `rule`, `ai`, `manual`; `lib/failure-modes/activation-engine.ts`.

### Priorización
- **Definición:** decisión sobre qué modos de fallo activados entran en el análisis de modos de fallo. Solo los priorizados se evalúan.
- **No usar:** «triaje», «filtrado».
- **En el código:** `system_failure_modes.priority_status`, `priority_score` (0-100), `priority_level`.

| Término | Valor |
|---|---|
| Por revisar | `pending_review` |
| Priorizado | `prioritized` |
| En vigilancia | `monitoring` |
| Descartado | `dismissed` |

### Análisis de modos de fallo (FMEA)
- **Definición:** evaluación de los modos de fallo priorizados de un sistema de IA. Para cada uno se fijan la ocurrencia, la detectabilidad real y la severidad actual, y de ahí resulta la zona de riesgo. Se versiona, y una versión aprobada da lugar al plan de tratamiento.
- **No usar:** «AMFE», «evaluación de riesgos» a secas, «FMEA» sin el nombre largo la primera vez.
- **En el código:** `fluxion.fmea_evaluations` (`state` ∈ `draft`, `in_review`, `approved`, `superseded`); `fluxion.fmea_items`.
- **Normativa:** AI Act, Art. 9; ISO/IEC 42001, §6.1.2 y §8.2.

### Segunda revisión
- **Definición:** revisión adicional obligatoria cuando el evaluador reduce la severidad actual de un modo de fallo en 3 puntos o más respecto a la severidad por defecto.
- **No usar:** «doble validación».
- **En el código:** `fmea_items.second_review_status`; `requiresSecondReview` en `lib/fmea/domain.ts`.

### Estimación por familia
- **Definición:** forma de evaluar la ocurrencia y la detectabilidad real de todos los modos de fallo de una familia causal a la vez, con una justificación común de al menos 50 caracteres.
- **No usar:** «evaluación masiva».
- **En el código:** `fluxion.fmea_family_estimates`; `fmea_items.estimate_source` ∈ `family`, `manual`.

### Riesgo de negocio
- **Definición:** riesgo que afecta a la viabilidad o al retorno de un sistema de IA y que no se evalúa en el análisis de modos de fallo, porque no comparte su escala. Se valora con probabilidad e impacto de 1 a 5; su producto es la exposición.
- **No usar:** «riesgo ROI», «riesgo económico».
- **En el código:** `fluxion.business_risk_assessments` (`exposure` = `probability` × `impact`).
- **Normativa:** ISO/IEC 42001, §6.1 (riesgos para los objetivos de la organización).

---

## 4. Tratamiento y aprobación

### Plan de tratamiento
- **Definición:** conjunto de acciones que decide la organización para los modos de fallo de un análisis aprobado. Tiene zona de partida, zona objetivo, plazo y nivel de aprobación.
- **No usar:** «plan de acción», «plan de mitigación».
- **En el código:** `fluxion.treatment_plans` (`status` ∈ `draft`, `in_review`, `approved`, `in_progress`, `closed`, `superseded`).
- **Normativa:** AI Act, Art. 9.2.d; ISO/IEC 42001, §6.1.3 y §8.3.

### Acción de tratamiento
- **Definición:** decisión sobre un modo de fallo dentro del plan de tratamiento, con una opción de tratamiento, un responsable, un plazo y, si procede, un control y su evidencia.
- **No usar:** «medida», «tarea» (la acción puede generar una tarea, pero no es una tarea).
- **En el código:** `fluxion.treatment_actions` (`status` ∈ `pending`, `in_progress`, `evidence_pending`, `completed`, `accepted`, `cancelled`).

### Opción de tratamiento
- **Definición:** tipo de respuesta a un modo de fallo.
- **No usar:** «estrategia», «respuesta».
- **En el código:** enum `fluxion.treatment_option`.

| Término | Valor | Regla |
|---|---|---|
| Mitigar | `mitigar` | Única opción que lleva control asociado |
| Aceptar | `aceptar` | Exige justificación de al menos 100 caracteres; no se permite con severidad 9; revisión periódica |
| Transferir | `transferir` | — |
| Evitar | `evitar` | — |
| Posponer con revisión | `diferir` | Revisión periódica |

### Revisión periódica
- **Definición:** reevaluación programada de las acciones de tratamiento aceptadas o pospuestas, con la frecuencia que marca la zona de riesgo.
- **No usar:** «recordatorio», «seguimiento».
- **En el código:** `fluxion.treatment_action_reviews`; vista `/planes/revisiones-pendientes`.

### Control
- **Definición:** medida concreta que la organización implanta en un sistema de IA para reducir un modo de fallo. Se instancia a partir de una plantilla de control o se crea como **control propio**.
- **No usar:** «salvaguarda», «mitigación».
- **En el código:** `fluxion.controls` (`status` ∈ `planned`, `partial`, `implemented`, `excluded`).
- **Normativa:** ISO/IEC 42001, §6.1.3 y Anexo A.
- > TODO: confirmar el término. La interfaz llama «Medidas» al catálogo de plantillas de control (`/datos/medidas`). Propuesta: «Control» en toda la documentación y «Medida» como sinónimo desaconsejado.

### Control propio
- **Definición:** control que la organización crea sin partir de una plantilla del catálogo, con su título y su descripción. Se usa cuando ninguna plantilla encaja con el modo de fallo que se quiere mitigar.
- **No usar:** «control libre», «control manual».
- **En el código:** `fluxion.controls` con `template_id` nulo y `title`, `description`.

### Plantilla de control
- **Definición:** control genérico del catálogo (CTL-001 a CTL-059) que se puede asociar a modos de fallo y aplicar a un sistema.
- **No usar:** «medida tipo».
- **En el código:** `compliance.control_templates`; `compliance.failure_mode_control_refs`.

### Flujos de aprobación
- **Definición:** circuito por el que pasan los objetos que requieren aprobación antes de darse por buenos: planes de tratamiento, evaluaciones de impacto, documentos, la Declaración de Aplicabilidad, evidencias y [disposiciones de brechas](#disposición-de-la-brecha) que gobierne una política. Cada objeto abre una solicitud al enviarse a aprobación y se decide en la bandeja de Aprobaciones. Una **política** fija los pasos sucesivos y quién interviene en cada uno: un rol, una persona, un comité concreto, un tipo de comité o una función de gobierno; los dos últimos se resuelven al abrir la solicitud y, si el comité no está constituido o la función no está designada, decide un **rol de respaldo**. Un paso puede ser de aprobación o de consulta ([paso de consulta](#paso-de-consulta)), y puede entrar solo en determinados casos ([paso condicional](#paso-condicional)). Admite delegaciones con fecha de fin. Quien solicita no aprueba, salvo que la política lo permita, y el Auditor nunca decide. Cada organización recibe políticas por defecto con el mapa de aprobaciones del modelo de gobierno, y puede tener varias por tipo de objeto con condiciones distintas (nivel del plan, plantilla del expediente, tipo de brecha): se aplica la más específica. Las solicitudes se pueden cancelar y, si la política lo fija, caducan. Está disponible en todos los planes.
- **No usar:** «workflow», «validación».
- **En el código:** `fluxion.approval_policies` (`conditions`, `is_default`, `expires_after_days`), `approval_policy_steps` (`approver_type` ∈ `role`, `profile`, `committee`, `committee_type`, `function`; `fallback_role`; `kind`; `condition`), `approval_requests` (`context`, `expires_at`), `approval_decisions`, `approval_delegations`; enum `approval_object_type`.

### Paso de consulta
- **Definición:** paso de un flujo de aprobación en el que quien interviene emite un **dictamen** en lugar de un voto: favorable o desfavorable, siempre razonado y sin abstención. El dictamen consta en la solicitud y en el acta, pero no decide: la solicitud pasa al paso siguiente, y quien aprueba decide con el dictamen delante. Si al abrir la solicitud no hay nadie a quien consultar, el paso se omite y queda constancia; no tiene rol de respaldo. Por ejemplo, el dictamen del DPO en la evaluación de impacto AISIA, la FRIA y la DPIA.
- **No usar:** «voto consultivo», «informe previo».
- **En el código:** `approval_policy_steps.kind = 'consultation'`; el dictamen es una fila de `approval_decisions` (`approved` = favorable, `rejected` = desfavorable).

### Paso condicional
- **Definición:** paso de un flujo de aprobación que solo entra si el objeto cumple una condición al abrir la solicitud. Por ejemplo, la consulta al CISO solo en los planes de tratamiento con controles de seguridad (alguna acción «Mitigar» sobre un modo de fallo de la dimensión Seguridad). Si no se cumple, el paso no entra y queda constancia en el acta.
- **No usar:** «paso opcional».
- **En el código:** `approval_policy_steps.condition`, evaluada sobre `approval_requests.context` (hoy, `has_security_controls`).

### Nivel de aprobación
- **Definición:** nivel de autoridad que debe aprobar un plan de tratamiento, determinado por la zona de riesgo de partida.
- **No usar:** «nivel de firma».
- **En el código:** enum `fluxion.approval_level`; `getApprovalLevelForZone` en `lib/fmea/treatment-plan.ts`.

| Término | Valor | Zona |
|---|---|---|
| Nivel 1 · Responsable | `level_1` | Zonas III y IV |
| Nivel 2 · Comité | `level_2` | Zona II |
| Nivel 3 · Dirección | `level_3` | Zona I |

- Quién aprueba cada nivel (DP-01): nivel 1, el Responsable del SGAI; nivel 2, el Comité de Riesgos de IA; nivel 3, la Revisión por la Dirección, que puede delegar la aprobación de los planes de Zona I con fecha de fin.
- Se aplica con las políticas por defecto de Flujos de aprobación. Si el comité del nivel no está constituido, decide el rol de respaldo: el Responsable del SGAI en el nivel 2 y un Directivo en el nivel 3.

### Comité
- **Definición:** órgano colegiado de gobierno de la IA de la organización. Tipos: Comité de IA, Comité de Riesgos de IA, Revisión por la Dirección y Comité técnico / validación de modelos (opcional). Sus miembros tienen un papel en el comité: Presidente, Secretario, Miembro o Asesor. Cada comité fija su quórum y su regla de desempate.
- **No usar:** «grupo de trabajo».
- **En el código:** `fluxion.committees` (`type` ∈ `ai_committee`, `risk_committee`, `director_review`, `technical_committee`; `quorum`, `tie_break`); `fluxion.committee_members` (`committee_role`).
- **Normativa:** la Revisión por la Dirección corresponde a ISO/IEC 42001, §9.3.

---

### Comité técnico / validación de modelos
- **Definición:** comité opcional, formado por perfiles técnicos (MLOps, ciencia de datos, responsables de sistema), que revisa la calidad técnica de un sistema antes del Comité de Riesgos de IA.
- **No usar:** «comité de modelos».
- **En el código:** `fluxion.committees.type = 'technical_committee'`.

### Asesor (voz sin voto)
- **Definición:** papel de un miembro de comité que participa con voz pero sin voto: no vota, no cuenta para el quórum y no puede aprobar en Flujos de aprobación. Es el papel del DPO y del auditor externo en los comités.
- **No usar:** «invitado», «observador».
- **En el código:** `fluxion.committee_members.committee_role = 'advisor'`.

### Quórum
- **Definición:** número de miembros con voto de un comité necesarios para decidir. Si no se fija, es la mayoría de los miembros con voto. Cada comité indica también cómo se resuelve un empate: voto del presidente o elevación al órgano superior.
- **No usar:** «mínimo de votos».
- **En el código:** `fluxion.committees.quorum` (nulo = mayoría) y `tie_break` (`chair`, `escalate`).

---

## 5. Cumplimiento, evidencias y documentos

### Evidencia
- **Definición:** documento, registro o enlace que demuestra que se cumple una obligación, que un control está implantado o que se ha tratado un modo de fallo. Puede pertenecer a un sistema o a toda la organización, y tiene fecha de caducidad.
- **No usar:** «prueba», «adjunto», «documento soporte».
- **En el código:** `fluxion.system_evidences`; `fluxion.evidences` (adjuntos de acciones de tratamiento). Ambas se unificarán en la Biblioteca de evidencias (decisión 30).
- **Normativa:** ISO/IEC 42001, §7.5 (información documentada).

### Biblioteca de evidencias
- **Definición:** repositorio único de evidencias de la organización, con versiones, revisión y alertas de caducidad.
- **No usar:** «repositorio documental», «gestor de evidencias».
- **En el código:** vista `/evidencias`.

### Estado de la evidencia
- **Definición:** situación de una evidencia en su ciclo de revisión.
- **En el código:** `system_evidences.status`.

| Término | Valor |
|---|---|
| Borrador | `draft` |
| Pendiente de revisión | `pending_review` |
| Válida | `valid` |
| Rechazada | `rejected` |
| Caducada | `expired` |

### Tipo de evidencia
- **Definición:** clase de evidencia que espera una obligación (por ejemplo, política, informe de pruebas, acta). Cada obligación indica qué tipos de evidencia la cubren y con qué nivel de exigencia.
- **No usar:** «categoría de documento».
- **En el código:** `compliance.evidence_types` (EVT-*); `compliance.obligation_evidence_types.requirement_level`.

### Brecha
- **Definición:** carencia detectada en el cumplimiento o en el tratamiento del riesgo de un sistema de IA. Fluxion las calcula automáticamente.
- **No usar:** «gap», «incumplimiento», «no conformidad» (término de auditoría con otro significado).
- **En el código:** cálculo en `lib/gaps/data.ts`; decisiones en `fluxion.gap_dispositions`.

### Tipo de brecha
- **Definición:** origen de una brecha.
- **No usar:** «capa».
- **En el código:** `GapLayer` en `lib/gaps/data.ts`.

| Término | Valor | Cuándo aparece |
|---|---|---|
| Obligación sin cubrir | `normativo` | Obligación aplicable no resuelta |
| Riesgo sin tratar | `fmea` | Modo de fallo con severidad actual de 7 o más sin mitigación en curso ni cierre |
| Control sin implantar | `control` | Acción de mitigación pendiente de cierre o con evidencia pendiente |
| Evidencia caducada | `caducidad` | Evidencia caducada o con caducidad próxima |

### Disposición de la brecha
- **Definición:** decisión justificada de no cerrar una brecha: se asume o se declara fuera de alcance. La de un «Riesgo sin tratar» o una «Obligación sin cubrir» equivale a aceptar un riesgo o un incumplimiento y pasa por los [flujos de aprobación](#flujos-de-aprobación) (por defecto, la aprueba el Responsable del SGAI): mientras espera, la brecha sigue en la cola; si se rechaza, la disposición se descarta. Las de los otros tipos de brecha no requieren aprobación.
- **No usar:** «exclusión», «waiver».
- **En el código:** `fluxion.gap_dispositions.disposition`. «Brecha asumida» es `accepted` y «Fuera de alcance» es `not_applicable`; la justificación debe tener al menos 10 caracteres. `status` ∈ `active`, `pending` (esperando aprobación); objeto aprobable `gap_disposition`.

### Instantánea
- **Definición:** copia inmutable de un informe o análisis en una fecha, que se conserva para auditoría y para comparar con otras instantáneas.
- **No usar:** «snapshot», «foto».
- **En el código:** `fluxion.system_report_snapshots` (informes del sistema y análisis de brechas); `fluxion.treatment_plan_snapshots` (planes de tratamiento).

### Declaración de Aplicabilidad ISO 42001
- **Definición:** documento que recoge, para cada uno de los 38 controles del Anexo A de ISO/IEC 42001, si aplica a la organización, por qué y en qué estado de implantación está. Pasa por los estados borrador, en revisión y aprobada.
- **No usar:** «SoA» (salvo entre paréntesis), «matriz de controles».
- **En el código:** `fluxion.organization_soa_controls`; `organization_soa_metadata.lifecycle_status` ∈ `draft`, `under_review`, `approved`; catálogo en `lib/templates/iso42001-catalog.ts`.
- **Normativa:** ISO/IEC 42001, §6.1.3.d y Anexo A.

### Evaluación de impacto del sistema de IA (AISIA)
- **Definición:** evaluación de las consecuencias de un sistema de IA sobre personas, grupos y sociedad. Tiene seis secciones:
  - S1: Descripción del sistema.
  - S2: Datos e información.
  - S3: Modos de fallo identificados.
  - S4: Acciones de tratamiento.
  - S5: Impacto en personas.
  - S6: Impacto social.
- **No usar:** «AISIA» sin el nombre largo la primera vez, «evaluación de impacto» a secas (se confunde con la FRIA y la DPIA).
- **En el código:** `fluxion.aisia_assessments` (`status` ∈ `draft`, `submitted`, `approved`, `rejected`); `fluxion.aisia_sections`.
- **Normativa:** ISO/IEC 42001, §6.1.4.

### Evaluación de impacto
- **Definición:** módulo que agrupa la evaluación de impacto del sistema de IA (AISIA), el registro de riesgos de negocio y el cuestionario preliminar.
- **No usar:** «impacto» a secas.

### Cuestionario preliminar
- **Definición:** cuestionario previo al alta de un sistema de IA que recoge la información inicial necesaria para orientar su clasificación y evaluación.
- **No usar:** «encuesta», «pre-alta».
- **En el código:** `fluxion.preliminary_questionnaires` (`status` ∈ `borrador`, `completado`); `lib/preliminary-questionnaire/schema.ts`.
- > TODO: confirmar el propósito exacto; el vínculo con el sistema (`ai_system_id`) existe pero no se usa todavía.

### Documentación del sistema
- **Definición:** módulo que genera los documentos regulatorios de un sistema de IA a partir de plantillas: documentación técnica (Anexo IV), evaluación de impacto en los derechos fundamentales (FRIA), evaluación de impacto relativa a la protección de datos (DPIA) y ficha del modelo (model card). Cada documento se redacta, se aprueba y se exporta a PDF.
- **No usar:** «expediente» como nombre del módulo, «doc-engine».
- **En el código:** `fluxion.document_templates` (`key` ∈ `annex_iv`, `fria`, `dpia`, `model_card`); `fluxion.documents`; `fluxion.document_renders`.

| Término | Clave | Normativa |
|---|---|---|
| Documentación técnica (Anexo IV) | `annex_iv` | AI Act, Art. 11 y Anexo IV |
| Evaluación de impacto en los derechos fundamentales (FRIA) | `fria` | AI Act, Art. 27 |
| Evaluación de impacto relativa a la protección de datos (DPIA) | `dpia` | RGPD, Art. 35 |
| Ficha del modelo (model card) | `model_card` | — |

### Expediente documental
- **Definición:** vista de la ficha del sistema donde se redactan y generan los documentos de Documentación del sistema.
- **No usar:** «expediente técnico» (se confunde con el dossier técnico).
- **En el código:** vista `/inventario/[id]/expediente/[key]`.

### Informes del sistema
- **Definición:** informes que Fluxion compone automáticamente con los datos de un sistema de IA:
  - Dossier técnico.
  - Ficha para el registro UE.
  - Informe de brechas del sistema.

  Se pueden guardar como instantánea y como evidencia.
- **No usar:** «reportes».
- **En el código:** `lib/ai-systems/{technical-dossier,eu-registry,gap-report}.ts`.

### Ficha para el registro UE
- **Definición:** informe con los datos que la organización debe presentar en la base de datos de la UE para sistemas de alto riesgo. La presentación es manual: Fluxion prepara la información.
- **No usar:** «registro UE» a secas (es la base de datos oficial, no el informe).
- **En el código:** vista `/inventario/[id]/eu-registry`.
- **Normativa:** AI Act, Art. 49 y Art. 71.

### Acta
- **Definición:** documento que deja constancia de una decisión de aprobación. Se genera en todo cierre con decisión (aprobada o rechazada), con los pasos de la política, los votos, los dictámenes y los pasos omitidos; las cancelaciones y caducidades no la llevan. Forma parte del módulo Actas y paquetes de auditoría.
- **No usar:** «minuta».
- **En el código:** plantilla `approval_minutes` en `fluxion.document_templates`; `lib/approvals/minutes.ts`.

---

## 6. Operación y seguimiento

### Incidente
- **Definición:** suceso relacionado con un sistema de IA que la organización registra para investigarlo y, si es grave, notificarlo. Tiene referencia propia (INC-AAAA-NNN), categoría, estado y acciones correctoras.
- **No usar:** «evento», «alerta», «issue».
- **En el código:** `fluxion.ai_incidents` (`status` ∈ `open`, `investigating`, `contained`, `closed`).
- **Normativa:** AI Act, Art. 73.

### Incidente grave
- **Definición:** incidente que causa, directa o indirectamente, fallecimiento o daño grave a la salud, una alteración grave de infraestructuras críticas, la infracción de derechos fundamentales o daños graves a la propiedad o al medio ambiente. Obliga a notificar a la autoridad dentro de un plazo.
- **No usar:** «incidente crítico».
- **En el código:** `ai_incidents.is_serious`; `incident_category` ∈ `death`, `health_harm`, `critical_infrastructure`, `fundamental_rights`, `property_environment`, `other`.
- **Normativa:** AI Act, Art. 3.49 y Art. 73.

### Plazo de notificación
- **Definición:** plazo máximo para notificar un incidente grave a la autoridad, contado desde que la organización tuvo conocimiento de él:
  - 2 días: infraestructura crítica o infracción generalizada.
  - 10 días: fallecimiento.
  - 15 días: resto de casos.
- **No usar:** «SLA», «deadline».
- **En el código:** `incident_notification_days`; `ai_incidents.became_aware_at`, `notification_deadline`.
- **Normativa:** AI Act, Art. 73.2, 73.3 y 73.4.

### Señal de riesgo
- **Definición:** observación que un módulo o una integración envía a Fluxion sobre un sistema de IA (por ejemplo, un modelo promocionado o un presupuesto superado). Según su gravedad, queda en el historial, genera un aviso o crea una tarea.
- **No usar:** «señal» a secas, «evento», «alerta».
- **En el código:** `fluxion.signals`.

| Gravedad | Valor | Efecto |
|---|---|---|
| Informativa | `info` | Historial |
| Baja | `low` | Historial |
| Media | `medium` | Historial |
| Alta | `high` | Historial y aviso en la app |
| Crítica | `critical` | Historial, aviso en la app y tarea |

- > TODO: confirmar los nombres de negocio de las gravedades; en la interfaz no aparecen traducidos.

### Supervisión humana
- **Definición:** medición de cómo las personas usan las recomendaciones de un sistema de IA: si las aceptan, las modifican, las anulan o no las usan, y por qué. Una subida de las anulaciones (discordancia) indica posible deterioro o sesgo.
- **No usar:** «HITL», «auditoría de discordancias», «human in the loop».
- **En el código:** `fluxion.hitl_decisions` (`decision` ∈ `accepted`, `modified`, `overridden`, `not_used`); `fluxion.hitl_reason_codes`; vista `/supervision`.
- **Normativa:** AI Act, Art. 14.

### Responsable de supervisión humana
- **Definición:** miembro designado en cada sistema de IA como la persona competente que puede intervenir en su funcionamiento o detenerlo. Puede tener un suplente. Es obligatorio en los sistemas de alto riesgo para enviar su evaluación de riesgos.
- **No usar:** «supervisor del sistema», «operador humano».
- **En el código:** `ai_systems.human_oversight_owner_id` y `human_oversight_backup_id` (`profiles.id`).
- **Normativa:** AI Act, Art. 14 y Art. 26.2.

### Supervisión post-comercialización
- **Definición:** módulo que agrupa la vigilancia de los sistemas de IA en producción. Hoy contiene la Supervisión humana y, en el futuro, la deriva y la equidad.
- **No usar:** «monitorización».
- **Normativa:** AI Act, Art. 72.
- > TODO: confirmar el nombre. El texto oficial en español del AI Act (Art. 72) usa «vigilancia poscomercialización». Se recomienda adoptarlo para no chocar con «supervisión humana» (Art. 14).

### Coste y uso de IA (FinOps)
- **Definición:** módulo que mide el coste, el volumen y la latencia de las llamadas a modelos de IA de la organización a partir de sus trazas, sin guardar el contenido de prompts ni respuestas.
- **No usar:** «Observabilidad», «Telemetría» (nombres técnicos del servicio).
- **En el código:** módulo `telemetry`; `telemetry.llm_spans`, `telemetry.rollup_daily`; vista `/observabilidad`.

### Tarifa de modelo
- **Definición:** precio por token de un modelo de IA, con fecha de vigencia, que se usa para calcular el coste. Puede ser del catálogo de Fluxion o propia de la organización.
- **No usar:** «precio».
- **En el código:** `telemetry.model_prices`.

### Presupuesto de IA
- **Definición:** límite de gasto mensual en IA para la organización o para un sistema, con umbrales de aviso.
- **No usar:** «cuota», «límite de gasto».
- **En el código:** `telemetry.cost_budgets`, `telemetry.cost_budget_alerts`.

### Tarea
- **Definición:** trabajo asignado a una persona, con estado, prioridad y fecha. Puede crearse a mano o surgir de una acción de tratamiento, una brecha, una evaluación, una señal de riesgo crítica o un incidente.
- **No usar:** «ticket», «to-do».
- **En el código:** `fluxion.tasks` (`status` ∈ `todo`, `in_progress`, `blocked`, `in_review`, `done`, `cancelled`; `source_type`).

### Aviso en la app
- **Definición:** notificación que una persona recibe dentro de Fluxion (campana de la barra superior).
- **No usar:** «notificación push», «alerta».
- **En el código:** `fluxion.notifications`.

### Aviso a Slack/Teams
- **Definición:** mensaje que Fluxion envía a un canal de Slack o Microsoft Teams de la organización cuando ocurre un evento configurado (por ejemplo, el plazo de un incidente).
- **No usar:** «canal de aviso» como nombre de la funcionalidad, «notificación».
- **En el código:** `fluxion.notification_channels`, `fluxion.channel_deliveries`; `lib/channels/send.ts`.

### Integración saliente (webhook)
- **Definición:** envío automático y firmado de eventos de Fluxion (por ejemplo, una aprobación o una tarea completada) a un sistema externo de la organización.
- **No usar:** «outbox», «callback».
- **En el código:** `fluxion.webhooks`, `fluxion.outbox_events`, `fluxion.outbox_deliveries`; `lib/outbox/*`.

### Clave API
- **Definición:** credencial (prefijo `flx_`) con la que un módulo o un sistema externo envía datos a Fluxion. Tiene permisos acotados (scopes) y puede revocarse.
- **No usar:** «token», «API key».
- **En el código:** `fluxion.api_keys`; `lib/auth/scopes.ts`.

---

## 7. Organización, acceso y producto

### Organización
- **Definición:** cliente de Fluxion. Todos sus datos están aislados de los de otras organizaciones.
- **No usar:** «tenant», «empresa», «cuenta».
- **En el código:** `fluxion.organizations`; `organization_id` en todas las tablas de datos de cliente.

### Miembro
- **Definición:** persona que pertenece a una organización con uno o varios roles.
- **No usar:** «usuario» cuando se habla de la pertenencia a la organización (usuario es la cuenta de acceso), «empleado».
- **En el código:** `fluxion.profiles`.

### Rol
- **Definición:** perfil de permisos de un miembro dentro de su organización. Un miembro puede tener varios roles, y sus permisos son la suma de todos. Puede haber varios Administradores, y la organización conserva siempre al menos uno. DPO y Responsable del SGAI no pueden recaer en la misma persona (RGPD, Art. 38.6).
- **No usar:** «perfil», «permiso».
- **En el código:** enum `fluxion.org_role`; `profiles.roles` (todos los roles) y `profiles.role` (el principal, el primero de la lista).

| Término | Valor |
|---|---|
| Administrador | `org_admin` |
| Responsable del SGAI | `sgai_manager` |
| CAIO | `caio` |
| DPO | `dpo` |
| Responsable del sistema | `system_owner` |
| Analista de riesgos | `risk_analyst` |
| Analista de cumplimiento | `compliance_analyst` |
| Directivo | `executive` |
| Auditor | `auditor` |
| Lector | `viewer` |

- El Auditor nunca decide en los flujos de aprobación, ni por delegación: audita lo aprobado (DP-01).

### Función de gobierno
- **Definición:** función del modelo de gobierno de la IA que interviene en el circuito de aprobación sin ser un rol de permisos. La persona designada conserva su rol y además ocupa la función. Hay una persona por función.

| Término | Valor | Papel |
|---|---|---|
| Seguridad de la información (CISO) | `ciso` | Valida los controles de seguridad del plan de tratamiento |
| Legal | `legal` | Revisa la clasificación AI Act y las excepciones del Art. 6.3 |
| Riesgos corporativos | `corporate_risk` | Forma parte del Comité de Riesgos de IA |
| Responsable del tratamiento | `data_controller` | Prepara y aprueba la DPIA, con el dictamen del DPO. No puede ser el DPO |
| Función de calidad | `quality` | Aprueba la documentación técnica (Anexo IV) si la organización es proveedora |

- **No usar:** «rol» para estas funciones, «cargo».
- **En el código:** `fluxion.governance_designations` (enum `governance_function`).

### Core
- **Definición:** funcionalidades incluidas siempre, en todos los planes y sin contratar nada aparte.
- **No usar:** «básico», «estándar».
- **En el código:** todo lo que no figura en `lib/modules/registry.ts`.

### Módulo
- **Definición:** capacidad que se contrata aparte y se activa por organización (por ejemplo, Coste y uso de IA). Puede estar activo, desactivado o en prueba.
- **No usar:** «add-on», «extensión», «plugin».
- **En el código:** `lib/modules/registry.ts`; `fluxion.organization_modules` (`status` ∈ `enabled`, `disabled`, `trial`).

### Plan
- **Definición:** modalidad de contratación de Fluxion.
- **No usar:** «licencia», «suscripción».
- **En el código:** `organizations.plan` (`starter` por defecto).
- > **Pendiente de definir.** Contenido y precio de cada plan.

### Catálogo de tablas básicas
- **Definición:** conjunto de datos de referencia con que trabaja Fluxion: modos de fallo, controles, tipos de evidencia, obligaciones, sus relaciones y el grafo causal. Lo mantiene el administrador de cada organización. Las organizaciones parten de una copia del catálogo estándar de Fluxion y reciben como oferta sus actualizaciones.
- **No usar:** «Base de datos», «datos maestros», «Catálogo metodológico» (nombre anterior).
- **En el código:** esquema `compliance`; vistas `/datos/*`.
- > **Pendiente de implementar.** Hoy el catálogo es único y lo comparten todas las organizaciones (`_inventario.md` §14.1).
- > TODO: confirmar el nombre definitivo. El inventario usa «Catálogo metodológico» (§9, decisión 20) y «Catálogo de tablas básicas» (§13.2, §14.1).

### Catálogo estándar de Fluxion
- **Definición:** versión de referencia del catálogo de tablas básicas que mantiene el equipo de Fluxion y de la que parte cada organización nueva.
- **No usar:** «semilla», «plantilla base».
- **En el código:** `supabase/migrations/00000000000005_seed_compliance.sql` y migraciones posteriores que lo amplían.

### Asistente SGAI
- **Definición:** asistente conversacional de Fluxion que responde preguntas sobre el SGAI y los sistemas de la organización, apoyándose en el corpus normativo.
- **No usar:** «Agente 4», «chatbot», «copiloto».
- **En el código:** `services/agents/fluxion_agents/routes/assistant.py`; `components/assistant/*`.

### Asistente de clasificación AI Act
- **Definición:** función de IA que propone el nivel de riesgo AI Act de un sistema y su justificación, que una persona confirma.
- **No usar:** «Agente 1», «clasificador».
- **En el código:** `services/agents/fluxion_agents/routes/classification.py`; `api/agent/classify-system`.

### Generador de documentos
- **Definición:** función de IA prevista para redactar automáticamente los documentos regulatorios.
- **No usar:** «Agente 3».
- > **Pendiente de implementar.** Hoy los documentos los redacta una persona sobre las plantillas (`_inventario.md` §12, punto 60).

### Corpus normativo
- **Definición:** conjunto de textos normativos y guías (AI Act, MDR, IVDR, DORA, ISO/IEC 42001, RGPD, ENS, guías de la AESIA) en que se apoyan los asistentes de IA para fundamentar sus respuestas.
- **No usar:** «RAG» (es la técnica, no el contenido), «base de conocimiento».
- **En el código:** esquema `rag`; `recursos/baseline/rag_corpus.manifest.json`.
