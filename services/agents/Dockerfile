# Servicio: fluxion-agents (Agente 1 · clasificación AI Act, Agente 4 · asistente SGAI)
#
# CONTEXTO DE BUILD: la raíz del monorepo, no esta carpeta.
# Es obligatorio para poder copiar packages/py-common, que queda fuera de
# services/agents. En Dokploy: contexto = raíz, dockerfile = services/agents/Dockerfile

FROM python:3.11-slim

WORKDIR /app

# Dependencias primero: se cachean mientras requirements.txt no cambie
COPY services/agents/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Librería compartida entre servicios Python
COPY packages/py-common/fluxion_common/ ./fluxion_common/

# Código del servicio
COPY services/agents/fluxion_agents/ ./fluxion_agents/

EXPOSE 8001

CMD ["uvicorn", "fluxion_agents.main:app", "--host", "0.0.0.0", "--port", "8001"]
