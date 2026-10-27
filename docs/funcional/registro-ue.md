---
id: FUN-REGISTRO-UE
titulo: Ficha para el registro UE
tipo: funcional
modulo: documentacion-del-sistema
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/lib/documents/derive-eu-registry.ts
  - apps/web/lib/documents/applicability.ts
  - apps/web/lib/documents/compose.ts
  - apps/web/lib/documents/templates.ts
  - apps/web/app/(app)/inventario/[id]/expediente/[key]/page.tsx
  - apps/web/app/(app)/inventario/[id]/eu-registry/page.tsx
  - apps/web/app/(app)/inventario/[id]/eu-registry/snapshots/[snapshotId]/page.tsx
  - apps/web/lib/evidences/data.ts
  - supabase/migrations/20261027150000_expediente_registro_ue.sql
---

# Ficha para el registro UE

La [ficha para el registro UE](../glosario.md#ficha-para-el-registro-ue) es una plantilla del
[Expediente documental](expediente-documental.md) (`eu_registry`, B16b, DP-06): reúne los datos del Anexo VIII
del AI Act que hay que presentar en la base de datos de la UE. Tiene el ciclo, la aprobación, el PDF y la
evidencia del expediente; este documento describe solo lo propio de la ficha. Fluxion no envía nada a la base de
datos de la UE: la presentación es manual.

## Propósito

Preparar el registro del sistema en la base de datos de la UE con los datos que Fluxion ya tiene de la
organización y del sistema, y redactar el resto.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/expediente/eu_registry`. La ruta anterior (`/inventario/[id]/eu-registry`)
  redirige aquí.
- **Navegación:** **Acciones rápidas** de la [Ficha del sistema](ficha-sistema.md), tarjeta **Ficha registro
  UE**; pestaña del expediente del sistema.
- **Disponibilidad:** módulo Documentación del sistema.
- **Permisos:** los del [Expediente documental](expediente-documental.md#acceso-y-permisos).

**Cuándo se redacta** (DP-11, `documentApplicability`):

| Caso | Modo | Sección del Anexo VIII |
|---|---|---|
| La organización es proveedora y el sistema es de alto riesgo | Redactar | A (Art. 49.1) |
| La organización es proveedora y aplica la excepción del Art. 6.3 (`aiact_result.art63 = valid`) | Redactar | B (Art. 49.2) |
| La organización es responsable del despliegue, organismo público o que presta servicios públicos (`aiact_inputs.publicBody`), y el sistema es de alto riesgo del Anexo III con algún punto distinto del 2 | Redactar | C (Art. 49.3) |
| Alto riesgo sin ser proveedora (y sin el caso anterior) | [Documentación del proveedor](expediente-documental.md#documentación-del-proveedor-dp-11-b16a): el número de registro del proveedor | — |
| Proveedora de alto riesgo solo por infraestructura crítica (Anexo III, punto 2, o la marca de la ficha en la vía de respaldo) | No aplica: se registra a nivel nacional (Art. 49.5) | — |
| Resto | No aplica | — |

El documento muestra solo los apartados de su sección. Si la ficha ya no aplica, muestra la sección A.

**Aprobación.** Política por defecto «Expediente · Ficha para el registro UE»: el Responsable del SGAI, como el
Anexo IV. Las organizaciones que ya existían la recibieron si ninguna política activa de documentos cubría la
plantilla.

## Campos

| Apartado | Origen | Obligatorio | Contenido derivado |
|---|---|---|---|
| **A.1 · Proveedor: nombre, dirección y datos de contacto** | Organización | Sí | Razón social (o nombre), identificación fiscal, domicilio, país y sitio web |
| A.2 · Persona que registra en nombre del proveedor | Redacción | No | — |
| A.3 · Representante autorizado | Redacción | No | — |
| **A.4 · Nombre comercial y referencia del sistema** | Ficha | Sí | Nombre y versión, código, identificador interno |
| **A.5 · Finalidad prevista, componentes y funciones** | Ficha | Sí | Finalidad prevista, descripción, tipos de salida, automatización completa |
| **A.6 · Información que utiliza y lógica de funcionamiento** | Ficha | Sí | Descripción técnica, fuentes y categorías de datos, modelo base |
| **A.7 · Situación del sistema** | Ficha (`status`) | Sí | Producción: introducido en el mercado o puesto en servicio; piloto y desarrollo: aún no; deprecado: ya no se introduce; retirado |
| A.8 · Certificado del organismo notificado | Ficha (`cert_status`) y redacción | No | Estado de la certificación |
| A.9 · Copia escaneada del certificado | Redacción | No | — |
| **A.10 · Estados miembros** | Ficha (`geo_scope`) | Sí | Ámbito geográfico |
| **A.11 · Copia de la declaración UE de conformidad** | Redacción | Sí | — |
| A.12 · Instrucciones de uso en formato electrónico | Redacción | No (no se exigen en los puntos 1, 6 y 7 del Anexo III) | — |
| A.13 · Dirección URL con información adicional | Redacción | No | — |
| **B.1, B.4, B.5, B.8 y B.9** | Organización y ficha | Sí | Como A.1, A.4, A.5, A.7 y A.10 |
| B.2 y B.3 | Redacción | No | — |
| **B.6 · Condiciones del Art. 6.3 que se cumplen** | Supuestos AI Act (`aiact_inputs.art63.conditions`) | Sí | Las condiciones a) a d) marcadas |
| **B.7 · Resumen de los motivos** | Supuestos AI Act (`aiact_inputs.art63.justification`) y redacción | Sí | La justificación registrada |
| **C.1 · Responsable del despliegue** | Organización | Sí | Como A.1 |
| C.2 · Persona que registra en su nombre | Redacción | No | — |
| **C.3 · URL de la entrada del sistema en la base de datos de la UE** | Documentación del proveedor | Sí | Los enlaces de las evidencias del sistema con la etiqueta `doc-proveedor-tipo-registro` |
| **C.4 · Resumen de la FRIA** | Redacción | Sí | — |
| C.5 · Resumen de la DPIA | Redacción | No | — |

Los datos de la organización se toman de `organizations` (Organización › Datos legales).

## Acciones

Las del [Expediente documental](expediente-documental.md#acciones).

**Presentación en la base de datos de la UE** (B17b): con la ficha aprobada, el panel del mismo nombre registra
cuándo se presentó, en qué registro y con qué referencia; mientras no conste, lo avisa. Ver
[Notificación del documento aprobado](expediente-documental.md#notificación-del-documento-aprobado-b17b).

**Instantáneas anteriores.** Las fichas guardadas con la pantalla anterior (`system_report_snapshots` con
`report_type = 'eu_registry_prep'`) se siguen viendo en `/inventario/[id]/eu-registry/snapshots/[snapshotId]`,
enlazadas desde sus evidencias.

## Validaciones

Las del [Expediente documental](expediente-documental.md#validaciones).

## Estados

Los del [Expediente documental](expediente-documental.md#estados).

> TODO: confirmar con la revisión jurídica la lectura del Anexo VIII y del Art. 49 (DP-11): los apartados de cada
> sección, el caso de las autoridades públicas que despliegan y el registro nacional de la infraestructura crítica.

## Vistas relacionadas

- [Expediente documental](expediente-documental.md).
- [Ficha del sistema](ficha-sistema.md): datos de origen, rol y clasificación.
- [Clasificación AI Act](../negocio/clasificacion-ai-act.md): nivel, vía del Anexo III y excepción del Art. 6.3.
