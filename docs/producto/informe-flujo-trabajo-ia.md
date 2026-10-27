---
id: PRD-INFORME-FLUJO
titulo: Informe de cumplimiento del flujo de trabajo de sistemas de IA
tipo: especificacion
modulo: transversal
audiencia: producto, cumplimiento
version: 0.1
fuente:
  - Notas flujo de trabajo sistema de IA.pdf (revisión del equipo, 2026-10-26)
  - docs/producto/plan-resolucion-gaps.md
  - docs/producto/registro-de-cambios.md
  - supabase/migrations/00000000000005_seed_compliance.sql
  - supabase/migrations/20260911090000_rol_cadena_de_valor.sql
---

# Informe de cumplimiento del flujo de trabajo de sistemas de IA

Contraste de las notas del equipo sobre el flujo de trabajo de un sistema de IA (fases 1 a 4 del Reglamento de IA)
con Fluxion a 27 de octubre de 2026, después de los bloques B13 a B16 del
[plan de resolución de gaps](plan-resolucion-gaps.md). Sin cambios de código.

Leyenda: **Cumplido** · **Parcial** · **No cubierto** · **Planificado** (ya previsto en el plan).

## Resumen

- **Fase 1, identificación y clasificación:** cubierta.
- **Fase 2, antes de desplegar un sistema de alto riesgo:** lo principal está (análisis de riesgos, documentación,
  FRIA, documentación del proveedor). Faltan las obligaciones concretas del responsable del despliegue.
- **Fase 3, operación continuada:** es lo más débil.
- **Causa común:** el catálogo trata el Art. 26 como **una sola obligación genérica**. Desglosarlo por apartados
  es la palanca principal del plan.

## 1. Grado de cumplimiento

### Fase 1 · Identificación y clasificación

| Requisito | Estado | Dónde está hoy | Qué falta |
|---|---|---|---|
| 1.1 ¿Es un sistema de IA? (Art. 3.1) | Cumplido | Cuestionario preliminar y supuestos AI Act; el motor marca «No es un sistema de IA» (B13) | — |
| 1.2 Práctica prohibida (Art. 5) | Parcial | Supuestos del Art. 5 con excepciones; nivel «Práctica prohibida» | Consecuencia: no se bloquea el uso ni se crea la tarea de cese |
| 1.3 Nivel de riesgo (Anexos I y III, Art. 6.3, Art. 50) | Cumplido | Motor único de clasificación (B13) | Registrar que el responsable del despliegue discrepa de la clasificación del proveedor |
| 1.4 Rol en la cadena de valor y Art. 25 | Cumplido | Cuestionario, alta y ficha del sistema | — |

### Fase 2 · Antes de desplegar un sistema de alto riesgo

| Requisito | Estado | Dónde está hoy | Qué falta |
|---|---|---|---|
| «Plan de despliegue» como conjunto de pasos | Parcial · Planificado (B18) | B18 prevé una lista de lo exigible por etapa, nivel y rol | Lista específica previa al despliegue y aviso al pasar a producción sin completarla |
| 2.1 Documentación y conformidad del proveedor: marcado CE, declaración UE de conformidad, instrucciones de uso, registro | Parcial | «Documentación del proveedor» (B16a); si somos proveedores, Anexo IV y ficha para el registro UE (B16b) | Tipo «marcado CE», estado «verificado» por documento y aviso si falta alguno |
| Análisis de riesgos procedimentado, con evaluación y plan, según las instrucciones y el caso de uso | Cumplido / Parcial | FMEA con versiones, plan de tratamiento y aprobación (B07, B11, B14) | Usar las instrucciones del proveedor como entrada del análisis; el Art. 9 del catálogo solo se asigna al proveedor |
| Declaración de Aplicabilidad del Anexo A | Cumplido (ISO/IEC 42001) | Declaración de Aplicabilidad ISO/IEC 42001 | Las notas citan la ISO 27001; se decide trabajar con la 42001 (decisión 1) |
| 2.3 Supervisión humana con competencia, formación y autoridad (Art. 26.2) | Parcial | Responsable y suplente obligatorios en alto riesgo (B23b); panel de supervisión humana | Documentar competencia, formación, autoridad y medidas de vigilancia; conectar con la alfabetización del Art. 4 |
| 2.4 FRIA (Art. 27) | Parcial | Plantilla FRIA; regla del Art. 27 (B16a); sus riesgos salen del FMEA | Trazar los riesgos de derechos fundamentales desde el análisis de riesgos; notificación a la autoridad (Art. 27.3); vínculo con la DPIA |
| 2.5 Registro UE de la autoridad pública; no usar el sistema sin registro del proveedor | Parcial | Sección C de la ficha para el registro UE (B16b); número de registro del proveedor | Aviso si no consta el registro del proveedor |
| 2.6 Informar a trabajadores y representantes (Art. 26.7) | No cubierto | Solo en la obligación genérica del Art. 26 | Saber si somos empleadores y el uso es en el trabajo; constancia de la comunicación |
| 2.7 Informar a las personas afectadas (Art. 26.11) | No cubierto | Obligaciones del Art. 50 y del Art. 86 | Obligación propia para alto riesgo del Anexo III que decide sobre personas |
| 2.8 Idoneidad de los datos de entrada (Art. 26.4) | Parcial | Datos de la ficha y S2 de la AISIA; el Art. 10 es del proveedor | Obligación propia del responsable del despliegue y su evidencia |
| 2.2 Uso conforme a las instrucciones (Art. 26.1) | No cubierto | Obligación genérica del Art. 26 | Obligación propia, enlazada a las instrucciones de uso adjuntas |

### Fase 3 · Operación y vigilancia continuada

| Requisito | Estado | Dónde está hoy | Qué falta |
|---|---|---|---|
| 3.1 Vigilancia continua; avisar al proveedor y a la autoridad y suspender el uso (Art. 26.5) | Parcial | Observabilidad, Supervisión humana y revisión periódica del FMEA (B07); no hay monitor de deriva | Estado «uso suspendido», aviso al proveedor y obligación con evidencia |
| 3.2 Incidentes graves, plazos de 2, 10 y 15 días | Cumplido / Parcial | Incidentes con el reloj del Art. 73 y notificación a la autoridad | Circuito del responsable del despliegue: proveedor primero, luego importador o distribuidor y autoridad; el Art. 73 solo se asigna al proveedor; reevaluación tras un incidente (B21) |
| 3.3 Registros (logs) al menos 6 meses (Art. 26.6) | Parcial | Retención configurable en Ajustes; la supervisión humana usa 180 días | Por sistema: dónde están los registros, quién los controla y cuánto se guardan, con el mínimo validado |
| 3.4 Actualizar la FRIA cuando cambien las circunstancias | Parcial · Planificado (B21) | B21 prevé disparadores de reevaluación, solo para el FMEA | Extenderlos a la FRIA y la AISIA; revisión anual recomendada |
| 3.5 Informe anual por biometría remota en diferido (Art. 26.10) | No cubierto | El supuesto está en el cuestionario | Detectarlo y crear la tarea anual |
| 3.6 Cooperación con las autoridades (Art. 26.12) | No cubierto | El Art. 21 es solo del proveedor | Registro de requerimientos de la autoridad (decisión 4) |
| 3.7 Vigilancia poscomercialización del proveedor (Art. 72) | Parcial | Obligación del Art. 72; módulo Supervisión post-comercialización | Plan de vigilancia poscomercialización como documento del expediente (proveedor y alto riesgo, DP-11) |

### Fase 4 y calendario

| Requisito | Estado | Qué falta |
|---|---|---|
| Medidas correctoras exigidas por la autoridad | No cubierto | Registro de requerimientos de la autoridad (decisión 4) |
| Calendario de aplicación (Anexo III y Anexo I) | No cubierto | Fecha de exigibilidad por obligación; fechas pendientes de revisión jurídica (decisión 3) |

## 2. Relación con lo hecho y lo planificado

- **Resuelto en B13 a B16:** clasificación y cuestionario; FMEA priorizado y plan parcial; AISIA en el expediente;
  aplicabilidad del expediente por rol y nivel (DP-11), documentación del proveedor y ficha para el registro UE; rol
  visible en la ficha y Art. 25 en el alta.
- **Planificado, con ajustes:** B17 (obligaciones con tipos de evidencia: aquí cabe el desglose del Art. 26), B18
  (lista de lo exigible por etapa, nivel y rol: aquí cabe el plan de despliegue) y B21 (disparadores de
  reevaluación: ampliarlos a la FRIA y la AISIA).
- **Nuevo:** competencia y formación de la supervisión humana, registros por sistema, suspensión del uso,
  notificación de incidentes al proveedor, requerimientos de la autoridad, informe anual por biometría, plan de
  vigilancia poscomercialización, calendario de aplicación, notificación de la FRIA y su vínculo con la DPIA.

## 3. Plan propuesto

| Orden | Bloque | Contenido | Talla |
|---|---|---|---|
| 1 | **B17 ampliado** | Desglose del Art. 26 en obligaciones por apartado (26.1, 26.2, 26.4, 26.5, 26.6, 26.7, 26.8, 26.10, 26.11, 26.12), con su condición y su tipo de evidencia; Art. 73 también para el responsable del despliegue; fecha de exigibilidad por obligación; notificación de la FRIA y vínculo con la DPIA | L |
| 2 | **B18 ampliado** | Plan de despliegue para alto riesgo según el rol: documentación del proveedor verificada (incluido el marcado CE), supervisión designada, FRIA si aplica, comunicación a trabajadores y personas afectadas, datos de entrada; **aviso** al pasar a producción sin completarlo; consecuencia de una práctica prohibida | M+M |
| 3 | **B24 · Supervisión humana documentada** (nuevo) | Competencia, formación y autoridad de cada responsable; medidas de vigilancia; evidencias de formación conectadas con la alfabetización del Art. 4 | M |
| 4 | **B25 · Operación del responsable del despliegue** (nuevo) | Uso suspendido con aviso al proveedor; notificación de incidentes al proveedor, al importador o distribuidor y a la autoridad; registros por sistema con retención mínima de 6 meses; requerimientos de la autoridad | L |
| 5 | **B21 ampliado** | Disparadores también para la FRIA y la AISIA; revisión anual; tarea anual por biometría remota en diferido | M |
| 6 | **B26 · Plan de vigilancia poscomercialización** (nuevo) | Plantilla del expediente para proveedor y alto riesgo (Art. 72), con la regla de DP-11 | M |
| 7 | B19, B20 y B22 | Sin cambios | — |

**Estado (2026-10-27).** B17a integrado: el Art. 26 por apartados en el catálogo, el motor y la vista (RN-O08) y la
fecha de exigibilidad en el catálogo, vacía hasta la revisión jurídica. El Art. 73 sigue siendo del proveedor: la
obligación del responsable del despliegue ante un incidente grave (informar al proveedor y después al importador o
distribuidor y a la autoridad) está en el apartado 26.5. B17b integrado: notificación de la FRIA (Art. 27.3) y
presentación de la ficha para el registro UE registradas en el expediente, FRIA v2 con el 27.3 no obligatorio antes de
aprobar, y la FRIA traza los riesgos de derechos fundamentales del análisis y la DPIA. B17c integrado: propuestas de estado de las
obligaciones (Art. 9, 11, 27, 49 y 6.4) a partir de las aprobaciones. Pendientes de B17: B17d (exclusión de brechas
según F-14) y B17e (cobertura por tipos de evidencia y controles de la Declaración, con decisiones pendientes).

## 4. Decisiones

| # | Decisión | Estado |
|---|---|---|
| 1 | Norma de la Declaración de Aplicabilidad | **Decidida (2026-10-27):** de momento, ISO/IEC 42001 |
| 2 | Pasar a producción un sistema de alto riesgo sin completar el plan de despliegue | **Decidida (2026-10-27):** de momento, se avisa (no se bloquea) |
| 3 | Fechas de aplicación de las obligaciones | **Decidida (2026-10-27):** de momento, pendientes de revisión jurídica |
| 4 | Cómo registrar los requerimientos de la autoridad | **Decidida (2026-10-27):** objeto propio «Requerimiento» (en B25) |
| 5 | Cómo controlar la conservación de registros (logs) | **Decidida (2026-10-27):** registro declarativo por sistema (en B25); la integración con las fuentes queda para más adelante |

**Decisión 4 · Requerimientos de la autoridad.** Una autoridad de vigilancia del mercado puede pedir información
sobre un sistema o exigir medidas correctoras con un plazo (Art. 26.12, fase 4). Hay que dejar constancia de qué se
pidió, para cuándo, qué se respondió y con qué evidencias.
- **Objeto propio (recomendado):** «Requerimiento», con autoridad, sistemas afectados, fecha de recepción, plazo,
  estado, respuesta, evidencias y tareas. Claro para auditar y sin mezclarlo con nada.
- **Tipo de incidente:** reutiliza el reloj de plazos de los incidentes, pero un requerimiento no es un incidente
  grave y confundiría sus plazos del Art. 73 y sus recuentos.
- **Tarea con plazo:** lo más barato, pero sin ficha propia ni historial de la respuesta.

**Decisión 5 · Conservación de registros (logs).** El responsable del despliegue debe conservar al menos 6 meses los
registros que el sistema genera automáticamente, cuando están bajo su control (Art. 26.6).
- **Registro declarativo por sistema (recomendado ahora):** en la ficha, dónde se guardan los registros, quién los
  controla (la organización o el proveedor) y durante cuántos meses. Fluxion valida el mínimo de 6 meses, lo pide
  como evidencia y recuerda verificarlo periódicamente.
- **Integración con las fuentes de registros:** Fluxion se conecta a los sistemas (por ejemplo, con el módulo de
  telemetría) y comprueba o guarda los registros. Es más fiable, pero es un proyecto aparte, con coste de
  almacenamiento y una integración por fuente.
