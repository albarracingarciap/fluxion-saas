---
id: FUN-INFORME-BRECHAS
titulo: Informe de brechas del sistema (retirado)
tipo: funcional
modulo: informes-del-sistema
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/inventario/[id]/gap-report/page.tsx
  - apps/web/app/(app)/inventario/[id]/gap-report/snapshots/[snapshotId]/page.tsx
  - apps/web/lib/ai-systems/gap-report.ts
  - apps/web/lib/evidences/data.ts
---

# Informe de brechas del sistema (retirado)

Vista retirada en B16c (DP-06). El informe es ahora el [Análisis de brechas](brechas.md) filtrado por el sistema, con su instantánea del sistema, que queda como evidencia.

## Propósito

No aplica: la vista se retiró.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/gap-report` redirige a el [Análisis de brechas](brechas.md) filtrado por el sistema (`/gaps?system_id=…`).
- **Instantáneas anteriores:** `/inventario/[id]/gap-report/snapshots/[snapshotId]` sigue mostrando las que se guardaron, de solo lectura. Se abren desde
  su evidencia en la [Biblioteca de evidencias](evidencias.md) (**Abrir …**).

## Campos

No aplica.

## Acciones

En una instantánea anterior: imprimir.

## Validaciones

No aplica.

## Estados

No aplica.

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md).
- [Expediente documental](expediente-documental.md).
- [Análisis de brechas](brechas.md).
