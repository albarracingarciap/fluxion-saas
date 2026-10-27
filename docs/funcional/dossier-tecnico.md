---
id: FUN-DOSSIER
titulo: Dossier técnico (retirado)
tipo: funcional
modulo: informes-del-sistema
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/inventario/[id]/technical-dossier/page.tsx
  - apps/web/app/(app)/inventario/[id]/technical-dossier/snapshots/[snapshotId]/page.tsx
  - apps/web/lib/ai-systems/technical-dossier.ts
  - apps/web/lib/evidences/data.ts
---

# Dossier técnico (retirado)

Vista retirada en B16c (DP-06). Su contenido útil está en la [Ficha del sistema](ficha-sistema.md) y en la documentación técnica del Anexo IV del [Expediente documental](expediente-documental.md).

## Propósito

No aplica: la vista se retiró.

## Acceso y permisos

- **Ruta:** `/inventario/[id]/technical-dossier` redirige a la [Ficha del sistema](ficha-sistema.md).
- **Instantáneas anteriores:** `/inventario/[id]/technical-dossier/snapshots/[snapshotId]` sigue mostrando las que se guardaron, de solo lectura. Se abren desde
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
