---
id: FUN-REVISIONES
titulo: Revisiones pendientes
tipo: funcional
modulo: plan-de-tratamiento
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/planes/revisiones-pendientes/page.tsx
  - apps/web/app/(app)/planes/revisiones-pendientes/pending-reviews-client.tsx
  - apps/web/lib/treatment-plans/data.ts
  - apps/web/app/api/cron/review-reminders/route.ts
  - apps/web/components/layout/overdue-reviews-banner.tsx
---

# Revisiones pendientes

Lista de las acciones de tratamiento aceptadas o pospuestas cuya
[revisión periódica](../glosario.md#revisión-periódica) está vencida o vence en los próximos 30 días.

## Propósito

Que ninguna aceptación de riesgo quede sin reevaluar en su plazo, como exige la gestión de riesgos
continua.

## Acceso y permisos

- **Ruta:** `/planes/revisiones-pendientes`
- **Navegación:**
  - botón **N revisiones pendientes** de [Planes de tratamiento](planes-de-tratamiento.md);
  - aviso de revisiones de la [Navegación](navegacion.md);
  - notificación semanal de recordatorio.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Todas las revisiones de la organización | Navegar al plan |

## Campos

### Indicadores

- **Total pendientes**;
- **Vencidas** (incluye las que vencen hoy);
- **Próximas (≤ 30 días)**;
- **Sistemas afectados**;
- **Planes afectados**.

### Lista

Filtro **Urgencia**: Todas · Vencidas · Próximas. Agrupada por sistema y por plan.

| Campo | Contenido | Origen (`tabla.columna`) |
|---|---|---|
| Plan | Código, número de acciones, **Ir al plan** | `treatment_plans.code` |
| S | Severidad de la acción | `treatment_actions.s_actual_at_creation` |
| Modo | Nombre y código | `compliance.failure_modes` |
| Opción | Aceptar · Diferir | `option` |
| Fecha | Fecha de revisión y «Vence hoy», «Vencida hace N d» o «En N d» | `review_due_date` |
| Estado | Vencida · Vence hoy · Próxima | — |
| Revisiones previas | Número | `review_count` |

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Ir al plan** | Todos | Navega al [Plan de tratamiento](plan-de-tratamiento.md), donde se hace la revisión | — |

La revisión no se puede hacer desde esta vista.

### Recordatorio semanal

Cada lunes, una tarea programada revisa las mismas acciones en todas las organizaciones y envía a cada
responsable un aviso en la app:
- título: «N revisiones de riesgo aceptado pendientes»;
- enlace a esta vista;
- no se repite antes de seis días.

No envía correo.

> TODO: confirmar el destinatario del recordatorio. Usa un identificador de usuario donde se espera el del
> perfil, así que podría no llegar a la persona correcta.


## Validaciones

No aplica.

## Estados

Una revisión está **vencida** si su fecha es hoy o anterior, y **próxima** si vence en 30 días o menos.

Sin revisiones, la vista muestra «Sin revisiones pendientes».

## Vistas relacionadas

- [Plan de tratamiento](plan-de-tratamiento.md), [Planes de tratamiento](planes-de-tratamiento.md),
  [Navegación](navegacion.md).
- Negocio: [Plan de tratamiento](../negocio/plan-de-tratamiento.md).
