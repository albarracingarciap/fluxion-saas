---
id: FUN-PRESUPUESTOS
titulo: Presupuestos de IA
tipo: funcional
modulo: coste-uso-ia
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/observabilidad/presupuestos/page.tsx
  - apps/web/app/(app)/observabilidad/presupuestos/presupuestos-client.tsx
  - apps/web/app/(app)/observabilidad/presupuestos/actions.ts
  - apps/web/app/api/cron/cost-budgets/route.ts
  - supabase/migrations/20260823090000_telemetry_budgets.sql
---

# Presupuestos de IA

Definición de [presupuestos de IA](../glosario.md#presupuesto-de-ia) mensuales y seguimiento del gasto
del mes en curso.

## Propósito

Poner un límite de gasto mensual a la organización o a un sistema y recibir un aviso al alcanzar los
umbrales. La vista dice: «Se comprueba cada hora, porque un bucle descontrolado se come el presupuesto de
un mes en una tarde.».

## Acceso y permisos

- **Ruta:** `/observabilidad/presupuestos`
- **Navegación:** botón **Presupuestos** de [Coste y uso de IA](coste-uso-ia.md). No tiene entrada en el
  menú.
- **Disponibilidad:** módulo Coste y uso de IA.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Presupuestos de la organización | Crear y borrar |

> **Pendiente de definir.** Qué roles pueden mantener los presupuestos.

## Campos

**Lista** de presupuestos activos:

| Campo | Descripción | Origen |
|---|---|---|
| Ámbito | «Toda la organización» o el nombre del sistema | `telemetry.cost_budgets.scope`, `ai_system_id` |
| Umbrales | «Avisos al 50 %, 80 %, 100 %» | `alert_at_pct` |
| Gasto | «{gastado} de {importe} {moneda}» y «{pct} % del mes en curso» | `telemetry.v_budget_status` |
| Barra | Verde; naranja desde el 80 %; rojo desde el 100 %. No depende de los umbrales configurados | `v_budget_status.pct` |
| Cobertura | «El consumo real es mayor: solo el Z % de las llamadas tiene tarifa registrada.», si procede | `v_budget_status` |

Si no hay presupuestos: «No hay presupuestos definidos. Sin uno, el gasto se ve pero no avisa.».

**Formulario Nuevo presupuesto:**

| Campo | Tipo | Obligatorio | Descripción y valores | Origen |
|---|---|---|---|---|
| **Ámbito** | selección | Sí | Toda la organización · Un sistema concreto | `scope` |
| **Sistema** | selección | Si el ámbito es un sistema | Sistemas del inventario | `ai_system_id` |
| **Importe mensual (USD)** | decimal | Sí | Mayor que cero | `amount` |
| **Avisar al (% separados por comas)** | texto | No | Por defecto «50, 80, 100». Valores entre 0 y 500 | `alert_at_pct` |

El periodo es siempre mensual y la moneda, siempre USD. Solo puede haber un presupuesto activo por
ámbito.

**Aviso al alcanzar un umbral:**

1. Cada hora, Fluxion compara el gasto del mes con cada presupuesto.
2. Si se alcanza un umbral nuevo:
   - registra una [señal de riesgo](../glosario.md#señal-de-riesgo): media, alta desde el 80 % o crítica
     desde el 100 %;
   - envía un [aviso a Slack/Teams](../glosario.md#aviso-a-slackteams) «Gasto en IA al {pct} % del
     presupuesto», con el evento «Presupuesto de IA superado».
3. Si se cruzan varios umbrales a la vez, solo avisa del más alto.
4. Cada umbral avisa una sola vez al mes.

> TODO: confirmar varios aspectos de los avisos y del formulario.
> - **Campana:** la vista dice que el aviso llega a la campana, Slack y Teams, pero no llega a la campana.
> - **Moneda:** el gasto se suma en cualquier moneda y se compara con un importe en dólares.
> - **Umbrales repetidos** (por ejemplo, «80, 80») **o todos fuera de rango:** el presupuesto no avisa
>   nunca.
> - **Edición:** no se puede editar un presupuesto.
> - **Borrar y recrear en el mismo mes:** los avisos se repiten.
> - **Retraso de los avisos:** pueden llegar con hasta una hora de retraso respecto al cálculo de los
>   agregados.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Nuevo** | Todos | Abre el formulario | — |
| **Guardar** | Todos | `saveBudget`: crea el presupuesto | — |
| Papelera (**Borrar presupuesto**) | Todos | `deleteBudget`: borra el presupuesto y su registro de avisos, sin confirmación | — |
| **← Observabilidad** | Todos | Vuelve a [Coste y uso de IA](coste-uso-ia.md) | — |

## Validaciones

| Situación | Mensaje |
|---|---|
| Importe vacío | **Guardar** deshabilitado |
| Importe cero o negativo | «El importe debe ser mayor que cero.» |
| Ámbito sistema sin sistema | «Elige el sistema al que aplica el presupuesto.» |
| Ya hay un presupuesto activo en ese ámbito | «Ya existe un presupuesto activo para ese ámbito.» |
| Otros errores | «No se pudo guardar el presupuesto.» / «No se pudo borrar el presupuesto.» |

Los errores al borrar no se muestran.

## Estados

Por presupuesto, según el gasto del mes:
- por debajo del 80 %;
- desde el 80 %;
- desde el 100 %.

Cada mes vuelve a empezar.

## Vistas relacionadas

- [Coste y uso de IA](coste-uso-ia.md), [Tarifas de modelos](tarifas-modelos.md).
- [Ajustes](ajustes.md), pestaña de canales de Slack y Teams.
- Negocio: [Coste y uso de IA](../negocio/coste-uso-ia.md).
