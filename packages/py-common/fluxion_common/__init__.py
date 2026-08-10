"""
fluxion_common — utilidades compartidas por los servicios Python del monorepo.

Se copia dentro de cada imagen desde el Dockerfile del servicio:
    COPY packages/py-common/fluxion_common/ ./fluxion_common/

Regla: aquí solo va lo que usan (o van a usar) DOS o más servicios.
Lo que solo necesita uno vive en ese servicio.
"""

from fluxion_common.config import get_env, require_env
from fluxion_common.logging import setup_logging

__all__ = ["get_env", "require_env", "setup_logging"]
