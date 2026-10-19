---
id: FUN-CAT-GRAFO
titulo: Grafo causal
tipo: funcional
modulo: catalogo-tablas-basicas
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/datos/catalogo-causal/page.tsx
  - apps/web/app/(app)/datos/catalogo-causal/catalog-client.tsx
  - apps/web/app/(app)/datos/catalogo-causal/catalog-canvas.tsx
  - apps/web/lib/causal-graph/system-graph.ts
---

# Grafo causal

Visualización interactiva del [grafo causal](../glosario.md#grafo-causal) completo del catálogo.

## Propósito

Ver de un vistazo la estructura causal del catálogo. La vista dice: «Este mapa maestro sirve de base para
que el sistema identifique cómo los diferentes modos de fallo pueden propagar su severidad a través de
dependencias estructurales.».

## Acceso y permisos

- **Ruta:** `/datos/catalogo-causal`
- **Navegación:** tarjeta **Grafo Causal** del [Catálogo de tablas básicas](catalogo.md) y menú **Datos ›
  Grafo Causal**. La barra superior la titula «Catálogo Causal».
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Solo consulta |

## Campos

**Nodos:** los nodos causales del catálogo (98 en el catálogo estándar), con el nombre y una etiqueta de
dominio de color.

**Conexiones:** las [relaciones causales](catalogo-relaciones-causales.md), con flecha del origen al
destino y la condición de activación abreviada.

| Tipo | Trazo |
|---|---|
| Causa (fuerte) | Rojo, continuo |
| Amplifica (probabilidad) | Naranja, discontinuo y animado |
| Habilita (condición) | Gris, continuo |
| Se correlaciona | Azul, punteado |

**Barra superior:** «N Nodos totales» y la leyenda.

**Al pulsar un nodo:** se abre el panel **Nodo del catálogo**, con su dominio y su nombre.

La vista no tiene filtros ni búsqueda.

> TODO: confirmar varios datos de la visualización.
> - **Leyenda:** no incluye «Se correlaciona».
> - **Colores de dominio:** los de ética, seguridad y ROI aparecen en gris, porque los códigos de colores
>   no coinciden con los de los datos.
> - **Grafo vacío:** si falla la carga, aparece un grafo vacío sin aviso.
> - **Texto del panel:** habla de activación por sistema, que esta vista no muestra.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Zoom, desplazar, arrastrar nodos | Todos | Ajusta la vista. Las posiciones no se guardan | — |
| **Pantalla completa** / **Contraer Vista** | Todos | Amplía el grafo a toda la pantalla | — |
| Pulsar un nodo | Todos | Abre o cierra su panel | — |

## Validaciones

No aplica.

## Estados

No aplica.

## Vistas relacionadas

- [Relaciones causales](catalogo-relaciones-causales.md).
- [Ficha del sistema](ficha-sistema.md): mapa de contagio causal del sistema.
- Negocio: [Catálogo de tablas básicas](../negocio/catalogo-tablas-basicas.md).
