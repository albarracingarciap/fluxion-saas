import os
import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar configuraciones del mismo archivo .env.local de Next.js si existe
load_dotenv(dotenv_path="../.env.local")

app = FastAPI(
    title="Fluxion API",
    description="Motores RIDE, FMEA y RAG Ingestors",
    version="1.0.0"
)

# Configurar CORS para permitir que el Frontend de Next.js consuma la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Inicializar Supabase Client con Role Key para saltar RLS desde el Backend
SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") # o la ANON_KEY para testing

if SUPABASE_URL and SUPABASE_KEY:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
else:
    logging.warning("Faltan credenciales de Supabase en las variables de entorno.")
    supabase = None
    
@app.get("/health")
def health_check():
    return {"status": "ok", "service": "Fluxion AI Engines"}

# Montar los routers de los motores aquí en el futuro
# from app.engines.fmea import router as fmea_router
# app.include_router(fmea_router, prefix="/api/fmea", tags=["fmea"])
