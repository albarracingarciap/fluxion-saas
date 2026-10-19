---
id: NEG-MODULOS-PLANES
titulo: Módulos y planes
tipo: negocio
modulo: transversal
audiencia: comercial
version: 0.1
fuente:
  - apps/web/lib/modules/registry.ts
  - apps/web/lib/modules/entitlements.ts
  - apps/web/app/(app)/organizacion/tabs/modulos.tsx
  - apps/web/app/(app)/organizacion/tabs/plan.tsx
  - apps/web/app/(app)/organizacion/actions.ts
  - apps/web/app/(app)/layout.tsx
  - supabase/migrations/20260811000306_core_organization_modules.sql
  - supabase/migrations/20260829090000_onboarding_nombre_y_modulos.sql
  - docs/_inventario.md
---

# Módulos y planes

Fluxion se compone de un [Core](../glosario.md#core), incluido siempre, y de
[módulos](../glosario.md#módulo) que cada [organización](../glosario.md#organización) contrata y
activa por separado. Este documento explica qué incluye cada parte, cómo se activa un módulo y en qué
punto están los planes.

## Propósito

Permitir que cada organización empiece con lo esencial para cumplir el AI Act y la ISO/IEC 42001 y
añada capacidades según su madurez y sus necesidades. Por ejemplo, la detección automática de
sistemas o el seguimiento del coste de los modelos.

## Problema que resuelve

Las organizaciones no tienen todas el mismo punto de partida. Unas necesitan primero ordenar su
inventario y su evaluación de riesgos; otras ya operan sistemas en producción y necesitan
vigilarlos. Separar Core y módulos evita pagar por capacidades que aún no se usan y permite probar un
módulo antes de contratarlo.

## Roles

| Rol | Responsabilidad |
|---|---|
| Administrador | Activa un módulo en prueba, lo renueva o lo desactiva desde la ficha de la organización. Cada cambio queda en el registro de auditoría |
| Resto de roles | Usan los módulos activos según sus permisos; no pueden activarlos |

El paso de un módulo de prueba a contratado no se hace desde la aplicación.

> **Pendiente de implementar.** Facturación y contratación de módulos desde la aplicación. Hoy no
> existe ninguna pantalla para pasar un módulo a contratado.

## Flujo de trabajo

### Core

Incluido en todos los planes, sin activación:

| Funcionalidad | Qué hace |
|---|---|
| [Inventario de sistemas de IA](../glosario.md#inventario-de-sistemas-de-ia) | Registro centralizado de los sistemas |
| [Clasificación AI Act](../glosario.md#clasificación-ai-act) | Nivel de riesgo de cada sistema, propuesto por IA y confirmado por una persona |
| [Obligaciones](../glosario.md#obligación) | Requisitos aplicables a cada sistema según su nivel de riesgo y el rol de la organización |
| [Análisis de modos de fallo (FMEA)](../glosario.md#análisis-de-modos-de-fallo-fmea) | Evaluación del riesgo y [zona de riesgo](../glosario.md#zona-de-riesgo) del sistema |
| [Plan de tratamiento](../glosario.md#plan-de-tratamiento) | Decisión sobre cada modo de fallo, con responsables, plazos y controles |
| Análisis de [brechas](../glosario.md#brecha) | Vista consolidada de lo que falta |
| [Biblioteca de evidencias](../glosario.md#biblioteca-de-evidencias) | Pruebas de cumplimiento, versionadas y con caducidad |
| [Declaración de Aplicabilidad ISO 42001](../glosario.md#declaración-de-aplicabilidad-iso-42001) | Aplicabilidad y estado de los 38 controles del Anexo A |
| [Informes del sistema](../glosario.md#informes-del-sistema) | Dossier técnico, ficha para el registro UE e informe de brechas |
| [Incidentes](../glosario.md#incidente) | Registro y plazos de notificación del AI Act, Art. 73 |
| [Flujos de aprobación](../glosario.md#flujos-de-aprobación) | Aprobación de planes, documentos, evaluaciones y la Declaración de Aplicabilidad |
| [Tareas](../glosario.md#tarea) | Lista, tablero, calendario, plantillas y tareas recurrentes |
| [Asistente SGAI](../glosario.md#asistente-sgai) | Asistente conversacional sobre normativa y sistemas |
| [Catálogo de tablas básicas](../glosario.md#catálogo-de-tablas-básicas) | Modos de fallo, controles, obligaciones y tipos de evidencia de referencia |

> **Pendiente de implementar.** Integración de la aprobación del plan de tratamiento en Flujos de
> aprobación. Flujos de aprobación ya es Core y está disponible en todos los planes.

### Módulos contratables

| Módulo | Qué aporta | Disponible |
|---|---|---|
| [Descubrimiento de inventario](../glosario.md#descubrimiento-de-inventario) | Detecta sistemas de IA en el registro de modelos de MLflow ([Conector MLflow](../glosario.md#conector-mlflow)) y en los repositorios de código ([Detección de IA no declarada](../glosario.md#detección-de-ia-no-declarada)), y los propone para el inventario | Sí |
| [Coste y uso de IA (FinOps)](../glosario.md#coste-y-uso-de-ia-finops) | Coste, volumen y latencia de las llamadas a modelos, [tarifas](../glosario.md#tarifa-de-modelo) y [presupuestos](../glosario.md#presupuesto-de-ia) con avisos | Sí |
| [Supervisión post-comercialización](../glosario.md#supervisión-post-comercialización) | Medición de la [supervisión humana](../glosario.md#supervisión-humana): cuándo y por qué las personas aceptan o anulan al sistema | Sí |
| [Documentación del sistema](../glosario.md#documentación-del-sistema) | Redacción, aprobación y exportación a PDF de la documentación técnica del Anexo IV, la FRIA, la DPIA y la ficha del modelo | Sí |
| Actas y paquetes de auditoría | [Actas](../glosario.md#acta) de las decisiones de aprobación | En parte: hay actas, pero no paquetes de auditoría |
| [Evaluación de impacto](../glosario.md#evaluación-de-impacto) | Evaluación de impacto del sistema de IA (AISIA), registro de [riesgos de negocio](../glosario.md#riesgo-de-negocio) y [cuestionario preliminar](../glosario.md#cuestionario-preliminar) | Sí |
| Evaluación de calidad | Calidad de los sistemas basados en recuperación de información | No |
| Deriva y equidad | Desplazamiento de datos, caída de rendimiento y sesgos | No |
| Integración ITSM | Sincronización de incidentes con Jira, ServiceNow y otras herramientas | No |
| Linaje de datos y modelos | Recorrido de los datos hasta el modelo y propagación de obligaciones | No |
| AI Gateway | Control de prompts y respuestas: inyecciones, datos personales, contenido tóxico | No |

Los módulos no disponibles se describen en la [Hoja de ruta](hoja-de-ruta.md).

> **Pendiente de implementar.** La estructura de módulos de esta tabla es la decidida para el
> producto. En la aplicación conviven todavía la organización anterior y sus nombres: Conector MLOps y
> Detección de Shadow AI son dos módulos separados; Telemetría y evaluación; Auditoría de
> discordancias; Documentación regulatoria. Además, AISIA, riesgos de negocio y cuestionario
> preliminar están hoy en el Core.

### Activación de un módulo

1. Al crearse una organización, Fluxion activa automáticamente una prueba de 30 días de los módulos
   disponibles.
2. El administrador puede activar en prueba, renovar o desactivar cualquier módulo disponible desde la
   ficha de la organización, eligiendo una duración de 30, 60, 90 o 120 días.
3. Un módulo está activo mientras esté en prueba o contratado y no haya vencido su fecha.
4. Un módulo activo queda disponible para todos los miembros de la organización.

> **Pendiente de implementar.** Que el acceso a cada módulo dependa de que esté activo. Hoy la
> activación solo muestra u oculta dos entradas del menú (Sistemas detectados y Aprobaciones). Las
> pantallas del resto de módulos aparecen siempre y ninguna comprueba si el módulo está activo.

> **Pendiente de definir.** Si el número de renovaciones de prueba tiene límite. Hoy el administrador
> puede renovarlas sin restricción.

### Planes

Fluxion contempla tres planes: Starter, Pro y Enterprise. Una organización nueva empieza en Starter. El
plan aparece en la ficha de la organización a título informativo; para cambiarlo, la aplicación indica
que hay que contactar con el equipo de Fluxion.

> **Pendiente de definir.** Qué incluye cada plan, su precio y su relación con los módulos. Hoy el
> plan no condiciona ninguna funcionalidad.

## Relación normativa

No aplica: la organización en Core y módulos es una decisión comercial. La relación normativa de cada
funcionalidad se describe en la [Visión general](vision-general.md#relación-normativa) y en el
documento de cada módulo.

## Módulos relacionados

- [Visión general](vision-general.md): recorrido completo del producto.
- [Plataforma](plataforma.md): organización y administración, donde se gestionan los módulos.
- [Hoja de ruta](hoja-de-ruta.md): módulos y funcionalidades previstos.
- Documento técnico: [arquitectura.md](../tecnica/arquitectura.md).
