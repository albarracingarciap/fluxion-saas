"""Conector MLflow → Fluxion.

Recorre el registro de modelos de MLflow y publica una señal por cada versión.
No guarda estado: la idempotencia vive en el Core mediante `dedupe_key`, así que
cada pasada puede reenviar todo el registro sin duplicar nada.

La configuración de las instancias de MLflow se pide al Core (se gestiona desde
Ajustes → Conectores). Si no hay ninguna configurada, cae a las variables de
entorno — así un despliegue existente sigue funcionando mientras se migra.

Variables de entorno:

    FLUXION_API_URL          https://fluxion-ai.es
    FLUXION_API_KEY          clave con signals:write y connectors:sync
    POLL_INTERVAL_SECONDS    por defecto 900 (15 min)
    RUN_ONCE                 "true" para una sola pasada y salir

    MLFLOW_TRACKING_URI      solo como respaldo si no hay conexiones en el Core
    MLFLOW_USERNAME          ídem
    MLFLOW_PASSWORD          ídem
"""

import sys
import time
from datetime import datetime, timezone

from fluxion_common import (
    Connection,
    ConnectorClient,
    CoreApiError,
    SignalsClient,
    get_env,
    require_env,
    setup_logging,
)

from .mlflow_client import MLflowClient, MLflowError
from .signals import build_discovery, build_signals, resolve_system_id

logger = setup_logging("fluxion_connector_mlflow")

CONNECTOR_TYPE = "mlflow"


def _connections_from_env() -> list[Connection]:
    """Respaldo cuando el Core no tiene ninguna conexión configurada."""
    uri = get_env("MLFLOW_TRACKING_URI")
    if not uri:
        return []

    username = get_env("MLFLOW_USERNAME")
    password = get_env("MLFLOW_PASSWORD")

    return [
        Connection(
            id="",                       # sin id: la pasada se reporta sin conexión asociada
            name="MLflow (variables de entorno)",
            base_url=uri,
            auth_type="basic" if username and password else "none",
            username=username,
            password=password,
            poll_interval_seconds=int(get_env("POLL_INTERVAL_SECONDS", "900") or 900),
        )
    ]


def sync_connection(
    connection: Connection,
    links: dict[str, str],
    signals_client: SignalsClient,
    connector_client: ConnectorClient,
) -> None:
    """Una pasada sobre una instancia de MLflow, reportada al Core."""
    started_at = datetime.now(timezone.utc)
    credentials = connection.credentials

    mlflow = MLflowClient(
        connection.base_url,
        username=credentials[0] if credentials else None,
        password=credentials[1] if credentials else None,
    )

    models = 0
    versions_total = 0
    pending_signals: list[dict] = []
    pending_discoveries: list[dict] = []

    try:
        for model in mlflow.registered_models():
            models += 1
            versions = list(mlflow.model_versions(model["name"]))
            versions_total += len(versions)

            system_id = resolve_system_id(model, versions, links)

            if system_id:
                # Vinculado: sus versiones son eventos del expediente del sistema.
                for version in versions:
                    pending_signals.extend(build_signals(model, version, system_id))
            else:
                # Sin vincular: uno solo, a la cola de conciliación.
                pending_discoveries.append(
                    build_discovery(
                        model, versions,
                        connection_id=connection.id or None,
                        base_url=connection.base_url,
                    )
                )

        logger.info(
            "«%s»: %s modelos, %s versiones → %s senales, %s descubrimientos",
            connection.name, models, versions_total,
            len(pending_signals), len(pending_discoveries),
        )

        # El resultado NO se descarta: un descubrimiento rechazado por el Core
        # es un fallo del conector (formato, longitud, conexion inexistente) y
        # tiene que verse en el historial de la pasada. Descartarlo dejaba
        # pasadas reportadas como `ok` que no habian reportado nada.
        discoveries = (
            connector_client.publish_discoveries(pending_discoveries)
            if pending_discoveries
            else {"received": 0, "accepted": 0, "rejected": 0}
        )

        totals = (
            signals_client.publish(pending_signals)
            if pending_signals
            else {"accepted": 0, "duplicates": 0, "rejected": 0}
        )

        connector_client.report_run(
            connector_type=CONNECTOR_TYPE,
            connection_id=connection.id or None,
            started_at=started_at,
            status="partial" if totals["rejected"] or discoveries.get("rejected") else "ok",
            objects_seen=models,
            signals_published=totals["accepted"],
            signals_duplicated=totals["duplicates"],
            signals_rejected=totals["rejected"],
            details={
                "versions_seen": versions_total,
                "discoveries_reported": len(pending_discoveries),
                "discoveries_accepted": discoveries.get("accepted", 0),
                "discoveries_rejected": discoveries.get("rejected", 0),
            },
        )

    except MLflowError as exc:
        # MLflow caído no debe tumbar el conector: se registra la pasada como
        # fallida —para que se vea en la aplicación— y se reintenta en la
        # siguiente.
        logger.error("«%s» no responde: %s", connection.name, exc)
        connector_client.report_run(
            connector_type=CONNECTOR_TYPE,
            connection_id=connection.id or None,
            started_at=started_at,
            status="error",
            objects_seen=models,
            error_message=str(exc)[:2000],
        )

    except CoreApiError as exc:
        # Fallo publicando en Fluxion: típicamente un permiso que falta en la
        # clave, o el Core no disponible. Tampoco debe tumbar el conector — se
        # deja constancia y se reintenta en la siguiente pasada.
        logger.error("no se pudo publicar en Fluxion desde «%s»: %s", connection.name, exc)
        connector_client.report_run(
            connector_type=CONNECTOR_TYPE,
            connection_id=connection.id or None,
            started_at=started_at,
            status="error",
            objects_seen=models,
            error_message=str(exc)[:2000],
        )


def main() -> int:
    api_url = require_env("FLUXION_API_URL")
    api_key = require_env("FLUXION_API_KEY")

    default_interval = int(get_env("POLL_INTERVAL_SECONDS", "900") or 900)
    run_once_only = (get_env("RUN_ONCE", "false") or "false").lower() == "true"

    signals_client = SignalsClient(api_url, api_key)
    connector_client = ConnectorClient(api_url, api_key)

    signals_client.ping()

    while True:
        links: dict[str, str] = {}
        try:
            connections, links = connector_client.fetch_config(CONNECTOR_TYPE)
        except CoreApiError as exc:
            # Lo más habitual: la clave no tiene el permiso connectors:sync.
            logger.warning("no se pudo leer la configuracion (%s); uso variables de entorno", exc)
            connections = []

        if not connections:
            connections = _connections_from_env()

        if not connections:
            logger.warning(
                "sin conexiones configuradas. Añade una en Ajustes → Conectores, "
                "o define MLFLOW_TRACKING_URI"
            )
        else:
            for connection in connections:
                sync_connection(connection, links, signals_client, connector_client)

        if run_once_only:
            return 0

        interval = connections[0].poll_interval_seconds if connections else default_interval
        time.sleep(interval)


if __name__ == "__main__":
    sys.exit(main())
