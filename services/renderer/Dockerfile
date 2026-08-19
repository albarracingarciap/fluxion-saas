# Servicio: fluxion-renderer
#
# CONTEXTO DE BUILD: la raíz del monorepo, no esta carpeta.
# En Dokploy: contexto = raíz, dockerfile = services/renderer/Dockerfile
#
# No copia packages/py-common a propósito: este servicio no habla con el Core.
# Recibe HTML y devuelve PDF. Cuanto menos sepa, menos puede filtrar.

# La etiqueta lleva la distribución fijada a propósito. `python:3.11-slim` pasó
# a Debian 13 (trixie), que Playwright 1.49 no reconoce: cae a las dependencias
# de Ubuntu 20.04 e intenta instalar ttf-unifont y ttf-ubuntu-font-family, que
# en trixie ya no existen. El build muere con exit 100.
FROM python:3.11-slim-bookworm

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
