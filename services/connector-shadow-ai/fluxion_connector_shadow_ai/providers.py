"""Clientes de GitHub y GitLab.

Solo lectura. Los dos exponen la misma interfaz para que el escaner no tenga que
saber con cual esta hablando.

El token va SIEMPRE de solo lectura: el escaner no necesita mas, y una
credencial que no puede escribir no puede ser usada para escribir si se filtra
del contenedor.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass

import httpx

log = logging.getLogger("fluxion_connector_shadow_ai.providers")

TIMEOUT = 30.0
MAX_PAGINAS = 10


class ProviderError(RuntimeError):
    pass


@dataclass
class Repo:
    external_id: str      # 'github:owner/nombre'
    name: str
    full_name: str
    url: str
    default_branch: str
    private: bool
    description: str | None
    updated_at: str | None
    archived: bool


@dataclass
class Fichero:
    path: str
    size: int


class GitHubClient:
    def __init__(self, base_url: str, token: str, owner: str) -> None:
        self.base = base_url.rstrip("/") or "https://api.github.com"
        self.owner = owner
        self.http = httpx.Client(
            timeout=TIMEOUT,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )

    def _get(self, path: str, **kwargs) -> httpx.Response:
        r = self.http.get(f"{self.base}{path}", **kwargs)
        if r.status_code == 403 and "rate limit" in r.text.lower():
            raise ProviderError("limite de peticiones de GitHub alcanzado")
        if r.status_code >= 400:
            raise ProviderError(f"GitHub {r.status_code} en {path}: {r.text[:200]}")
        return r

    def _mapear(self, x: dict) -> Repo:
        return Repo(
            external_id=f"github:{x['full_name']}",
            name=x["name"],
            full_name=x["full_name"],
            url=x["html_url"],
            default_branch=x.get("default_branch") or "main",
            private=bool(x.get("private")),
            description=x.get("description"),
            updated_at=x.get("pushed_at"),
            archived=bool(x.get("archived")),
        )

    def _paginar(self, endpoint: str, params: dict) -> list[dict]:
        salida: list[dict] = []
        for pagina in range(1, MAX_PAGINAS + 1):
            lote = self._get(endpoint, params={**params, "per_page": 100, "page": pagina}).json()
            if not lote:
                break
            salida.extend(lote)
        return salida

    def repos(self) -> list[Repo]:
        """Repositorios de la organizacion, o de la cuenta autenticada.

        Ojo con `/users/{owner}/repos`: devuelve SOLO los publicos aunque la
        peticion vaya autenticada. Con una cuenta personal, usarlo dejaria los
        repositorios privados fuera del escaneo y el modulo diria que todo esta
        bien. Por eso, cuando el owner coincide con la cuenta del token, se usa
        `/user/repos`, que si los incluye.
        """
        # 1 - Organizacion
        try:
            crudos = self._paginar(f"/orgs/{self.owner}/repos", {"type": "all"})
            if crudos:
                return [self._mapear(x) for x in crudos]
        except ProviderError as e:
            log.debug("%s no es una organizacion (%s)", self.owner, e)

        # 2 - Cuenta propia del token
        try:
            yo = self._get("/user").json().get("login")
        except ProviderError:
            yo = None

        if yo and yo.lower() == self.owner.lower():
            crudos = self._paginar(
                "/user/repos", {"affiliation": "owner,collaborator", "visibility": "all"}
            )
            return [self._mapear(x) for x in crudos]

        # 3 - Otra cuenta: solo se veran sus repositorios publicos, y se dice.
        crudos = self._paginar(f"/users/{self.owner}/repos", {"type": "all"})
        if crudos:
            log.warning(
                "%s no es la cuenta del token: solo se escanean sus repositorios publicos",
                self.owner,
            )
            return [self._mapear(x) for x in crudos]

        raise ProviderError(f"no se pudieron listar los repositorios de {self.owner}")

    def arbol(self, repo: Repo) -> list[Fichero]:
        r = self._get(
            f"/repos/{repo.full_name}/git/trees/{repo.default_branch}",
            params={"recursive": "1"},
        )
        data = r.json()
        if data.get("truncated"):
            log.warning("arbol de %s truncado por GitHub: el escaneo sera parcial", repo.full_name)
        return [
            Fichero(path=x["path"], size=int(x.get("size") or 0))
            for x in data.get("tree", [])
            if x.get("type") == "blob"
        ]

    def contenido(self, repo: Repo, ruta: str) -> str | None:
        try:
            r = self._get(
                f"/repos/{repo.full_name}/contents/{ruta}",
                params={"ref": repo.default_branch},
                headers={"Accept": "application/vnd.github.raw"},
            )
            return r.text
        except ProviderError as e:
            log.debug("no se pudo leer %s de %s: %s", ruta, repo.full_name, e)
            return None

    def close(self) -> None:
        self.http.close()


class GitLabClient:
    def __init__(self, base_url: str, token: str, owner: str) -> None:
        self.base = (base_url.rstrip("/") or "https://gitlab.com") + "/api/v4"
        self.owner = owner
        self.http = httpx.Client(timeout=TIMEOUT, headers={"PRIVATE-TOKEN": token})

    def _get(self, path: str, **kwargs) -> httpx.Response:
        r = self.http.get(f"{self.base}{path}", **kwargs)
        if r.status_code >= 400:
            raise ProviderError(f"GitLab {r.status_code} en {path}: {r.text[:200]}")
        return r

    def repos(self) -> list[Repo]:
        salida: list[Repo] = []
        for pagina in range(1, MAX_PAGINAS + 1):
            r = self._get(
                f"/groups/{self.owner.replace('/', '%2F')}/projects",
                params={"per_page": 100, "page": pagina, "include_subgroups": "true"},
            )
            lote = r.json()
            if not lote:
                break
            salida.extend(
                Repo(
                    external_id=f"gitlab:{x['path_with_namespace']}",
                    name=x["name"],
                    full_name=str(x["id"]),          # GitLab trabaja por id
                    url=x["web_url"],
                    default_branch=x.get("default_branch") or "main",
                    private=x.get("visibility") != "public",
                    description=x.get("description"),
                    updated_at=x.get("last_activity_at"),
                    archived=bool(x.get("archived")),
                )
                for x in lote
            )
        return salida

    def arbol(self, repo: Repo) -> list[Fichero]:
        salida: list[Fichero] = []
        for pagina in range(1, MAX_PAGINAS + 1):
            r = self._get(
                f"/projects/{repo.full_name}/repository/tree",
                params={"recursive": "true", "per_page": 100, "page": pagina,
                        "ref": repo.default_branch},
            )
            lote = r.json()
            if not lote:
                break
            salida.extend(
                Fichero(path=x["path"], size=0)
                for x in lote if x.get("type") == "blob"
            )
        return salida

    def contenido(self, repo: Repo, ruta: str) -> str | None:
        try:
            ruta_cod = ruta.replace("/", "%2F")
            r = self._get(
                f"/projects/{repo.full_name}/repository/files/{ruta_cod}/raw",
                params={"ref": repo.default_branch},
            )
            return r.text
        except ProviderError:
            return None

    def close(self) -> None:
        self.http.close()


def build_client(connector_type: str, base_url: str, token: str, owner: str):
    if connector_type == "github":
        return GitHubClient(base_url, token, owner)
    if connector_type == "gitlab":
        return GitLabClient(base_url, token, owner)
    raise ProviderError(f"tipo de conector no soportado: {connector_type}")
