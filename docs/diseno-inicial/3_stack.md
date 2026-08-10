## FLUXION — STACK TÉCNICO (Capa 2)

INFRAESTRUCTURA — DOS ENTORNOS:

DESARROLLO LOCAL (activo ahora):
- Máquina local del desarrollador
- Supabase Cloud (supabase.com) como servicio gestionado
- Servicios Python arrancados directamente con Uvicorn
  (sin Docker, máxima velocidad de iteración)
- n8n en local o saltado durante el desarrollo inicial
- Comando arranque backend:
    uvicorn app.main:app --reload --port 8000
- Comando arranque agent:
    uvicorn app.main:app --reload --port 8001

PRODUCCIÓN (destino final — VPS Hostinger):
- VPS Hostinger con acceso SSH root
- Docker Compose orquesta todos los servicios
- Supabase self-hosted (instancia propia en el VPS)
- n8n self-hosted (ya instalado)
- Nginx como reverse proxy + SSL via Certbot

El código es idéntico en ambos entornos.
La diferencia es únicamente en .env:

  # Desarrollo local → Supabase Cloud
  SUPABASE_URL=por definir
  SUPABASE_ANON_KEY=eyJ...   # del dashboard Supabase Cloud
  SUPABASE_SERVICE_KEY=eyJ...

  # Producción → Supabase self-hosted en VPS
  SUPABASE_URL=por definir
  SUPABASE_ANON_KEY=eyJ...   # generada en la instancia propia
  SUPABASE_SERVICE_KEY=eyJ...

SUPABASE (gestionado en ambos entornos):
- PostgreSQL 15 + extensión pgvector activada
- Supabase Auth → JWT, OAuth, magic links
- Supabase Storage → documentos, logos, evidencias
- Supabase Realtime → streaming agente via postgres changes
- Schemas: public (auth nativo), fluxion (app), rag (vectores)
- ANON_KEY: solo frontend (respeta RLS)
- SERVICE_KEY: solo backend/agent server-side (nunca al cliente)

SERVICIOS DOCKER COMPOSE (producción):
1. nginx     → reverse proxy + SSL
2. frontend  → Next.js 14, puerto 3000
3. backend   → FastAPI Python, puerto 8000
4. agent     → FastAPI agente independiente, puerto 8001
5. n8n       → ya instalado en el VPS
  (Supabase corre como instancia separada self-hosted,
   no como contenedor dentro de este Compose)

CACHE Y COLAS (Redis — evaluación pendiente):
- No incluido en el MVP inicial
- Si se necesita: añadir como servicio al Docker Compose
- Fallback sin Redis:
  · Sesiones del agente → tabla agent_sessions en Supabase
  · Tareas async → endpoints síncronos con background tasks
    de FastAPI (BackgroundTasks) para el MVP
  · Cache de embeddings → sin cache inicial, evaluar impacto
- Diseñar servicios con capa de abstracción intercambiable

FRONTEND STACK:
- Next.js 14 App Router, TypeScript strict
- shadcn/ui + Tailwind CSS
- Zustand (estado global) + TanStack Query (datos remotos)
- React Hook Form + Zod (formularios y validación)
- Framer Motion (transiciones de página)
- @supabase/supabase-js + @supabase/ssr

BACKEND STACK:
- FastAPI Python 3.11+
- SQLAlchemy 2.0 async + asyncpg
- Pydantic v2
- Verificación JWT Supabase (no genera tokens propios)
- BackgroundTasks de FastAPI para tareas asíncronas (MVP)
- supabase-py con SERVICE_KEY para operaciones admin

AGENT SERVICE STACK:
- FastAPI independiente (latencia LLM aislada del backend)
- Anthropic Claude API: claude-sonnet-4-20250514
- RAG: pgvector en Supabase via asyncpg
- Embeddings: voyage-3-lite o text-embedding-3-small
- Streaming: SSE → INSERT en agent_messages →
  Supabase Realtime → frontend
- Memoria de sesión: tabla agent_sessions en Supabase (MVP)
- Módulos sectoriales cargados desde /app/modules

VARIABLES DE ENTORNO (.env — nunca en git):
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_KEY=...
ANTHROPIC_API_KEY=...
SECRET_KEY=...              # para signing interno
ENVIRONMENT=development     # development | production

CONVENCIONES:
- TypeScript strict:true, sin 'any'
- Python: snake_case, type hints completos
- SQL: snake_case, UUIDs como PK, created_at + updated_at siempre
- Server Components por defecto, 'use client' solo si necesario
- Imports con alias: @/components, @/lib, @/types
- API responses: { "data": {...} } éxito / { "error": {...} } error