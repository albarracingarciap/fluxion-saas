"""Configuración de logging común a todos los servicios.

Un solo formato en todos los contenedores para que los logs de Dokploy sean
comparables entre servicios y, más adelante, parseables por un colector.
"""

import logging
import sys

_FORMAT = "%(asctime)s [%(levelname)s] %(name)s — %(message)s"


def setup_logging(service_name: str, level: str = "INFO") -> logging.Logger:
    """Inicializa el logging del proceso y devuelve el logger del servicio.

    Llamar una sola vez, al arrancar:
        logger = setup_logging("fluxion_agents")
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format=_FORMAT,
        stream=sys.stdout,
        force=True,
    )
    # Uvicorn y httpx son ruidosos en INFO
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("httpx").setLevel(logging.WARNING)

    return logging.getLogger(service_name)
