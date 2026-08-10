"""Lectura de configuración desde el entorno.

Los servicios corren en Dokploy, que inyecta las variables en el contenedor.
No hay ficheros .env en producción: si una variable falta, el servicio debe
fallar al arrancar y no a mitad de la primera petición.
"""

import os


class MissingConfig(RuntimeError):
    """Falta una variable de entorno obligatoria."""


def get_env(name: str, default: str | None = None) -> str | None:
    """Devuelve la variable, o `default` si no está definida o está vacía."""
    value = os.getenv(name)
    return value if value else default


def require_env(name: str) -> str:
    """Devuelve la variable o lanza MissingConfig.

    Úsalo en el arranque del servicio, no dentro de un handler: así un
    despliegue mal configurado se detecta en el healthcheck y no en producción.
    """
    value = os.getenv(name)
    if not value:
        raise MissingConfig(
            f"Falta la variable de entorno obligatoria: {name}. "
            f"Revisa la configuración del servicio en Dokploy."
        )
    return value
