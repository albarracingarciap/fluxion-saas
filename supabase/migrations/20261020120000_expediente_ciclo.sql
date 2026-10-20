-- ============================================================================
-- Expediente documental: ciclo de aprobación y versiones (B09)
-- ============================================================================
-- Problemas (GAP-24 en parte, E16):
--
--   · cualquier miembro aprobaba un expediente, también desde borrador y
--     también quien lo había redactado (DP-01: quien prepara no aprueba);
--   · reabrir un expediente aprobado lo devolvía a borrador y lo sobrescribía:
--     el aprobado se perdía y «Sustituido» no se asignaba nunca;
--   · no se podía volver a borrador desde «En revisión».
--
-- Esta migración:
--   1. `documents.version` y `documents.previous_id`: reabrir un aprobado crea
--      una versión nueva en borrador y deja la aprobada como `superseded`.
--   2. `trg_document_lifecycle_rules` (BEFORE INSERT/UPDATE): con un usuario
--      autenticado, un expediente nuevo nace en borrador; el estado solo cambia
--      por el ciclo (borrador ⇄ revisión → aprobado → sustituido); el contenido
--      solo se edita en borrador; aprobar exige el rol Responsable del SGAI y no
--      haber redactado ningún apartado, y la regla rellena quién y cuándo
--      aprobó. Las escrituras del sistema (sin usuario: actas de aprobación) no
--      pasan por estas reglas.
--   3. `document_reopen`: reabre un aprobado en una transacción (sustituye el
--      aprobado y crea la versión siguiente en borrador con su contenido).
--   4. Datos: las evidencias «Válidas» de PDF generados con el expediente sin
--      aprobar reciben la etiqueta `sin-revision`.
--
-- Hasta B11 el aprobador es el Responsable del SGAI en todas las plantillas.
-- DP-01 asigna la DPIA al responsable del tratamiento, con dictamen del DPO, y
-- la FRIA al Comité de IA: se aplicarán con políticas de Flujos de aprobación.
--
-- Idempotente: columnas con IF NOT EXISTS, funciones con CREATE OR REPLACE,
-- trigger recreado y la etiqueta solo se añade una vez.
-- ============================================================================


-- ── 1. Versiones del expediente ──────────────────────────────────────────────

ALTER TABLE fluxion.documents
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE fluxion.documents
  ADD COLUMN IF NOT EXISTS previous_id uuid REFERENCES fluxion.documents(id) ON DELETE SET NULL;

COMMENT ON COLUMN fluxion.documents.version IS
  'Versión del expediente. Reabrir uno aprobado crea la siguiente y deja el anterior como superseded.';
COMMENT ON COLUMN fluxion.documents.previous_id IS
  'Versión de la que parte (la aprobada que se reabrió).';


-- ── 2. Reglas del ciclo ──────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_document_lifecycle_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_perfil  uuid;
  v_roles   text[];
BEGIN
  -- Escrituras del sistema (service role: actas de aprobación, migraciones).
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'Un expediente nuevo nace en borrador.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.content IS DISTINCT FROM OLD.content AND OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'El expediente solo se edita en borrador.'
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  IF NOT (
       (OLD.status = 'draft'     AND NEW.status = 'in_review')
    OR (OLD.status = 'in_review' AND NEW.status IN ('draft', 'approved'))
    OR (OLD.status = 'approved'  AND NEW.status = 'superseded')
  ) THEN
    RAISE EXCEPTION 'El expediente no puede pasar de «%» a «%».', OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status = 'approved' THEN
    SELECT p.id, p.roles::text[] INTO v_perfil, v_roles
    FROM fluxion.profiles p
    WHERE p.user_id = v_uid
      AND p.organization_id = NEW.organization_id;

    IF v_roles IS NULL OR NOT ('sgai_manager' = ANY (v_roles)) THEN
      RAISE EXCEPTION 'Solo el Responsable del SGAI puede aprobar expedientes.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    -- Quien redactó algún apartado no aprueba (DP-01).
    IF EXISTS (
      SELECT 1 FROM jsonb_each(NEW.content) AS c(ref, valor)
      WHERE jsonb_typeof(c.valor) = 'object'
        AND c.valor ->> 'author_id' = v_perfil::text
    ) THEN
      RAISE EXCEPTION 'Quien redacta el expediente no puede aprobarlo.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    NEW.approved_by := v_perfil;
    NEW.approved_at := now();
  ELSIF NEW.status IN ('draft', 'in_review') THEN
    NEW.approved_by := NULL;
    NEW.approved_at := NULL;
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION fluxion.trg_document_lifecycle_rules() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_document_lifecycle_rules ON fluxion.documents;
CREATE TRIGGER trg_document_lifecycle_rules
  BEFORE INSERT OR UPDATE ON fluxion.documents
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_document_lifecycle_rules();


-- ── 3. Reabrir un expediente aprobado ────────────────────────────────────────
-- En una transacción: el aprobado pasa a `superseded` y se crea la versión
-- siguiente en borrador con el mismo contenido. Las dos escrituras pasan por
-- las reglas del ciclo (auth.uid() sigue siendo quien llama). Devuelve el id
-- de la versión nueva.

CREATE OR REPLACE FUNCTION fluxion.document_reopen(p_document_id uuid) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_doc    fluxion.documents;
  v_perfil uuid;
  v_nuevo  uuid;
BEGIN
  SELECT * INTO v_doc FROM fluxion.documents WHERE id = p_document_id FOR UPDATE;

  IF v_doc.id IS NULL THEN
    RAISE EXCEPTION 'Expediente no encontrado.';
  END IF;

  SELECT p.id INTO v_perfil
  FROM fluxion.profiles p
  WHERE p.user_id = auth.uid()
    AND p.organization_id = v_doc.organization_id;

  IF v_perfil IS NULL THEN
    RAISE EXCEPTION 'Expediente no encontrado.';
  END IF;

  IF v_doc.status <> 'approved' THEN
    RAISE EXCEPTION 'Solo se reabre un expediente aprobado.'
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE fluxion.documents
  SET status = 'superseded', updated_at = now()
  WHERE id = v_doc.id;

  INSERT INTO fluxion.documents (
    organization_id, ai_system_id, template_key, template_version, title,
    status, content, created_by, version, previous_id
  ) VALUES (
    v_doc.organization_id, v_doc.ai_system_id, v_doc.template_key, v_doc.template_version, v_doc.title,
    'draft', v_doc.content, v_perfil, v_doc.version + 1, v_doc.id
  )
  RETURNING id INTO v_nuevo;

  RETURN v_nuevo;
END;
$$;

ALTER FUNCTION fluxion.document_reopen(uuid) OWNER TO postgres;
REVOKE ALL ON FUNCTION fluxion.document_reopen(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION fluxion.document_reopen(uuid) TO authenticated, service_role;


-- ── 4. Evidencias de PDF generados sin aprobar ───────────────────────────────
-- Hasta ahora cada PDF del expediente creaba una evidencia «Válida» aunque el
-- expediente estuviera en borrador (E16). Las que salen de un expediente no
-- aprobado reciben la etiqueta `sin-revision` para poder localizarlas, como
-- las de B10. No cambian de estado.

UPDATE fluxion.system_evidences se
SET tags = array_append(se.tags, 'sin-revision')
FROM fluxion.document_renders dr
WHERE dr.evidence_id = se.id
  AND dr.document_status <> 'approved'
  AND se.status = 'valid'
  AND NOT ('sin-revision' = ANY (se.tags));
