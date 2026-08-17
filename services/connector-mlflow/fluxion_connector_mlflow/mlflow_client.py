"""Cliente mínimo de la API REST de MLflow.

Solo lo necesario para inventariar: modelos registrados y sus versiones. No se
usa el SDK de MLflow a propósito — arrastra scipy, pandas y medio ecosistema
científico para hacer dos peticiones HTTP.
"""

import logging
from typing import Any, Iterator

import httpx

logger = logging.getLogger(__name__)

PAGE_SIZE = 100


class MLflowError(RuntimeError):
    """Fallo hablando con MLflow."""


class MLflowClient:
    def __init__(
        self,
        tracking_uri: str,
        *,
        username: str | None = None,
        password: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self._base = tracking_uri.rstrip("/")
        self._auth = (username, password) if username and password else None
        self._timeout = timeout

    def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        url = f"{self._base}/api/2.0/mlflow{path}"
        try:
            with httpx.Client(timeout=self._timeout, auth=self._auth) as client:
                response = client.get(url, params=params)
        except httpx.RequestError as exc:
            raise MLflowError(f"sin conexion con MLflow en {url}: {exc}") from exc

        if response.status_code >= 400:
            raise MLflowError(f"{response.status_code} en {path}: {response.text}")

        return response.json()

    # ── Modelos registrados ─────────────────────────────────────────────────

    def registered_models(self) -> Iterator[dict[str, Any]]:
        """Todos los modelos registrados, paginando."""
        page_token: str | None = None
        while True:
            params: dict[str, Any] = {"max_results": PAGE_SIZE}
            if page_token:
                params["page_token"] = page_token

            data = self._get("/registered-models/search", params)
            for model in data.get("registered_models", []):
                yield model

            page_token = data.get("next_page_token")
            if not page_token:
                return

    def model_versions(self, model_name: str) -> Iterator[dict[str, Any]]:
        """Versiones de un modelo registrado, paginando."""
        page_token: str | None = None
        # El filtro de MLflow usa comillas simples; se escapan las del nombre.
        escaped = model_name.replace("'", "\\'")

        while True:
            params: dict[str, Any] = {
                "filter": f"name='{escaped}'",
                "max_results": PAGE_SIZE,
            }
            if page_token:
                params["page_token"] = page_token

            data = self._get("/model-versions/search", params)
            for version in data.get("model_versions", []):
                yield version

            page_token = data.get("next_page_token")
            if not page_token:
                return


def tag_value(entity: dict[str, Any], key: str) -> str | None:
    """Lee una etiqueta de un modelo o versión.

    MLflow devuelve las etiquetas como lista de {key, value}, no como diccionario.
    """
    for tag in entity.get("tags") or []:
        if tag.get("key") == key:
            return tag.get("value")
    return None
