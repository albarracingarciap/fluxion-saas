"""
agent1/routes/assistant.py
Agente 4 — Asistente conversacional del responsable del SGAI

Endpoints:
  POST   /api/agent/assistant/chat                      → SSE streaming
  GET    /api/agent/assistant/conversations              → lista
  GET    /api/agent/assistant/conversations/{id}         → detalle
  DELETE /api/agent/assistant/conversations/{id}         → borrar
"""

import json
import logging
from datetime import datetime, date, timezone
from typing import Optional

from fastapi import APIRouter, Header, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel
from supabase import Client

from agent1.prompts.assistant import ASSISTANT_SYSTEM_PROMPT
from agent1.rag.retriever import retrieve_chunks

logger = logging.getLogger("agent4")

router = APIRouter()

# ═══════════════════════════════════════════════════════════
# MODELOS PYDANTIC
# ═══════════════════════════════════════════════════════════

class AssistantMessage(BaseModel):
    role: str
    content: str


class AssistantRequest(BaseModel):
    message: str
    conversation_id: Optional[str] = None
    context_page: str = "/"
    context_system_id: Optional[str] = None
    history: list[AssistantMessage] = []


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════

def needs_rag(user_message: str) -> bool:
    """Determina si la pregunta necesita recuperación RAG."""
    msg = user_message.lower()

    state_keywords = [
        "cuántos", "cuántas", "cuál es el estado", "qué sistemas",
        "qué falta", "cómo voy", "qué gaps", "cuándo vence",
    ]
    if any(kw in msg for kw in state_keywords):
        return False

    platform_keywords = ["dónde", "qué hace", "botón", "pantalla", "cómo se usa", "cómo navego"]
    if any(kw in msg for kw in platform_keywords):
        return False

    normative_keywords = [
        "art.", "artículo", "iso", "anexo", "reglamento", "obliga",
        "requiere", "exige", "plazo", "sanción", "multa", "certificación",
        "dora", "rgpd", "gdpr", "aesia", "considerando", "obligación",
        "cumplimiento", "norma", "directiva", "reglamento",
    ]
    if any(kw in msg for kw in normative_keywords):
        return True

    return True


def retrieve_for_assistant(query: str, top_k: int = 4) -> list[dict]:
    """RAG para el asistente: todos los source_types, threshold 0.75."""
    return retrieve_chunks(
        query=query,
        source_types=["eu_regulation", "iso_standard", "authority_guide", "tenant_doc"],
        match_count=top_k,
        match_threshold=0.72,
    )


def build_tenant_context(
    sb: Client,
    org_id: str,
    current_page: str,
    current_system_id: Optional[str] = None,
) -> str:
    """
    Construye el contexto del tenant para el Agente 4.
    Adaptado a supabase-py (síncrono, schema fluxion).
    Objetivo: conciso, ≤ 1.500 tokens.
    """

    # ── Inventario de sistemas ──────────────────────────────
    systems_res = (
        sb.schema("fluxion")
        .table("ai_systems")
        .select("name, code, aiact_risk_level, domain, status")
        .eq("organization_id", org_id)
        .order("name")
        .execute()
    )
    systems = systems_res.data or []

    # Zona actual de cada sistema (última evaluación aprobada)
    zone_by_system: dict[str, str] = {}
    if systems:
        system_ids = [s["id"] for s in systems if "id" in s]
        # Re-fetch with id to get zones
        systems_full_res = (
            sb.schema("fluxion")
            .table("ai_systems")
            .select("id, name, code, aiact_risk_level, domain, status")
            .eq("organization_id", org_id)
            .order("name")
            .execute()
        )
        systems = systems_full_res.data or []
        system_ids = [s["id"] for s in systems]

        if system_ids:
            evals_res = (
                sb.schema("fluxion")
                .table("fmea_evaluations")
                .select("system_id, cached_zone")
                .in_("system_id", system_ids)
                .eq("state", "approved")
                .order("created_at", desc=True)
                .execute()
            )
            seen = set()
            for ev in (evals_res.data or []):
                sid = ev["system_id"]
                if sid not in seen and ev.get("cached_zone"):
                    zone_by_system[sid] = ev["cached_zone"]
                    seen.add(sid)

    # ── Estado de gaps ──────────────────────────────────────
    gaps_res = (
        sb.schema("fluxion")
        .table("gaps")
        .select("status")
        .eq("organization_id", org_id)
        .execute()
    )
    gaps = gaps_res.data or []
    open_statuses = {"auto_detected", "confirmed", "in_progress"}
    gaps_open   = sum(1 for g in gaps if g.get("status") in open_statuses)
    gaps_resolved = sum(1 for g in gaps if g.get("status") == "resolved")
    gaps_accepted = sum(1 for g in gaps if g.get("status") == "accepted_risk")

    # ── Planes de tratamiento con plazo próximo ─────────────
    today_str = date.today().isoformat()
    thirty_days_str = (date.today().replace(year=date.today().year) if False else
                       date.fromordinal(date.today().toordinal() + 30).isoformat())

    urgent_plans: list[dict] = []
    try:
        plans_res = (
            sb.schema("fluxion")
            .table("treatment_plans")
            .select("code, deadline, zone_at_creation, actions_completed, actions_total, system_id")
            .eq("organization_id", org_id)
            .in_("status", ["approved", "in_progress"])
            .lte("deadline", thirty_days_str)
            .order("deadline")
            .limit(5)
            .execute()
        )
        urgent_plans = plans_res.data or []

        # Enriquecer con nombre del sistema
        if urgent_plans:
            plan_system_ids = list({p["system_id"] for p in urgent_plans if p.get("system_id")})
            names_res = (
                sb.schema("fluxion")
                .table("ai_systems")
                .select("id, name")
                .in_("id", plan_system_ids)
                .execute()
            )
            name_map = {s["id"]: s["name"] for s in (names_res.data or [])}
            for p in urgent_plans:
                p["system_name"] = name_map.get(p.get("system_id"), "—")
    except Exception as e:
        logger.warning(f"[build_tenant_context] No se pudieron cargar planes: {e}")

    # ── Evidencias próximas a caducar ───────────────────────
    expiring: list[dict] = []
    try:
        exp_res = (
            sb.schema("fluxion")
            .table("evidences")
            .select("title, valid_until")
            .eq("organization_id", org_id)
            .not_.is_("valid_until", "null")
            .lte("valid_until", thirty_days_str)
            .order("valid_until")
            .limit(5)
            .execute()
        )
        expiring = exp_res.data or []
    except Exception as e:
        logger.warning(f"[build_tenant_context] No se pudieron cargar evidencias: {e}")

    # ── Sistema activo en pantalla ──────────────────────────
    current_system_ctx = ""
    if current_system_id:
        try:
            sys_res = (
                sb.schema("fluxion")
                .table("ai_systems")
                .select("name, code, aiact_risk_level, domain, status, classification_note, description")
                .eq("id", current_system_id)
                .eq("organization_id", org_id)
                .single()
                .execute()
            )
            if sys_res.data:
                s = sys_res.data
                desc = (s.get("description") or "—")[:200]
                current_system_ctx = (
                    f"\n## Sistema activo en pantalla\n\n"
                    f"**{s['name']}** ({s.get('code', '—')})\n"
                    f"- Clasificación: {s.get('aiact_risk_level') or 'sin clasificar'}\n"
                    f"- Dominio: {s.get('domain') or '—'}\n"
                    f"- Estado: {s.get('status') or '—'}\n"
                    f"- Descripción: {desc}\n"
                )
        except Exception as e:
            logger.warning(f"[build_tenant_context] No se pudo cargar sistema activo: {e}")

    # ── Construir contexto ──────────────────────────────────
    ctx = f"\n## Contexto de la organización\n\n**Página actual:** {current_page}\n"

    ctx += f"\n### Inventario de sistemas IA ({len(systems)} sistemas)\n"
    for s in systems:
        zone = zone_by_system.get(s.get("id", ""), "Sin evaluar")
        risk = s.get("aiact_risk_level") or "sin clasificar"
        ctx += f"- **{s['name']}** ({s.get('code', '—')}): {risk} | Zona: {zone}\n"

    ctx += (
        f"\n### Estado de gaps normativas\n"
        f"- Abiertos: {gaps_open} | Resueltos: {gaps_resolved} | Riesgo aceptado: {gaps_accepted}\n"
    )

    if urgent_plans:
        ctx += "\n### Planes de tratamiento con plazo próximo (<30 días)\n"
        for p in urgent_plans:
            ctx += (
                f"- {p.get('system_name', '—')} — {p.get('code', '—')} "
                f"({p.get('actions_completed', 0)}/{p.get('actions_total', 0)} acciones) "
                f"vence {p.get('deadline', '—')}\n"
            )

    if expiring:
        ctx += "\n### Evidencias próximas a caducar\n"
        for e in expiring:
            ctx += f"- {e.get('title', '—')} — caduca {e.get('valid_until', '—')}\n"

    return current_system_ctx + ctx


# ═══════════════════════════════════════════════════════════
# ENDPOINT: chat (SSE)
# ═══════════════════════════════════════════════════════════

def make_chat_endpoint(sb: Client, openai_client: OpenAI, verify_token, get_user_profile):

    async def chat(
        request: AssistantRequest,
        authorization: str = Header(None),
    ):
        """
        Envía un mensaje al asistente y recibe la respuesta como SSE.
        Gestiona conversaciones persistentes en assistant_conversations.
        """
        user = verify_token(authorization)
        profile = get_user_profile(user.id)
        org_id = profile["organization_id"]

        # ── 1. Cargar o crear conversación ──────────────────
        if request.conversation_id:
            conv_res = (
                sb.schema("fluxion")
                .table("assistant_conversations")
                .select("id")
                .eq("id", request.conversation_id)
                .eq("user_id", user.id)
                .eq("organization_id", org_id)
                .single()
                .execute()
            )
            if not conv_res.data:
                raise HTTPException(404, "Conversación no encontrada")
            conv_id = conv_res.data["id"]
        else:
            title = request.message[:60] + ("..." if len(request.message) > 60 else "")
            new_conv = (
                sb.schema("fluxion")
                .table("assistant_conversations")
                .insert({
                    "organization_id": org_id,
                    "user_id":         user.id,
                    "title":           title,
                    "context_page":    request.context_page,
                    "context_system":  request.context_system_id,
                    "messages":        [],
                })
                .execute()
            )
            conv_id = new_conv.data[0]["id"]

        # ── 2. Contexto del tenant ──────────────────────────
        try:
            tenant_ctx = build_tenant_context(
                sb=sb,
                org_id=org_id,
                current_page=request.context_page,
                current_system_id=request.context_system_id,
            )
        except Exception as e:
            logger.warning(f"[chat] Error construyendo contexto tenant: {e}")
            tenant_ctx = ""

        # ── 3. RAG ─────────────────────────────────────────
        rag_context = ""
        if needs_rag(request.message):
            try:
                chunks = retrieve_for_assistant(request.message, top_k=4)
                if chunks:
                    rag_context = "\n## Referencias normativas relevantes\n\n"
                    for chunk in chunks:
                        rag_context += (
                            f"**[{chunk.get('short_name', '—')} — "
                            f"{chunk.get('section_ref', '—')}]**\n"
                            f"{str(chunk.get('content', ''))[:500]}\n\n"
                        )
                    logger.info(f"[chat] RAG: {len(chunks)} chunks recuperados")
            except Exception as e:
                logger.warning(f"[chat] Error en RAG: {e}")

        # ── 4. Construir mensajes ───────────────────────────
        system_prompt = ASSISTANT_SYSTEM_PROMPT + tenant_ctx + rag_context

        messages = []
        for msg in request.history[-18:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        # ── 5. Streaming ────────────────────────────────────
        async def stream_response():
            full_response = ""
            try:
                stream = openai_client.chat.completions.create(
                    model="gpt-5.4",
                    max_completion_tokens=2000,
                    stream=True,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        *messages,
                    ],
                )

                for chunk in stream:
                    if chunk.choices[0].finish_reason == "stop":
                        break
                    delta = chunk.choices[0].delta
                    text = delta.content if delta.content is not None else ""
                    if not text:
                        continue
                    full_response += text
                    yield f"data: {json.dumps({'delta': text, 'conversation_id': conv_id})}\n\n"

                # ── 6. Persistir historial ──────────────────
                now_iso = datetime.now(timezone.utc).isoformat()
                new_messages = [
                    {"role": "user",      "content": request.message,  "timestamp": now_iso},
                    {"role": "assistant", "content": full_response,     "timestamp": now_iso},
                ]

                try:
                    # Cargar mensajes existentes y concatenar
                    existing_res = (
                        sb.schema("fluxion")
                        .table("assistant_conversations")
                        .select("messages")
                        .eq("id", conv_id)
                        .single()
                        .execute()
                    )
                    existing_msgs = existing_res.data.get("messages", []) if existing_res.data else []
                    updated_msgs = existing_msgs + new_messages

                    sb.schema("fluxion").table("assistant_conversations").update({
                        "messages":        updated_msgs,
                        "last_message_at": now_iso,
                    }).eq("id", conv_id).execute()
                except Exception as e:
                    logger.error(f"[chat] Error guardando historial: {e}")

                yield f"data: {json.dumps({'type': 'complete', 'conversation_id': conv_id})}\n\n"

            except Exception as e:
                logger.error(f"[chat] Error en streaming: {e}", exc_info=True)
                yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

        return StreamingResponse(
            stream_response(),
            media_type="text/event-stream",
            headers={
                "Cache-Control":    "no-cache",
                "X-Accel-Buffering": "no",
                "Connection":       "keep-alive",
            },
        )

    return chat


# ═══════════════════════════════════════════════════════════
# ENDPOINTS: gestión de conversaciones
# ═══════════════════════════════════════════════════════════

def make_list_conversations(sb: Client, verify_token, get_user_profile):
    async def list_conversations(authorization: str = Header(None)):
        user = verify_token(authorization)
        profile = get_user_profile(user.id)

        res = (
            sb.schema("fluxion")
            .table("assistant_conversations")
            .select("id, title, context_page, last_message_at, messages")
            .eq("user_id", user.id)
            .eq("organization_id", profile["organization_id"])
            .order("last_message_at", desc=True)
            .limit(20)
            .execute()
        )
        rows = res.data or []
        return [
            {
                "id":              r["id"],
                "title":           r.get("title"),
                "context_page":    r.get("context_page"),
                "last_message_at": r.get("last_message_at"),
                "message_count":   len(r.get("messages") or []),
            }
            for r in rows
        ]

    return list_conversations


def make_get_conversation(sb: Client, verify_token, get_user_profile):
    async def get_conversation(conv_id: str, authorization: str = Header(None)):
        user = verify_token(authorization)
        profile = get_user_profile(user.id)

        res = (
            sb.schema("fluxion")
            .table("assistant_conversations")
            .select("id, title, context_page, context_system, messages, last_message_at, created_at")
            .eq("id", conv_id)
            .eq("user_id", user.id)
            .eq("organization_id", profile["organization_id"])
            .single()
            .execute()
        )
        if not res.data:
            raise HTTPException(404, "Conversación no encontrada")
        return res.data

    return get_conversation


def make_delete_conversation(sb: Client, verify_token, get_user_profile):
    async def delete_conversation(conv_id: str, authorization: str = Header(None)):
        user = verify_token(authorization)
        profile = get_user_profile(user.id)

        sb.schema("fluxion").table("assistant_conversations").delete().eq(
            "id", conv_id
        ).eq("user_id", user.id).eq(
            "organization_id", profile["organization_id"]
        ).execute()

        return {"status": "deleted"}

    return delete_conversation


# ═══════════════════════════════════════════════════════════
# REGISTRO DE RUTAS
# ═══════════════════════════════════════════════════════════

def register_assistant_routes(app, sb: Client, openai_client: OpenAI, verify_token, get_user_profile):
    """Registra todos los endpoints del Agente 4 en la app FastAPI."""

    app.add_api_route(
        "/api/agent/assistant/chat",
        make_chat_endpoint(sb, openai_client, verify_token, get_user_profile),
        methods=["POST"],
        summary="Agente 4: chat SSE",
    )
    app.add_api_route(
        "/api/agent/assistant/conversations",
        make_list_conversations(sb, verify_token, get_user_profile),
        methods=["GET"],
        summary="Listar conversaciones del usuario",
    )
    app.add_api_route(
        "/api/agent/assistant/conversations/{conv_id}",
        make_get_conversation(sb, verify_token, get_user_profile),
        methods=["GET"],
        summary="Obtener conversación con mensajes",
    )
    app.add_api_route(
        "/api/agent/assistant/conversations/{conv_id}",
        make_delete_conversation(sb, verify_token, get_user_profile),
        methods=["DELETE"],
        summary="Eliminar conversación",
    )
