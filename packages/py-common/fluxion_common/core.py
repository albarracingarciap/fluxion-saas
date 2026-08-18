"""Transporte común contra la API del Core de Fluxion.

Reintentos, autenticación y manejo de errores en un solo sitio. Los clientes
concretos —señales, conectores— heredan de aquí.
"""

import logging
import time
from typing import Any

import httpx

logger = logging.getLogger(__name__)


class CoreApiError(RuntimeError):
    """Fallo no recuperable hablando con el Core."""


class CoreApiClient:
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

    def ping(self) -> dict[str, Any]:
        """Comprueba credencial y conectividad. Llamar al arrancar el módulo.

        Fallar aquí es mucho más barato que descubrir a las tres horas que la
        clave estaba revocada.
        """
        data = self._request("GET", "/api/ingest/v1/ping").json()
        logger.info(
            "conectado a Fluxion · organizacion=%s permisos=%s",
            data.get("organization_id"),
            data.get("scopes"),
        )
        return data

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
                    raise CoreApiError(f"sin conexion con {url}: {exc}") from exc
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
                    raise CoreApiError(f"{response.status_code} del Core: {response.text}")
                logger.warning(
                    "error del Core (%s/%s): %s", attempt, self._max_retries, response.status_code
                )
                time.sleep(delay)
                delay *= 2
                continue

            # 4xx: no reintentar
            raise CoreApiError(
                f"{response.status_code} en {path}: {response.text}. "
                "Revisa la clave API y sus permisos."
            )

        raise CoreApiError(f"agotados los reintentos en {path}")
