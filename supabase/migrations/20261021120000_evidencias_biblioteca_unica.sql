-- ============================================================================
-- Biblioteca de evidencias única (B12)
-- ============================================================================
-- Hasta ahora había dos almacenes de evidencias:
--   · fluxion.system_evidences — la biblioteca (revisión, versiones, caducidad,
--     Flujos de aprobación);
--   · fluxion.evidences        — los adjuntos de las acciones del plan de
--     tratamiento, sin revisión real (un `verification_status` que nadie
--     cambiaba) y fuera de la biblioteca.
-- El cierre de una mitigación trasladaba la severidad residual al FMEA con
-- cualquier evidencia, validada o no (GAP-19, F-02).
--
--   1. Cada fila de `fluxion.evidences` se copia a `system_evidences` con el
--      MISMO id (los ficheros no se mueven: ya están en el mismo almacén). Así
--      `treatment_actions.evidence_id` sigue apuntando a la misma evidencia.
--   2. `treatment_actions.evidence_id` pasa a referenciar `system_evidences`.
--   3. `trigger_evidence_closes_action`: una mitigación con severidad residual
--      medida solo la traslada al FMEA si su evidencia está «Válida»; si no, la
--      acción queda «Completada, pendiente de evidencia» (`evidence_pending`).
--      Cuando la evidencia se valida, la acción se completa y la severidad se
--      traslada (`trg_evidence_valid_completes_actions`).
--   4. Las copias pendientes de validar abren su revisión en Flujos de
--      aprobación (la pide y la prepara quien la subió); sin política, quedan
--      en borrador.
--   5. `fluxion.evidences` queda como histórico: sin escrituras desde la
--      aplicación.
--
-- No es retroactivo: las acciones ya completadas conservan su estado y la
-- severidad que trasladaron.
--
-- Idempotente: la copia salta los ids que ya existen; FKs y triggers con
-- DROP IF EXISTS; el paso 4 solo actúa sobre copias pendientes sin solicitud.
-- ============================================================================


-- ── 1. Copia a la biblioteca ─────────────────────────────────────────────────

INSERT INTO fluxion.system_evidences (
  id, organization_id, ai_system_id, scope, title, description, evidence_type, status,
  storage_path, storage_backend, storage_bucket, checksum_sha256, mime_type, file_size_bytes,
  external_url, owner_user_id, reviewed_by, reviewed_at, issued_at, expires_at,
  tags, created_at, updated_at
)
SELECT
  e.id,
  e.organization_id,
  s.id,
  CASE WHEN s.id IS NOT NULL THEN 'system' ELSE 'organization' END,
  e.title,
  e.description,
  CASE e.type::text
    WHEN 'document'    THEN 'technical_doc'
    WHEN 'policy'      THEN 'policy'
    WHEN 'test_report' THEN 'test_result'
    WHEN 'audit_log'   THEN 'monitoring_log'
    WHEN 'log_export'  THEN 'monitoring_log'
    WHEN 'certificate' THEN 'certification'
    ELSE 'other'
  END,
  -- Estado: validada → válida (o caducada si ya venció); rechazada → rechazada;
  -- el resto, pendiente de revisión (paso 4).
  CASE
    WHEN e.verification_status::text = 'validated' AND e.valid_until IS NOT NULL AND e.valid_until < now() THEN 'expired'
    WHEN e.verification_status::text = 'validated' THEN 'valid'
    WHEN e.verification_status::text = 'rejected'  THEN 'rejected'
    ELSE 'pending_review'
  END,
  NULLIF(btrim(e.storage_path), ''),
  COALESCE(e.storage_backend, 'supabase'),
  e.storage_bucket,
  e.checksum_sha256,
  e.mime_type,
  e.file_size,
  COALESCE(NULLIF(btrim(e.external_url), ''), NULLIF(btrim(e.url), '')),
  e.uploaded_by,
  e.validated_by,
  e.validated_at,
  COALESCE(e.valid_from, e.created_at::date),
  e.valid_until::date,
  ARRAY['accion-plan'] || COALESCE(e.regulatory_refs, '{}'::text[]),
  COALESCE(e.created_at, now()),
  e.updated_at
FROM fluxion.evidences e
-- El sistema: el anotado en la evidencia o, si no, el del plan de su acción.
LEFT JOIN fluxion.ai_systems s
       ON s.organization_id = e.organization_id
      AND s.id = COALESCE(
            e.applies_to_systems[1],
            (SELECT tp.system_id
               FROM fluxion.treatment_actions ta
               JOIN fluxion.treatment_plans tp ON tp.id = ta.plan_id
              WHERE ta.evidence_id = e.id
              LIMIT 1))
WHERE NOT EXISTS (SELECT 1 FROM fluxion.system_evidences x WHERE x.id = e.id);


-- ── 2. Las acciones apuntan a la biblioteca ──────────────────────────────────

ALTER TABLE fluxion.treatment_actions
  DROP CONSTRAINT IF EXISTS treatment_actions_evidence_id_fkey;

ALTER TABLE fluxion.treatment_actions
  ADD CONSTRAINT treatment_actions_evidence_id_fkey
  FOREIGN KEY (evidence_id) REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_treatment_actions_evidence
  ON fluxion.treatment_actions (evidence_id) WHERE evidence_id IS NOT NULL;


-- ── 3. La severidad residual solo con evidencia válida ───────────────────────

CREATE OR REPLACE FUNCTION fluxion.trigger_evidence_closes_action() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_valida boolean;
BEGIN
  IF NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed' THEN
    SELECT (e.status = 'valid') INTO v_valida
      FROM fluxion.system_evidences e WHERE e.id = NEW.evidence_id;

    -- B12: una mitigación con severidad residual medida necesita evidencia
    -- válida para darla por buena. Sin ella, queda completada pendiente de
    -- evidencia; se completa sola cuando la evidencia se valida.
    IF NEW.option = 'mitigar' AND NEW.s_residual_achieved IS NOT NULL AND NOT COALESCE(v_valida, false) THEN
      NEW.status := 'evidence_pending';
      RETURN NEW;
    END IF;

    IF COALESCE(v_valida, false) THEN
      IF NEW.s_residual_achieved IS NULL THEN
        NEW.s_residual_achieved := NEW.s_residual_target;
      END IF;

      -- Actualizar S_actual en fmea_items → la zona se recalculará
      IF NEW.option = 'mitigar' AND NEW.s_residual_achieved IS NOT NULL THEN
        UPDATE fluxion.fmea_items
           SET s_actual = NEW.s_residual_achieved, updated_at = now()
         WHERE id = NEW.fmea_item_id;
      END IF;
    END IF;

    NEW.completed_at := COALESCE(NEW.completed_at, now());
  END IF;

  RETURN NEW;
END;
$$;

-- El trigger ya existe (trg_complete_action, WHEN pasa a 'completed'); se
-- vuelve a crear igual por si acaso.
DROP TRIGGER IF EXISTS trg_complete_action ON fluxion.treatment_actions;
CREATE TRIGGER trg_complete_action
  BEFORE UPDATE ON fluxion.treatment_actions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION fluxion.trigger_evidence_closes_action();

/** Al validarse una evidencia, completa las acciones que la esperaban. */
CREATE OR REPLACE FUNCTION fluxion.trg_evidence_valid_completes_actions() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
BEGIN
  IF NEW.status = 'valid' AND OLD.status IS DISTINCT FROM 'valid' THEN
    UPDATE fluxion.treatment_actions
       SET status = 'completed'
     WHERE evidence_id = NEW.id
       AND status = 'evidence_pending';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_evidence_valid_completes_actions ON fluxion.system_evidences;
CREATE TRIGGER trg_evidence_valid_completes_actions
  AFTER UPDATE OF status ON fluxion.system_evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_evidence_valid_completes_actions();


-- ── 4. Revisión de las copias pendientes ─────────────────────────────────────

DO $$
DECLARE
  o           record;
  v_perfil    uuid;
  v_req       uuid;
  v_abiertas  integer := 0;
  v_borrador  integer := 0;
BEGIN
  FOR o IN
    SELECT se.id, se.organization_id, se.owner_user_id
      FROM fluxion.system_evidences se
      JOIN fluxion.evidences e ON e.id = se.id
     WHERE se.status = 'pending_review'
       AND NOT EXISTS (SELECT 1 FROM fluxion.approval_requests r
                        WHERE r.object_type = 'evidence' AND r.object_id = se.id AND r.status = 'pending')
  LOOP
    v_perfil := NULL;
    SELECT p.id INTO v_perfil FROM fluxion.profiles p
     WHERE p.user_id = o.owner_user_id AND p.organization_id = o.organization_id LIMIT 1;
    v_req := NULL;
    IF v_perfil IS NOT NULL THEN
      v_req := fluxion.approval_open(o.organization_id, 'evidence', o.id, v_perfil,
        jsonb_build_object('prepared_by', jsonb_build_array(v_perfil)));
    END IF;
    IF v_req IS NOT NULL THEN
      v_abiertas := v_abiertas + 1;
    ELSE
      UPDATE fluxion.system_evidences SET status = 'draft', updated_at = now() WHERE id = o.id;
      v_borrador := v_borrador + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'B12: % evidencias de acciones en la biblioteca (% con revisión abierta, % en borrador)',
    (SELECT count(*) FROM fluxion.evidences), v_abiertas, v_borrador;
END;
$$;


-- ── 5. El almacén antiguo queda como histórico ───────────────────────────────

REVOKE INSERT, UPDATE ON fluxion.evidences FROM authenticated;

COMMENT ON TABLE fluxion.evidences IS
  'HISTÓRICO (B12): adjuntos de acciones del plan anteriores a la biblioteca única. Copiados a system_evidences con el mismo id; la aplicación ya no escribe aquí.';
