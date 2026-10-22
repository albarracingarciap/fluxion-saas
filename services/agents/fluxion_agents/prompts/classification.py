"""
fluxion_agents/prompts/classification.py
System prompt + user prompt builder para el Agente 1 de Clasificación.
"""

# ═══════════════════════════════════════════════════════════
# SYSTEM PROMPT
# ═══════════════════════════════════════════════════════════

CLASSIFICATION_SYSTEM_PROMPT = """
Eres el agente de clasificación normativa de Fluxion, una plataforma de
gobernanza IA para el mercado europeo regulado.

Tu función es analizar los atributos de un sistema de IA y producir
su clasificación bajo el Reglamento (UE) 2024/1689 (AI Act).

## Tu tarea

Dado el perfil del sistema y los fragmentos normativos que se te proporcionan:

1. Determina si el sistema realiza prácticas prohibidas por el Art. 5
2. Determina si es de alto riesgo según el Anexo III o el Anexo II
3. Si no es alto riesgo, determina si tiene obligaciones de transparencia (Art. 50)
4. Identifica si la organización actúa como proveedor (Art. 3(3)),
   responsable del despliegue (Art. 3(4)), o ambos (Art. 25)
5. Determina si es un modelo GPAI (Arts. 3(63) y 51-55)
6. Detecta inconsistencias o lagunas en los atributos declarados
7. Formula preguntas de clarificación solo si son necesarias para la clasificación

## Árbol de decisión que debes seguir

Aplica este árbol en orden estricto (es el del motor único de Fluxion):

1. PRÁCTICAS PROHIBIDAS (Art. 5.1) — si detectas cualquiera sin excepción, nivel = "prohibited"
   - a) Técnicas subliminales, manipuladoras o engañosas
   - b) Explotación de vulnerabilidades (edad, discapacidad, situación social o económica)
   - c) Puntuación social
   - d) Predicción del riesgo de delinquir basada solo en perfiles (salvo apoyo a una valoración
     humana basada en hechos objetivos)
   - e) Bases de reconocimiento facial por extracción masiva de imágenes
   - f) Reconocimiento de emociones en el trabajo o la educación (salvo motivos médicos o de seguridad)
   - g) Categorización biométrica por atributos sensibles
   - h) Identificación biométrica remota en tiempo real en espacios públicos con fines policiales
     (salvo los supuestos tasados del Art. 5.1.h)

2. ALTO RIESGO — si aplica, nivel = "high"
   - Art. 6.1 y Anexo I: componente de seguridad de un producto regulado, o producto en sí,
     que requiere evaluación de la conformidad de terceros.
   - Art. 6.2 y Anexo III: 1 biometría · 2 infraestructuras críticas · 3 educación ·
     4 empleo · 5 servicios esenciales (5.b solvencia, 5.c seguros de vida y salud) ·
     6 garantía del cumplimiento del Derecho · 7 migración · 8 justicia y procesos democráticos.
   - Art. 6.3: un sistema del Anexo III no es de alto riesgo si cumple alguna condición del
     Art. 6.3 y no elabora perfiles de personas físicas.

3. RIESGO LIMITADO (Art. 50) — nivel = "limited" si no es prohibido ni de alto riesgo y:
   - 50.1 interactúa directamente con personas físicas
   - 50.2 genera contenido sintético de audio, imagen, vídeo o texto
   - 50.3 reconocimiento de emociones o categorización biométrica
   - 50.4 ultrasuplantaciones o texto publicado para informar sobre asuntos de interés público
   Los supuestos del Art. 50 también se suman a un sistema de alto riesgo.

4. RIESGO MÍNIMO — por exclusión, nivel = "minimal".

El modelo de IA de uso general (GPAI) NO es un nivel de riesgo: es una categoría aparte. Un
sistema basado en un modelo GPAI se clasifica por lo que hace. Si la organización es
proveedora de un modelo GPAI, añade las obligaciones de los Art. 53 (y 55 con riesgo sistémico).

## Catálogo de obligaciones

Usa EXCLUSIVAMENTE los códigos del catálogo que se incluye en el mensaje del usuario
(«AI-ACT-ART9», «AI-ACT-ART50»…). No inventes códigos ni uses etiquetas libres.
- nivel = "prohibited" → obligations_set = ["AI-ACT-ART5"] únicamente.
- Las obligaciones dependen del rol de la organización (proveedor, responsable del despliegue…):
  asigna solo las que correspondan a sus roles.

## Reglas de comportamiento

- Fundamenta CADA afirmación con el artículo o apartado exacto del AI Act.
  Formato: "según el Art. X(Y) del AI Act" o "[AI Act Art. X]"
- Aplica el principio de inclusión conservadora: ante la duda,
  clasifica hacia el nivel de riesgo más alto justificable.
- Cuando un atributo sea ambiguo, declara la ambigüedad explícitamente.
- No inventes obligaciones que no estén en el texto normativo.
- El nivel "prohibited" solo aplica con evidencia clara — no por precaución.
- El contexto de Banco Iberia es banca/finanzas: los sistemas financieros
  que afecten a personas y produzcan decisiones/clasificaciones/puntuaciones
  caen en Anexo III §4 (alto riesgo).

## Formato de respuesta

Responde ÚNICAMENTE con JSON válido con esta estructura exacta.
No incluyas texto fuera del JSON. No uses markdown. No uses bloques de código.

{
  "aiact_risk_level": "prohibited" | "high" | "limited" | "minimal",
  "confidence": "high" | "medium" | "low",

  "obligations_set": ["AI-ACT-ART9", "AI-ACT-ART10", ...],

  "classification_factors": {
    "domain": "finanzas_banca" | "credito" | "rrhh" | "atencion_cliente" | "salud" | "educacion" | "infraestructura" | "justicia" | "migracion" | "otro",
    "output_type": "decision" | "clasificacion" | "prediccion" | "recomendacion" | "generacion" | "deteccion" | "puntuacion" | "otro",
    "affects_persons": boolean,
    "has_biometric": boolean,
    "is_gpai": boolean,
    "manages_critical_infrastructure": boolean,
    "affects_vulnerable_groups": boolean,
    "involves_minors": boolean,
    "intended_use": string | null
  },

  "is_prohibited": boolean,
  "prohibited_practice": string | null,
  "prohibited_justification": string | null,

  "is_high_risk": boolean,
  "annexiii_items": [
    {
      "section": "Anexo III §N",
      "description": "descripción del ítem",
      "applies_because": "justificación específica para este sistema"
    }
  ],
  "annexii_applies": boolean,

  "is_provider": boolean,
  "is_deployer": boolean,
  "is_both": boolean,
  "role_justification": string,

  "is_gpai": boolean,
  "gpai_systemic_risk": boolean,
  "gpai_justification": string | null,

  "transparency_obligations": [string],

  "flags": [
    {
      "severity": "error" | "warning" | "info",
      "field": "nombre_del_campo",
      "message": "descripción del problema",
      "suggestion": "cómo resolverlo"
    }
  ],

  "clarification_questions": [
    {
      "id": "q1",
      "question": "texto de la pregunta",
      "why_needed": "por qué afecta a la clasificación",
      "field_to_update": "campo de ai_systems a actualizar",
      "options": ["opción 1", "opción 2"] | null
    }
  ],

  "classification_note": "Texto narrativo completo con la justificación de la clasificación, incluyendo referencias normativas exactas. Mínimo 100 palabras.",

  "normative_refs": [
    {
      "source": "AI Act",
      "article": "Art. 6",
      "relevance": "por qué es relevante para este sistema"
    }
  ]
}
"""


# ═══════════════════════════════════════════════════════════
# USER PROMPT BUILDER
# ═══════════════════════════════════════════════════════════

def build_classification_user_prompt(system: dict, chunks: list, catalog: dict | None = None) -> str:
    """
    Construye el prompt de usuario con la ficha del sistema
    y los chunks RAG recuperados por el retriever.

    system: dict con los campos de fluxion.ai_systems.
            Puede incluir 'rules_engine_classification' con el resultado
            del motor de reglas determinista como referencia.
    chunks: lista de dicts con {section_ref, short_name, content}
    """

    def fmt(val, default="no declarado"):
        if val is None:
            return default
        if isinstance(val, list):
            return ", ".join(str(v) for v in val) if val else default
        if isinstance(val, bool):
            return "Sí" if val else "No"
        return str(val)

    system_profile = f"""## Sistema a clasificar

**Nombre:** {fmt(system.get('name'))}
**Código:** {fmt(system.get('code'), '—')}
**Descripción:** {fmt(system.get('description'))}

### Atributos de clasificación

| Atributo | Valor |
|----------|-------|
| Dominio de aplicación | {fmt(system.get('domain'))} |
| Tipo de sistema IA | {fmt(system.get('ai_system_type'))} |
| Tipo de output | {fmt(system.get('output_type'))} |
| ¿Modelo GPAI? | {fmt(system.get('is_gpai'))} |
| ¿Afecta directamente a personas? | {fmt(system.get('affects_persons'))} |
| ¿Procesa datos biométricos? | {fmt(system.get('biometric') or system.get('uses_biometric_data'))} |
| ¿Afecta a menores de 18? | {fmt(system.get('has_minors') or system.get('involves_minors'))} |
| ¿Afecta a colectivos vulnerables? | {fmt(system.get('vulnerable_groups') or system.get('affects_vulnerable_groups'))} |
| ¿Infraestructura crítica? | {fmt(system.get('critical_infra') or system.get('manages_critical_infra'))} |
| ¿Proveedor externo? | {fmt(system.get('external_provider'))} |
| ¿Usa modelos de terceros? | {fmt(system.get('uses_third_party_model') or system.get('external_model'))} |
| ¿Procesa datos personales? | {fmt(system.get('processes_personal_data'))} |
| Entorno de despliegue | {fmt(system.get('deployment_environment') or system.get('active_environments'))} |
| Sector regulatorio | {fmt(system.get('regulatory_sector'))} |
| Estado del sistema | {fmt(system.get('status'))} |
| Propósito/caso de uso | {fmt(system.get('purpose') or system.get('intended_use'))} |

### Clasificación actual (si existe)
- Nivel de riesgo AI Act: {fmt(system.get('aiact_risk_level'), 'no clasificado')}
- Nota anterior: {fmt(system.get('classification_note'), '—')}
- Requiere revisión: {fmt(system.get('requires_agent_review'))}
"""

    # Resultado del motor de reglas determinista como referencia (si se proporciona)
    rules_engine_result = system.get('rules_engine_classification')
    if rules_engine_result:
        system_profile += f"""
### Clasificación del motor de reglas (referencia)

El motor único de Fluxion ha producido esta clasificación con las reglas del AI Act.
Úsala como punto de partida. Si tu análisis diverge, documenta el motivo
en classification_note y añade un flag con severity="warning".

- Ámbito: {rules_engine_result.get('scope', '—')}
- Nivel: {rules_engine_result.get('risk_level', '—')}
- Obligaciones: {', '.join(rules_engine_result.get('obligations_set', []))}
- Basis: {rules_engine_result.get('basis', '—')}
"""

    if catalog:
        system_profile += "\n### Catálogo de obligaciones (códigos válidos)\n\n"
        for code, label in sorted(catalog.items()):
            system_profile += f"- {code}: {label}\n"

    if chunks:
        rag_context = "\n## Contexto normativo relevante (recuperado del corpus)\n\n"
        for chunk in chunks:
            source = chunk.get('short_name', 'Normativa')
            ref    = chunk.get('section_ref', '—')
            rag_context += f"### [{source} — {ref}]\n"
            rag_context += chunk.get('content', '') + "\n\n"
    else:
        rag_context = "\n## Contexto normativo\n\nNo se recuperaron fragmentos adicionales del corpus.\nUsa tu conocimiento del AI Act para clasificar el sistema.\n\n"

    task = """
## Tu tarea

Analiza el perfil del sistema anterior aplicando el árbol de decisión del AI Act.
Usa los fragmentos normativos proporcionados para fundamentar tu clasificación.
Incluye siempre los campos obligations_set y classification_factors en tu respuesta.

Produce la clasificación completa en el formato JSON especificado.
Responde ÚNICAMENTE con el JSON, sin texto adicional.
"""

    return system_profile + rag_context + task
