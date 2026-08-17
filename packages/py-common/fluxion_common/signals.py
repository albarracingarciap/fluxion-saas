"""Cliente para publicar señales en el Core de Fluxion.

Todos los módulos publican por aquí. El contrato completo está en
docs/ingesta.md; este cliente lo implementa y añade reintentos.

    from fluxion_common import SignalsClient

    client = SignalsClient(base_url, api_key)
    client.ping()                      # falla pronto si la credencial no vale
    client.publish([{...}, {...}])
"""

import logging
import time
from typing import Any, Iterable

import httpx

logger = logging.getLogger(__name__)

MAX_PER_REQUEST = 100
"""Tope del endpoint. Los lotes mayores se trocean automáticamente."""


class SignalsError(RuntimeError):
    """Fallo no recuperable publicando señales."""


class SignalsClient:
    def __init__(
        self,
        base_url: str,
        api_key: str,
        *,
        timeout: float = 30.0,
        max_retries: int = 3,
    ) -> None:
        self._base_url = base_url.rstrip("/")
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        self._timeout = timeout
        self._max_retries = max_retries

    # ── Conectividad ────────────────────────────────────────────────────────

    def ping(self) -> dict[str, Any]:
        """Comprueba credencial y conectividad. Llamar al arrancar el módulo.

        Fallar aquí es mucho más barato que descubrir a las tres horas que la
        clave estaba revocada.
        """
        response = self._request("GET", "/api/ingest/v1/ping")
        data = response.json()
        logger.info(
            "conectado a Fluxion · organizacion=%s permisos=%s",
            data.get("organization_id"),
            data.get("scopes"),
        )
        return data

    # ── Publicación ─────────────────────────────────────────────────────────

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
        response = self._request("POST", "/api/ingest/v1/signals", json=batch)
        data = response.json()

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

    # ── Transporte ──────────────────────────────────────────────────────────

    def _request(self, method: str, path: str, **kwargs: Any) -> httpx.Response:
        """Petición con reintentos.

        Se reintenta lo transitorio (429 y 5xx) con espera creciente. Los 4xx
        restantes son errores del módulo —credencial mala, permiso que falta,
        cuerpo inválido— y reintentarlos solo consume cuota.
        """
        url = f"{self._base_url}{path}"
        delay = 1.0

        for attempt in range(1, self._max_retries + 1):
            try:
                with httpx.Client(timeout=self._timeout) as client:
                    response = client.request(method, url, headers=self._headers, **kwargs)
            except httpx.RequestError as exc:
                if attempt == self._max_retries:
                    raise SignalsError(f"sin conexion con {url}: {exc}") from exc
                logger.warning("error de red (%s/%s): %s", attempt, self._max_retries, exc)
                time.sleep(delay)
                delay *= 2
                continue

            if response.status_code < 400:
                return response

            if response.status_code == 429:
                wait = float(response.headers.get("Retry-After", delay))
                logger.warning("limite de peticiones alcanzado, esperando %ss", wait)
                time.sleep(wait)
                continue

            if response.status_code >= 500:
                if attempt == self._max_retries:
                    raise SignalsError(f"{response.status_code} del Core: {response.text}")
                logger.warning("error del Core (%s/%s): %s", attempt, self._max_retries,
                               response.status_code)
                time.sleep(delay)
                delay *= 2
                continue

            # 4xx: no reintentar
            raise SignalsError(
                f"{response.status_code} en {path}: {response.text}. "
                "Revisa la clave API y sus permisos."
            )

        raise SignalsError(f"agotados los reintentos en {path}")
