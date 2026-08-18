"""Cliente para publicar señales en el Core de Fluxion.

Todos los módulos publican por aquí. El contrato completo está en
docs/ingesta.md.

    from fluxion_common import SignalsClient

    client = SignalsClient(base_url, api_key)
    client.ping()                      # falla pronto si la credencial no vale
    client.publish([{...}, {...}])
"""

import logging
from typing import Any, Iterable

from .core import CoreApiClient

logger = logging.getLogger(__name__)

MAX_PER_REQUEST = 100
"""Tope del endpoint. Los lotes mayores se trocean automáticamente."""


class SignalsClient(CoreApiClient):
    def publish(self, signals: Iterable[dict[str, Any]]) -> dict[str, int]:
        """Publica señales, troceando en lotes de 100.

        Devuelve el recuento agregado. Los duplicados NO son un error: son la
        respuesta esperada cuando se reenvía una señal con la misma dedupe_key.
        """
        batch: list[dict[str, Any]] = []
        totals = {"received": 0, "accepted": 0, "duplicates": 0, "rejected": 0}

        for signal in signals:
            batch.append(signal)
            if len(batch) >= MAX_PER_REQUEST:
                self._accumulate(totals, self._publish_batch(batch))
                batch = []

        if batch:
            self._accumulate(totals, self._publish_batch(batch))

        return totals

    def _publish_batch(self, batch: list[dict[str, Any]]) -> dict[str, Any]:
        data = self._request("POST", "/api/ingest/v1/signals", json=batch).json()

        # Los elementos rechazados son fallos del módulo emisor, no del Core:
        # se registran con detalle para poder corregir el formato.
        for item in data.get("results", []):
            if item.get("error"):
                logger.error(
                    "senal rechazada (posicion %s): %s", item.get("index"), item["error"]
                )

        logger.info(
            "publicadas %s senales · %s nuevas, %s duplicadas, %s rechazadas",
            data.get("received"), data.get("accepted"),
            data.get("duplicates"), data.get("rejected"),
        )
        return data

    @staticmethod
    def _accumulate(totals: dict[str, int], data: dict[str, Any]) -> None:
        for key in totals:
            totals[key] += int(data.get(key, 0) or 0)
