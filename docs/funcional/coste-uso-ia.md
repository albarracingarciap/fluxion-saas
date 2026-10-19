---
id: FUN-COSTE-USO
titulo: Coste y uso de IA
tipo: funcional
modulo: coste-uso-ia
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/observabilidad/page.tsx
  - apps/web/lib/telemetry/data.ts
  - services/telemetry/fluxion_telemetry/main.py
  - services/telemetry/fluxion_telemetry/otlp.py
  - services/telemetry/fluxion_telemetry/store.py
  - supabase/migrations/20260821090000_telemetry_core.sql
  - supabase/migrations/20260822090000_telemetry_rollups.sql
  - supabase/migrations/20260822120000_telemetry_ttft.sql
---

# Coste y uso de IA

Panel de [Coste y uso de IA](../glosario.md#coste-y-uso-de-ia-finops): coste, volumen, errores y latencia
de las llamadas a modelos de la organización, a partir de sus trazas.

## Propósito

Saber cuánto gasta y cuánto tarda la IA de la organización, por modelo y por sistema, y qué parte del
gasto no se puede calcular por falta de [tarifa](../glosario.md#tarifa-de-modelo). La vista dice: «Solo
metadatos: aquí no se guarda el contenido de ninguna conversación.».

## Acceso y permisos

- **Ruta:** `/observabilidad`
- **Menú:** **Observabilidad**, en el grupo Seguimiento. Aparece siempre.
- **Disponibilidad:** módulo Coste y uso de IA.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Datos de la organización | Solo consulta |

> **Pendiente de implementar.** Acceso condicionado a la activación del módulo.

> **Pendiente de definir.** Qué roles pueden consultar el coste.

## Campos

**Periodo:** **7 días**, **30 días** (por defecto) o **90 días**, en el parámetro `?dias=`. El periodo
incluye el día de hoy.

| Bloque | Contenido | Origen |
|---|---|---|
| **Coste del periodo** | Suma del coste. Si no todas las llamadas tienen tarifa: «medido sobre el Z % de las llamadas» | `telemetry.rollup_daily.cost_total` |
| **Llamadas** | Número de llamadas y tokens de entrada y salida | `rollup_daily` |
| **Primer token** | Mediana y p95 del tiempo hasta el primer token: «es la espera que nota el usuario» | `rollup_daily` |
| **Llamada completa** | Mediana y p95 de la duración | `rollup_daily` |
| Errores | «N llamadas con error (x %)», si hay | `rollup_daily` |
| **Llamadas por día** | Barras por día; en color de aviso los días con errores | `rollup_daily` |
| **Por modelo** | Modelo, proveedor, «sin tarifa», coste y llamadas, de más a menos llamadas | `rollup_daily` |
| **Por sistema de IA** | Sistema (enlace a la [Ficha del sistema](ficha-sistema.md)) o «Sin adscribir», coste y llamadas | `rollup_daily`, `ai_systems` |
| Pie | Fecha del último cálculo de agregados | `telemetry.rollup_runs` |

**Aviso de coste incompleto**, si hay llamadas sin tarifa:
- «Solo X de Y llamadas (Z %) tienen tarifa registrada.»;
- una estimación del gasto real, extrapolada a todas las llamadas;
- la lista de modelos sin tarifa, con el enlace **ponles precio** a [Tarifas de modelos](tarifas-modelos.md).

**Cálculo del coste:** se calcula al recibir cada llamada, con la tarifa vigente ese día, y no se
recalcula después.
- Precio por millón de tokens de entrada, salida, caché y razonamiento.
- Si el modelo usa caché o razonamiento y la tarifa no tiene ese precio, el coste es estimado.
- Si no hay tarifa, el coste es desconocido.

Los agregados se recalculan cada hora para ayer y hoy.

**Origen de las trazas:**
- Las aplicaciones de la organización envían trazas OpenTelemetry al servicio de telemetría, con una
  [clave API](../glosario.md#clave-api) con el permiso **Enviar telemetría**.
- La organización sale de la clave.
- El sistema sale del atributo de recurso `fluxion.system_id`. Sin él, el gasto figura como «Sin
  adscribir».
- Se descartan:
  - las trazas que no son llamadas a modelos;
  - las que tienen más de 30 días o más de 48 horas en el futuro;
  - los atributos que parecen contenido de prompts o respuestas.

Si no hay datos: «Todavía no hay telemetría.» y las instrucciones para configurar el exportador.

> TODO: confirmar varios datos del panel.
> - **Fecha del último cálculo:** el pie siempre dice «Los agregados no se han calculado todavía.», porque
>   la vista no puede leer esa fecha.
> - **Moneda:** el coste se muestra siempre en dólares, aunque haya tarifas en otra moneda; se suman sin
>   convertir.
> - **Modelos sin tarifa:** un modelo sigue figurando como «sin tarifa» aunque se le ponga precio después.
>   La lista no depende del periodo.
> - **Trazas con retraso:** las que llegan con más de unos dos días de retraso no entran en los agregados.
> - **Días sin llamadas:** no aparecen en el gráfico.
> - **Datos que no se muestran:** el entorno y la distinción entre coste exacto y estimado.
> - **Conservación:** no hay borrado programado de las trazas antiguas.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **7 días** / **30 días** / **90 días** | Todos | Cambia el periodo | — |
| **Tarifas** | Todos | Navega a [Tarifas de modelos](tarifas-modelos.md) | — |
| **Presupuestos** | Todos | Navega a [Presupuestos de IA](presupuestos.md) | — |

## Validaciones

No aplica: la vista no escribe datos.

## Estados

No aplica.

## Vistas relacionadas

- [Tarifas de modelos](tarifas-modelos.md), [Presupuestos de IA](presupuestos.md).
- [Ajustes](ajustes.md), para las claves API.
- Negocio: [Coste y uso de IA](../negocio/coste-uso-ia.md).
