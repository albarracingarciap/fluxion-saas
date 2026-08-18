"""Traducción de entidades de MLflow a señales y descubrimientos de Fluxion.

La regla que evita ruido duplicado:

  · El modelo ESTÁ vinculado a un sistema del inventario → señales. Aparecen en
    la cronología de ese sistema, que es donde tienen sentido.
  · El modelo NO está vinculado → un descubrimiento, uno por modelo (no por
    versión), a la espera de que alguien decida qué es.

Nunca las dos cosas para el mismo modelo.
"""

from datetime import datetime, timezone
from typing import Any

from .mlflow_client import tag_value

# Etiqueta con la que un modelo de MLflow puede declarar directamente a qué
# sistema corresponde. Sigue funcionando y tiene prioridad, pero ya no es la vía
# principal: lo normal es conciliar desde la pantalla de Descubrimientos.
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


def _is_production(model: dict[str, Any], version: dict[str, Any]) -> bool:
    """¿Esta versión es la que está sirviendo en producción?

    Los alias se guardan en el MODELO REGISTRADO, no en la versión:
    `registered-models/search` devuelve [{"alias": "champion", "version": "1"}]
    mientras que `model-versions/search` no los incluye.
    """
    number = str(version.get("version") or "")

    for entry in model.get("aliases") or []:
        alias = str(entry.get("alias") or "").lower()
        if alias in PRODUCTION_ALIASES and str(entry.get("version") or "") == number:
            return True

    if {a.lower() for a in (version.get("aliases") or [])} & PRODUCTION_ALIASES:
        return True

    # MLflow 2.x usaba etapas; siguen apareciendo en instalaciones migradas.
    return (version.get("current_stage") or "").lower() == "production"


def resolve_system_id(
    model: dict[str, Any],
    versions: list[dict[str, Any]],
    links: dict[str, str],
) -> str | None:
    """Sistema del inventario al que pertenece este modelo, si se sabe.

    Prioridad: etiqueta en la versión → etiqueta en el modelo → conciliación
    hecha desde la aplicación. La etiqueta gana porque es una declaración
    explícita de quien administra MLflow.
    """
    for version in versions:
        tagged = tag_value(version, SYSTEM_ID_TAG)
        if tagged:
            return tagged

    return tag_value(model, SYSTEM_ID_TAG) or links.get(model.get("name") or "")


def build_signals(
    model: dict[str, Any],
    version: dict[str, Any],
    system_id: str,
) -> list[dict[str, Any]]:
    """Señales que corresponden a una versión de un modelo YA vinculado.

    Una versión siempre genera la señal de registro. Si además está sirviendo en
    producción, genera una segunda de promoción — que es la que importa desde el
    punto de vista de gobernanza: significa que el sistema de IA que hay en el
    inventario ya no es el que está descrito en su dossier.

    Las claves de idempotencia hacen que el conector no necesite recordar nada:
    puede reenviar todo el registro en cada pasada y el Core ignora lo conocido.
    """
    name = model.get("name") or version.get("name") or "(sin nombre)"
    number = version.get("version")
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

    if _is_production(model, version):
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


def build_discovery(
    model: dict[str, Any],
    versions: list[dict[str, Any]],
    *,
    connection_id: str | None,
    base_url: str,
) -> dict[str, Any]:
    """Descubrimiento de un modelo que aún no está en el inventario.

    Uno por modelo, no por versión: lo que hay que decidir es si ese modelo es
    un sistema de IA de la organización, no cada una de sus versiones.
    """
    name = model.get("name") or "(sin nombre)"

    production = [
        str(v.get("version"))
        for v in versions
        if _is_production(model, v)
    ]

    return {
        "connection_id": connection_id,
        "source_module": SOURCE_MODULE,
        "asset_type": "model",
        "external_id": name,
        "external_url": f"{base_url.rstrip('/')}/#/models/{name}",
        "name": name,
        "description": model.get("description") or None,
        "metadata": {
            "versions": len(versions),
            "latest_version": max(
                (int(v["version"]) for v in versions if str(v.get("version", "")).isdigit()),
                default=None,
            ),
            "production_versions": production,
            "created_at": _iso(model.get("creation_timestamp")),
            "last_updated_at": _iso(model.get("last_updated_timestamp")),
            "tags": {t.get("key"): t.get("value") for t in (model.get("tags") or [])},
        },
    }
