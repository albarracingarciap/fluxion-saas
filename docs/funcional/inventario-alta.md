---
id: FUN-INVENTARIO-ALTA
titulo: Alta de sistema
tipo: funcional
modulo: inventario
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/inventario/nuevo/page.jsx
  - apps/web/app/(app)/inventario/nuevo/actions.ts
  - apps/web/components/inventory/SystemWizard.jsx
  - apps/web/lib/ai-systems/scoring.ts
  - apps/web/lib/ai-act/index.ts
  - apps/web/lib/ai-act/fallback.ts
  - apps/web/lib/ai-act/server.ts
  - apps/web/lib/ai-systems/history.ts
  - services/agents/fluxion_agents/routes/classification.py
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/20261022090000_ai_act_motor_unico.sql
---

# Alta de sistema

Asistente de siete pasos para registrar un [sistema de IA](../glosario.md#sistema-de-ia) en el inventario.
Mientras se rellena, muestra una vista previa de la ficha y una clasificación AI Act preliminar.

## Propósito

Recoger los datos que necesitan la [clasificación AI Act](../glosario.md#clasificación-ai-act), las
[obligaciones](../glosario.md#obligación) y el análisis de riesgos, y dejar el sistema clasificado desde
el primer momento.

## Acceso y permisos

- **Ruta:** `/inventario/nuevo`
- **Navegación:** **+ Registrar sistema** en el [Inventario](inventario.md), o **+ Sistema** / **Crear
  primer sistema** en el [Dashboard](dashboard.md).
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Registrar el sistema |

> **Pendiente de definir.** Qué roles pueden dar de alta sistemas.

## Campos

### Estructura

- **Disposición:** a la izquierda el formulario y a la derecha la **Vista previa en tiempo real**.
- **Pasos:** 1 Identificación · 2 Propósito · 3 Impacto · 4 Datos · 5 Tecnología · 6 Gobierno ·
  7 Controles.
- **Avance:** **Continuar →** solo se habilita si el paso tiene sus campos obligatorios. Se puede volver a
  un paso ya hecho, pero no saltar hacia delante.
- **Etiquetas:** junto a cada campo aparece la norma que lo motiva (AI Act, ISO, RGPD, DORA).

En la columna «Obligatorio»:
- **Sí** significa que el paso no avanza sin el campo.
- **Marcado** significa que el campo lleva asterisco, pero no se exige.

### Paso 1 · Identificación del sistema

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Nombre del sistema** | texto | Sí (más de 2 caracteres) | — | `ai_systems.name` |
| **Versión** | texto | No | Por defecto 1.0.0. Formato `n.n` o `n.n.n` | `version` |
| **Dominio de aplicación** | selector | Sí | Finanzas y Banca, Seguros, Crédito y Scoring, Salud y Medicina, RRHH y Empleo, Educación y Formación, Seguridad Pública, Justicia y Legal, Migración y Fronteras, Infraestructura Crítica, Marketing y Publicidad, Operaciones Internas, Atención al Cliente, Cumplimiento Normativo, Otro | `domain` |
| **Estado actual** | selector | Sí | Producción · Desarrollo · Piloto / Testing · Deprecado · Retirado | `status` |
| **ID interno / código** | texto | No | Único por organización. Por ejemplo, «SYS-042» | `internal_id` ([código del sistema](../glosario.md#código-del-sistema)) |
| **Fecha de despliegue** | fecha | No | La etiqueta cambia según el estado: «primer despliegue» o «prevista» | `deployed_at` |
| **Descripción para directivos** | texto largo | Marcado | — | `description` |
| **Descripción técnica** | texto largo | No | — | `technical_description` |
| **Etiquetas / palabras clave** | etiquetas | No | Se añaden con Intro | `tags` |

### Paso 2 · Propósito y función

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Uso previsto (intended use)** | texto largo | Marcado | AI Act, Art. 11 | `intended_use` |
| **Usos prohibidos / fuera de alcance** | texto largo | No | Si está vacío, aviso: obligatorio en la documentación técnica de alto riesgo | `prohibited_uses` |
| **Tipo de output que produce** | casillas | Sí (al menos uno) | Decisión automática · Recomendación · Clasificación / Scoring · Generación de contenido · Predicción / Estimación · Detección / Alerta · Optimización · Otro | `output_type` |
| **¿Las decisiones o recomendaciones son totalmente automáticas?** | tarjetas | No | Sí, completamente automático · No, siempre hay revisión humana | `fully_automated` |
| **El sistema interactúa directamente con personas en tiempo real** | interruptor | No | — | `interacts_persons` |
| **Usuarios / colectivos objetivo** | casillas | No | 12 opciones: clientes, empleados, ciudadanos, pacientes, estudiantes… | `target_users` |
| **Escala de uso** | selector | No | Desde menos de 100 hasta más de 100.000 decisiones al mes | `usage_scale` |
| **Geografía de despliegue** | casillas | No | España, Portugal, Resto UE, EEUU, LATAM, Global | `geo_scope` |

> TODO: confirmar el **Tipo de output**. Admite varias opciones, pero solo se guarda la primera marcada,
> y la clasificación solo tiene en cuenta esa.

### Paso 3 · Impacto y clasificación AI Act

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **¿Es este un sistema de inteligencia artificial?** | tarjetas | Sí | Sí, es un sistema de IA · Es un modelo GPAI · No, no es IA. «Es un modelo GPAI» marca el sistema como IA y a la organización como proveedora de un modelo GPAI; no fija el nivel de riesgo | `is_ai_system`, `is_gpai` |
| **¿Las salidas del sistema afectan directamente a personas físicas?** | tarjetas | Marcado | Solo si es IA | `affects_persons` |
| **Procesa datos biométricos** | interruptor | No | Anexo III §1 | `uses_biometric_data` |
| **Gestiona infraestructura crítica** | interruptor | No | Anexo III §2 | `manages_critical_infra` |
| **Puede afectar a grupos vulnerables** | interruptor | No | — | `vulnerable_groups` |
| **Puede interactuar con o procesar datos de menores de edad** | interruptor | No | — | `involves_minors` |
| **El sistema podría constituir una práctica prohibida (Art. 5)** | interruptor | No | Si se activa, aviso «Práctica prohibida detectada» | `prohibited_practice` |

### Paso 4 · Datos e inputs

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **¿El sistema trata datos personales?** | tarjetas | Sí | Sí · No, solo datos anonimizados / agregados | `processes_personal_data` |
| **Categorías de datos personales tratados** | casillas | No | Solo si trata datos personales. 13 categorías | `data_categories` |
| **Categorías especiales Art. 9 RGPD** | casillas | No | Ídem. 8 categorías | `special_categories` |
| **Base(s) legal(es) del tratamiento (Art. 6)** | casillas | Marcado | Ídem. Las seis del Art. 6.1 | `legal_bases` |
| **Base legal específica para categorías especiales (Art. 9.2)** | casillas | Marcado | Solo si hay categorías especiales. Siete bases del Art. 9.2 | `legal_bases_art9` |
| **Fuentes de datos de entrada** | casillas | No | 8 opciones | `data_sources` |
| **Volumen de datos** | selector | No | Desde menos de 1 GB hasta más de 10 TB, o Desconocido | `data_volume` |
| **Retención de datos** | selector | No | Desde menos de 6 meses hasta más de 5 años, o Sin política definida | `data_retention` |
| **¿Están documentados los datos de entrenamiento y su calidad?** | tarjetas | No | Sí · Parcialmente · No. AI Act, Art. 10 | `training_data_doc` |
| **¿Se ha realizado una Evaluación de Impacto (DPIA)?** | tarjetas | No | Sí · En proceso · No. Aviso «DPIA obligatoria» si no se ha hecho y hay categorías especiales | `dpia_completed` |
| **El sistema transfiere datos fuera de la UE / EEE** | interruptor | No | — | `intl_data_transfers` |

### Paso 5 · Tecnología y arquitectura

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Tipo de sistema de IA** | tarjetas | Marcado | ML Tradicional · Deep Learning · LLM / Generativo · Sistema Agéntico · Reglas de Negocio · Híbrido · Otro. El agéntico muestra un aviso | `ai_system_type` |
| **Modelo / Algoritmo base** | texto | Marcado | — | `base_model` |
| **Origen del sistema** | tarjetas | No | Desarrollo interno · Proveedor externo · SaaS / API tercero · Open Source | `provider_origin` |
| **Tu papel frente a este sistema** | selección múltiple | Marcado | Proveedor · Responsable del despliegue · Importador · Distribuidor · Representante autorizado. Explica el Art. 25 | `value_chain_roles` ([rol en la cadena de valor](../glosario.md#rol-en-la-cadena-de-valor)) |
| **Modelo fundacional externo**, **Proveedor del modelo** | texto | No | Solo con proveedor externo o SaaS | `external_model`, `external_provider` |
| **Nombre del modelo / repositorio**, **Licencia** | texto | No | Solo con Open Source | `oss_model_name`, `oss_license` |
| **Frameworks y librerías principales** | texto | No | — | `frameworks` |
| **Se aplica fine-tuning o reentrenamiento sobre modelo base** | interruptor | No | — | `has_fine_tuning` |
| **El sistema usa herramientas o APIs externas (capacidad agéntica)** | interruptor | No | — | `has_external_tools` |
| **Entornos activos** | casillas | No | Producción, Preproducción, Staging, Desarrollo, Piloto, DR / Backup | `active_environments` |
| **Integración MLOps** | selector | No | MLflow, Azure ML, SageMaker, Vertex AI, Databricks, Sin integración MLOps, Otro | `mlops_integration` |
| **¿El modelo dispone de mecanismos de explicabilidad?** | tarjetas | No | Sí · Parcialmente · No | `has_explainability` |

### Paso 6 · Gobierno y responsabilidad

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Responsable del sistema IA (AI Owner)** | texto | Marcado | Texto libre, no vinculado a un miembro | `ai_owner` |
| **Equipo responsable** | texto | Marcado | — | `responsible_team` |
| **Responsable técnico** | texto | No | — | `tech_lead` |
| **Sponsor ejecutivo** | texto | No | — | `executive_sponsor` |
| **El DPO ha revisado este sistema** | interruptor | No | Aviso si trata datos personales y no está activado | `dpo_involved` |
| **Existe un SLA o acuerdo de nivel de servicio definido** | interruptor | No | — | `has_sla` |
| **Periodicidad de revisión del sistema** | selector | Marcado | Mensual · Trimestral · Semestral · Anual · Ad-hoc | `review_frequency` |
| **Contacto de incidentes / alertas IA** | texto | No | — | `incident_contact` |
| **Fecha de última revisión** | fecha | No | — | `last_review_date` |
| **Próxima revisión planificada** | fecha | No | — | `next_audit_date` |
| **Proveedores TIC críticos (DORA)** | etiquetas | No | DORA, Art. 28 | `critical_providers` (texto separado por comas) |

### Paso 7 · Controles y documentación

| Campo | Tipo | Obligatorio | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|---|---|
| **Documentación técnica disponible (Art. 11)** | tarjetas | Marcado | Sí, completa · Parcialmente · No existe | `has_tech_doc` |
| **Logging / registro de actividad (Art. 12)** | tarjetas | Marcado | Sí · Parcial · No | `has_logging` |
| **Supervisión humana (Art. 14)** | tarjetas | Marcado | Sí · Parcial · Sin supervisión humana | `has_human_oversight` |
| **Tipo de supervisión humana** | selector | No | Solo con supervisión total o parcial: previa, posterior con reversión, muestral, por umbral, solo auditoría | `oversight_type` |
| **Evaluación de riesgos completada (Art. 9)** | tarjetas | No | Sí · En proceso · Pendiente | `has_risk_assessment` |
| **Nivel de riesgo residual** | selector | No | Solo si hay evaluación: Bajo, Medio, Alto, Muy alto, No determinado | `residual_risk` |
| **Medidas de mitigación principales** | texto largo | No | — | `mitigation_notes` |
| **Se han realizado pruebas de robustez / adversarial testing** | interruptor | No | AI Act, Art. 15 | `has_adversarial_test` |
| **Existe mecanismo de reclamación para personas afectadas** | interruptor | No | — | `has_complaint_mechanism` |
| **Estado de certificación / conformidad** | selector | No | Declaración de conformidad emitida, En proceso de evaluación, Certificación CE obtenida, Pendiente de iniciar, No aplica | `cert_status` |

### Vista previa en tiempo real

| Bloque | Contenido |
|---|---|
| **Ficha del sistema** | Nombre, dominio, estado, versión, output, tipo de IA, si afecta a personas, supervisión, responsable y revisión |
| **Clasificación AI Act · Preliminar** | [Nivel de riesgo](../glosario.md#nivel-de-riesgo-ai-act), base legal, motivo y principales obligaciones. Se calcula en el navegador con el motor único de clasificación (`lib/ai-act`), el mismo que al guardar. Si el sistema no es IA o faltan datos para clasificar, muestra «—» y «Completa al menos dominio, tipo de output y si afecta a personas.». Las obligaciones de la vista previa son orientativas: las que se guardan salen del catálogo de obligaciones |
| **Madurez ISO 42001** | Desde el paso 5. Puntuación de gobierno sobre 10 comprobaciones |
| Cierre (paso 7) | «Listo para registrar», o «Registrar con N gap(s) crítico(s)» si falta documentación técnica, logging, pruebas de robustez, mecanismo de reclamación, DPIA o revisión del DPO |

> TODO: confirmar la **Madurez ISO 42001**. La vista previa la calcula, pero no se guarda: los sistemas
> nuevos quedan sin puntuación en el [Inventario](inventario.md).

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **← Anterior** / **Continuar →** | Todos | Cambia de paso | — |
| **✓ Registrar sistema** (paso 7) | Todos | Server action `saveAISystem` | Ver abajo. Después navega al [Inventario](inventario.md) |

`saveAISystem` hace lo siguiente:
1. Clasifica el sistema en el servidor con el motor único (`classifyWithCatalog`, de `lib/ai-act/server.ts`)
   y calcula las obligaciones sugeridas a partir del catálogo `compliance.obligations` y de los roles en
   la cadena de valor.
2. Crea la fila en `ai_systems` con el nivel de riesgo, su base, su motivo, las etiquetas de las
   obligaciones y el resultado completo del motor (ámbito, avisos, versión de las reglas, categoría GPAI).
   Ver [Clasificación con el motor único](#clasificación-con-el-motor-único).
3. Registra en el [historial del sistema](../glosario.md#historial-del-sistema) los eventos «Sistema
   registrado» y «Clasificación AI Act calculada». Si la clasificación es aproximada, el resumen lo
   indica: «(aproximación sin supuestos AI Act)».
4. Envía el resultado del motor al servicio de agentes (`/api/v1/systems/{id}/classify`), que registra la
   versión 1 de la clasificación y crea las obligaciones en estado «Sugerida» con los códigos del
   catálogo (`AI-ACT-ART9`…). El servicio ya no clasifica por su cuenta. Si falla, el alta no se bloquea.

## Validaciones

| Situación | Comportamiento |
|---|---|
| Faltan campos obligatorios del paso | **Continuar →** se atenúa y no avanza. No hay mensaje |
| Versión con formato incorrecto o **ID interno** repetido | Al guardar se muestra el error técnico de la base de datos junto al botón |
| Usuario sin organización | «No se encontró organización asociada al usuario.» |

> TODO: confirmar el comportamiento de los campos ocultos. Si se cambia una respuesta (por ejemplo, de
> «trata datos personales» a «no»), los datos de los campos que se ocultan se guardan igualmente.

## Estados

El sistema se crea con el estado elegido en el paso 1 y el resultado de la clasificación: un nivel de
riesgo, «Pendiente de clasificar» si faltan datos, o «No es un sistema de IA» si así se ha indicado.

### Clasificación con el motor único

La clasificación la calcula el motor único de clasificación AI Act (`lib/ai-act`), el mismo que usan la
edición, la reclasificación y la [Ficha del sistema](ficha-sistema.md). Las reglas están en la
especificación [Cuestionario preliminar: reglas de clasificación](../producto/cuestionario-preliminar-reglas.md)
y cada resultado guarda la versión de las reglas con la que se calculó (`aiact_rules_version`). El motor
tiene dos vías:

- **Con supuestos AI Act** (`supuestos`): aplica las reglas de la especificación a los supuestos guardados
  en `ai_systems.aiact_inputs` (exclusiones del Art. 2, prácticas del Art. 5, Anexo I, Anexo III,
  Art. 6.3, Art. 50 y GPAI).
- **De respaldo** (`respaldo`): si el sistema no tiene supuestos, aproxima la clasificación con el
  dominio, el tipo de output y los indicadores del paso 3. El resultado lleva el aviso «Clasificación
  aproximada por dominio y tipo de output: faltan los supuestos del AI Act.».

> **Pendiente de implementar.** El asistente todavía no recoge los supuestos AI Act. El
> [cuestionario preliminar](cuestionario-preliminar-formulario.md) ya los recoge desde B13b, pero el bloque
> del alta que los pide y el volcado desde el cuestionario llegan con B13c. Hasta entonces, el alta
> clasifica siempre por la vía de respaldo.

Reglas de la vía de respaldo; se aplica la primera que se cumple:

| # | Condición | Resultado |
|---|---|---|
| 1 | No es un sistema de IA | No es un sistema de IA (sin nivel de riesgo) |
| 2 | Práctica prohibida | Práctica prohibida (Art. 5) |
| 3 | Biometría que afecta a personas | Alto riesgo (Anexo III §1) |
| 4 | Infraestructura crítica (indicador o dominio) | Alto riesgo (§2) |
| 5 | Educación, RRHH o crédito, finanzas y seguros con decisiones, clasificación o predicción que afectan a personas | Alto riesgo (§3, §4, §5) |
| 6 | Salud, seguridad, justicia o migración que afectan a personas | Alto riesgo |
| 7 | Genera contenido | Riesgo limitado (Art. 50.2) |
| 8 | Interactúa con personas | Riesgo limitado (Art. 50.1) |
| 9 | No se sabe si es IA o falta el tipo de output | Pendiente de clasificar |
| 10 | Resto | Riesgo mínimo |

El [modelo de IA de uso general (GPAI)](../glosario.md#categoría-gpai) ya no es un nivel de riesgo: un
sistema marcado como modelo GPAI se clasifica por lo que hace, y la marca solo indica que la organización
es proveedora de un modelo GPAI (`is_gpai`).

## Vistas relacionadas

- [Inventario](inventario.md): destino al guardar.
- [Ficha del sistema](ficha-sistema.md): clasificación, obligaciones y resto del trabajo.
- [Edición de la ficha](ficha-sistema-edicion.md): mismo asistente para modificar.
- [Cuestionario preliminar](cuestionario-preliminar.md): recogida previa de información.
- Negocio: [Inventario de sistemas de IA](../negocio/inventario.md),
  [Clasificación AI Act](../negocio/clasificacion-ai-act.md).
