"""
fluxion_agents/routes/classification.py
Motor de clasificación AI Act con diff y reconciliación.

Endpoints:
  POST   /api/v1/systems/{system_id}/classify              — primera clasificación
  POST   /api/v1/systems/{system_id}/reclassify            — revisión manual
  POST   /api/v1/systems/{system_id}/reconcile             — confirmar diff
  DELETE /api/v1/systems/{system_id}/classification-events/{event_id} — cancelar
  GET    /api/v1/systems/{system_id}/classification-events — historial
"""

import json
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import uuid4

from fastapi import FastAPI, HTTPException, Header
from openai import AsyncOpenAI

from fluxion_agents.models import CLASSIFICATION_MODEL
from pydantic import BaseModel
from supabase import Client

from fluxion_agents.prompts.classification import (
    CLASSIFICATION_SYSTEM_PROMPT,
    build_classification_user_prompt,
)
from fluxion_agents.rag.retriever import retrieve_for_classification
from fluxion_common.telemetry import llm_span

logger = logging.getLogger("fluxion_agents.classification")

# ─────────────────────────────────────────────────────────────
# CLASIFICACIÓN DEL MOTOR ÚNICO (B13a)
# ─────────────────────────────────────────────────────────────
#
# La clasificación AI Act la calcula un solo motor, en la aplicación web
# (apps/web/lib/ai-act). Este servicio ya no clasifica por reglas: recibe el
# resultado del motor y se ocupa de los eventos de clasificación y de la
# conciliación de obligaciones. Las obligaciones usan los códigos del catálogo
# compliance.obligations (AI-ACT-ART9…).

VALID_LEVELS = {"prohibited", "high", "limited", "minimal", "pending"}


class EngineObligation(BaseModel):
    code: str
    label: str


class EngineClassification(BaseModel):
    scope: str  # in_scope | out_of_scope | not_ai_system | pending
    risk_level: Optional[str] = None  # None fuera del ámbito o si no es IA
    risk_label: str
    basis: str
    reason: str
    obligations: list[EngineObligation] = []
    result: dict = {}
    inputs: Optional[dict] = None


class ClassifyRequest(BaseModel):
    classification: EngineClassification


class ReclassifyRequest(BaseModel):
    classification: EngineClassification
    factors: dict = {}
    review_notes: Optional[str] = None


class AiReclassifyRequest(BaseModel):
    reference: EngineClassification


class ReconcileDecision(BaseModel):
    diff_id: str
    resolution: str  # 'accepted' | 'excluded' | 'preserved' | 'archived'
    resolution_note: Optional[str] = None


class ReconcileRequest(BaseModel):
    event_id: str
    decisions: list[ReconcileDecision]


# Campos de la ventana «Revisar clasificación» → columnas de ai_systems.
FORM_COLUMNS = {
    "domain":            "domain",
    "intendedUse":       "intended_use",
    "outputType":        "output_type",
    "outputTypes":       "output_types",
    "interactsPersons":  "interacts_persons",
    "isAISystem":        "is_ai_system",
    "affectsPersons":    "affects_persons",
    "vulnerableGroups":  "vulnerable_groups",
    "hasMinors":         "involves_minors",
    "biometric":         "uses_biometric_data",
    "criticalInfra":     "manages_critical_infra",
}


def _catalog_labels(sb: Client, include_retired: bool = True) -> dict[str, str]:
    """Etiqueta «Art. N — título» de cada código AI Act del catálogo.

    Las retiradas (B13d: el Art. 50 sin dividir) conservan su etiqueta para las
    obligaciones ya registradas, pero no se ofrecen al agente.
    """
    res = sb.schema("compliance").table("obligations") \
        .select("code, article, title, retired_at") \
        .eq("framework", "AI_ACT") \
        .execute()
    return {
        o["code"]: f"{o['article']} — {o['title']}"
        for o in (res.data or [])
        if include_retired or not o.get("retired_at")
    }


def _event_payload(c: EngineClassification, factors: Optional[dict] = None) -> dict:
    """classification_factors del evento: resultado del motor, supuestos y formulario."""
    return {"engine_result": c.result, "inputs": c.inputs, "form": factors or {}}


# ─────────────────────────────────────────────────────────────
# ALGORITMO DE DIFF
# ─────────────────────────────────────────────────────────────

def compute_diff(
    current_keys: list[str],
    new_keys: list[str],
    existing_obligations: dict[str, dict],
    labels: dict[str, str],
) -> list[dict]:
    current_set = set(current_keys)
    new_set = set(new_keys)
    result = []

    for key in sorted(new_set - current_set):
        result.append({
            "obligation_key": key,
            "obligation_label": labels.get(key, key),
            "diff_type": "added",
            "previous_obligation_id": None,
            "previous_status": None,
        })

    for key in sorted(current_set - new_set):
        existing = existing_obligations.get(key, {})
        result.append({
            "obligation_key": key,
            "obligation_label": labels.get(key, key),
            "diff_type": "removed",
            "previous_obligation_id": existing.get("id"),
            "previous_status": existing.get("status"),
        })

    for key in sorted(current_set & new_set):
        existing = existing_obligations.get(key, {})
        result.append({
            "obligation_key": key,
            "obligation_label": labels.get(key, key),
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


# ─────────────────────────────────────────────────────────────
# REGISTRO DE RUTAS
# ─────────────────────────────────────────────────────────────

def register_classification_routes(
    app: FastAPI,
    sb: Client,
    verify_token,
    get_user_profile,
    openai_client: Optional[AsyncOpenAI] = None,
):

    # ─── POST /classify ───────────────────────────────────────────
    @app.post("/api/v1/systems/{system_id}/classify")
    async def classify_initial(
        system_id: str,
        request: ClassifyRequest,
        authorization: str = Header(None),
    ):
        """
        Primera clasificación de un sistema recién registrado, con el resultado
        del motor único que envía la aplicación web (B13a).
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

        c = request.classification
        keys = [o.code for o in c.obligations]
        labels = {o.code: o.label for o in c.obligations}

        version = _get_next_version(sb, system_id)
        event_id = str(uuid4())

        sb.schema("fluxion").table("classification_events").insert({
            "id":                     event_id,
            "ai_system_id":           system_id,
            "organization_id":        org_id,
            "version":                version,
            "method":                 "initial",
            "risk_level":             c.risk_level,
            "risk_label":             c.risk_label,
            "basis":                  c.basis,
            "reason":                 c.reason,
            "obligations_set":        keys,
            "classification_factors": _event_payload(c),
            "created_by":             profile_id,
            "status":                 "reconciled",
        }).execute()

        for key in keys:
            label = labels.get(key, key)
            sb.schema("fluxion").table("system_obligations").insert({
                "id":                      str(uuid4()),
                "ai_system_id":            system_id,
                "organization_id":         org_id,
                "source_framework":        "AI_ACT",
                "title":                   label,
                "obligation_code":         key,
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
            f"{c.risk_level} (v{version})"
        )

        return {
            "data": {
                "event_id":        event_id,
                "version":         version,
                "risk_level":      c.risk_level,
                "risk_label":      c.risk_label,
                "obligations_set": keys,
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
                current_risk = lvl if lvl in VALID_LEVELS else None

        c = request.classification
        new_keys = [o.code for o in c.obligations]
        labels = {**_catalog_labels(sb), **{o.code: o.label for o in c.obligations}}

        # Sin cambios → no crear evento
        if set(current_keys) == set(new_keys) and current_risk == c.risk_level:
            return {"data": {"has_changes": False}}

        existing_obligations = _get_active_obligations(sb, system_id)
        diff_items = compute_diff(current_keys, new_keys, existing_obligations, labels)

        version = _get_next_version(sb, system_id)
        event_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        sb.schema("fluxion").table("classification_events").insert({
            "id":                     event_id,
            "ai_system_id":           system_id,
            "organization_id":        org_id,
            "version":                version,
            "method":                 "manual_review",
            "risk_level":             c.risk_level,
            "risk_label":             c.risk_label,
            "basis":                  c.basis,
            "reason":                 c.reason,
            "obligations_set":        new_keys,
            "classification_factors": _event_payload(c, request.factors),
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
            f"{c.risk_level} (v{version}, pending_reconciliation)"
        )

        return {
            "data": {
                "has_changes": True,
                "event_id":    event_id,
                "version":     version,
                "risk_level":  c.risk_level,
                "risk_label":  c.risk_label,
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
                        "source_framework":        "AI_ACT",
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
                        "source_framework":         "AI_ACT",
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

        # Actualizar ai_systems: la cabecera completa, no solo el nivel (B13a, I10).
        labels = _catalog_labels(sb)
        nivel = event["risk_level"] if event["risk_level"] in VALID_LEVELS else "pending"
        update = {
            "current_classification_event_id": request.event_id,
            "aiact_risk_level":    nivel,
            "aiact_risk_basis":    event.get("basis"),
            "aiact_risk_reason":   event.get("reason"),
            "aiact_obligations":   [labels.get(k, k) for k in (event.get("obligations_set") or [])],
            "aiact_classified_at": datetime.now(timezone.utc).isoformat(),
            "aiact_review_pending": False,
            "prohibited_practice": nivel == "prohibited",
        }
        factors = event.get("classification_factors") or {}
        # `engine_reference`: eventos del agente anteriores a B13e.
        engine_result = factors.get("engine_result") or factors.get("engine_reference") or {}
        if engine_result:
            gpai = engine_result.get("gpai") or {}
            # Si el agente fija un nivel, el sistema queda dentro del ámbito
            # aunque el motor dijera otra cosa; la ficha muestra la divergencia.
            ambito = engine_result.get("scope") or "in_scope"
            if event.get("method") == "ai_agent" and event["risk_level"] in VALID_LEVELS:
                ambito = "in_scope"
            update.update({
                "aiact_result":           engine_result,
                "aiact_scope":            ambito,
                "aiact_scope_reason":     engine_result.get("scopeReason") if ambito != "in_scope" else None,
                "aiact_rules_version":    engine_result.get("rulesVersion"),
                "is_gpai":                bool(gpai.get("modelProvider")),
                "gpai_systemic_risk":     gpai.get("systemicRisk"),
                "gpai_third_party_based": bool(gpai.get("thirdPartyBased")),
            })
            inputs = factors.get("inputs")
            if inputs is not None:
                update["aiact_inputs"] = inputs
        # Campos editados en la ventana de revisión: pasan a la ficha, para que
        # la próxima clasificación parta de ellos (B13a).
        form = factors.get("form") or {}
        for campo, columna in FORM_COLUMNS.items():
            if campo in form:
                update[columna] = form[campo]
        sb.schema("fluxion").table("ai_systems").update(update).eq("id", system_id).execute()

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


    # ─── POST /reclassify/ai ──────────────────────────────────────
    @app.post("/api/v1/systems/{system_id}/reclassify/ai")
    async def reclassify_with_ai(
        system_id: str,
        request: AiReclassifyRequest,
        authorization: str = Header(None),
    ):
        """
        Reclasifica un sistema usando el agente IA.
        El agente produce risk_level + obligations_set con los códigos del
        catálogo; el resultado del motor único (lo envía la web) actúa como
        referencia para detectar divergencias (B13a).
        Si hay diferencias respecto a la clasificación activa, crea un evento
        pending_reconciliation y devuelve has_changes: true.
        """
        if openai_client is None:
            raise HTTPException(503, "Cliente OpenAI no disponible")

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

        _assert_no_pending_reconciliation(sb, system_id)

        # Referencia del motor único y catálogo de obligaciones
        ref = request.reference
        # El agente solo ve las obligaciones vigentes; el diff necesita también
        # las etiquetas de las retiradas que el sistema aún tiene registradas.
        labels = _catalog_labels(sb, include_retired=False)
        all_labels = _catalog_labels(sb)
        rules_result = {
            "risk_level":      ref.risk_level,
            "scope":           ref.scope,
            "basis":           ref.basis,
            "obligations_set": [o.code for o in ref.obligations],
        }

        # RAG: recuperar fragmentos normativos relevantes
        chunks, _ = retrieve_for_classification(system, max_chunks=8)

        # Inyectar el resultado del motor en el perfil enviado al agente
        system_with_rules = {**system, "rules_engine_classification": rules_result}
        user_prompt = build_classification_user_prompt(system_with_rules, chunks, labels)

        # Llamada sincrónica al agente (no streaming)
        try:
            with llm_span("chat", "openai", CLASSIFICATION_MODEL) as call:
                response = await openai_client.chat.completions.create(
                    model=CLASSIFICATION_MODEL,
                    max_completion_tokens=4000,
                    messages=[
                        {"role": "system", "content": CLASSIFICATION_SYSTEM_PROMPT},
                        {"role": "user",   "content": user_prompt},
                    ],
                )
                call.from_openai(response)
        except Exception as e:
            logger.error(f"Error llamando a OpenAI: {e}", exc_info=True)
            raise HTTPException(502, f"Error del agente IA: {e}")

        raw = response.choices[0].message.content.strip()
        if raw.startswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[1:])
        if raw.endswith("```"):
            lines = raw.split("\n")
            raw = "\n".join(lines[:-1])
        raw = raw.strip()

        try:
            ai_result = json.loads(raw)
        except json.JSONDecodeError as e:
            logger.error(f"JSON inválido del agente: {e}\nRespuesta: {raw[:500]}")
            raise HTTPException(502, "El agente devolvió una respuesta sin formato JSON válido.")

        # Validar nivel de riesgo
        ai_risk_level = ai_result.get("aiact_risk_level")
        valid_levels = {"prohibited", "high", "limited", "minimal"}
        if ai_risk_level not in valid_levels:
            raise HTTPException(502, f"Nivel de riesgo inválido del agente: {ai_risk_level!r}")

        # Validar obligations_set contra el catálogo canónico
        valid_keys = set(labels.keys())
        raw_obligations = ai_result.get("obligations_set") or []
        validated_obligations = [k for k in raw_obligations if k in valid_keys]
        invalid_keys = [k for k in raw_obligations if k not in valid_keys]
        if invalid_keys:
            logger.warning(f"Claves de obligaciones desconocidas eliminadas: {invalid_keys}")

        risk_labels_map = {
            "prohibited": "Práctica prohibida",
            "high":       "Alto riesgo",
            "limited":    "Riesgo limitado",
            "minimal":    "Riesgo mínimo",
        }
        risk_label = risk_labels_map.get(ai_risk_level, ai_risk_level)

        # Detectar divergencia con el motor de reglas
        divergence_prefix = ""
        if rules_result["risk_level"] != ai_risk_level:
            divergence_prefix = (
                f"[Divergencia con motor de reglas: "
                f"motor={rules_result['risk_level']}, agente={ai_risk_level}] "
            )
            logger.warning(
                f"Divergencia AI vs reglas para sistema {system_id}: "
                f"motor={rules_result['risk_level']}, agente={ai_risk_level}"
            )

        # Estado actual de clasificación
        active_result = sb.schema("fluxion").table("classification_events") \
            .select("risk_level, obligations_set") \
            .eq("ai_system_id", system_id) \
            .eq("status", "reconciled") \
            .order("version", desc=True) \
            .limit(1) \
            .execute()

        current_keys: list[str] = []
        current_risk = None
        if active_result.data:
            current_keys = active_result.data[0]["obligations_set"] or []
            current_risk = active_result.data[0]["risk_level"]
        else:
            existing_fallback = _get_active_obligations(sb, system_id)
            current_keys = list(existing_fallback.keys())
            sys_res = sb.schema("fluxion").table("ai_systems") \
                .select("aiact_risk_level") \
                .eq("id", system_id) \
                .single() \
                .execute()
            if sys_res.data:
                lvl = sys_res.data.get("aiact_risk_level") or ""
                current_risk = lvl if lvl in VALID_LEVELS else None

        # Sin cambios → respuesta rápida
        if set(current_keys) == set(validated_obligations) and current_risk == ai_risk_level:
            return {"data": {"has_changes": False}}

        existing_obligations = _get_active_obligations(sb, system_id)
        diff_items = compute_diff(current_keys, validated_obligations, existing_obligations, all_labels)

        version = _get_next_version(sb, system_id)
        event_id = str(uuid4())
        now = datetime.now(timezone.utc).isoformat()

        # Extraer basis de los items del Anexo III si los hay
        basis_parts = []
        for item in (ai_result.get("annexiii_items") or []):
            basis_parts.append(f"{item.get('section', '')}: {item.get('description', '')}")
        if not basis_parts:
            if ai_risk_level == "prohibited":
                basis_parts = ["Art. 5 — Práctica prohibida"]
        basis = "; ".join(basis_parts) or (rules_result.get("basis") or "")

        classification_note = ai_result.get("classification_note") or ""
        reason = (divergence_prefix + classification_note)[:4000]

        factors_payload = {
            "classification_factors": ai_result.get("classification_factors") or {},
            "ai_agent_output": {
                k: v for k, v in ai_result.items()
                if k not in ("classification_note",)
            },
            # Resultado del motor único con el que se reclasificó: al conciliar
            # fija el ámbito, la categoría GPAI, la versión de las reglas y los
            # avisos; el agente solo decide el nivel y las obligaciones (B13e).
            "engine_result": ref.result,
            "inputs": ref.inputs,
        }

        sb.schema("fluxion").table("classification_events").insert({
            "id":                     event_id,
            "ai_system_id":           system_id,
            "organization_id":        org_id,
            "version":                version,
            "method":                 "ai_agent",
            "risk_level":             ai_risk_level,
            "risk_label":             risk_label,
            "basis":                  basis,
            "reason":                 reason,
            "obligations_set":        validated_obligations,
            "classification_factors": factors_payload,
            "created_by":             profile_id,
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
            f"Reclasificación AI: sistema {system_id} → "
            f"{ai_risk_level} (v{version}, pending_reconciliation, "
            f"confianza={ai_result.get('confidence')})"
        )

        return {
            "data": {
                "has_changes": True,
                "event_id":    event_id,
                "version":     version,
                "risk_level":  ai_risk_level,
                "risk_label":  risk_label,
                "confidence":  ai_result.get("confidence"),
                "divergence":  bool(divergence_prefix),
            }
        }
