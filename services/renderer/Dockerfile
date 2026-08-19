# Servicio: fluxion-renderer
#
# CONTEXTO DE BUILD: la raíz del monorepo, no esta carpeta.
# En Dokploy: contexto = raíz, dockerfile = services/renderer/Dockerfile
#
# No copia packages/py-common a propósito: este servicio no habla con el Core.
# Recibe HTML y devuelve PDF. Cuanto menos sepa, menos puede filtrar.

FROM python:3.11-slim

WORKDIR /app

COPY services/renderer/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Chromium con sus dependencias del sistema. Es lo que engorda la imagen (~1 GB)
# y no hay forma de evitarlo si se quiere un PDF con el mismo maquetado que el
# navegador.
RUN playwright install --with-deps chromium

COPY services/renderer/fluxion_renderer/ ./fluxion_renderer/

EXPOSE 8000

CMD ["uvicorn", "fluxion_renderer.main:app", "--host", "0.0.0.0", "--port", "8000"]
