# Fluxion — Especificación de implementación
## Agente 4: Asistente conversacional del responsable del SGAI
**Versión:** 1.0 | **Para:** Claude Code u otro agente de implementación
**Stack:** FastAPI (puerto 8001) · OpenAI API (gpt-5.4) · pgvector RAG · SSE streaming
**Corpus RAG:** todos los source_types (eu_regulation + iso_standard + authority_guide + tenant_doc)
**Prerrequisito:** ninguno — disponible desde el primer login

---

## 1. Responsabilidad del agente

El Agente 4 es el punto de contacto permanente del responsable del SGAI
con el conocimiento normativo y el estado de su organización. Responde
preguntas en lenguaje natural sobre:

- Estado del SGAI: zona de los sistemas, gaps abiertos, plazos
- Marco normativo: qué exige el AI Act, qué obliga ISO 42001, cuándo aplica DORA
- Proceso metodológico: cómo funciona la evaluación FMEA, qué significa S_default
- Planificación: qué falta para certificarse, qué hacer antes de la auditoría
- Contexto de la plataforma: cómo usar Fluxion, qué hace cada módulo

**Lo que NO hace:**
- No toma decisiones — no confirma clasificaciones, no cierra gaps, no aprueba planes
- No produce dictámenes jurídicos vinculantes
- No accede a datos de otras organizaciones
- No genera documentos para exportar (eso es el Agente 3)
- No ejecuta acciones sobre la BD — es puramente consultivo

**La diferencia clave con los otros tres agentes:** los Agentes 1-3 producen
outputs estructurados que persisten en la BD. El Agente 4 produce respuestas
conversacionales que el usuario lee y actúa sobre ellas manualmente.

---

## 2. Cuándo se activa

**Siempre disponible** desde el panel lateral de cualquier pantalla de Fluxion.
El panel está colapsado por defecto y se expande con un click.

Tres contextos de uso distintos:

**A — Consulta libre:** el usuario escribe una pregunta sin contexto específico.
"¿Qué artículos del AI Act aplican a un sistema de scoring crediticio?"

**B — Consulta contextual:** el usuario está en una pantalla específica
y el agente recibe el contexto de esa pantalla automáticamente.
Desde la pantalla de evaluación FMEA: "¿Por qué este modo tiene S_default=9?"
El agente ya sabe qué sistema y qué modo se está viendo.

**C — Alerta proactiva:** n8n detecta un evento (evidencia próxima a caducar,
plan de tratamiento vencido) y el agente aparece con un mensaje proactivo
sin que el usuario haya preguntado nada.

---

## 3. Memoria de sesión

### 3.1 Memoria de corto plazo (conversación activa)

La conversación activa se mantiene en el estado del componente React
y se envía completa en cada llamada a la API. No hay estado en el servidor
entre mensajes de la misma conversación.

Límite: 20 mensajes (10 turnos) antes de comprimir el historial.
Si supera el límite, el frontend comprime los mensajes más antiguos
en un resumen y lo incluye al inicio del historial.

### 3.2 Memoria de largo plazo (entre sesiones)

```sql
CREATE TABLE fluxion.assistant_conversations (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES fluxion.organizations(id),
  user_id         uuid        NOT NULL REFERENCES fluxion.profiles(id),
  title           text,
    -- Auto-generado del primer mensaje: primeras 60 chars
  context_page    text,
    -- Ruta de la página donde se inició la conversación
  context_system  uuid        REFERENCES fluxion.ai_systems(id),
    -- Sistema que estaba activo cuando se inició
  messages        jsonb       NOT NULL DEFAULT '[]',
    -- [{role, content, timestamp}] — historial completo
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),

  -- RLS
  CONSTRAINT chk_user_org CHECK (
    EXISTS (
      SELECT 1 FROM fluxion.profiles
      WHERE id = user_id AND organization_id = assistant_conversations.organization_id
    )
  )
);

-- Índice para cargar conversaciones recientes del usuario
CREATE INDEX idx_assistant_conv_user
  ON fluxion.assistant_conversations(user_id, last_message_at DESC);

-- RLS: cada usuario solo ve sus propias conversaciones
ALTER TABLE fluxion.assistant_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_conversations" ON fluxion.assistant_conversations
  FOR ALL TO authenticated
  USING (user_id = auth.uid());
```

---

## 4. Contexto del tenant inyectado en el prompt

A diferencia de los Agentes 1-3 que tienen contexto muy específico de un sistema,
el Agente 4 necesita una visión amplia del estado de la organización.
Se construye dinámicamente al inicio de cada mensaje.

```python
async def build_tenant_context(
    db: asyncpg.Connection,
    org_id: UUID,
    current_page: str,
    current_system_id: Optional[UUID] = None
) -> str:
    """
    Construye el contexto del tenant para el Agente 4.
    Debe ser conciso — no más de 1.500 tokens.
    """

    # Resumen del inventario
    systems = await db.fetch("""
        SELECT name, code, aiact_risk_level, domain, status,
               (SELECT cached_zone FROM fluxion.fmea_evaluations
                WHERE system_id = s.id AND status = 'approved'
                ORDER BY created_at DESC LIMIT 1) AS current_zone
        FROM fluxion.ai_systems s
        WHERE organization_id = $1
        ORDER BY aiact_risk_level DESC, name
    """, org_id)

    # Estado de gaps
    gap_summary = await db.fetchrow("""
        SELECT
            COUNT(*) FILTER (WHERE severity = 'critico') AS critico,
            COUNT(*) FILTER (WHERE severity = 'alto')    AS alto,
            COUNT(*) FILTER (WHERE severity = 'medio')   AS medio
        FROM fluxion.gap_unified
        WHERE organization_id = $1
    """, org_id)

    # Plazos próximos (planes de tratamiento)
    urgent_plans = await db.fetch("""
        SELECT sys.name, tp.code, tp.deadline, tp.zone_at_creation,
               tp.actions_completed, tp.actions_total
        FROM fluxion.treatment_plans tp
        JOIN fluxion.ai_systems sys ON sys.id = tp.system_id
        WHERE tp.organization_id = $1
          AND tp.status IN ('approved', 'in_progress')
          AND tp.deadline < CURRENT_DATE + INTERVAL '30 days'
        ORDER BY tp.deadline ASC
        LIMIT 5
    """, org_id)

    # Evidencias próximas a caducar
    expiring = await db.fetch("""
        SELECT title, valid_until
        FROM fluxion.evidences
        WHERE organization_id = $1
          AND valid_until IS NOT NULL
          AND valid_until < CURRENT_DATE + INTERVAL '30 days'
          AND validated_by IS NOT NULL
        ORDER BY valid_until ASC
        LIMIT 5
    """, org_id)

    # Sistema activo (si hay)
    current_system_ctx = ""
    if current_system_id:
        sys = await db.fetchrow("""
            SELECT name, code, aiact_risk_level, domain, status,
                   classification_note, description
            FROM fluxion.ai_systems
            WHERE id = $1 AND organization_id = $2
        """, current_system_id, org_id)
        if sys:
            current_system_ctx = f"""
## Sistema activo en pantalla

**{sys['name']}** ({sys['code']})
- Clasificación: {sys['aiact_risk_level']}
- Dominio: {sys['domain']}
- Estado: {sys['status']}
- Descripción: {sys.get('description', '—')[:200]}
"""

    # Construir el contexto
    ctx = f"""
## Contexto de la organización

**Página actual:** {current_page}

### Inventario de sistemas IA ({len(systems)} sistemas)
"""
    for s in systems:
        zone = s['current_zone'] or 'Sin evaluar'
        ctx += f"- **{s['name']}** ({s['code']}): {s['aiact_risk_level']} | {zone}\n"

    if gap_summary:
        ctx += f"""
### Estado de gaps
- Críticos: {gap_summary['critico']} | Altos: {gap_summary['alto']} | Medios: {gap_summary['medio']}
"""

    if urgent_plans:
        ctx += "\n### Planes de tratamiento con plazo próximo (<30 días)\n"
        for p in urgent_plans:
            ctx += (
                f"- {p['name']} — {p['code']} "
                f"({p['actions_completed']}/{p['actions_total']} acciones) "
                f"vence {p['deadline']}\n"
            )

    if expiring:
        ctx += "\n### Evidencias próximas a caducar\n"
        for e in expiring:
            ctx += f"- {e['title']} — caduca {e['valid_until']}\n"

    return current_system_ctx + ctx
```

---

## 5. System prompt

```python
ASSISTANT_SYSTEM_PROMPT = """
Eres el asistente de gobernanza IA de Fluxion, la plataforma de gestión
de riesgos y compliance IA para el mercado europeo regulado.

## Tu rol

Ayudas al responsable del SGAI (Sistema de Gestión de IA) de la organización
a entender el marco normativo, el estado de su SGAI, y cómo usar Fluxion
para gestionar sus obligaciones. Eres su copiloto de gobernanza IA.

## Tu perfil de conocimiento

Tienes conocimiento profundo de:
- Reglamento (UE) 2024/1689 (AI Act) — texto completo con considerandos
- ISO/IEC 42001:2023 — estructura, cláusulas y Anexo A
- RGPD especialmente Arts. 22, 25 y 35
- DORA para entidades financieras
- Metodología Fluxion: R·I·D·E, zonas de riesgo, SoA, ciclo FMEA
- Guías de AESIA y EDPB relevantes

## Cómo respondes

**Sé específico con el contexto del usuario.**
Si el usuario pregunta "¿qué le falta a mi sistema?", usa el contexto
de la organización que tienes para dar una respuesta concreta,
no una respuesta genérica sobre qué podría faltar en un sistema hipotético.

**Cita las fuentes normativas.**
Cuando menciones una obligación del AI Act o un requisito de ISO 42001,
cita el artículo o cláusula exacta: "[Art. 9(4) AI Act]", "[ISO 42001 §6.1.3]".

**Distingue entre hechos y orientación.**
Los requisitos normativos son hechos. La orientación sobre qué hacer
es tu opinión experta — márca la diferencia. Ejemplo:
"El Art. 9 AI Act requiere [hecho]. Para este sistema, lo más eficiente
sería [orientación]."

**Reconoce lo que no sabes.**
Si la pregunta requiere conocimiento jurídico especializado, un análisis
de la situación específica de la organización que no tienes, o información
posterior a tu conocimiento, dilo explícitamente. No improvises.

**Sé conciso pero completo.**
Las respuestas deben ser lo suficientemente largas para ser útiles,
pero no más largas de lo necesario. Un párrafo claro es mejor que
tres párrafos con relleno.

**Nunca tomes decisiones.**
Puedes recomendar, orientar y explicar. Pero confirmar una clasificación,
aprobar un plan o cerrar un gap son acciones que corresponden al
responsable del SGAI, no a ti.

## Limitaciones que debes declarar

- No produces dictámenes jurídicos vinculantes
- No tienes acceso a la normativa publicada después de tu fecha de entrenamiento
- Para obligaciones muy específicas del sector (banca, salud, sector público),
  el Agente de Compliance tiene más contexto que tú
- Los datos del estado de la organización que ves pueden estar desactualizados
  en minutos si hay cambios en curso

## Tono

Profesional pero accesible. El usuario es el responsable del SGAI —
tiene conocimiento técnico y de compliance, no necesita que le expliques
qué es un sistema de IA. Pero puede que necesite orientación sobre
cómo aplicar una norma concreta a su situación.
"""
```

---

## 6. Lógica de recuperación RAG

El Agente 4 usa el corpus más amplio pero con estrategia de recuperación
más inteligente — no todas las preguntas necesitan RAG.

```python
def needs_rag(user_message: str, context: dict) -> bool:
    """
    Determina si la pregunta necesita recuperación RAG o puede
    responderse con el contexto del tenant + conocimiento del modelo.
    """
    # Preguntas sobre el estado del SGAI → no necesita RAG
    state_keywords = [
        "cuántos", "cuál es el estado", "qué sistemas",
        "qué falta", "cómo voy", "qué gaps", "cuándo vence"
    ]
    if any(kw in user_message.lower() for kw in state_keywords):
        return False

    # Preguntas sobre navegación de Fluxion → no necesita RAG
    platform_keywords = ["cómo", "dónde", "qué hace", "botón", "pantalla"]
    if any(kw in user_message.lower() for kw in platform_keywords):
        return False

    # Preguntas normativas → necesita RAG
    normative_keywords = [
        "art.", "artículo", "iso", "anexo", "reglamento", "obliga",
        "requiere", "exige", "plazo", "sanción", "multa", "certificación",
        "dora", "rgpd", "gdpr", "aesia"
    ]
    if any(kw in user_message.lower() for kw in normative_keywords):
        return True

    # Por defecto, intentar RAG con threshold alto
    return True


async def retrieve_for_assistant(
    db: asyncpg.Connection,
    query: str,
    org_id: str,
    top_k: int = 4
) -> list:
    """
    Recuperación RAG para el asistente.
    Incluye documentos del tenant además del corpus plataforma.
    Usa threshold más alto (0.75) para evitar ruido en conversación.
    """
    from agent.rag.retriever import retrieve_for_agent
    return await retrieve_for_agent(
        db=db,
        query=query,
        agent_type='assistant',
        org_id=org_id,
        top_k=top_k,
        use_hybrid=True,    # híbrido para referencias exactas de artículos
        match_threshold=0.75  # más estricto que los agentes especializados
    )
```

---

## 7. Implementación FastAPI

```python
# agent/routes/assistant.py

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, UUID4
from typing import Optional
import json
import asyncpg
import anthropic

router = APIRouter(prefix="/agent")
claude = anthropic.Anthropic()


class AssistantMessage(BaseModel):
    role: str   # 'user' | 'assistant'
    content: str


class AssistantRequest(BaseModel):
    message: str
    conversation_id: Optional[UUID4] = None  # None = nueva conversación
    context_page: str = "/"
    context_system_id: Optional[UUID4] = None
    history: list[AssistantMessage] = []  # historial enviado desde el frontend


@router.post("/assistant/chat")
async def chat(
    request: AssistantRequest,
    db: asyncpg.Connection = Depends(get_db),
    current_user = Depends(get_current_user)
):
    org_id = current_user.organization_id

    # 1. Cargar o crear conversación
    if request.conversation_id:
        conv = await db.fetchrow("""
            SELECT * FROM fluxion.assistant_conversations
            WHERE id = $1 AND user_id = $2
        """, request.conversation_id, current_user.id)
        if not conv:
            raise HTTPException(404, "Conversación no encontrada")
        conv_id = conv['id']
    else:
        # Nueva conversación — título = primeras 60 chars del primer mensaje
        title = request.message[:60] + ("..." if len(request.message) > 60 else "")
        conv_id = await db.fetchval("""
            INSERT INTO fluxion.assistant_conversations
              (organization_id, user_id, title, context_page,
               context_system, messages)
            VALUES ($1, $2, $3, $4, $5, '[]'::jsonb)
            RETURNING id
        """, org_id, current_user.id, title,
             request.context_page, request.context_system_id)

    # 2. Construir contexto del tenant
    tenant_ctx = await build_tenant_context(
        db=db,
        org_id=org_id,
        current_page=request.context_page,
        current_system_id=request.context_system_id
    )

    # 3. RAG si necesario
    rag_context = ""
    if needs_rag(request.message, {}):
        chunks = await retrieve_for_assistant(
            db=db,
            query=request.message,
            org_id=str(org_id),
            top_k=4
        )
        if chunks:
            rag_context = "\n## Referencias normativas relevantes\n\n"
            for chunk in chunks:
                rag_context += (
                    f"**[{chunk.short_name} — {chunk.section_ref}]**\n"
                    f"{chunk.content[:500]}\n\n"
                )

    # 4. Construir historial de mensajes para Claude
    system_with_context = (
        ASSISTANT_SYSTEM_PROMPT + "\n\n" + tenant_ctx +
        (rag_context if rag_context else "")
    )

    messages = []
    # Historial previo (enviado desde el frontend)
    for msg in request.history[-18:]:  # máx 18 mensajes de historial
        messages.append({"role": msg.role, "content": msg.content})
    # Mensaje actual
    messages.append({"role": "user", "content": request.message})

    # 5. Streaming
    async def stream_response():
        full_response = ""
        try:
            with claude.messages.stream(
                model="claude-sonnet-4-20250514",
                max_tokens=2000,  # respuestas más cortas que los agentes especializados
                system=system_with_context,
                messages=messages
            ) as stream:
                for text in stream.text_stream:
                    full_response += text
                    yield f"data: {json.dumps({'delta': text, 'conversation_id': str(conv_id)})}\n\n"

            # 6. Guardar en la BD (historial de la conversación)
            # Añadir el mensaje del usuario y la respuesta al historial
            await db.execute("""
                UPDATE fluxion.assistant_conversations
                SET
                    messages = messages || $1::jsonb,
                    last_message_at = now()
                WHERE id = $2
            """, json.dumps([
                    {"role": "user", "content": request.message,
                     "timestamp": "now()"},
                    {"role": "assistant", "content": full_response,
                     "timestamp": "now()"}
                ]), conv_id)

            usage = stream.get_final_message().usage
            yield f"data: {json.dumps({'type': 'complete', 'conversation_id': str(conv_id), 'tokens': usage.output_tokens})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_response(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"}
    )


@router.get("/assistant/conversations")
async def list_conversations(
    db: asyncpg.Connection = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Lista las últimas 20 conversaciones del usuario."""
    rows = await db.fetch("""
        SELECT id, title, context_page, last_message_at,
               jsonb_array_length(messages) AS message_count
        FROM fluxion.assistant_conversations
        WHERE user_id = $1
        ORDER BY last_message_at DESC
        LIMIT 20
    """, current_user.id)
    return [dict(r) for r in rows]


@router.delete("/assistant/conversations/{conv_id}")
async def delete_conversation(
    conv_id: UUID4,
    db: asyncpg.Connection = Depends(get_db),
    current_user = Depends(get_current_user)
):
    await db.execute("""
        DELETE FROM fluxion.assistant_conversations
        WHERE id = $1 AND user_id = $2
    """, conv_id, current_user.id)
    return {"status": "deleted"}
```

---

## 8. Frontend — Panel del asistente

### 8.1 Componente: AssistantPanel

Panel lateral collapsable. Ancho 360px en escritorio.
En móvil: sheet desde la parte inferior.

```
Estado colapsado:
  [Icono bot cian] en la esquina inferior derecha
  Badge con número de alertas proactivas pendientes (si las hay)

Estado expandido:
  ┌─────────────────────────────────────┐
  │ [≡ Historial]  Asistente  [×]       │ ← header oscuro
  ├─────────────────────────────────────┤
  │                                     │
  │   [Área de mensajes — scroll]       │
  │                                     │
  │   [Mensaje usuario]                 │
  │   [Respuesta asistente]             │
  │   ...                               │
  │                                     │
  ├─────────────────────────────────────┤
  │ [Input]              [Enviar ▶]     │ ← footer claro
  │ ¿En qué puedo ayudarte?             │
  └─────────────────────────────────────┘
```

### 8.2 Mensajes sugeridos contextuales

Cuando se abre el panel en una pantalla específica, mostrar
3-4 preguntas sugeridas relevantes para esa pantalla:

**En pantalla de evaluación FMEA:**
```
"¿Qué significa que este modo tenga S_default=9?"
"¿Cómo afecta el Art. 10 AI Act a la evaluación de datos?"
"¿Cuándo necesito segunda revisión?"
```

**En plan de tratamiento:**
```
"¿Puedo aceptar un riesgo en Zona II?"
"¿Qué documentación necesita el nivel 3 de aprobación?"
"¿Qué diferencia hay entre mitigar y transferir?"
```

**En análisis de gaps:**
```
"¿Qué es más urgente resolver primero?"
"¿Cuánto tiempo tengo para cerrar un gap normativo crítico?"
"¿Cómo afecta este gap a la certificación ISO 42001?"
```

**En pestaña ISO 42001:**
```
"¿Cuántos controles necesito para solicitar la certificación?"
"¿Qué justificación acepta un auditor para excluir A.7.2?"
"¿Cómo se actualiza la SoA automáticamente?"
```

Los mensajes sugeridos desaparecen una vez el usuario envía el primer mensaje.

### 8.3 Alertas proactivas

Mensajes generados por n8n que aparecen automáticamente al abrir el panel:

```typescript
interface ProactiveAlert {
  id: string
  type: 'deadline' | 'expiry' | 'zone_change' | 'gap_new'
  priority: 'high' | 'medium'
  title: string
  message: string
  action_url?: string   // enlace directo al objeto afectado
  created_at: string
}
```

Ejemplo de alerta proactiva:
```
⚠ Plazo próximo
El plan PTR-2026-001 (Motor de Scoring) vence en 8 días.
Quedan 3 acciones sin completar.
[Ver plan →]
```

La alerta aparece como mensaje del asistente al abrir el panel.
El usuario puede responder con preguntas de seguimiento.

### 8.4 Renderizado de respuestas

Las respuestas del asistente se renderizan como Markdown:
- **negrita** para términos normativos clave
- Referencias a artículos en `IBM Plex Mono`: `Art. 9(4) AI Act`
- Listas para enumeraciones de obligaciones
- Links a pantallas de Fluxion cuando el asistente menciona
  ir a una pantalla específica: `[Ver el análisis de gaps →]`

### 8.5 Código React (estructura)

```typescript
// components/assistant/AssistantPanel.tsx

export function AssistantPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [convId, setConvId] = useState<string | null>(null)

  const { pathname } = useRouter()
  const { systemId } = useParams()

  // Suggestions según la página actual
  const suggestions = useMemo(
    () => getSuggestionsForPage(pathname),
    [pathname]
  )

  const sendMessage = async (text: string) => {
    if (isStreaming) return
    setInput('')
    setIsStreaming(true)

    // Añadir mensaje del usuario optimisticamente
    const userMsg = { role: 'user', content: text, id: crypto.randomUUID() }
    setMessages(prev => [...prev, userMsg])

    // Añadir placeholder del asistente
    const assistantMsgId = crypto.randomUUID()
    setMessages(prev => [...prev, {
      role: 'assistant', content: '', id: assistantMsgId
    }])

    // SSE stream
    const response = await fetch('/api/agent/assistant/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: text,
        conversation_id: convId,
        context_page: pathname,
        context_system_id: systemId,
        history: messages.slice(-18)
      })
    })

    const reader = response.body!.getReader()
    const decoder = new TextDecoder()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const lines = decoder.decode(value)
        .split('\n')
        .filter(l => l.startsWith('data: '))

      for (const line of lines) {
        const data = JSON.parse(line.slice(6))

        if (data.delta) {
          // Actualizar el placeholder con el texto acumulado
          setMessages(prev => prev.map(m =>
            m.id === assistantMsgId
              ? { ...m, content: m.content + data.delta }
              : m
          ))
        }

        if (data.type === 'complete') {
          setConvId(data.conversation_id)
          setIsStreaming(false)
        }

        if (data.type === 'error') {
          setIsStreaming(false)
        }
      }
    }
  }

  return (
    <div className={`assistant-panel ${isOpen ? 'open' : 'closed'}`}>
      {!isOpen && (
        <AssistantToggle
          onClick={() => setIsOpen(true)}
          alertCount={proactiveAlerts.length}
        />
      )}
      {isOpen && (
        <>
          <AssistantHeader onClose={() => setIsOpen(false)} />
          <MessageList
            messages={messages}
            isStreaming={isStreaming}
          />
          {messages.length === 0 && (
            <SuggestionChips
              suggestions={suggestions}
              onSelect={sendMessage}
            />
          )}
          <AssistantInput
            value={input}
            onChange={setInput}
            onSubmit={() => sendMessage(input)}
            disabled={isStreaming}
          />
        </>
      )}
    </div>
  )
}
```

---

## 9. Preguntas frecuentes — ejemplos de respuestas esperadas

Estos ejemplos sirven para validar la calidad del agente en testing:

**P: "¿Cuándo entra en vigor el AI Act para sistemas de alto riesgo?"**
R esperada: mencionar Aug 2026 (2 años desde publicación), distinguir entre
las obligaciones que entraron antes (Art. 5 prohibiciones: Feb 2025,
GPAI: Aug 2025) y las obligaciones completas de alto riesgo (Aug 2026).

**P: "¿Qué diferencia hay entre S_default y S_actual?"**
R esperada: explicar que S_default es el prior del catálogo (inmutable,
basado en R·I·D·E para el tipo de fallo en abstracto) y S_actual es la
evaluación del responsable del SGAI para ese sistema concreto (puede
ser igual o menor que S_default según O y D_real del sistema).

**P: "¿Cuántos gaps críticos tiene mi organización?"**
R esperada: usar el contexto del tenant y dar el número exacto de la
sección "Estado de gaps" del prompt de contexto.

**P: "¿Puedo certificarme en ISO 42001 sin tener todos los controles implementados?"**
R esperada: sí, pero con gaps bien justificados. Explicar que el certificador
espera un SGAI funcional y en mejora continua, no perfección. Los gaps
críticos sin plan de resolución son los que generan no conformidades.

**P: "¿Qué hace el botón 'Refinar mediante IA' en la pantalla de modos de fallo?"**
R esperada: explicar que activa el Agente 2, que revisa la priorización
del motor de reglas considerando el contexto específico del sistema
y puede mover modos entre `prioritized` y `monitoring`.

---

## 10. Mensajes proactivos — triggers n8n

```javascript
// n8n workflow: assistant_proactive_alerts
// Se ejecuta cada noche a las 07:00

// Trigger 1: Plan próximo a vencer
IF treatment_plan.deadline < today + 14 days
   AND treatment_plan.status IN ('approved', 'in_progress')
   AND treatment_plan.actions_completed < treatment_plan.actions_total
THEN
  INSERT INTO assistant_proactive_messages {
    organization_id, user_id: plan.created_by,
    type: 'deadline',
    priority: deadline < today + 7 ? 'high' : 'medium',
    title: 'Plan próximo a vencer',
    message: `El plan ${plan.code} (${system.name}) vence en ${days} días. Quedan ${pending} acciones sin completar.`,
    action_url: `/app/treatment/${plan.id}`
  }

// Trigger 2: Evidencia próxima a caducar
IF evidence.valid_until < today + 14 days
   AND evidence.validated_by IS NOT NULL
THEN
  INSERT INTO assistant_proactive_messages {
    type: 'expiry',
    priority: 'medium',
    title: 'Evidencia próxima a caducar',
    message: `La evidencia "${evidence.title}" caduca el ${valid_until}. Su caducidad afectará al estado de ${controls_count} control(es).`,
    action_url: `/app/compliance/evidences/${evidence.id}`
  }

// Trigger 3: Sistema nuevo sin clasificar
IF ai_system.aiact_risk_level IS NULL
   AND ai_system.created_at < today - 3 days
THEN
  INSERT INTO assistant_proactive_messages {
    type: 'gap_new',
    priority: 'medium',
    title: 'Sistema pendiente de clasificar',
    message: `El sistema "${system.name}" lleva ${days} días sin clasificación AI Act. Sin clasificación no es posible activar la evaluación de riesgos.`,
    action_url: `/app/systems/${system.id}/classify`
  }
```

---

## 11. Casos borde

### 11.1 Pregunta sobre datos de otra organización

El contexto del tenant tiene RLS — el agente nunca ve datos de otras
organizaciones. Si el usuario pregunta "¿cómo lo hacen otras empresas?",
la respuesta es orientación general normativa o de buenas prácticas,
nunca datos específicos de otra organización.

### 11.2 Pregunta que requiere acción inmediata

Si el usuario pregunta algo como "¿puedo desplegar este sistema ya?",
el asistente responde con la evaluación basada en el contexto pero
siempre con el disclaimer: "La decisión final de despliegue corresponde
al responsable del SGAI. Te recomiendo revisar el estado completo
en [enlace a pantalla de riesgos del sistema]."

### 11.3 Conversación muy larga (>20 mensajes)

El frontend detecta cuándo el historial supera 20 mensajes
y antes de enviar el siguiente, comprime los mensajes más antiguos:

```typescript
function compressHistory(messages: Message[]): Message[] {
  if (messages.length <= 20) return messages

  // Los últimos 10 mensajes se conservan completos
  const recent = messages.slice(-10)

  // Los anteriores se resumen en un mensaje de sistema
  const older = messages.slice(0, -10)
  const summary = `[Resumen de conversación anterior: ${
    older.map(m => `${m.role}: ${m.content.slice(0, 50)}`).join(' | ')
  }]`

  return [
    { role: 'user', content: summary, id: 'summary' },
    { role: 'assistant', content: 'Entendido, continúo desde ese contexto.', id: 'summary-ack' },
    ...recent
  ]
}
```

### 11.4 Pregunta en inglés

El agente responde en el mismo idioma del mensaje. Si el usuario
escribe en inglés, responde en inglés aunque el corpus RAG esté
principalmente en español. El system prompt está en español pero
el agente detecta el idioma del usuario.

---

## 12. Diferencias clave respecto a los otros tres agentes

| Aspecto | Agentes 1-3 | Agente 4 |
|---------|-------------|---------|
| Trigger | Acción explícita del usuario | Siempre disponible |
| Output | JSON estructurado → BD | Texto conversacional |
| Persistencia | Escribe en BD | Solo guarda historial de chat |
| Contexto | Un sistema específico | Toda la organización |
| RAG | Focalizado por agente | Todos los source_types |
| max_tokens | 4.000-8.000 | 2.000 |
| Historial | Sin historial (cada sesión es nueva) | Historial persistente |
| Confirmación | Requiere confirmación humana explícita | No requiere |

---

## 13. Resumen de endpoints

| Método | Endpoint | Uso |
|--------|----------|-----|
| `POST` | `/api/agent/assistant/chat` | Mensaje de chat (SSE) |
| `GET` | `/api/agent/assistant/conversations` | Historial de conversaciones |
| `GET` | `/api/agent/assistant/conversations/{id}` | Mensajes de una conversación |
| `DELETE` | `/api/agent/assistant/conversations/{id}` | Eliminar conversación |
| `GET` | `/api/agent/assistant/proactive` | Alertas proactivas pendientes |
| `PATCH` | `/api/agent/assistant/proactive/{id}/dismiss` | Marcar alerta como vista |

---

## 14. Métricas de calidad

| Métrica | Objetivo | Cómo medir |
|---------|----------|-----------|
| Tasa de preguntas que reciben RAG | 40-60% | `chunks_retrieved > 0` en sesiones |
| TTFT (tiempo hasta primer token) | < 2 segundos | Latencia del primer `delta` en SSE |
| Longitud media de respuesta | 150-400 tokens | `tokens_output` en sesiones |
| Conversaciones con > 3 turnos | > 30% | `message_count > 6` |
| Alertas proactivas descartadas sin leer | < 20% | dismiss sin mensaje de seguimiento |

