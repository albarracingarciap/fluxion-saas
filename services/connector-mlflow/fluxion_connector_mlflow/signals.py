"""Traducción de entidades de MLflow a señales de Fluxion."""

from datetime import datetime, timezone
from typing import Any

from .mlflow_client import tag_value

# Etiqueta con la que un modelo de MLflow declara a qué sistema del inventario
# corresponde. Mientras no exista la pantalla de conciliación (Fase 3), este es
# el puente: se pone la etiqueta en MLflow y las señales aparecen en la
# cronología de ese sistema.
SYSTEM_ID_TAG = "fluxion.system_id"

# Alias que en MLflow 3 marcan la versión que está sirviendo en producción.
PRODUCTION_ALIASES = {"production", "prod", "champion"}

SOURCE_MODULE = "connector-mlflow"


def _iso(timestamp_ms: Any) -> str | None:
    """MLflow devuelve milisegundos desde epoch; el contrato pide ISO 8601."""
    if not timestamp_ms:
        return None
    try:
        return datetime.fromtimestamp(int(timestamp_ms) / 1000, tz=timezone.utc).isoformat()
    except (TypeError, ValueError, OSError):
        return None


def _is_production(version: dict[str, Any]) -> bool:
    aliases = {a.lower() for a in (version.get("aliases") or [])}
    if aliases & PRODUCTION_ALIASES:
        return True
    # MLflow 2.x usaba etapas; siguen apareciendo en instalaciones migradas.
    return (version.get("current_stage") or "").lower() == "production"


def _system_id(model: dict[str, Any], version: dict[str, Any]) -> str | None:
    """La etiqueta de la versión manda sobre la del modelo."""
    return tag_value(version, SYSTEM_ID_TAG) or tag_value(model, SYSTEM_ID_TAG)


def build_signals(model: dict[str, Any], version: dict[str, Any]) -> list[dict[str, Any]]:
    """Señales que corresponden a una versión de modelo.

    Una versión siempre genera la señal de registro. Si además está sirviendo en
    producción, genera una segunda de promoción — que es la que importa desde el
    punto de vista de gobernanza: significa que el sistema de IA que hay en el
    inventario ya no es el que está descrito en su dossier.

    Las claves de idempotencia hacen que el conector no necesite recordar nada:
    puede reenviar todo el registro en cada pasada y el Core ignora lo conocido.
    """
    name = model.get("name") or version.get("name") or "(sin nombre)"
    number = version.get("version")
    system_id = _system_id(model, version)
    created = _iso(version.get("creation_timestamp"))

    payload = {
        "model_name": name,
        "model_version": number,
        "run_id": version.get("run_id"),
        "source": version.get("source"),
        "status": version.get("status"),
        "aliases": version.get("aliases") or [],
        "current_stage": version.get("current_stage"),
        "description": version.get("description"),
    }

    signals: list[dict[str, Any]] = [
        {
            "system_id": system_id,
            "source_module": SOURCE_MODULE,
            "source_ref": f"{name}/{number}",
            "signal_type": "inventory.model_registered",
            "severity": "info",
            "title": f"Versión {number} del modelo «{name}» registrada en MLflow",
            "summary": version.get("description") or None,
            "occurred_at": created,
            "payload": payload,
            "dedupe_key": f"mlflow:{name}:v{number}",
        }
    ]

    if _is_production(version):
        signals.append(
            {
                "system_id": system_id,
                "source_module": SOURCE_MODULE,
                "source_ref": f"{name}/{number}",
                "signal_type": "inventory.model_promoted",
                "severity": "medium",
                "title": f"La versión {number} de «{name}» está sirviendo en producción",
                "summary": (
                    "Comprueba que la documentación técnica y las evidencias del "
                    "sistema corresponden a esta versión."
                ),
                "occurred_at": _iso(version.get("last_updated_timestamp")) or created,
                "payload": payload,
                "dedupe_key": f"mlflow:{name}:v{number}:production",
            }
        )

    return signals
