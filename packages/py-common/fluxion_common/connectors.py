"""Cliente para conectores: configuración, descubrimientos y reporte de pasadas.

Un conector no lleva su configuración en variables de entorno más allá de las
credenciales de arranque. La pide al Core, que es donde el cliente la gestiona
desde la interfaz.
"""

import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

from .core import CoreApiClient, CoreApiError

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class Connection:
    """Una instancia externa con la que sincronizar."""

    id: str
    name: str
    base_url: str
    auth_type: str
    username: str | None
    password: str | None
    poll_interval_seconds: int

    @property
    def credentials(self) -> tuple[str, str] | None:
        if self.auth_type == "basic" and self.username and self.password:
            return (self.username, self.password)
        return None


class ConnectorClient(CoreApiClient):
    def fetch_config(self, connector_type: str) -> tuple[list[Connection], dict[str, str]]:
        """Configuración del conector: conexiones activas y vínculos resueltos.

        Devuelve varias conexiones a propósito: un solo contenedor atiende todas
        las instancias que tenga configuradas la organización.

        El segundo elemento mapea `external_id` -> id del sistema del inventario
        para los activos ya conciliados. Es lo que permite al conector decidir
        entre publicar una señal (el activo pertenece a un sistema conocido) o
        reportar un descubrimiento (nadie ha decidido todavía qué es).
        """
        data = self._request(
            "GET", "/api/ingest/v1/connectors/config", params={"type": connector_type}
        ).json()

        connections = [
            Connection(
                id=c["id"],
                name=c["name"],
                base_url=c["base_url"],
                auth_type=c.get("auth_type", "none"),
                username=c.get("username"),
                password=c.get("password"),
                poll_interval_seconds=int(c.get("poll_interval_seconds") or 900),
            )
            for c in data.get("connections", [])
        ]

        links: dict[str, str] = data.get("links") or {}

        logger.info(
            "configuracion recibida · %s conexiones activas, %s activos ya vinculados",
            len(connections), len(links),
        )
        return connections, links

    def publish_discoveries(self, discoveries: list[dict[str, Any]]) -> dict[str, int]:
        """Reporta activos encontrados que aún no están conciliados.

        Idempotente en el Core por (organización, módulo, external_id): se puede
        reenviar todo en cada pasada sin duplicar ni pisar decisiones ya tomadas.
        """
        if not discoveries:
            return {"received": 0, "accepted": 0, "rejected": 0}

        data = self._request("POST", "/api/ingest/v1/discoveries", json=discoveries).json()

        for item in data.get("results", []):
            if item.get("error"):
                logger.error(
                    "descubrimiento rechazado (posicion %s): %s", item.get("index"), item["error"]
                )

        logger.info(
            "reportados %s descubrimientos · %s aceptados, %s rechazados",
            data.get("received"), data.get("accepted"), data.get("rejected"),
        )
        return data

    def report_run(
        self,
        *,
        connector_type: str,
        started_at: datetime,
        status: str,
        connection_id: str | None = None,
        objects_seen: int = 0,
        signals_published: int = 0,
        signals_duplicated: int = 0,
        signals_rejected: int = 0,
        details: dict[str, Any] | None = None,
        error_message: str | None = None,
    ) -> None:
        """Registra el resultado de una pasada.

        No propaga excepciones: que falle el reporte no debe tumbar el conector
        ni impedir la siguiente pasada. Lo importante ya se publicó.
        """
        payload = {
            "connection_id": connection_id,
            "connector_type": connector_type,
            "started_at": started_at.astimezone(timezone.utc).isoformat(),
            "status": status,
            "objects_seen": objects_seen,
            "signals_published": signals_published,
            "signals_duplicated": signals_duplicated,
            "signals_rejected": signals_rejected,
            "details": details or {},
            "error_message": error_message,
        }

        try:
            self._request("POST", "/api/ingest/v1/connectors/runs", json=payload)
        except CoreApiError as exc:
            logger.warning("no se pudo reportar la pasada: %s", exc)
