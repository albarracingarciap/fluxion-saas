---
id: FUN-AISIA
titulo: Evaluación de impacto del sistema de IA (AISIA)
tipo: funcional
modulo: evaluacion-de-impacto
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/lib/documents/derive-aisia.ts
  - apps/web/lib/documents/compose.ts
  - apps/web/lib/documents/templates.ts
  - apps/web/app/(app)/inventario/[id]/expediente/[key]/page.tsx
  - apps/web/app/(app)/inventario/[id]/expediente/[key]/actions.ts
  - apps/web/app/(app)/inventario/[id]/aisia/[assessmentId]/page.tsx
  - apps/web/app/(app)/inventario/[id]/page.tsx
  - apps/web/app/(app)/inventario/[id]/system-detail-client.tsx
  - apps/web/lib/aisia/soa-sync.ts
  - apps/web/lib/approvals/effects.ts
  - apps/web/lib/templates/data.ts
  - apps/web/app/(app)/plantillas/soa-iso42001/actions.ts
  - supabase/migrations/20261027120000_expediente_plantilla_aisia.sql
  - supabase/migrations/20261027130000_aisia_al_expediente.sql
  - supabase/migrations/20261027140000_aisia_retirar_tablas.sql
  - apps/web/lib/approvals/catalog.ts
---

# Evaluación de impacto del sistema de IA (AISIA)

La [evaluación de impacto del sistema de IA](../glosario.md#evaluación-de-impacto-del-sistema-de-ia-aisia)
es una plantilla del [Expediente documental](expediente-documental.md) (`aisia`, B15). Tiene el mismo
ciclo, la misma aprobación, el mismo PDF y la misma evidencia que el resto del expediente; este documento
describe solo lo propio de la AISIA.

## Propósito

Documentar las consecuencias del sistema sobre personas, grupos y sociedad, reutilizando la ficha, el
análisis de modos de fallo y el plan de tratamiento. Las AISIA aprobadas alimentan la
[Declaración de Aplicabilidad](declaracion-aplicabilidad.md).

## Acceso y permisos

- **Ruta:** `/inventario/[id]/expediente/aisia`. La ruta antigua del asistente
  (`/inventario/[id]/aisia/[assessmentId]`) redirige aquí.
- **Navegación:**
  - pestaña **ISO 42001** de la [Ficha del sistema](ficha-sistema.md): **Iniciar evaluación AISIA**,
    **Continuar en el expediente →** o **Ver en el expediente →**;
  - pestaña **AISIA** del expediente del sistema.
- **Disponibilidad:** Core (DP-04).
- **Permisos:** los del [Expediente documental](expediente-documental.md#acceso-y-permisos).

**Aprobación.** Política por defecto «Expediente · AISIA (DP-01)»: dictamen (consulta) del DPO y
aprobación del Comité de IA, con el Responsable del SGAI si no hay comité. Quien redactó algún apartado no
puede decidir. Al introducir la plantilla, cada organización recibió una copia, con sus pasos, de sus
políticas activas de la AISIA anterior.

## Campos

| Apartado | Origen | Obligatorio | Contenido |
|---|---|---|---|
| **S1 · Descripción del sistema** · Finalidad, usos y funcionamiento (`AISIA.S1.a`) | Ficha | Sí | Nombre y versión, finalidad prevista, usos prohibidos declarados, descripción técnica, tipos de salida, automatización completa, interacción con personas y usuarios destinatarios |
| S1 · Contexto de despliegue y tecnología (`AISIA.S1.b`) | Redacción | No | — |
| **S2 · Datos** · Datos personales y categorías (`AISIA.S2.a`) | Ficha | Sí | Datos personales, categorías, categorías especiales, volumen, conservación y estado de la DPIA |
| S2 · Fuentes y calidad de los datos (`AISIA.S2.b`) | Redacción | No | — |
| **S3 · Riesgos** · Modos de fallo evaluados (`AISIA.S3.a`) | Evaluación de riesgos vigente | Sí | Versión y estado de la evaluación, zona, modos evaluados sobre el total, modos de la segunda ronda si el plan es parcial y lista de modos con severidad actual 7 o más (código, nombre, severidad actual y por defecto), de mayor a menor |
| S3 · Resumen y riesgos adicionales (`AISIA.S3.b`) | Redacción | No | — |
| **S4 · Tratamiento** · Plan de tratamiento (`AISIA.S4.a`) | Plan de la evaluación vigente | Sí | Código, estado, fecha límite, acciones totales y por opción (sin las canceladas), completadas, riesgos aceptados y notas de riesgo residual |
| S4 · Riesgo residual y seguimiento (`AISIA.S4.b`) | Redacción | No | — |
| **S5 · Impacto en las personas** · Personas y colectivos afectados (`AISIA.S5.a`) | Ficha y redacción | Sí | Si afecta a personas; colectivos vulnerables y menores solo cuando la ficha los marca |
| S5 · Derechos afectados, Gravedad y probabilidad del impacto, Salvaguardas (`S5.b` a `S5.d`) | Redacción | Sí | — |
| **S6 · Impacto social** · Impacto social y riesgo de sesgo (`S6.a`), Conclusión (`S6.d`) | Redacción | Sí | — |
| S6 · Consideraciones ambientales (`S6.b`), Implicaciones sociales amplias y consulta a partes interesadas (`S6.c`) | Redacción | No | — |

Lo derivado se recalcula en cada lectura (`lib/documents/derive-aisia.ts`); si el dato no existe, el
apartado obligatorio queda como hueco y el documento no se puede enviar. La evaluación de referencia es la
vigente o, si no hay ninguna aprobada, la última versión (la misma regla que el Anexo IV).

## Acciones

Las del [Expediente documental](expediente-documental.md#acciones): redactar apartados, enviar a
aprobación, volver a borrador, generar el PDF y abrir una versión nueva desde la aprobada.

**Efectos de la aprobación** (además de los del expediente):
- si la Declaración de Aplicabilidad está en borrador, los controles A.5.2 a A.5.5 pasan a implantados
  cuando todos sus sistemas tienen AISIA aprobada (`syncAisiaSoaControls`); si no lo está, se aplica al
  iniciar su siguiente revisión y la aprobación lo avisa;
- la insignia de AISIA de cada sistema en la Declaración y **Analizar AISIA** leen el documento.

## Migración desde el asistente (B15b)

El asistente de seis secciones se retiró. La migración `20261027130000_aisia_al_expediente.sql` pasó al
expediente la última versión de la AISIA de cada sistema:
- aprobada → documento aprobado, con quién y cuándo; cualquier otro estado → borrador;
- el texto redactado de cada sección → el apartado equivalente, con su autor;
- lo que ahora se deriva no se copia, salvo los textos de S1 editados en el asistente que ya no coinciden
  con la ficha;
- los modos de fallo y el plan elegidos a mano en S3 y S4 no se copian: el documento cita la evaluación
  vigente.

Cada sistema migrado tiene el evento de historial «AISIA trasladada al expediente».

**Retirada de las tablas (B15c).** Validada la migración, `20261027140000_aisia_retirar_tablas.sql` borró
`aisia_assessments`, `aisia_sections` y `aisia_ai_generations`, las políticas de tipo `aisia_assessment` y su
fila en la semilla de políticas por defecto. Antes comprueba que no haya AISIA en un circuito abierto ni
sistemas con una AISIA aprobada en el asistente sin otra aprobada en el expediente. Las solicitudes de
aprobación antiguas se conservan: su título y su sistema se copiaron al contexto (`legacy_label`,
`legacy_ai_system_id`) y enlazan a la AISIA del expediente; su tipo aparece como «Evaluación AISIA
(asistente retirado)».

> **Pendiente de implementar.** Propuesta de contenido por IA para los apartados redactados.

## Validaciones

Las del [Expediente documental](expediente-documental.md#validaciones).

## Estados

Los del [Expediente documental](expediente-documental.md#estados): Borrador, En revisión, Aprobado y
Sustituido.

## Vistas relacionadas

- [Expediente documental](expediente-documental.md).
- [Ficha del sistema](ficha-sistema.md): estado de la AISIA en la pestaña **ISO 42001**.
- [Aprobaciones](aprobaciones.md): decisión.
- [Evaluación FMEA](fmea-evaluacion.md) y [Plan de tratamiento](plan-de-tratamiento.md): base de S3 y S4.
- [Declaración de Aplicabilidad ISO 42001](declaracion-aplicabilidad.md).
- Negocio: [Evaluación de impacto](../negocio/evaluacion-de-impacto.md).
