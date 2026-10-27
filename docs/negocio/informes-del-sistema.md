---
id: NEG-INFORMES
titulo: Informes del sistema
tipo: negocio
modulo: informes-del-sistema
audiencia: comercial
version: 0.2
fuente:
  - apps/web/app/(app)/gaps/page.tsx
  - apps/web/app/(app)/gaps/actions.ts
  - apps/web/lib/gaps/by-system.ts
  - apps/web/lib/documents/templates.ts
  - apps/web/lib/documents/applicability.ts
  - apps/web/app/(app)/inventario/[id]/technical-dossier/page.tsx
  - apps/web/app/(app)/inventario/[id]/gap-report/page.tsx
  - apps/web/app/(app)/inventario/[id]/eu-registry/page.tsx
  - apps/web/lib/evidences/data.ts
---

# Informes del sistema

Hasta B16, cada sistema de IA tenía tres [informes del sistema](../glosario.md#informes-del-sistema) que
Fluxion componía con sus datos: el dossier técnico, la ficha para el registro UE y el informe de brechas del
sistema. Se solapaban entre sí y con el Anexo IV, y calculaban datos parecidos con reglas distintas: por
ejemplo, el número de modos de fallo no coincidía de uno a otro. Desde B16 (decisión DP-06) esa información
vive en un solo sitio para cada uso.

## Propósito

Que cada dato del sistema se consulte, se apruebe y se entregue en un único lugar, con las mismas reglas en
toda la plataforma.

## Problema que resuelve

- **Una sola versión de cada cifra:** los recuentos de brechas y de riesgos salen siempre del mismo cálculo.
- **Documentos aprobados, no solo generados:** lo que se presenta ante una autoridad pasa por el expediente,
  con redacción, aprobación, PDF con huella y evidencia.
- **Menos pantallas que mantener:** desaparecen las que repetían lo que ya está en la ficha o en el expediente.

## Roles

| Rol | Responsabilidad |
|---|---|
| Responsable del sistema | Consulta la ficha y las brechas de sus sistemas y guarda sus instantáneas |
| Analista de cumplimiento | Prepara la ficha para el registro UE en el expediente |
| Responsable del SGAI | Usa las brechas del sistema para priorizar |
| Auditor, Directivo | Consultan los documentos aprobados y las instantáneas |

## Flujo de trabajo

| Antes | Ahora |
|---|---|
| **Dossier técnico** | Se retira. Su contenido útil está en la [ficha del sistema](inventario.md) y en la documentación técnica del Anexo IV del [expediente](documentacion-del-sistema.md) |
| **Ficha para el registro UE** | Es un documento del [expediente](documentacion-del-sistema.md) con los datos del Anexo VIII del AI Act, solo cuando la organización tiene que registrar el sistema |
| **Informe de brechas del sistema** | Es el [análisis de brechas](brechas.md) filtrado por el sistema. Desde ahí se guarda una instantánea fechada, que queda como evidencia del sistema |

Desde la ficha del sistema, **Acciones rápidas** lleva a la ficha para el registro UE y a las brechas del
sistema. Los enlaces antiguos llevan a su nuevo sitio.

Las instantáneas que se guardaron con los informes anteriores se conservan y se siguen consultando desde sus
evidencias.

## Relación normativa

| Norma | Referencia | Qué cubre |
|---|---|---|
| AI Act | Art. 49 y Anexo VIII | Registro en la base de datos de la UE (ficha para el registro UE) |
| AI Act | Art. 11 y Anexo IV | Documentación técnica (expediente) |
| ISO/IEC 42001 | §7.5 | Información documentada y conservación de versiones (instantáneas) |

## Módulos relacionados

- **[Documentación del sistema](documentacion-del-sistema.md):** Anexo IV y ficha para el registro UE.
- **[Análisis de brechas](brechas.md):** brechas de toda la organización o de un sistema, con sus instantáneas.
- **[Inventario de sistemas de IA](inventario.md):** la ficha del sistema.
- **[Biblioteca de evidencias](biblioteca-evidencias.md):** recibe las instantáneas guardadas.
- **Vistas:** [Ficha para el registro UE](../funcional/registro-ue.md),
  [Análisis de brechas](../funcional/brechas.md); retiradas: [Dossier técnico](../funcional/dossier-tecnico.md),
  [Informe de brechas del sistema](../funcional/informe-brechas-sistema.md).
