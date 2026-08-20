"""Conector Shadow AI -> Fluxion.

Escanea los repositorios de GitHub o GitLab de la organizacion y publica lo que
encuentra como DESCUBRIMIENTOS, no como sistemas del inventario. Nada entra al
inventario solo: alguien lo concilia, igual que con los modelos de MLflow.

Las credenciales expuestas no son un descubrimiento sino un incidente de
seguridad: emiten una senal critica que sale por los canales.

Variables de entorno:

    FLUXION_API_URL          https://fluxion-ai.es
    FLUXION_API_KEY          clave con inventory:write, signals:write y connectors:sync
    POLL_INTERVAL_SECONDS    por defecto 86400 (un dia)
    RUN_ONCE                 "true" para una sola pasada y salir

La configuracion de las conexiones se gestiona en Ajustes -> Conectores. En
GitHub y GitLab, el campo `username` de la conexion guarda la ORGANIZACION o
GRUPO a escanear, y el secreto es un token de SOLO LECTURA.
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

from .providers import ProviderError, build_client
from .scanner import escanear_repo, parece_ia, presupuesto_agotado

logger = setup_logging("fluxion_connector_shadow_ai")

TIPOS = ("github", "gitlab")


def _senal_credencial(repo, hallazgos: list[dict], system_id: str | None) -> dict | None:
    """Una senal por repositorio, no una por clave.

    Cinco claves en el mismo repositorio son un unico problema —"este
    repositorio filtra credenciales"— y cinco mensajes en Slack solo consiguen
    que se ignore el sexto.
    """
    credenciales = [h for h in hallazgos if h["finding_type"] == "credential"]
    if not credenciales:
        return None

    criticas = [h for h in credenciales if h["severity"] == "critical"]
    donde = ", ".join(sorted({f"{h['file_path']}:{h['line_number']}" for h in credenciales})[:5])

    return {
        "system_id": system_id,
        "signal_type": "security.exposed_credential",
        "severity": "critical" if criticas else "medium",
        "title": f"Credenciales de IA expuestas en {repo.name}",
        "summary": (
            f"Se han detectado {len(credenciales)} posibles credenciales en el codigo de "
            f"{repo.full_name}: {donde}. Fluxion no almacena el valor encontrado. "
            f"Rotalas y sacalas del repositorio: el historial de Git conserva lo borrado."
        ),
        "metric_name": "shadow_ai.exposed_credentials",
        "metric_value": len(credenciales),
        # Una senal por repositorio y dia: la pasada diaria no repite el aviso.
        "dedupe_key": f"shadow-cred:{repo.external_id}:{datetime.now(timezone.utc).date()}",
        "payload": {"repository": repo.full_name, "findings": len(credenciales)},
    }


def sync_connection(
    connection: Connection,
    connector_type: str,
    links: dict[str, str],
    signals: SignalsClient,
    core: ConnectorClient,
) -> None:
    started_at = datetime.now(timezone.utc)
    owner = connection.username
    token = connection.token

    if not owner or not token:
        logger.error(
            "conexion '%s' sin organizacion o sin token; se omite", connection.name
        )
        core.report_run(
            connector_type=connector_type, connection_id=connection.id or None,
            started_at=started_at, status="error",
            error_message="falta la organizacion (campo usuario) o el token",
        )
        return

    cliente = build_client(connector_type, connection.base_url, token, owner)
    repos_vistos = 0
    descubrimientos: list[dict] = []
    hallazgos_por_repo: dict[str, list[dict]] = {}
    senales: list[dict] = []
    con_hallazgos = 0

    try:
        repos = cliente.repos()
        logger.info("%s: %s repositorios en %s", connection.name, len(repos), owner)

        parcial = False

        for repo in repos:
            if repo.archived:
                continue

            if presupuesto_agotado(cliente):
                # Se para y se dice. Seguir hasta estrellarse contra el limite
                # deja la pasada en error y sin distinguir "fallo" de "no cabia".
                logger.warning(
                    "presupuesto de peticiones agotado tras %s repositorios; "
                    "el resto se revisara en la proxima pasada", repos_vistos,
                )
                parcial = True
                break

            repos_vistos += 1

            hallazgos = escanear_repo(cliente, repo)
            if not hallazgos:
                continue

            if parece_ia(hallazgos):
                con_hallazgos += 1
                descubrimientos.append({
                    "connection_id": connection.id or None,
                    "source_module": "shadow-ai",
                    "asset_type": "repository",
                    "external_id": repo.external_id,
                    "external_url": repo.url,
                    "name": repo.full_name,
                    "description": repo.description,
                    "metadata": {
                        "private": repo.private,
                        "default_branch": repo.default_branch,
                        "updated_at": repo.updated_at,
                        "findings": len(hallazgos),
                    },
                })

            senal = _senal_credencial(repo, hallazgos, links.get(repo.external_id))
            if senal:
                senales.append(senal)

            # Los hallazgos se publican DESPUES de los descubrimientos: el
            # endpoint los cuelga del activo, y el activo tiene que existir.
            if parece_ia(hallazgos):
                hallazgos_por_repo[repo.external_id] = hallazgos

        core.publish_discoveries(descubrimientos)

        for external_id, hallazgos in hallazgos_por_repo.items():
            try:
                core.publish_findings(external_id, hallazgos)
            except CoreApiError as e:
                logger.error("hallazgos de %s rechazados: %s", external_id, e)

        if senales:
            signals.publish(senales)

        core.report_run(
            connector_type=connector_type, connection_id=connection.id or None,
            started_at=started_at, status="partial" if parcial else "ok",
            objects_seen=repos_vistos, signals_published=len(senales),
            details={
                "repositorios_con_ia": con_hallazgos,
                "peticiones_restantes": getattr(cliente, "restantes", None),
                "parcial": parcial,
            },
        )
        logger.info(
            "%s: %s repositorios revisados, %s con indicios de IA, %s con credenciales",
            connection.name, repos_vistos, con_hallazgos, len(senales),
        )

    except (ProviderError, CoreApiError) as e:
        logger.error("fallo en '%s': %s", connection.name, e)
        core.report_run(
            connector_type=connector_type, connection_id=connection.id or None,
            started_at=started_at, status="error",
            objects_seen=repos_vistos, error_message=str(e)[:500],
        )
    finally:
        cliente.close()


def main() -> int:
    api_url = require_env("FLUXION_API_URL")
    api_key = require_env("FLUXION_API_KEY")
    intervalo = int(get_env("POLL_INTERVAL_SECONDS", "86400") or 86400)
    una_vez = (get_env("RUN_ONCE", "false") or "false").lower() == "true"

    core = ConnectorClient(api_url, api_key)
    signals = SignalsClient(api_url, api_key)

    while True:
        for tipo in TIPOS:
            try:
                conexiones, links = core.fetch_config(tipo)
            except CoreApiError as e:
                logger.error("no se pudo leer la configuracion de %s: %s", tipo, e)
                continue

            if not conexiones:
                continue

            for conexion in conexiones:
                sync_connection(conexion, tipo, links, signals, core)

        if una_vez:
            return 0

        logger.info("siguiente pasada en %s segundos", intervalo)
        time.sleep(intervalo)


if __name__ == "__main__":
    sys.exit(main())
