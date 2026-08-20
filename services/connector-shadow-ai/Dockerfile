# Servicio: fluxion-connector-shadow-ai
#
# CONTEXTO DE BUILD: la raíz del monorepo, no esta carpeta.
# En Dokploy: contexto = raíz, dockerfile = services/connector-shadow-ai/Dockerfile
#
# Distribución fijada por la misma razón que en los otros servicios:
# `python:3.11-slim` a secas se movió a Debian 13 y rompió un build.

FROM python:3.11-slim-bookworm

WORKDIR /app

COPY services/connector-shadow-ai/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/py-common/fluxion_common/ ./fluxion_common/
COPY services/connector-shadow-ai/fluxion_connector_shadow_ai/ ./fluxion_connector_shadow_ai/

CMD ["python", "-m", "fluxion_connector_shadow_ai.main"]
