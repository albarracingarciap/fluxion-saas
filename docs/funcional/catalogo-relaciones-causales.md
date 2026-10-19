---
id: FUN-CAT-RELACIONES
titulo: Relaciones causales
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/datos/relaciones-causales/page.tsx
  - apps/web/app/(app)/datos/relaciones-causales/actions.ts
  - apps/web/lib/causal-graph/chains.ts
  - apps/web/lib/causal-graph/propagation.ts
  - apps/web/lib/causal-graph/amplifiers.ts
  - supabase/migrations/00000000000001_schema.sql
  - supabase/migrations/00000000000005_seed_compliance.sql
---

# Relaciones causales

Mantenimiento de las [relaciones causales](../glosario.md#relación-causal): las conexiones del
[grafo causal](../glosario.md#grafo-causal).

## Propósito

Definir cómo un nodo causal provoca, amplifica, habilita o se correlaciona con otro. De estas relaciones
dependen las cadenas causales y los avisos de propagación de Fluxion.

## Acceso y permisos

- **Ruta:** `/datos/relaciones-causales`
- **Navegación:** tarjeta **Relaciones Causales** del [Catálogo de tablas básicas](catalogo.md) y menú
  **Datos › Relaciones Causales**.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Crear, editar y eliminar |

> **Pendiente de implementar.** Restringir el mantenimiento al Administrador y tener un catálogo por
> organización. Ver [Catálogo de tablas básicas](catalogo.md#acceso-y-permisos).

## Campos

**Lista** «Grafo (N aristas)», ordenada por identificador, de 50 en 50. No tiene búsqueda ni filtros.

| Columna | Descripción | Origen (`compliance.causal_relationships.`) |
|---|---|---|
| **ID** | Por ejemplo, «A-01»: letra de la familia y número | `id` |
| **Origen** · **Destino** | Nodo causal, con su dominio (TEC, GOV, ETH, LEG, SEG, ROI) | `source_node_id`, `target_node_id` → `causal_nodes` |
| **Tipo** | causes · amplifies · enables · correlates | `type` |
| **Mecanismo / Condición** | Mecanismo explicativo y condición de activación | `explanatory_mechanism`, `activation_condition` |
| **Conf.** | high · medium · low | `confidence` |

Sin resultados: «No se encontraron resultados».

**Formulario Añadir / Editar Relación** (todos los campos obligatorios):

| Campo | Tipo | Descripción y valores |
|---|---|---|
| **ID (Formato: A-01)** | texto | No se puede cambiar al editar |
| **Familia** | selección | Una de las ocho [familias causales](../glosario.md#familia-causal), de la A a la H |
| **Nodo Origen** · **Nodo Destino** | selección | Nodos causales |
| **Tipo de Relación** | selección | causes (por defecto) · amplifies · enables · correlates |
| **Nivel de Confianza** | selección | Alto (por defecto) · Medio · Bajo |
| **Mecanismo Explicativo** | texto largo | Cómo se propaga el evento del origen al destino |
| **Condición de Activación** | texto largo | Cuándo se materializa la relación |

La relación siempre va del origen al destino. No tiene peso ni probabilidad numérica.

> TODO: confirmar varios datos de la vista.
> - **Sin traducir:** el tipo, la confianza y el dominio aparecen como códigos. La opción «Alto» del
>   formulario aparece como «Ato (high)».
> - **Familia:** no se muestra en la lista.
> - **Relaciones no deseadas:** no se impiden las de un nodo consigo mismo, las duplicadas ni los ciclos.
>   El catálogo estándar ya tiene cuatro parejas origen-destino repetidas.
> - **Datos sin pantalla:** los nodos causales, las familias y los vínculos entre nodos y modos de fallo,
>   de los que depende la activación.
> - **Nivel de confianza:** no lo usa ningún cálculo.

**Uso de las relaciones:** solo cuentan las de tipo causes y amplifies, salvo en los amplificadores de
brechas, que usan solo amplifies.

| Dónde | Qué hace |
|---|---|
| [Dashboard](dashboard.md) y [Dossier técnico](dossier-tecnico.md) | **Cadenas causales activas**: caminos de tres o más nodos activos en un sistema |
| [Ficha del sistema](ficha-sistema.md) | Mapa de contagio causal. Modos de fallo que propagan o reciben efectos |
| [Evaluación FMEA](fmea-evaluacion.md) | Al confirmar un modo con severidad 4 o más, avisa de los modos que puede desencadenar o agravar. Solo mira un salto. No bloquea |
| [Brechas](brechas.md) | «N modos activos amplifican este incumplimiento», con las relaciones amplifies hacia un artículo |

Un nodo está activo en un sistema si tiene vinculado algún modo de fallo activado en él.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Añadir Nueva** / **Editar** › **Guardar** | Todos | Crea o actualiza la relación | Cambia las cadenas y avisos de todos los sistemas |
| **Eliminar** | Todos | Pide confirmación («¿Estás seguro de que deseas eliminar la relación {id}?») y la borra | Ídem |
| **Volver a Datos** | Todos | Vuelve al [Catálogo de tablas básicas](catalogo.md) | — |

No hay mensaje de confirmación. Los errores se muestran en una ventana del navegador con el texto técnico
de la base de datos.

## Validaciones

Todos los campos son obligatorios y el identificador no se puede repetir. El formato «A-01» es solo una
indicación: no se comprueba.

## Estados

No aplica. El borrado es definitivo.

## Vistas relacionadas

- [Grafo causal](catalogo-grafo-causal.md), [Catálogo de modos de fallo](catalogo-modos-de-fallo.md).
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
