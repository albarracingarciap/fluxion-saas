---
id: FUN-NAVEGACION
titulo: Navegación
tipo: funcional
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/layout.tsx
  - apps/web/components/layout/sidebar.tsx
  - apps/web/components/layout/topbar.tsx
  - apps/web/components/layout/overdue-reviews-banner.tsx
  - apps/web/components/notifications/NotificationsBell.tsx
  - apps/web/components/assistant/AssistantPanel.tsx
  - apps/web/components/assistant/AssistantToggle.tsx
  - apps/web/lib/store/sidebarStore.ts
  - apps/web/lib/store/authStore.ts
  - apps/web/lib/modules/entitlements.ts
---

# Navegación

Elementos comunes a todas las vistas de la aplicación: menú lateral, barra superior, campana de
notificaciones, aviso de revisiones y botón del [Asistente SGAI](../glosario.md#asistente-sgai). No es una
ruta propia.

## Propósito

Dar acceso a todas las áreas de Fluxion y mostrar en todo momento los avisos que requieren atención:
sistemas detectados pendientes, incidentes con plazo, revisiones periódicas y notificaciones.

## Acceso y permisos

- **Ruta:** todas las vistas bajo el layout de la aplicación (`app/(app)/layout.tsx`).
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | El mismo menú: no se filtra por rol | Navegar, consultar notificaciones, abrir el asistente, cerrar sesión |

Las entradas condicionales dependen de los [módulos](../glosario.md#módulo) activos de la organización.
Un módulo está activo si su estado es `enabled` o `trial` y no ha vencido.

## Campos

### Menú lateral

| Sección | Entradas | Condición |
|---|---|---|
| **Principal** | Dashboard · Sistemas ▸ Inventario, Análisis de Gaps, Evidencias, **Descubrimientos (N)** | Descubrimientos solo si está activo `connector-mlflow` o `shadow-ai`; N = sistemas detectados pendientes |
| **Evaluación** | Evaluaciones · Planes de tratamiento · **Incidentes (N)** · Supervisión humana · **Aprobaciones** | N = incidentes graves con notificación pendiente o solo inicial. Aprobaciones aparece siempre (Core) |
| **Seguimiento** | Observabilidad · Tareas · Kanban | — |
| **Cumplimiento** | ISO 42001 ▸ Declaración de Aplicabilidad | — |
| **Datos** | Datos ▸ Base de datos, Modos de fallo, Medidas, Tipos de evidencia, Obligaciones, Obligación ↔ Evidencia, Modo ↔ Medida, Relaciones Causales, Grafo Causal | «Modos de fallo» aparece deshabilitado («Próximamente») mientras la organización no tiene sistemas |
| **Configuración** | Organización · Usuarios · Ajustes | — |

- El menú se puede colapsar; el estado se recuerda en el navegador.
- Al pie aparece el chip de la organización: logotipo o iniciales, nombre, rol y plan.

> **Pendiente de implementar.**
> - Nombres de negocio en el menú. Hoy se usan los anteriores: «Análisis de Gaps», «Descubrimientos»,
>   «Observabilidad», «Base de datos», «Medidas».
> - Flujos de aprobación siempre visible, ya que pasa al Core.

> TODO: confirmar un comportamiento del chip de la organización: parece pulsable, pero no hace nada.

El chip muestra el rol principal del miembro con su nombre del glosario (antes mostraba «Miembro» para
casi todos los roles).

### Barra superior

| Elemento | Contenido |
|---|---|
| Título | Según la ruta. Las vistas sin título propio muestran «Dashboard»: incidentes, supervisión, observabilidad, aprobaciones, perfil, notificaciones y plantillas |
| Campana | Número de notificaciones no leídas («99+» por encima de 99), actualizado cada 30 segundos |
| Usuario | Nombre, rol principal (Administrador, Responsable del SGAI, CAIO, DPO, Responsable del sistema, Analista de riesgos, Analista de cumplimiento, Directivo, Auditor, Lector) y avatar o iniciales |

### Aviso de revisiones

Banda sobre el contenido cuando hay acciones aceptadas o pospuestas con revisión vencida o en los
próximos 30 días ([revisión periódica](../glosario.md#revisión-periódica)):
- **Variante roja**, si hay vencidas: «N revisiones vencidas … requieren re-evaluación inmediata».
- **Variante ámbar**, si solo hay próximas.

### Asistente

Botón flotante abajo a la derecha, presente en todas las vistas, que abre el panel del Asistente SGAI.
Ver [Asistente SGAI](asistente-sgai.md).

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Entradas del menú | Todos | Navegan a la vista | — |
| **Colapsar menú** / **Expandir menú** | Todos | Cambia el ancho del menú | Se guarda en el navegador |
| Campana | Todos | Abre las 10 últimas notificaciones | — |
| Pulsar una notificación | Todos | Navega a su enlace | La marca como leída |
| **Marcar todas** | Todos | Marca todas como leídas | Actualiza `notifications.read_at` |
| **Ver todas las notificaciones →** | Todos | Navega a [Notificaciones](notificaciones.md) | — |
| **Mi Perfil** / **Ajustes** | Todos | Navegan a [Perfil](perfil.md) y [Ajustes](ajustes.md) | — |
| **Cerrar sesión** | Todos | Cierra la sesión de Supabase y vuelve a `/login` | Sin registro de auditoría |
| **Ver revisiones** (aviso) | Todos | Navega a [Revisiones pendientes](revisiones-pendientes.md) | — |
| Descartar aviso (X) | Todos | Oculta el aviso durante 24 horas | Se guarda en el navegador |
| Botón del asistente | Todos | Abre el panel del asistente | — |

## Validaciones

No aplica.

## Estados

No aplica.

## Vistas relacionadas

- [Dashboard](dashboard.md), [Notificaciones](notificaciones.md), [Perfil](perfil.md),
  [Ajustes](ajustes.md), [Asistente SGAI](asistente-sgai.md).
- Negocio: [Plataforma](../negocio/plataforma.md), [Módulos y planes](../negocio/modulos-y-planes.md).
