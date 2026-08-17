"""Conector MLflow → Fluxion.

Recorre el registro de modelos de MLflow y publica una señal por cada versión.
No guarda estado: la idempotencia vive en el Core mediante `dedupe_key`, así que
cada pasada puede reenviar todo el registro sin duplicar nada.

Variables de entorno:

    FLUXION_API_URL          https://fluxion-ai.es
    FLUXION_API_KEY          clave con permiso signals:write
    MLFLOW_TRACKING_URI      http://mlflow:5000
    MLFLOW_USERNAME          opcional
    MLFLOW_PASSWORD          opcional
    POLL_INTERVAL_SECONDS    por defecto 900 (15 min)
    RUN_ONCE                 "true" para una sola pasada y salir
"""

import sys
import time

from fluxion_common import SignalsClient, SignalsError, get_env, require_env, setup_logging

from .mlflow_client import MLflowClient, MLflowError
from .signals import build_signals

logger = setup_logging("fluxion_connector_mlflow")


def run_once(mlflow: MLflowClient, fluxion: SignalsClient) -> dict[str, int]:
    """Una pasada completa por el registro de modelos."""
    pending: list[dict] = []
    models = 0
    versions = 0

    for model in mlflow.registered_models():
        models += 1
        for version in mlflow.model_versions(model["name"]):
            versions += 1
            pending.extend(build_signals(model, version))

    logger.info("MLflow: %s modelos, %s versiones → %s senales", models, versions, len(pending))

    if not pending:
        return {"received": 0, "accepted": 0, "duplicates": 0, "rejected": 0}

    return fluxion.publish(pending)


def main() -> int:
    api_url = require_env("FLUXION_API_URL")
    api_key = require_env("FLUXION_API_KEY")
    tracking_uri = require_env("MLFLOW_TRACKING_URI")

    interval = int(get_env("POLL_INTERVAL_SECONDS", "900") or 900)
    run_once_only = (get_env("RUN_ONCE", "false") or "false").lower() == "true"

    fluxion = SignalsClient(api_url, api_key)
    mlflow = MLflowClient(
        tracking_uri,
        username=get_env("MLFLOW_USERNAME"),
        password=get_env("MLFLOW_PASSWORD"),
    )

    # Fallar aquí es mucho más barato que descubrir dentro de tres horas que la
    # clave estaba revocada o que MLflow no es alcanzable.
    fluxion.ping()
    logger.info("MLflow en %s · intervalo %ss", tracking_uri, interval)

    while True:
        try:
            totals = run_once(mlflow, fluxion)
            logger.info(
                "pasada completa · %s nuevas, %s ya conocidas, %s rechazadas",
                totals["accepted"], totals["duplicates"], totals["rejected"],
            )
        except MLflowError as exc:
            # MLflow caído no debe tumbar el conector: se reintenta en la
            # siguiente pasada.
            logger.error("MLflow no responde: %s", exc)
        except SignalsError as exc:
            logger.error("no se pudieron publicar las senales: %s", exc)

        if run_once_only:
            return 0

        time.sleep(interval)


if __name__ == "__main__":
    sys.exit(main())
