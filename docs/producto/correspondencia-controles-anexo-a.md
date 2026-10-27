---
id: PRD-CORRESPONDENCIA-ANEXO-A
titulo: Correspondencia entre plantillas de control y controles del Anexo A de la ISO/IEC 42001
tipo: especificacion
modulo: declaracion-aplicabilidad
audiencia: producto, cumplimiento
version: 1.0
fuente:
  - supabase/migrations/00000000000005_seed_compliance.sql
  - apps/web/lib/templates/iso42001-catalog.ts
  - docs/producto/plan-resolucion-gaps.md
  - supabase/migrations/20261027200000_soa_correspondencia_anexo_a.sql
---

# Correspondencia entre plantillas de control y controles del Anexo A

Correspondencia inicial de B17e2 (F-11, GAP-29), aprobada por el responsable el 2026-10-27 y cargada por la migración `20261027200000_soa_correspondencia_anexo_a.sql`. Sirve para que un control
implantado en el plan de tratamiento de un sistema, con evidencia válida, proponga como **implantado** el control
equivalente de la Declaración de Aplicabilidad (ISO/IEC 42001, Anexo A). La propuesta no cambia nada sola: la persona
la acepta en la Declaración.

**Cómo se ha hecho.** Por el contenido de cada plantilla de control (CTL-001 a CTL-059) frente a los 38 controles del
Anexo A de la Declaración. No se han usado las etiquetas «ISO A.x» de las plantillas: muchas siguen otra numeración (por
ejemplo, «ISO A.7.3» en la supervisión humana, cuando A.7.3 es «Adquisición de datos») o citan controles que no
existen en el Anexo A. Las plantillas de seguridad de la información (control de acceso, vulnerabilidades, fuga de
datos, perímetro) son de la ISO/IEC 27001 y no tienen equivalente en la 42001. Tampoco lo tienen las de costes ni las
que corresponden a cláusulas del sistema de gestión (auditoría interna, §9.2; revisión por la dirección, §9.3).

**Confianza:** *alta*, el control de la plantilla es esencialmente el del Anexo A; *media*, lo cubre en parte o
depende de cómo se implante. Una plantilla puede apuntar a varios controles.

| Plantilla | Título | Control del Anexo A | Confianza |
|---|---|---|---|
| CTL-001 | Monitorización continua de rendimiento en producción | A.6.2.6 Operación y monitoreo | Alta |
| CTL-002 | Evaluación diferenciada por subgrupos demográficos | A.6.2.4 Verificación y validación · A.5.4 Impacto en individuos o grupos | Media |
| CTL-003 | Control de calidad y sesgo en datos de entrenamiento | A.7.4 Calidad de los datos | Alta |
| CTL-004 | Detección y alertas de data drift | A.6.2.6 Operación y monitoreo | Alta |
| CTL-005 | Filtrado y validación de outputs del modelo | A.6.2.4 Verificación y validación | Media |
| CTL-006 | Gestión de versiones y trazabilidad de modelos | A.6.2.3 Documentación del diseño y desarrollo · A.6.2.8 Registro de eventos | Media |
| CTL-007 | Pruebas de robustez y casos extremos | A.6.2.4 Verificación y validación | Alta |
| CTL-008 | Explicabilidad y justificación de decisiones | A.8.2 Documentación e información para los usuarios | Media |
| CTL-009 | Gestión de dependencias y servicios externos | A.10.3 Proveedores | Alta |
| CTL-010 | Proceso formal de despliegue y rollback | A.6.2.5 Implementación | Alta |
| CTL-011 | Gestión de latencia y rendimiento bajo carga | A.6.2.6 Operación y monitoreo | Media |
| CTL-012 | Control de contexto y límites en sistemas RAG | A.6.2.2 Requisitos y especificaciones | Media |
| CTL-013 | Evaluación y gobierno de sistemas multi-agente | A.6.1.3 Procesos de diseño y desarrollo responsable | Media |
| CTL-014 | Documentación técnica del modelo (Model Card) | A.6.2.7 Documentación técnica | Alta |
| CTL-015 | Gestión de control de acceso al sistema IA | — (ISO/IEC 27001) | — |
| CTL-016 | Monitorización de seguridad y detección de anomalías | A.6.2.6 Operación y monitoreo | Media |
| CTL-017 | Protección contra envenenamiento de datos | A.7.4 Calidad de los datos | Media |
| CTL-018 | Defensa contra ataques adversariales | A.6.2.4 Verificación y validación | Media |
| CTL-019 | Prevención de fuga de información y datos de entrenamiento | — (ISO/IEC 27001) | — |
| CTL-020 | Gestión de vulnerabilidades y actualizaciones de seguridad | — (ISO/IEC 27001) | — |
| CTL-021 | Plan de respuesta a incidentes de seguridad IA | A.8.4 Comunicación de incidentes | Alta |
| CTL-022 | Seguridad perimetral para sistemas agénticos | — (ISO/IEC 27001) | — |
| CTL-023 | Protección contra prompt injection | A.6.2.4 Verificación y validación | Media |
| CTL-024 | Evaluación de impacto de IA (AISIA) | A.5.2 Proceso de evaluación del impacto · A.5.3 Documentación de las evaluaciones | Alta |
| CTL-025 | Mecanismo de apelación y derecho de impugnación | A.8.5 Información para las partes interesadas | Media |
| CTL-026 | Supervisión humana efectiva en decisiones de alto impacto | A.9.2 Procesos para el uso responsable | Media |
| CTL-027 | Análisis y mitigación de proxy-bias | A.7.4 Calidad de los datos · A.5.4 Impacto en individuos o grupos | Media |
| CTL-028 | Transparencia hacia usuarios — disclosure de IA | A.8.2 Documentación e información para los usuarios | Alta |
| CTL-029 | Gestión de derechos de propiedad intelectual en contenido generado | A.7.5 Procedencia de los datos | Media |
| CTL-030 | Incorporación de partes interesadas en el diseño | A.5.5 Impactos sociales | Media |
| CTL-031 | Política de uso aceptable y límites éticos del sistema | A.9.4 Uso previsto · A.9.3 Objetivos para el uso responsable | Alta |
| CTL-032 | Estructura formal de gobernanza del SGAI | A.3.2 Roles y responsabilidades | Alta |
| CTL-033 | Políticas y estándares de IA actualizados | A.2.2 Política de IA · A.2.4 Revisión de la política | Alta |
| CTL-034 | Proceso de gestión del ciclo de vida del sistema IA | A.6.1.3 Procesos de diseño y desarrollo responsable | Alta |
| CTL-035 | Trazabilidad de decisiones y cadena de responsabilidad | A.6.2.8 Registro de eventos | Alta |
| CTL-036 | Gestión de proveedores y terceros de IA | A.10.3 Proveedores | Alta |
| CTL-037 | Formación y competencia del equipo en gobernanza IA | A.4.6 Recursos humanos | Alta |
| CTL-038 | Comunicación regulatoria y reporte a supervisores | A.8.3 Informe externo · A.8.4 Comunicación de incidentes | Media |
| CTL-039 | Interfaces técnicas de supervisión humana | A.9.2 Procesos para el uso responsable | Media |
| CTL-040 | Business case y proyecciones económicas documentadas | — (costes) | — |
| CTL-041 | Monitorización de costes operativos del sistema IA | — (costes) | — |
| CTL-042 | Plan de adopción y gestión del cambio | — | — |
| CTL-043 | Gestión de obsolescencia y evolución del modelo | A.6.2.6 Operación y monitoreo | Media |
| CTL-044 | Estimación y control de costes de inferencia | — (costes) | — |
| CTL-045 | Due diligence legal pre-despliegue | A.5.2 Proceso de evaluación del impacto | Media |
| CTL-046 | Cláusulas contractuales de responsabilidad IA | A.10.3 Proveedores · A.10.4 Clientes | Media |
| CTL-047 | Evaluación y mitigación de riesgo de litigio por discriminación | A.5.4 Impacto en individuos o grupos | Media |
| CTL-048 | Gestión de jurisdicción y normativa transfronteriza | — | — |
| CTL-049 | Registro de actividades de tratamiento IA (ROPA) | A.4.3 Recursos de datos | Media |
| CTL-050 | Declaración de Aplicabilidad (SoA) ISO 42001 | — (es la propia Declaración) | — |
| CTL-051 | Evaluación de Impacto en Protección de Datos (EIPD/DPIA) | A.5.4 Impacto en individuos o grupos | Media |
| CTL-052 | Auditoría interna periódica del SGAI | — (cláusula 9.2) | — |
| CTL-053 | Revisión por la dirección del SGAI | — (cláusula 9.3) | — |
| CTL-054 | Gestión del incidente de IA — detección y respuesta | A.8.4 Comunicación de incidentes | Alta |
| CTL-055 | Inventario de sistemas IA actualizado | A.4.2 Documentación de recursos | Media |
| CTL-056 | Métricas de rendimiento del modelo y benchmarking | A.6.2.4 Verificación y validación | Alta |
| CTL-057 | Buenas prácticas de desarrollo seguro de IA | A.6.1.3 Procesos de diseño y desarrollo responsable · A.6.1.2 Objetivos para el desarrollo responsable | Alta |
| CTL-058 | Gestión de proyectos IA con controles de riesgo | A.6.1.2 Objetivos para el desarrollo responsable | Media |
| CTL-059 | Responsabilidad por contenido generado y marcado sintético | A.8.2 Documentación e información para los usuarios | Media |

**Resumen.** 47 plantillas con correspondencia (20 de confianza alta) y 12 sin ella. Controles del Anexo A que ninguna
plantilla cubre y que solo se implantan a mano: A.2.3, A.3.3, A.4.4, A.4.5, A.6.2.2 (solo en parte, CTL-012), A.7.2,
A.7.3, A.7.6, A.9.3 (solo en parte, CTL-031) y A.10.2.

A partir de aquí la correspondencia vigente es la de **Datos › Plantilla ↔ Anexo A**, que mantiene la
administración de la plataforma; este documento recoge la carga inicial.
