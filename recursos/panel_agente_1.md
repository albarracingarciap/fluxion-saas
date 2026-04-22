Contexto del proyecto: Fluxion, plataforma B2B SaaS de gobierno de IA.
Stack: Next.js 14 App Router, TypeScript strict, Tailwind + shadcn/ui,
Zustand, TanStack Query. Agente en FastAPI puerto 8001.
Color primario: --cyan #00ADEF. Tema oscuro: bg #0D1520.

---

TAREA: Crear el componente `ClassificationPanel` en
`src/components/classification/ClassificationPanel.tsx`

El componente conecta con el Agente 1 de clasificación AI Act
vía SSE streaming, muestra la propuesta generada y permite confirmarla.

---

ENDPOINTS DEL AGENTE (puerto 8001):

1. POST /api/agent/classify-system
   - Inicia la clasificación vía SSE streaming
   - Body: { system_id: string, organization_id: string }
   - Headers: Authorization: Bearer <supabase_jwt>
   - Respuesta: stream SSE con eventos:
       data: {"type": "thinking", "content": "..."}
       data: {"type": "chunk", "content": "..."}
       data: {"type": "proposal", "data": { ...ClassificationProposal }}
       data: {"type": "done"}
       data: {"type": "error", "message": "..."}

2. POST /api/agent/classify-system/confirm
   - Confirma y persiste la propuesta en BD
   - Body: { system_id: string, organization_id: string,
             proposal_id: string, confirmed_level?: string,
             reviewer_notes?: string }
   - Headers: Authorization: Bearer <supabase_jwt>
   - Respuesta: { data: { success: true, ai_system: {...} } }

---

# Tipos
types/classification.ts        ← crear directorio si no existe

type RiskLevel = 'prohibited' | 'high' | 'limited' | 'minimal' | 'pending'

interface ClassificationProposal {
  proposal_id: string
  system_id: string
  risk_level: RiskLevel
  confidence: number          // 0-1
  reasoning: string           // razonamiento completo del agente
  rag_sources: RagSource[]    // fragmentos regulatorios usados
  applicable_articles: string[]
  obligations: string[]
  requires_human_review: boolean
  classification_basis: string  // ej. "Anexo III, Sección 5(b)"
}

interface RagSource {
  chunk_id: string
  article: string
  text_excerpt: string
  relevance_score: number
}

---

ESTADOS DEL COMPONENTE:

type PanelState =
  | 'idle'          // sin iniciar
  | 'connecting'    // abriendo SSE
  | 'thinking'      // streaming thinking del agente
  | 'streaming'     // recibiendo chunks del razonamiento
  | 'proposal'      // propuesta completa visible, esperando confirmación
  | 'confirming'    // POST confirm en curso
  | 'confirmed'     // clasificación guardada
  | 'error'         // error en cualquier fase

---

UBICACIÓN Y COMPORTAMIENTO:

El componente ClassificationPanel se renderiza inline en la página
de detalle del sistema, inmediatamente debajo de la sección
"CLASIFICACIÓN AI ACT — RESULTADO GENERAL".

No es un modal. Es un panel que:
- Por defecto está colapsado (invisible)
- Se expande al pulsar el botón "Clasificar con IA" que se añade
  junto al botón existente "Revisar clasificación"
- Se colapsa al confirmar o al pulsar "Descartar"

El botón "Clasificar con IA" debe:
- Tener estilo secundario/ghost (no competir visualmente con
  "Revisar clasificación")
- Tener un icono de agente/robot/sparkle a la izquierda
- Deshabilitarse mientras el panel está activo

PROPS:

interface ClassificationPanelProps {
  systemId: string
  organizationId: string
  currentLevel: RiskLevel        // nivel actual para comparar
  currentBasis: string           // fundamento actual
  onConfirmed: (level: RiskLevel) => void  // actualiza el badge del header
  isOpen: boolean                // controlado desde el padre
  onClose: () => void            // colapsa el panel
}
---

COMPORTAMIENTO DETALLADO:

Estado 'idle':
- Botón "Analizar con AI Act" (icono de escáner/robot)
- Si currentLevel existe y no es 'pending': mostrar badge del nivel
  actual + botón "Re-clasificar"
- Si currentLevel === 'pending': mostrar badge "Pendiente" + CTA primario

Estado 'connecting' + 'thinking':
- Indicador de progreso con texto animado
- Mostrar: "Consultando base regulatoria..." mientras hay thinking
- No mostrar el texto de thinking del LLM (es interno)

Estado 'streaming':
- Mostrar el razonamiento del agente mientras llega (texto acumulado)
- Scroll automático al fondo del texto
- Indicador de cursor parpadeante al final

Estado 'proposal' (estado principal):
- Badge de nivel con color semántico:
    prohibited → rojo intenso (#DC2626)
    high       → rojo suave (#F85149)
    limited    → naranja (#E3913A)
    minimal    → verde (#3FB950)
    pending    → gris (#484F58)
- classification_basis en IBM Plex Mono, pequeño
- reasoning completo en área scrollable (max-height 200px)
- applicable_articles como chips/badges pequeños
- obligations como lista con iconos de check
- rag_sources colapsables: "Ver N fuentes regulatorias utilizadas"
  (cada source muestra article + excerpt + score como barra)
- confidence como barra de progreso con porcentaje
- Si requires_human_review === true: banner amarillo de advertencia
- Sección de confirmación:
    * Si el revisor quiere cambiar el nivel: selector dropdown
      con los 4 niveles válidos (prohibited, high, limited, minimal)
      pre-seleccionado en el nivel propuesto
    * Textarea opcional "Notas del revisor" (placeholder: "Justificación
      del ajuste o contexto adicional para la auditoría...")
    * Botón primario "Confirmar clasificación"
    * Botón secundario "Cancelar" → vuelve a 'idle'

Estado 'confirming':
- Botón de confirmar en estado loading
- Deshabilitar todo el formulario

Estado 'confirmed':
- Panel de éxito con el nivel confirmado
- Texto: "Clasificación registrada · [timestamp]"
- Badge del nivel definitivo (prominent)
- Callback onConfirmed ejecutado

Estado 'error':
- Mensaje de error legible
- Botón "Reintentar"

POST-CONFIRMACIÓN:
- Llamar onConfirmed(level) → el padre actualiza el badge
  "Alto Riesgo" del header con el nivel confirmado
- Mostrar brevemente el estado 'confirmed' (2 segundos)
- Llamar onClose() para colapsar el panel automáticamente

DESCARTAR:
- Botón "Descartar" visible en estado 'proposal'
- Llama onClose() sin modificar nada
- La clasificación actual permanece intacta

COMPARACIÓN VISUAL:
- Mientras el panel está en estado 'proposal', mostrar
  en dos columnas:
    Izquierda: "Clasificación actual" → currentLevel + currentBasis
    Derecha:   "Propuesta del agente" → proposal.risk_level + basis
  Para que el usuario pueda comparar antes de confirmar

---

AUTENTICACIÓN:

Usar el cliente de Supabase para obtener el JWT:
  import { createClient } from '@/lib/supabase/client'
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

Pasar como: Authorization: Bearer ${token}

---

SSE IMPLEMENTATION:

Usar fetch + ReadableStream (NO EventSource, para poder pasar
Authorization header):

const response = await fetch(`${AGENT_BASE_URL}/api/agent/classify-system`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'Accept': 'text/event-stream',
  },
  body: JSON.stringify({ system_id, organization_id }),
})

const reader = response.body?.getReader()
const decoder = new TextDecoder()

// leer chunks, parsear líneas "data: {...}", hacer JSON.parse
// acumular chunks de tipo 'chunk' en reasoningText
// cuando llega 'proposal': setProposal(event.data), setPhase('proposal')
// cuando llega 'done': si no hay proposal, setPhase('error')
// cuando llega 'error': setPhase('error'), setErrorMsg(event.message)

Importante: limpiar el reader en el cleanup de useEffect si el
componente se desmonta durante el streaming.

---

CONSTANTE DE ENTORNO:

const AGENT_BASE_URL = process.env.NEXT_PUBLIC_AGENT_URL ?? 'http://localhost:8001'

---

ESTRUCTURA DE ARCHIVOS A CREAR:

# Tipos
types/classification.ts        ← crear directorio si no existe

# Componentes
components/classification/
  ClassificationPanel.tsx
  RiskLevelBadge.tsx
  RagSourcesAccordion.tsx
  StreamingReasoning.tsx
  ConfirmationForm.tsx

---

NOTAS DE ESTILO:

- Usar CSS variables del design system donde corresponda
- El panel tiene borde lateral izquierdo con el color del nivel
  de riesgo (border-left: 3px solid <color-nivel>)
- Transiciones suaves entre estados (framer-motion si ya está instalado,
  sino CSS transitions)
- El componente es 'use client' — el resto pueden ser componentes puros

---

VALIDACIONES:

- Si systemId o organizationId están vacíos: botón disabled
- Si la sesión de Supabase ha expirado durante el streaming: mostrar
  error "Sesión expirada. Por favor recarga la página."
- Manejar AbortController para cancelar fetch si el componente
  se desmonta

---

NO hacer:
- No usar EventSource (no soporta headers de auth)
- No almacenar el JWT en localStorage manualmente
- No reintentar automáticamente más de 1 vez en error de red
- No importar desde rutas relativas profundas (usar alias @/)

---

⚠️ REGLA CRÍTICA ANTES DE ESCRIBIR CÓDIGO:

Antes de crear cualquier archivo, leer los componentes existentes
del proyecto para extraer los estilos, variables CSS, tipografías
y patrones UX que se usan REALMENTE. Los componentes actuales son
la única fuente de verdad en materia de estilos y UX.

Archivos de referencia obligatoria (leer en este orden):
app/globals.css                          ← CSS vars activas
components/layout/sidebar.tsx            ← patrones dark zone
components/layout/topbar.tsx             ← botones, tipografía
components/layout/intel-banner.tsx       ← badges, mono font
components/ui/button.tsx                 ← variantes de botón
tsconfig.json                            ← alias @/ configurado
tailwind.config.ts                       ← tokens

Al leer esos archivos, extraer y documentar en un comentario
interno antes de escribir el componente:
  - Qué fuentes se usan (pueden haber cambiado desde la doc)
  - Qué CSS variables están definidas y activas
  - Qué patrones de card, badge, botón y layout se usan
  - El color scheme real (¿dark? ¿light? ¿ambos?)

Si hay discrepancia entre cualquier documentación de diseño
y el código real de los componentes: el código gana siempre.
NO asumir tipografías, colores ni patrones de ningún documento
externo ni de instrucciones previas.