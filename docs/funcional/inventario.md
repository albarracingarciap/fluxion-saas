---
id: FUN-INVENTARIO
titulo: Inventario
tipo: funcional
modulo: inventario
audiencia: tecnica
version: 0.2
fuente:
  - apps/web/app/(app)/inventario/page.tsx
  - apps/web/app/(app)/inventario/systems-table-client.tsx
  - apps/web/lib/supabase/middleware.ts
  - apps/web/lib/ai-act/server.ts
---

# Inventario

Listado de todos los [sistemas de IA](../glosario.md#sistema-de-ia) de la organización, con indicadores,
búsqueda y filtros.

## Propósito

Consultar el [inventario de sistemas de IA](../glosario.md#inventario-de-sistemas-de-ia), localizar un
sistema y abrir su ficha, o dar de alta uno nuevo.

## Acceso y permisos

- **Ruta:** `/inventario`
- **Navegación:** **Principal › Sistemas › Inventario**. También desde el [Dashboard](dashboard.md), el
  análisis de brechas, la biblioteca de evidencias, las evaluaciones y los planes.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Todos los sistemas de la organización | Abrir la ficha, registrar un sistema |

Requiere sesión y onboarding completado.

## Campos

### Indicadores

| Indicador | Cálculo |
|---|---|
| **Sistemas IA** | Número de sistemas; debajo, cuántos están en producción |
| **Alto Riesgo** | Sistemas no retirados con nivel de riesgo «Alto riesgo» o «Práctica prohibida» |
| **Madurez ISO 42001** | Media de `ai_systems.iso_42001_score`: Alto (70 % o más), Medio (40 % o más) o Bajo |
| **Próximas revisiones** | Sistemas no retirados ni deprecados cuya fecha de despliegue, o de alta si no la tiene, supera los 90 días |

> TODO: confirmar dos indicadores.
> - **Próximas revisiones** no mide revisiones reales, solo la antigüedad, y no coincide con el aviso de
>   revisiones del menú, que usa las [revisiones periódicas](../glosario.md#revisión-periódica) del plan
>   de tratamiento.
> - **Madurez ISO 42001** se basa en un dato que el inventario considera legacy (decisión 46).

### Tabla «Todos los sistemas»

Orden: de más reciente a más antiguo. Sin paginación.

| Columna | Descripción y valores | Origen (`tabla.columna`) |
|---|---|---|
| **Sistema** | Nombre; debajo, versión y responsable | `ai_systems.name`, `version`, `ai_owner` |
| **Dominio** | Finanzas y Banca, Seguros, Crédito y Scoring, Salud y Medicina, RRHH y Empleo, Educación, Seguridad Pública, Justicia y Legal, Migración, Infraestructura Crítica, Marketing, Operaciones, Atención al Cliente, Cumplimiento, Otro | `ai_systems.domain` |
| **Clasificación AI Act** | Prohibido · Alto Riesgo · Riesgo Limitado · Riesgo Mínimo · Pendiente · Fuera del ámbito · No es un sistema de IA. El [ámbito del AI Act](../glosario.md#ámbito-del-ai-act) manda sobre el nivel: si el sistema está fuera del ámbito o no es un sistema de IA, se muestra eso y no el nivel. Si la organización es proveedora de un modelo GPAI (categoría GPAI), se añade la etiqueta **GPAI** (texto de ayuda: «Proveedor de modelo de IA de uso general») | `ai_systems.aiact_scope` y `aiact_risk_level` ([nivel de riesgo AI Act](../glosario.md#nivel-de-riesgo-ai-act)); la etiqueta, `ai_systems.is_gpai` ([categoría GPAI](../glosario.md#categoría-gpai)) |
| **Estado** | Producción · Desarrollo · Piloto · Deprecado · Retirado. Si el uso está suspendido, se añade la etiqueta **Suspendido** (B25a, AI Act, Art. 26.5) | `ai_systems.status`; la etiqueta, una fila activa de `system_use_suspensions` |
| **ISO 42001** | Porcentaje con barra, o «—» | `ai_systems.iso_42001_score` |

GPAI no es un nivel de riesgo: es una categoría aparte, que se suma al nivel. Los sistemas que tenían
GPAI como nivel pasaron a la categoría GPAI con el nivel «Pendiente» y la marca «Pendiente de revisar con
el motor nuevo» (B13d); se ven como «Pendiente» con la etiqueta **GPAI**.

Filtros, que se aplican en el navegador y no se guardan en la URL:

| Filtro | Valores |
|---|---|
| **Buscar sistema...** | Texto sobre el nombre |
| **AI Act** | Prohibido · Alto Riesgo · Riesgo Limitado · Riesgo Mínimo · Pendiente · Fuera del ámbito · No es un sistema de IA (los valores de la columna Clasificación) · **Categoría GPAI**, que muestra los sistemas con la etiqueta GPAI, sea cual sea su nivel |
| **Estado** | Los cinco estados |

Con algún filtro activo se muestra el número de resultados.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **+ Registrar sistema** / **Registrar primer sistema** | Todos | Navega a [Alta de sistema](inventario-alta.md) | — |
| Pulsar una fila | Todos | Navega a la [Ficha del sistema](ficha-sistema.md) | — |
| **Limpiar filtros** | Todos | Reinicia la búsqueda y los filtros | — |
| **Volver al dashboard** | Todos | Navega a [Dashboard](dashboard.md) | — |

> **Pendiente de definir.** Qué roles pueden dar de alta sistemas. Hoy cualquier miembro puede hacerlo.

## Validaciones

No aplica.

## Estados

El sistema tiene cinco estados (Desarrollo, Piloto, Producción, Deprecado, Retirado), que se cambian
desde la [Edición de la ficha](ficha-sistema-edicion.md). Esta vista solo los muestra. La suspensión del uso no es
un estado: se gestiona en la tarjeta **Uso del sistema** de la [ficha](ficha-sistema.md) y el filtro **Estado** no la tiene en cuenta.

Mensajes cuando no hay nada que mostrar:
- **Sin sistemas:** «Sin sistemas registrados», con un botón para registrar el primero.
- **Sin resultados:** «Sin resultados para los filtros aplicados».

## Vistas relacionadas

- [Alta de sistema](inventario-alta.md), [Ficha del sistema](ficha-sistema.md),
  [Edición de la ficha](ficha-sistema-edicion.md).
- [Sistemas detectados](descubrimientos.md): sistemas propuestos por los conectores. No hay enlace desde
  esta vista, solo desde el menú.
- Negocio: [Inventario de sistemas de IA](../negocio/inventario.md).
