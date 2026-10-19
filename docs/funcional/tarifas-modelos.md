---
id: FUN-TARIFAS
titulo: Tarifas de modelos
tipo: funcional
modulo: coste-uso-ia
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/observabilidad/tarifas/page.tsx
  - apps/web/app/(app)/observabilidad/tarifas/tarifas-client.tsx
  - apps/web/app/(app)/observabilidad/tarifas/actions.ts
  - supabase/migrations/20260824090000_model_prices_per_org.sql
---

# Tarifas de modelos

Mantenimiento de las [tarifas de modelo](../glosario.md#tarifa-de-modelo) con las que se calcula el coste
de cada llamada.

## Propósito

Registrar el precio por millón de tokens de cada modelo y su fecha de vigencia. La vista dice: «Cambiar un
precio no reescribe el pasado: es lo que evita que el informe de marzo cambie en junio.».

## Acceso y permisos

- **Ruta:** `/observabilidad/tarifas`
- **Navegación:** botón **Tarifas** de [Coste y uso de IA](coste-uso-ia.md) y enlace **ponles precio**.
  No tiene entrada en el menú.
- **Disponibilidad:** módulo Coste y uso de IA.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Tarifas del catálogo y propias | Crear, editar y borrar las propias |

> **Pendiente de definir.** Qué roles pueden mantener las tarifas.

Hay dos tipos de tarifa:
- **Catálogo:** las mantiene Fluxion y las comparten todas las organizaciones. No se editan desde la
  aplicación.
- **Propia:** la crea la organización y prevalece sobre la del catálogo, por ejemplo con precios
  negociados.

## Campos

**Modelos con tráfico y sin tarifa:** proveedor, modelo, número de llamadas y **Poner tarifa**. «Mientras
estén aquí, el coste total de la organización está incompleto.»

**Lista de tarifas**, ordenada por proveedor, modelo y fecha de vigencia de más reciente a más antigua:
- modelo y proveedor;
- marcas «catálogo» y «anulada por tu tarifa»;
- fecha de vigencia y procedencia;
- precios de entrada y salida, y de caché y razonamiento si los tiene.

Si no hay tarifas: «No hay ninguna tarifa. Sin ellas, la telemetría cuenta tokens pero no puede decir
cuánto cuestan.».

**Formulario Nueva tarifa / Editar tarifa:**

| Campo | Tipo | Obligatorio | Descripción | Origen (`telemetry.model_prices.`) |
|---|---|---|---|---|
| **Proveedor** | texto | Sí | Por defecto «openai». Debe coincidir con el proveedor que llega en las trazas | `provider` |
| **Modelo** | texto | Sí | — | `model` |
| **Vigente desde** | fecha | Sí | Por defecto, hoy | `effective_from` |
| **Entrada / millón** | decimal | Sí | Precio por millón de tokens de entrada | `input_per_million` |
| **Salida / millón** | decimal | Sí | Precio por millón de tokens de salida | `output_per_million` |
| **Moneda** | texto | Sí | Por defecto «USD» | `currency` |
| **Caché / millón** | decimal | No | Tokens de entrada servidos desde caché | `cached_input_per_million` |
| **Razonamiento / millón** | decimal | No | Tokens de razonamiento | `reasoning_per_million` |
| **Procedencia** | texto | No | Por ejemplo, «factura de agosto» | `source` |

Si el modelo usa caché o razonamiento y no tienen precio, el coste sale como estimado.

Cada llamada se cobra con la tarifa más reciente vigente en su fecha. La tarifa propia va por delante de
la del catálogo.

> TODO: confirmar varias reglas de las tarifas.
> - **Marca «anulada por tu tarifa»:** se pone aunque la tarifa propia solo sea vigente desde una fecha
>   posterior.
> - **Moneda:** es texto libre, pero el panel muestra todo en dólares.
> - **Proveedor:** tiene que coincidir exactamente, mayúsculas incluidas, con el que llega en las trazas.
> - **Tarifa nueva:** tarda unos minutos en aplicarse, y las llamadas de ese intervalo quedan sin coste.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Nueva tarifa** / **Poner tarifa** / lápiz | Todos | Abre el formulario, vacío, con proveedor y modelo, o con la tarifa | — |
| **Guardar** | Todos | `savePrice`: crea o actualiza la tarifa propia | Solo afecta a las llamadas que lleguen después |
| Papelera | Todos | `deletePrice`: borra la tarifa propia, sin confirmación | — |
| **← Observabilidad** | Todos | Vuelve a [Coste y uso de IA](coste-uso-ia.md) | — |

> TODO: confirmar el tratamiento de errores al borrar. La vista no los muestra.

## Validaciones

| Situación | Mensaje |
|---|---|
| Faltan modelo, entrada o salida | **Guardar** deshabilitado |
| Proveedor o modelo vacíos | «Proveedor y modelo son obligatorios.» |
| Precio de entrada o salida negativo o no numérico | «El precio de entrada no es válido.» / «El precio de salida no es válido.» |
| Fecha incorrecta | «La fecha de vigencia no es válida.» |
| Ya existe una tarifa del modelo en esa fecha | «Ya existe una tarifa para ese modelo con esa fecha de vigencia.» |
| Otros errores | «No se pudo guardar la tarifa.» / «No se pudo borrar la tarifa. El catálogo no se puede editar.» |

Los precios de caché y razonamiento no se validan.

## Estados

No aplica.

## Vistas relacionadas

- [Coste y uso de IA](coste-uso-ia.md), [Presupuestos de IA](presupuestos.md).
- Negocio: [Coste y uso de IA](../negocio/coste-uso-ia.md).
