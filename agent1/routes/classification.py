"""
agent1/routes/classification.py
Motor de clasificación AI Act con diff y reconciliación.

Endpoints:
  POST   /api/v1/systems/{system_id}/classify              — primera clasificación
  POST   /api/v1/systems/{system_id}/reclassify            — revisión manual
  POST   /api/v1/systems/{system_id}/reconcile             — confirmar diff
  DELETE /api/v1/systems/{system_id}/classification-events/{event_id} — cancelar
  GET    /api/v1/systems/{system_id}/classification-events — historial
"""

import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Header
from pydantic import BaseModel
from supabase import Client

logger = logging.getLogger("agent1.classification")

# ─────────────────────────────────────────────────────────────
# LABELS DE OBLIGACIONES
# ─────────────────────────────────────────────────────────────

OBLIGATION_LABELS: dict[str, str] = {
    "art_9":             "Art. 9 — Sistema de gestión de riesgos",
    "art_10":            "Art. 10 — Gobernanza de datos de entrenamiento",
    "art_11":            "Art. 11 — Documentación técnica completa",
    "art_12":            "Art. 12 — Registro automático de actividad (logs)",
    "art_13":            "Art. 13 — Transparencia e información a usuarios",
    "art_14":            "Art. 14 — Supervisión humana obligatoria",
    "art_15":            "Art. 15 — Precisión, robustez y ciberseguridad",
    "art_16":            "Art. 16 — Obligaciones del proveedor",
    "art_43":            "Art. 43 — Evaluación de conformidad",
    "art_50":            "Art. 50 — Disclosure de interacción con IA",
    "art_71":            "Art. 71 — Registro en EU AI Office",
    # GPAI (Art. 51-55)
    "art_53_doc":        "Art. 53 — Documentación técnica",
    "art_53_copyright":  "Art. 53 — Política de copyright",
    "art_53_training":   "Art. 53 — Resumen de datos de entrenamiento",
    "art_55":            "Art. 55 — Riesgo sistémico (si aplica)",
}

HIGH_RISK_FULL = [
    "art_9", "art_10", "art_11", "art_12",
    "art_13", "art_14", "art_15", "art_16", "art_43", "art_71",
]

GPAI_OBLIGATIONS = [
    "art_53_doc", "art_53_copyright", "art_53_training", "art_55",
]


# ─────────────────────────────────────────────────────────────
# MODELOS PYDANTIC
# ─────────────────────────────────────────────────────────────

class ClassificationFactors(BaseModel):
    domain: str
    output_type: str
    affects_persons: bool
    has_biometric: bool = False
    is_gpai: bool = False
    manages_critical_infrastructure: bool = False
    affects_vulnerable_groups: bool = False
    involves_minors: bool = False
    intended_use: Optional[str] = None


class ReclassifyRequest(BaseModel):
    factors: ClassificationFactors
    review_notes: Optional[str] = None


class ReconcileDecision(BaseModel):
    diff_id: str
    resolution: str  # 'accepted' | 'excluded' | 'preserved' | 'archived'
    resolution_note: Optional[str] = None


class ReconcileRequest(BaseModel):
    event_id: str
    decisions: list[ReconcileDecision]


# ─────────────────────────────────────────────────────────────
# MOTOR DE REGLAS
# ─────────────────────────────────────────────────────────────

def run_classification_engine(factors: ClassificationFactors) -> dict:
    f = factors

    # GPAI toma precedencia sobre todas las categorías de riesgo (igual que en el motor TS)
    if f.is_gpai:
        return {
            "risk_level": "gpai",
            "risk_label": "Modelo GPAI",
            "basis": "Art. 51-53 — IA de uso general",
            "reason": (
                "Modelo de propósito general. Obligaciones de transparencia, "
                "documentación y —si hay riesgo sistémico— Art. 55."
            ),
            "obligations_set": GPAI_OBLIGATIONS,
        }

    if f.has_biometric:
        return {
            "risk_level": "high",
            "risk_label": "Alto Riesgo",
            "basis": "Anexo III §1 — Biometría",
            "reason": (
                "Sistema que procesa datos biométricos de personas físicas "
                "para identificación remota o categorización."
            ),
            "obligations_set": HIGH_RISK_FULL,
        }

    if (
        f.domain in ("finanzas_banca", "credito")
        and f.output_type in ("decision", "prediccion")
        and f.affects_persons
    ):
        return {
            "risk_level": "high",
            "risk_label": "Alto Riesgo",
            "basis": "Anexo III §5(b)",
            "reason": (
                "Sistema que evalúa la solvencia de personas para el acceso "
                "a servicios financieros esenciales."
            ),
            "obligations_set": HIGH_RISK_FULL,
        }

    if (
        f.domain == "rrhh"
        and f.output_type in ("decision", "clasificacion")
        and f.affects_persons
    ):
        return {
            "risk_level": "high",
            "risk_label": "Alto Riesgo",
            "basis": "Anexo III §4",
            "reason": (
                "Sistema que interviene en decisiones de empleo o gestión "
                "de personas en el ámbito laboral."
            ),
            "obligations_set": ["art_9", "art_11", "art_14", "art_71"],
        }

    if f.manages_critical_infrastructure and f.affects_persons:
        return {
            "risk_level": "high",
            "risk_label": "Alto Riesgo",
            "basis": "Anexo III §2",
            "reason": (
                "Sistema que gestiona o interviene en componentes de infraestructura "
                "crítica que pueden afectar a personas."
            ),
            "obligations_set": HIGH_RISK_FULL,
        }

    if f.output_type == "generacion":
        return {
            "risk_level": "limited",
            "risk_label": "Riesgo Limitado",
            "basis": "Artículo 50",
            "reason": (
                "Sistema de generación de contenido que requiere disclosure "
                "de interacción con IA."
            ),
            "obligations_set": ["art_50"],
        }

    if f.domain == "atencion_cliente" and f.output_type == "clasificacion":
        return {
            "risk_level": "limited",
            "risk_label": "Riesgo Limitado",
            "basis": "Artículo 50.1",
            "reason": "Sistema de interacción con usuarios que debe informar del uso de IA.",
            "obligations_set": ["art_50"],
        }

    if not f.affects_persons:
        return {
            "risk_level": "minimal",
            "risk_label": "Riesgo Mínimo",
            "basis": "Sin aplicación Anexo III ni Art. 50",
            "reason": (
                "El sistema no afecta directamente a personas físicas y no cae "
                "en categorías de riesgo específicas."
            ),
            "obligations_set": [],
        }

    return {
        "risk_level": "minimal",
        "risk_label": "Riesgo Mínimo",
        "basis": "Fuera de categorías Anexo III",
        "reason": (
            "No se han detectado elementos que activen las categorías de "
            "alto riesgo del AI Act."
        ),
        "obligations_set": [],
    }


# ─────────────────────────────────────────────────────────────
# ALGORITMO DE DIFF
# ─────────────────────────────────────────────────────────────

def compute_diff(
    current_keys: list[str],
    new_keys: list[str],
    existing_obligations: dict[str, dict],
) -> list[dict]:
    current_set = set(current_keys)
    new_set = set(new_keys)
    result = []

    for key in sorted(new_set - current_set):
        result.append({
            "obligation_key": key,
            "obligation_label": OBLIGATION_LABELS.get(key, key),
            "diff_type": "added",
            "previous_obligation_id": None,
            "previous_status": None,
        })

    for key in sorted(current_set - new_set):
        existing = existing_obligations.get(key, {})
        result.append({
            "obligation_key": key,
            "obligation_label": OBLIGATION_LABELS.get(key, key),
            "diff_type": "removed",
            "previous_obligation_id": existing.get("id"),
            "previous_status": existing.get("status"),
        })

    for key in sorted(current_set & new_set):
        existing = existing_obligations.get(key, {})
        result.append({
            "obligation_key": key,
            "obligation_label": OBLIGATION_LABELS.get(key, key),
            "diff_type": "unchanged",
            "previous_obligation_id": existing.get("id"),
            "previous_status": existing.get("status"),
        })

    return result


def get_auto_resolution(diff_type: str, previous_status: Optional[str]) -> Optional[str]:
    if diff_type == "unchanged":
        return "preserved"
    if diff_type == "removed":
        # Requiere decisión explícita solo cuando hay trabajo real (espejo de isCriticalRemoval en el frontend)
        if previous_status in ("in_progress", "resolved", "accepted"):
            return None
        return "archived"
    return None


# ─────────────────────────────────────────────────────────────
# HELPERS DE DB
# ─────────────────────────────────────────────────────────────

def _get_next_version(sb: Client, system_id: str) -> int:
    result = sb.schema("fluxion").table("classification_events") \
        .select("version") \
        .eq("ai_system_id", system_id) \
        .order("version", desc=True) \
        .limit(1) \
        .execute()
    if result.data:
        return result.data[0]["version"] + 1
    return 1


def _get_active_obligations(sb: Client, system_id: str) -> dict[str, dict]:
    result = sb.schema("fluxion").table("system_obligations") \
        .select("id, obligation_key, obligation_code, status") \
        .eq("ai_system_id", system_id) \
        .is_("archived_at", "null") \
        .execute()

    obligations = {}
    for obl in (result.data or []):
        # Usar obligation_key si existe, sino obligation_code como fallback
        key = obl.get("obligation_key") or obl.get("obligation_code")
        if key:
            obligations[key] = {"id": obl["id"], "status": obl["status"]}
    return obligations


def _assert_no_pending_reconciliation(sb: Client, system_id: str) -> None:
    result = sb.schema("fluxion").table("classification_events") \
        .select("id") \
        .eq("ai_system_id", system_id) \
        .eq("status", "pending_reconciliation") \
        .execute()
    if result.data:
        raise HTTPException(
            status_code=409,
            detail=(
                "Hay una reclasificación pendiente de reconciliación. "
                "Resuelve los cambios antes de iniciar una nueva clasificación."
            )
        )


def _extract_factors_from_system(system: dict) -> ClassificationFactors:
    """Extrae los factores de clasificación del registro de ai_systems."""
    return ClassificationFactors(
        domain=system.get("domain") or "",
        output_type=system.get("output_type") or "",
        affects_persons=bool(system.get("affects_persons")),
        has_biometric=bool(system.get("biometric") or system.get("uses_biometric_data")),
        is_gpai=bool(system.get("is_gpai")),
        manages_critical_infrastructure=bool(system.get("critical_infra") or system.get("manages_critical_infra")),
        affects_vulnerable_groups=bool(system.get("vulnerable_groups") or system.get("affects_vulnerable_groups")),
        involves_minors=bool(system.get("has_minors") or system.get("involves_minors")),
        intended_use=system.get("intended_use") or system.get("purpose"),
    )


# ─────────────────────────────────────────────────────────────
# REGISTRO DE RUTAS
# ─────────────────────────────────────────────────────────────

def register_classification_routes(
    app: FastAPI,
    sb: Client,
    verify_token,
    get_user_profile,
):

    # ─── POST /classify ───────────────────────────────────────────
    @app.post("/api/v1/systems/{system_id}/classify")
    async def classify_initial(
        system_id: str,
        authorization: str = Header(None),
    ):
        """
        Primera clasificación de un sistema recién registrado.
        Lee los factores directamente del sistema en DB.
        Crea el classification_event (reconciled) y las system_obligations (suggested).
        """
        user = verify_token(authorization)
        profile = get_user_profile(user.id)
        org_id = profile["organization_id"]
        profile_id = profile["id"]

        system_result = sb.schema("fluxion").table("ai_systems") \
            .select("*") \
            .eq("id", system_id) \
            .eq("organization_id", org_id) \
            .single() \
            .execute()
        if not system_result.data:
            raise HTTPException(404, "Sistema no encontrado o sin acceso")
        system = system_result.data

        # No clasificar si ya tiene una clasificación activa
        if system.get("current_classification_event_id"):
            raise HTTPException(409, "El sistema ya tiene una clasificación activa.")

        factors = _extract_factors_from_system(system)
        classification = run_classification_engine(factors)

        version = _get_next_version(sb, system_id)
        event_id = str(uuid4())

        sb.schema("fluxion").table("classification_events").insert({
            "id":                     event_id,
            "ai_system_id":           system_id,
            "organization_id":        org_id,
            "version":                version,
            "method":                 "initial",
            "risk_level":             classification["risk_level"],
            "risk_label":             classification["risk_label"],
            "basis":                  classification["basis"],
            "reason":                 classification["reason"],
            "obligations_set":        classification["obligations_set"],
            "classification_factors": factors.model_dump(),
            "created_by":             profile_id,
            "status":                 "reconciled",
        }).execute()

        for key in classification["obligations_set"]:
            label = OBLIGATION_LABELS.get(key, key)
            sb.schema("fluxion").table("system_obligations").insert({
                "id":                      str(uuid4()),
                "ai_system_id":            system_id,
                "organization_id":         org_id,
                "source_framework":        "ai_act",
                "title":                   label,
                "obligation_key":          key,
                "obligation_label":        label,
                "status":                  "suggested",
                "classification_event_id": event_id,
            }).execute()

        sb.schema("fluxion").table("ai_systems").update({
            "current_classification_event_id": event_id,
        }).eq("id", system_id).execute()

        logger.info(
            f"Clasificación inicial: sistema {system_id} → "
            f"{classification['risk_level']} (v{version})"
        )

        return {
            "data": {
                "event_id":        event_id,
                "version":         version,
                "risk_level":      classification["risk_level"],
                "risk_label":      classification["risk_label"],
                "obligations_set": classification["obligations_set"],
            }
        }


    # ─── POST /reclassify ─────────────────────────────────────────
    @app.post("/api/v1/systems/{system_id}/reclassify")
    async def reclassify(
        system_id: str,
        request: ReclassifyRequest,
        authorization: str = Header(None),
    ):
        """
        Reclasifica un sistema con factores actualizados por el usuario.
        Si hay diferencias, crea un evento pending_reconciliation con el diff.
        Si no hay diferencias, devuelve has_changes: false sin crear nada.
        """
        user = verify_token(authorization)
        profile = get_user_profile(user.id)
        org_id = profile["organization_id"]
        profile_id = profile["id"]

        system_result = sb.schema("fluxion").table("ai_systems") \
            .select("id, organization_id, current_classification_event_id") \
            .eq("id", system_id) \
            .eq("organization_id", org_id) \
            .single() \
            .execute()
        if not system_result.data:
            raise HTTPException(404, "Sistema no encontrado o sin acceso")

        _assert_no_pending_reconciliation(sb, system_id)

        # Obtener clasificación activa
        active_result = sb.schema("fluxion").table("classification_events") \
            .select("risk_level, obligations_set") \
            .eq("ai_system_id", system_id) \
            .eq("status", "reconciled") \
            .order("version", desc=True) \
            .limit(1) \
            .execute()

        current_keys = []
        current_risk = None
        if active_result.data:
            current_keys = active_result.data[0]["obligations_set"] or []
            current_risk = active_result.data[0]["risk_level"]
        else:
            # Sin classification_event reconciliado — leer obligaciones activas directamente
            existing_fallback = _get_active_obligations(sb, system_id)
            current_keys = list(existing_fallback.keys())
            sys_res = sb.schema("fluxion").table("ai_systems") \
                .select("aiact_risk_level") \
                .eq("id", system_id) \
                .single() \
                .execute()
            if sys_res.data:
                lvl = sys_res.data.get("aiact_risk_level") or ""
                current_risk = lvl if lvl in ("prohibited", "high", "limited", "minimal", "gpai") else None

        new_classification = run_classification_engine(request.factors)
        new_keys = new_classification["obligations_set"]

        # Sin cambios → no crear evento
        if set(current_keys) == set(new_keys) and current_risk == new_classification["risk_level"]:
            return {"data": {"has_changes": False}}

        existing_obligations = _get_active_obligations(sb, system_id)
        diff_items = compute_diff(current_keys, new_keys, existing_obligations)

        version = _get_next_version(sb, system_id)
        event_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        sb.schema("fluxion").table("classification_events").insert({
            "id":                     event_id,
            "ai_system_id":           system_id,
            "organization_id":        org_id,
            "version":                version,
            "method":                 "manual_review",
            "risk_level":             new_classification["risk_level"],
            "risk_label":             new_classification["risk_label"],
            "basis":                  new_classification["basis"],
            "reason":                 new_classification["reason"],
            "obligations_set":        new_keys,
            "classification_factors": request.factors.model_dump(),
            "created_by":             profile_id,
            "review_notes":           request.review_notes,
            "status":                 "pending_reconciliation",
        }).execute()

        for item in diff_items:
            auto_res = get_auto_resolution(item["diff_type"], item["previous_status"])
            sb.schema("fluxion").table("classification_diffs").insert({
                "id":                      str(uuid4()),
                "classification_event_id": event_id,
                "ai_system_id":            system_id,
                "organization_id":         org_id,
                "obligation_key":          item["obligation_key"],
                "obligation_label":        item["obligation_label"],
                "diff_type":               item["diff_type"],
                "previous_obligation_id":  item["previous_obligation_id"],
                "previous_status":         item["previous_status"],
                "resolution":              auto_res,
                "resolved_by":             profile_id if auto_res else None,
                "resolved_at":             now if auto_res else None,
                "resolution_note":         "Auto-resuelto por el sistema" if auto_res else None,
            }).execute()

        logger.info(
            f"Reclasificación: sistema {system_id} → "
            f"{new_classification['risk_level']} (v{version}, pending_reconciliation)"
        )

        return {
            "data": {
                "has_changes": True,
                "event_id":    event_id,
                "version":     version,
                "risk_level":  new_classification["risk_level"],
                "risk_label":  new_classification["risk_label"],
            }
        }


    # ─── POST /reconcile ──────────────────────────────────────────
    @app.post("/api/v1/systems/{system_id}/reconcile")
    async def reconcile(
        system_id: str,
        request: ReconcileRequest,
        authorization: str = Header(None),
    ):
        """
        Aplica las decisiones del panel de reconciliación.
        Operación atómica: archiva eliminadas, crea nuevas, marca evento reconciled.
        """
        user = verify_token(authorization)
        profile = get_user_profile(user.id)
        org_id = profile["organization_id"]
        profile_id = profile["id"]

        # Verificar sistema
        system_result = sb.schema("fluxion").table("ai_systems") \
            .select("id") \
            .eq("id", system_id) \
            .eq("organization_id", org_id) \
            .single() \
            .execute()
        if not system_result.data:
            raise HTTPException(404, "Sistema no encontrado o sin acceso")

        # Verificar evento pendiente
        event_result = sb.schema("fluxion").table("classification_events") \
            .select("*") \
            .eq("id", request.event_id) \
            .eq("ai_system_id", system_id) \
            .eq("status", "pending_reconciliation") \
            .single() \
            .execute()
        if not event_result.data:
            raise HTTPException(404, "Evento de clasificación no encontrado o ya reconciliado.")
        event = event_result.data

        # Cargar todos los diffs del evento
        diffs_result = sb.schema("fluxion").table("classification_diffs") \
            .select("*") \
            .eq("classification_event_id", request.event_id) \
            .execute()
        diffs = {d["id"]: d for d in (diffs_result.data or [])}

        decisions_map = {d.diff_id: d for d in request.decisions}

        # Validar que no faltan decisiones requeridas
        for diff in diffs.values():
            if diff["resolution"] is not None:
                continue  # ya auto-resuelto
            if diff["id"] not in decisions_map:
                raise HTTPException(
                    status_code=422,
                    detail=f"Falta decisión para la obligación '{diff['obligation_label']}'."
                )

        # Validar que exclusiones y archivos tienen nota
        for diff in diffs.values():
            if diff["resolution"] is not None:
                continue
            decision = decisions_map[diff["id"]]
            if decision.resolution in ("excluded", "archived") and not decision.resolution_note:
                raise HTTPException(
                    status_code=422,
                    detail=(
                        f"La obligación '{diff['obligation_label']}' requiere una nota "
                        f"para ser {decision.resolution}."
                    )
                )

        now = datetime.now(timezone.utc).isoformat()

        # Paso 1: persistir decisiones del usuario en los diffs que no estaban auto-resueltos
        for diff in diffs.values():
            if diff["resolution"] is not None:
                continue  # ya auto-resuelto al crear el diff

            decision = decisions_map[diff["id"]]
            sb.schema("fluxion").table("classification_diffs").update({
                "resolution":      decision.resolution,
                "resolution_note": decision.resolution_note,
                "resolved_by":     profile_id,
                "resolved_at":     now,
            }).eq("id", diff["id"]).execute()
            # Actualizar el dict local para el paso 2
            diffs[diff["id"]]["resolution"] = decision.resolution
            diffs[diff["id"]]["resolution_note"] = decision.resolution_note

        # Paso 2: aplicar efectos sobre system_obligations para TODOS los diffs
        # (tanto auto-resueltos como resueltos por el usuario)
        for diff in diffs.values():
            resolution = diff["resolution"]

            if diff["diff_type"] == "added":
                if resolution == "accepted":
                    label = diff["obligation_label"]
                    sb.schema("fluxion").table("system_obligations").insert({
                        "id":                      str(uuid4()),
                        "ai_system_id":            system_id,
                        "organization_id":         org_id,
                        "source_framework":        "ai_act",
                        "title":                   label,
                        "obligation_key":          diff["obligation_key"],
                        "obligation_label":        label,
                        "status":                  "pending",
                        "classification_event_id": request.event_id,
                    }).execute()

                elif resolution == "excluded":
                    label = diff["obligation_label"]
                    note = diff.get("resolution_note") or ""
                    sb.schema("fluxion").table("system_obligations").insert({
                        "id":                       str(uuid4()),
                        "ai_system_id":             system_id,
                        "organization_id":          org_id,
                        "source_framework":         "ai_act",
                        "title":                    label,
                        "obligation_key":           diff["obligation_key"],
                        "obligation_label":         label,
                        "status":                   "excluded",
                        "exclusion_justification":  note,
                        "classification_event_id":  request.event_id,
                    }).execute()

            elif diff["diff_type"] == "removed":
                if resolution == "archived" and diff.get("previous_obligation_id"):
                    note = diff.get("resolution_note") or f"Archivada por reclasificación v{event['version']}"
                    sb.schema("fluxion").table("system_obligations").update({
                        "archived_at":  now,
                        "archive_note": note,
                    }).eq("id", diff["previous_obligation_id"]).execute()
                # preserved → no tocar la obligación existente

        # Marcar eventos anteriores como superseded
        sb.schema("fluxion").table("classification_events").update({
            "status": "superseded",
        }).eq("ai_system_id", system_id).eq("status", "reconciled").execute()

        # Marcar este evento como reconciled
        sb.schema("fluxion").table("classification_events").update({
            "status": "reconciled",
        }).eq("id", request.event_id).execute()

        # Actualizar ai_systems
        sb.schema("fluxion").table("ai_systems").update({
            "current_classification_event_id": request.event_id,
            "aiact_risk_level": event["risk_level"],
        }).eq("id", system_id).execute()

        logger.info(
            f"Reconciliación completada: sistema {system_id} → "
            f"clasificación v{event['version']} activa"
        )

        return {
            "data": {
                "event_id": request.event_id,
                "version":  event["version"],
                "message":  f"Clasificación actualizada a versión {event['version']}.",
            }
        }


    # ─── DELETE /classification-events/{event_id} ─────────────────
    @app.delete("/api/v1/systems/{system_id}/classification-events/{event_id}")
    async def cancel_reclassification(
        system_id: str,
        event_id: str,
        authorization: str = Header(None),
    ):
        """
        Cancela una reclasificación pending_reconciliation.
        Borra el evento y sus diffs (CASCADE). No toca system_obligations.
        """
        user = verify_token(authorization)
        profile = get_user_profile(user.id)
        org_id = profile["organization_id"]
        profile_id = profile["id"]

        result = sb.schema("fluxion").table("classification_events") \
            .select("id") \
            .eq("id", event_id) \
            .eq("ai_system_id", system_id) \
            .eq("organization_id", org_id) \
            .eq("status", "pending_reconciliation") \
            .single() \
            .execute()

        if not result.data:
            raise HTTPException(
                404,
                "Evento no encontrado o no está pendiente de reconciliación."
            )

        sb.schema("fluxion").table("classification_events") \
            .delete() \
            .eq("id", event_id) \
            .execute()

        logger.info(f"Reclasificación cancelada: evento {event_id} eliminado")
        return {"data": {"cancelled": True}}


    # ─── GET /classification-events ───────────────────────────────
    @app.get("/api/v1/systems/{system_id}/classification-events")
    async def get_classification_history(
        system_id: str,
        authorization: str = Header(None),
    ):
        """Historial de clasificaciones de un sistema, ordenado por versión descendente."""
        user = verify_token(authorization)
        profile = get_user_profile(user.id)
        org_id = profile["organization_id"]
        profile_id = profile["id"]

        system_result = sb.schema("fluxion").table("ai_systems") \
            .select("id") \
            .eq("id", system_id) \
            .eq("organization_id", org_id) \
            .single() \
            .execute()
        if not system_result.data:
            raise HTTPException(404, "Sistema no encontrado o sin acceso")

        result = sb.schema("fluxion").table("classification_events") \
            .select(
                "id, version, method, risk_level, risk_label, basis, "
                "reason, obligations_set, classification_factors, "
                "review_notes, status, created_by, created_at"
            ) \
            .eq("ai_system_id", system_id) \
            .eq("organization_id", org_id) \
            .order("version", desc=True) \
            .execute()

        return {"data": result.data or []}
