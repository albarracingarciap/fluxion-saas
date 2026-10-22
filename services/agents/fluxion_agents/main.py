"""
services/agents/fluxion_agents/main.py
Servidor FastAPI — Agente 1 (Clasificación AI Act) + Agente 4 (Asistente SGAI)
Puerto: 8001

Arrancar con:
  uvicorn fluxion_agents.main:app --reload --port 8001
"""

import os
import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

from supabase import create_client, Client
from dotenv import load_dotenv
from pathlib import Path

from fluxion_agents.routes.assistant import register_assistant_routes
from fluxion_agents.routes.classification import register_classification_routes
from fluxion_common.telemetry import init_telemetry


load_dotenv(Path(__file__).parent.parent / '.env.local')

# ─── Logging ────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s"
)
logger = logging.getLogger("fluxion_agents")

# ─── Clientes globales ──────────────────────────────────────
# AsyncOpenAI y no OpenAI: el cliente sincrono dentro de un manejador async
# bloquea el bucle de eventos, y mientras una llamada al modelo avanza
# ninguna otra peticion del servicio progresa. Con un usuario no se nota;
# con dos, los tiempos se triplican sin motivo aparente.
openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Telemetria de las llamadas al modelo. Si OTEL_EXPORTER_OTLP_ENDPOINT no esta
# definida no hace nada: la telemetria nunca puede ser el motivo de que el
# servicio falle. FLUXION_SYSTEM_ID adscribe los tramos a un sistema del
# inventario; sin el aparecen en la bandeja de telemetria sin adscribir.
init_telemetry(
    service_name="fluxion-agents",
    system_id=os.getenv("FLUXION_SYSTEM_ID"),
)
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


# ═══════════════════════════════════════════════════════════
# ENDPOINTS
# ═══════════════════════════════════════════════════════════

@app.get("/health")
def health():
    return {"status": "ok", "agent": "classification", "version": "1.0.0"}


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
    openai_client=openai_client,
)