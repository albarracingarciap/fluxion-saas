---
id: FUN-INVENTARIO
titulo: Inventario
tipo: funcional
modulo: inventario
audiencia: tecnica
version: 0.1
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
| **Clasificación AI Act** | Prohibido · Alto Riesgo · Riesgo Limitado · Riesgo Mínimo · GPAI · Pendiente. Los sistemas fuera del ámbito del AI Act o que no son IA aparecen como «Pendiente» | `ai_systems.aiact_risk_level` ([nivel de riesgo AI Act](../glosario.md#nivel-de-riesgo-ai-act)) |
| **Estado** | Producción · Desarrollo · Piloto · Deprecado · Retirado | `ai_systems.status` |
| **ISO 42001** | Porcentaje con barra, o «—» | `ai_systems.iso_42001_score` |

> **Pendiente de implementar.** GPAI ya no es un nivel de riesgo: el motor único de clasificación (B13a)
> no lo asigna. El valor y su filtro se mantienen para los sistemas existentes hasta su migración a la
> [categoría GPAI](../glosario.md#categoría-gpai) (B13d).

> TODO: confirmar cómo debe mostrar el listado los sistemas «Fuera del ámbito» y «No es un sistema de
> IA», que hoy aparecen como «Pendiente» (`aiact_scope` no se lee en el listado).

Filtros, que se aplican en el navegador y no se guardan en la URL:

| Filtro | Valores |
|---|---|
| **Buscar sistema...** | Texto sobre el nombre |
| **AI Act** | Los seis niveles de la columna Clasificación |
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
desde la [Edición de la ficha](ficha-sistema-edicion.md). Esta vista solo los muestra.

Mensajes cuando no hay nada que mostrar:
- **Sin sistemas:** «Sin sistemas registrados», con un botón para registrar el primero.
- **Sin resultados:** «Sin resultados para los filtros aplicados».

## Vistas relacionadas

- [Alta de sistema](inventario-alta.md), [Ficha del sistema](ficha-sistema.md),
  [Edición de la ficha](ficha-sistema-edicion.md).
- [Sistemas detectados](descubrimientos.md): sistemas propuestos por los conectores. No hay enlace desde
  esta vista, solo desde el menú.
- Negocio: [Inventario de sistemas de IA](../negocio/inventario.md).
