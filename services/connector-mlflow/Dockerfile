# Servicio: fluxion-connector-mlflow
#
# CONTEXTO DE BUILD: la raíz del monorepo, no esta carpeta.
# En Dokploy: contexto = raíz, dockerfile = services/connector-mlflow/Dockerfile

FROM python:3.11-slim

WORKDIR /app

COPY services/connector-mlflow/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY packages/py-common/fluxion_common/ ./fluxion_common/
COPY services/connector-mlflow/fluxion_connector_mlflow/ ./fluxion_connector_mlflow/

CMD ["python", "-m", "fluxion_connector_mlflow.main"]
