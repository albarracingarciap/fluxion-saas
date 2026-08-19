# Servicio: fluxion-telemetry
#
# CONTEXTO DE BUILD: la raíz del monorepo, no esta carpeta.
# En Dokploy: contexto = raíz, dockerfile = services/telemetry/Dockerfile
#
# Distribución fijada (bookworm) por la misma razón que en el renderizador:
# `python:3.11-slim` a secas se movió a Debian 13 y rompió un build.

FROM python:3.11-slim-bookworm

WORKDIR /app

COPY services/telemetry/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY services/telemetry/fluxion_telemetry/ ./fluxion_telemetry/

EXPOSE 8000

CMD ["uvicorn", "fluxion_telemetry.main:app", "--host", "0.0.0.0", "--port", "8000"]
