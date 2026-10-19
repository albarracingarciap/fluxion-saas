---
id: FUN-ASISTENTE
titulo: Asistente SGAI
tipo: funcional
modulo: asistente-sgai
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/components/assistant/AssistantPanel.tsx
  - apps/web/components/assistant/AssistantToggle.tsx
  - apps/web/components/assistant/AssistantHeader.tsx
  - apps/web/components/assistant/AssistantInput.tsx
  - apps/web/components/assistant/SuggestionChips.tsx
  - apps/web/components/assistant/MessageBubble.tsx
  - apps/web/app/api/agent/assistant/chat/route.ts
  - apps/web/app/api/agent/assistant/conversations/route.ts
  - services/agents/fluxion_agents/routes/assistant.py
  - services/agents/fluxion_agents/prompts/assistant.py
  - services/agents/fluxion_agents/rag/retriever.py
---

# Asistente SGAI

Panel conversacional del [Asistente SGAI](../glosario.md#asistente-sgai), disponible en todas las
pantallas.

## Propósito

Responder preguntas sobre el AI Act, ISO/IEC 42001, el estado del SGAI de la organización y el uso de
Fluxion, con referencias normativas.

## Acceso y permisos

- **Ruta:** no tiene; es un panel lateral.
- **Navegación:** botón flotante redondo, abajo a la derecha, «Abrir asistente de gobernanza». No hay
  atajo de teclado.
- **Disponibilidad:** Core.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Sí | Preguntar |

## Campos

**Cabecera:** «Asistente SGAI · Fluxion · Gobernanza IA», **+ Nueva** y cerrar.

**Pantalla vacía:** «Pregúntame sobre el AI Act, ISO 42001, el estado de tu SGAI o cómo usar Fluxion.» y
tres preguntas sugeridas según la pantalla:

| Pantalla | Ejemplo de sugerencia |
|---|---|
| Ficha del sistema | «¿Qué le falta a este sistema para cumplir el AI Act?» |
| Inventario | «¿Qué sistemas tengo sin clasificar?» |
| Brechas | «¿Qué es más urgente resolver primero?» |
| Evaluaciones | «¿Cuándo necesito segunda revisión en la FMEA?» |
| Dashboard | «¿Qué tengo pendiente antes de la próxima auditoría?» |
| Resto | «¿Qué exige el AI Act para sistemas de alto riesgo?» |

**Conversación:**
- La respuesta aparece a medida que se genera, con formato básico (negrita, listas, títulos).
- Las referencias normativas se citan en el texto, por ejemplo «[Art. 9(4) AI Act]».

**Entrada:**
- «Escribe tu pregunta...»;
- Enter envía y Mayús+Enter añade una línea.

**Datos de la organización que recibe el modelo:**
- la pantalla actual;
- los sistemas, con su clasificación AI Act y su zona de riesgo;
- el recuento de brechas;
- hasta cinco planes de tratamiento que vencen en 30 días;
- hasta cinco evidencias que caducan en 30 días;
- el sistema abierto, si lo hay;
- los últimos 18 mensajes de la conversación.

No recibe aprobaciones, supervisión humana ni incidentes.

**Corpus normativo:** cuando la pregunta lo requiere, se buscan los cuatro fragmentos más relevantes del
AI Act, de ISO/IEC 42001 y de las guías de autoridades. Los embeddings se calculan con Voyage AI.

La respuesta la genera GPT de OpenAI, con un máximo de 2.000 tokens. Cada llamada se registra en
[Coste y uso de IA](coste-uso-ia.md).

> TODO: confirmar varios aspectos del asistente.
> - **Historial:** las conversaciones se guardan, pero la interfaz no permite retomarlas. Al recargar la
>   página se pierde la conversación.
> - **Pantallas con identificador** (incidentes, evidencias, cuestionarios): el primer mensaje falla
>   con «Error 500», porque se toma su identificador como si fuera un sistema.
> - **Mensajes de error en el historial:** se envían al modelo como parte de la conversación.
> - **Interruptor del copiloto:** el perfil tiene un ajuste para desactivarlo, pero no tiene efecto.

> **Pendiente de implementar.**
> - Consulta de los documentos propios de la organización.
> - Elección del modelo de IA por organización.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| Enviar / pulsar una sugerencia | Todos | `POST /api/agent/assistant/chat`, reenviado al servicio de agentes | Guarda la conversación de la persona |
| **+ Nueva** | Todos | Empieza una conversación nueva | — |
| Cerrar | Todos | Oculta el panel sin borrar la conversación | — |

## Validaciones

No hay límite de longitud. El botón de enviar está deshabilitado con el texto vacío o mientras se genera
la respuesta.

Los errores se muestran en la propia conversación:

| Situación | Mensaje |
|---|---|
| Error del servidor | «Error: Error {código}» |
| Error de red | «Error: Error de red.» |
| Servicio de agentes no disponible | «Error: Error 502» |

## Estados

No aplica.

## Vistas relacionadas

- [Navegación](navegacion.md).
- [Coste y uso de IA](coste-uso-ia.md).
- Negocio: [Asistente SGAI](../negocio/asistente-sgai.md).
