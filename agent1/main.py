"""
agent1/main.py
Servidor FastAPI — Agente 1 (Clasificación AI Act) + Agente 4 (Asistente SGAI)
Puerto: 8001

Arrancar con:
  uvicorn agent1.main:app --reload --port 8001
"""

import os
import json
import logging
from datetime import datetime
from typing import Optional

from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from openai import OpenAI
from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

from agent1.prompts.classification import (
    CLASSIFICATION_SYSTEM_PROMPT,
    build_classification_user_prompt,
)
from agent1.rag.retriever import retrieve_for_classification
from agent1.routes.assistant import register_assistant_routes
from agent1.routes.classification import register_classification_routes


load_dotenv(Path(__file__).parent.parent / '.env.local')

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("agent1")

# ─── Clientes globales ──────────────────────────────────────
openai_client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
sb: Client = create_client(
    os.getenv("SUPABASE_URL"),
    os.getenv("SUPABASE_SERVICE_KEY")
)

# ─── FastAPI app ─────────────────────────────────────────────
app = FastAPI(
    title="Fluxion Agent Server",
    description="Agente 1: Clasificación AI Act",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("FRONTEND_URL", "http://localhost:3000")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ═══════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════

def verify_token(authorization: str) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token no proporcionado")
    token = authorization.split(" ", 1)[1]
    try:
        user_response = sb.auth.get_user(token)
        if not user_response.user:
            raise HTTPException(401, "Token inválido")
        return user_response.user
    except Exception:
        raise HTTPException(401, "Token inválido o expirado")


def get_user_profile(user_id: str) -> dict:
    result = sb.schema("fluxion").table("profiles")\
        .select("id, user_id, organization_id, role")\
        .eq("user_id", user_id)\
        .single()\
        .execute()
    if not result.data:
        raise HTTPException(404, "Usuario no pertenece a ninguna organización")
    return result.data


def get_system(system_id: str, organization_id: str) -> dict:
    result = sb.schema("fluxion").table("ai_systems")\
        .select("*")\
        .eq("id", system_id)\
        .eq("organization_id", organization_id)\
        .single()\
        .execute()
    if not result.data:
        raise HTTPException(404, "Sistema no encontrado o sin acceso")
    return result.data


# ═══════════════════════════════════════════════════════════
# MODELOS PYDANTIC
# ═══════════════════════════════════════════════════════════

class ClassifyRequest(BaseModel):
    system_id: str
    include_reasoning: bool = True
    force_reclassify: bool = False


class ConfirmRequest(BaseModel):
    session_id: str


# ═══════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "agent": "classification", "version": "1.0.0"}


@app.post("/api/agent/classify-system")
async def classify_system(
    request: ClassifyRequest,
    authorization: str = Header(None)
):
    """
    Clasifica un sistema IA usando GPT-4o con streaming.

    Flujo:
    1. Verificar auth + cargar sistema
    2. Crear sesión del agente
    3. RAG: recuperar chunks relevantes del corpus
    4. Llamar a OpenAI con streaming
    5. Parsear JSON de respuesta
    6. Guardar propuesta en agent_sessions
    7. SSE → frontend
    """
    # Auth
    user = verify_token(authorization)
    profile = get_user_profile(user.id)
    org_id = profile["organization_id"]

    # Cargar sistema
    system = get_system(request.system_id, org_id)

    # Si ya está clasificado y no se fuerza re-clasificación
    if not request.force_reclassify and system.get("classification_confirmed_at"):
        session_id = system.get("classification_session_id")
        if session_id:
            existing = sb.schema("fluxion").table("agent_sessions")\
                .select("output")\
                .eq("id", session_id)\
                .single()\
                .execute()
            if existing.data and existing.data.get("output"):
                return {
                    "status": "already_classified",
                    "proposal": existing.data["output"]
                }

    # Crear sesión
    trigger = "reclassification" if system.get("aiact_risk_level") else "initial"
    session_result = sb.schema("fluxion").table("agent_sessions").insert({
        "organization_id": org_id,
        "system_id":       request.system_id,
        "agent_type":      "classification",
        "status":          "running",
        "trigger":         trigger,
        "created_by":      user.id,
    }).execute()
    session_id = session_result.data[0]["id"]
    logger.info(f"Sesión creada: {session_id} | Sistema: {system['name']} | Trigger: {trigger}")

    # RAG
    logger.info(f"Ejecutando RAG para sistema: {system['name']}")
    chunks, rag_metadata = retrieve_for_classification(system, max_chunks=12)

    sb.schema("fluxion").table("agent_sessions").update({
        "chunks_retrieved": len(chunks),
        "rag_queries":      rag_metadata,
    }).eq("id", session_id).execute()

    logger.info(f"RAG completado: {len(chunks)} chunks para {system['name']}")

    # Construir prompt
    user_prompt = build_classification_user_prompt(system=system, chunks=chunks)

    # Streaming con OpenAI
    async def stream_classification():
        full_response = ""
        message_index = 0

        try:
            # Llamada a OpenAI con stream=True
            stream = openai_client.chat.completions.create(
                model="gpt-5.4",
                max_completion_tokens=4000,
                stream=True,
                messages=[
                    {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
                    {"role": "user",   "content": user_prompt},
                ]
            )

            for chunk in stream:
                if chunk.choices[0].finish_reason == "stop":
                    break

                delta = chunk.choices[0].delta
                text = delta.content if delta.content is not None else ""

                if not text:
                    continue

                full_response += text

                # Solo SSE al frontend — sin INSERT por token
                yield f"data: {json.dumps({'delta': text, 'session_id': session_id})}\n\n"

            # Guardar mensaje completo UNA vez al terminar el stream
            sb.schema("fluxion").table("agent_messages").insert({
                "session_id":    session_id,
                "role":          "assistant",
                "content":       full_response,
                "message_index": 1,
            }).execute()

            # Parsear el JSON completo acumulado
            clean_response = full_response.strip()
            # Limpiar bloques markdown si GPT los añade
            if clean_response.startswith("```"):
                lines = clean_response.split("\n")
                clean_response = "\n".join(lines[1:])
            if clean_response.endswith("```"):
                lines = clean_response.split("\n")
                clean_response = "\n".join(lines[:-1])
            clean_response = clean_response.strip()

            proposal = json.loads(clean_response)

            # Guardar propuesta completa en la sesión
            sb.schema("fluxion").table("agent_sessions").update({
                "status":        "completed",
                "output":        proposal,
                "model":         "gpt-5.4",
                "completed_at":  datetime.utcnow().isoformat(),
            }).eq("id", session_id).execute()

            logger.info(
                f"Clasificación completada: {system['name']} → "
                f"{proposal.get('aiact_risk_level')} "
                f"(confianza: {proposal.get('confidence')})"
            )

            # Evento final con la propuesta completa
            yield f"data: {json.dumps({'type': 'complete', 'proposal': proposal, 'session_id': session_id})}\n\n"

        except json.JSONDecodeError as e:
            logger.error(f"Error parseando JSON: {e}\nRespuesta: {full_response[:500]}")
            sb.schema("fluxion").table("agent_sessions").update({
                "status": "failed",
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", session_id).execute()
            yield f"data: {json.dumps({'type': 'error', 'message': 'Respuesta del agente sin formato JSON válido. Intenta de nuevo.'})}\n\n"

        except Exception as e:
            logger.error(f"Error en clasificación: {e}", exc_info=True)
            sb.schema("fluxion").table("agent_sessions").update({
                "status": "failed",
                "completed_at": datetime.utcnow().isoformat(),
            }).eq("id", session_id).execute()
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        stream_classification(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
            "Connection": "keep-alive",
        }
    )

def map_risk_level(level: str) -> str:
    mapping = {
        "prohibited":   "prohibited",
        "high_risk":    "high",
        "limited_risk": "limited",
        "minimal_risk": "minimal",
    }
    return mapping.get(level, "pending")

@app.post("/api/agent/classify-system/confirm")
async def confirm_classification(
    request: ConfirmRequest,
    authorization: str = Header(None)
):
    """
    Confirma la propuesta del agente.
    Actualiza fluxion.ai_systems con la clasificación confirmada.
    """
    user = verify_token(authorization)
    profile = get_user_profile(user.id)
    org_id = profile["organization_id"]

    session_result = sb.schema("fluxion").table("agent_sessions")\
        .select("*")\
        .eq("id", request.session_id)\
        .eq("organization_id", org_id)\
        .eq("agent_type", "classification")\
        .eq("status", "completed")\
        .single()\
        .execute()

    if not session_result.data:
        raise HTTPException(404, "Sesión no encontrada o no completada")

    session = session_result.data
    proposal = session["output"]

    if not proposal:
        raise HTTPException(422, "La sesión no tiene propuesta de clasificación")

    system_id = session["system_id"]

    sb.schema("fluxion").table("ai_systems").update({
        "aiact_risk_level":             map_risk_level(proposal["aiact_risk_level"]),
        "is_gpai":                      proposal.get("is_gpai", False),
        "classification_session_id":    request.session_id,
        "classification_confirmed_at":  datetime.utcnow().isoformat(),
        "classification_note":          proposal.get("classification_note", ""),
        "requires_agent_review":        len(proposal.get("clarification_questions", [])) > 0,
        "updated_at":                   datetime.utcnow().isoformat(),
    }).eq("id", system_id).eq("organization_id", org_id).execute()

    sb.schema("fluxion").table("agent_sessions").update({
        "confirmed_by": user.id,
        "confirmed_at": datetime.utcnow().isoformat(),
    }).eq("id", request.session_id).execute()

    confirmed_level = map_risk_level(proposal["aiact_risk_level"])

    logger.info(
        f"Clasificación confirmada: sistema {system_id} → "
        f"{confirmed_level} por usuario {user.id}"
    )

    return {
        "status":           "confirmed",
        "system_id":        system_id,
        "aiact_risk_level": confirmed_level,
        "is_gpai":          proposal.get("is_gpai", False),
        "requires_review":  len(proposal.get("clarification_questions", [])) > 0,
    }


@app.get("/api/agent/sessions/{session_id}")
async def get_session(
    session_id: str,
    authorization: str = Header(None)
):
    user = verify_token(authorization)
    profile = get_user_profile(user.id)

    result = sb.schema("fluxion").table("agent_sessions")\
        .select("id, status, agent_type, trigger, output, chunks_retrieved, model, created_at, completed_at, confirmed_at")\
        .eq("id", session_id)\
        .eq("organization_id", profile["organization_id"])\
        .single()\
        .execute()

    if not result.data:
        raise HTTPException(404, "Sesión no encontrada")

    return result.data


@app.get("/api/systems/{system_id}/classification-history")
async def get_classification_history(
    system_id: str,
    authorization: str = Header(None)
):
    user = verify_token(authorization)
    profile = get_user_profile(user.id)

    result = sb.schema("fluxion").table("agent_sessions")\
        .select("id, status, trigger, output, model, created_at, completed_at, confirmed_at, confirmed_by")\
        .eq("system_id", system_id)\
        .eq("organization_id", profile["organization_id"])\
        .eq("agent_type", "classification")\
        .order("created_at", desc=True)\
        .limit(10)\
        .execute()

    return {"history": result.data or []}


# ═══════════════════════════════════════════════════════════
# AGENTE 4 — Asistente conversacional
# ═══════════════════════════════════════════════════════════

register_assistant_routes(
    app=app,
    sb=sb,
    openai_client=openai_client,
    verify_token=verify_token,
    get_user_profile=get_user_profile,
)

register_classification_routes(
    app=app,
    sb=sb,
    verify_token=verify_token,
    get_user_profile=get_user_profile,
)