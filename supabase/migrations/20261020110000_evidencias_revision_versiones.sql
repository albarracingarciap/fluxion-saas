-- ============================================================================
-- Evidencias: revisión obligatoria y versiones (B10)
-- ============================================================================
-- Problemas (GAP-26, E4, E6, I16):
--
--   · Al crear o editar una evidencia se podía fijar «Válida» directamente: el
--     ciclo de revisión se podía saltar.
--   · Aprobar no exigía ningún rol ni que el revisor fuera distinto del autor
--     (DP-01: aprueba el Responsable del SGAI, distinto de quien la aporta).
--     La aprobación en bloque ni siquiera guardaba quién revisaba.
--   · El historial de versiones estaba siempre vacío: `system_evidence_versions`
--     no tiene política de inserción, y la aplicación además guardaba en
--     `changed_by` el usuario (auth.users.id) donde la clave foránea pide el
--     perfil (profiles.id). Los dos fallos se perdían en silencio.
--
-- Esta migración:
--   1. `trg_evidence_review_rules` (BEFORE INSERT/UPDATE): con un usuario
--      autenticado, una evidencia nueva entra en borrador o pendiente de
--      revisión, y el estado solo cambia por las transiciones del ciclo.
--      Aprobar o rechazar exige el rol Responsable del SGAI y no ser el autor;
--      la regla rellena quién y cuándo revisó. Las escrituras del sistema (sin
--      usuario: caducidad diaria, expediente generado) no pasan por estas
--      reglas.
--   2. `system_evidence_versions`: columna `storage_path` (el fichero también es
--      parte de la versión) y tipo de cambio `expired`.
--   3. `trg_evidence_versions` (AFTER INSERT/UPDATE, SECURITY DEFINER): guarda la
--      versión en la base de datos, para todas las vías (también en bloque y la
--      caducidad). Como hasta ahora, cada fila es el estado ANTERIOR al cambio,
--      con el tipo de cambio que lo sustituyó; al crear, el estado inicial.
--   4. Datos: las evidencias «Válidas» que nadie revisó reciben la etiqueta
--      `sin-revision`, para poder localizarlas. No cambian de estado.
--
-- Idempotente: funciones con CREATE OR REPLACE, triggers recreados, columna y
-- restricción con IF EXISTS / IF NOT EXISTS, y la etiqueta solo se añade una vez.
-- ============================================================================


-- ── 1. Reglas del ciclo de revisión ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.trg_evidence_review_rules() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_roles text[];
BEGIN
  -- Escrituras del sistema (service role, tareas programadas, migraciones).
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status NOT IN ('draft', 'pending_review') THEN
      RAISE EXCEPTION 'Una evidencia nueva entra en borrador o pendiente de revisión; se valida con la revisión.'
        USING ERRCODE = 'check_violation';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN
    RETURN NEW;
  END IF;

  -- Transiciones del ciclo. «→ draft» desde válida, caducada o pendiente es la
  -- vuelta a borrador al modificar su contenido.
  IF NOT (
       (OLD.status IN ('draft', 'rejected') AND NEW.status = 'pending_review')
    OR (OLD.status = 'pending_review'        AND NEW.status IN ('valid', 'rejected'))
    OR (OLD.status IN ('rejected', 'valid', 'expired', 'pending_review') AND NEW.status = 'draft')
  ) THEN
    RAISE EXCEPTION 'La evidencia no puede pasar de «%» a «%»: el estado solo cambia con el ciclo de revisión.',
      OLD.status, NEW.status
      USING ERRCODE = 'check_violation';
  END IF;

  IF NEW.status IN ('valid', 'rejected') THEN
    SELECT p.roles::text[] INTO v_roles
    FROM fluxion.profiles p
    WHERE p.user_id = v_uid
      AND p.organization_id = NEW.organization_id;

    IF v_roles IS NULL OR NOT ('sgai_manager' = ANY (v_roles)) THEN
      RAISE EXCEPTION 'Solo el Responsable del SGAI puede aprobar o rechazar evidencias.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    IF NEW.owner_user_id IS NOT DISTINCT FROM v_uid THEN
      RAISE EXCEPTION 'Quien aporta una evidencia no puede revisarla.'
        USING ERRCODE = 'insufficient_privilege';
    END IF;

    NEW.reviewed_by := v_uid;
    NEW.reviewed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

ALTER FUNCTION fluxion.trg_evidence_review_rules() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_evidence_review_rules ON fluxion.system_evidences;
CREATE TRIGGER trg_evidence_review_rules
  BEFORE INSERT OR UPDATE ON fluxion.system_evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_evidence_review_rules();


-- ── 2. Tabla de versiones ────────────────────────────────────────────────────

ALTER TABLE fluxion.system_evidence_versions
  ADD COLUMN IF NOT EXISTS storage_path text;

ALTER TABLE fluxion.system_evidence_versions
  DROP CONSTRAINT IF EXISTS system_evidence_versions_change_type_check;
ALTER TABLE fluxion.system_evidence_versions
  ADD CONSTRAINT system_evidence_versions_change_type_check CHECK (
    change_type = ANY (ARRAY['edit', 'review_requested', 'approved', 'rejected', 'reopened', 'created', 'expired'])
  );


-- ── 3. Registro de versiones ─────────────────────────────────────────────────
-- SECURITY DEFINER: la tabla no admite inserciones por RLS a propósito; solo
-- escribe este trigger. `changed_by` es el perfil (profiles.id) de quien hace
-- el cambio, o NULL si lo hace el sistema.

CREATE OR REPLACE FUNCTION fluxion.trg_evidence_versions() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_actor  uuid;
  v_tipo   text;
  v_src    fluxion.system_evidences;
  v_cambia boolean;
BEGIN
  SELECT p.id INTO v_actor
  FROM fluxion.profiles p
  WHERE p.user_id = auth.uid()
    AND p.organization_id = NEW.organization_id;

  IF TG_OP = 'INSERT' THEN
    v_tipo := 'created';
    v_src  := NEW;
  ELSE
    v_cambia :=
         NEW.title            IS DISTINCT FROM OLD.title
      OR NEW.description      IS DISTINCT FROM OLD.description
      OR NEW.evidence_type    IS DISTINCT FROM OLD.evidence_type
      OR NEW.external_url     IS DISTINCT FROM OLD.external_url
      OR NEW.storage_path     IS DISTINCT FROM OLD.storage_path
      OR NEW.version          IS DISTINCT FROM OLD.version
      OR NEW.issued_at        IS DISTINCT FROM OLD.issued_at
      OR NEW.expires_at       IS DISTINCT FROM OLD.expires_at;

    IF NEW.status IS NOT DISTINCT FROM OLD.status AND NOT v_cambia THEN
      RETURN NEW;  -- etiquetas, responsable, notas sueltas: no es una versión
    END IF;

    v_tipo := CASE
      WHEN NEW.status IS NOT DISTINCT FROM OLD.status                 THEN 'edit'
      WHEN NEW.status = 'pending_review'                              THEN 'review_requested'
      WHEN NEW.status = 'valid'                                       THEN 'approved'
      WHEN NEW.status = 'rejected'                                    THEN 'rejected'
      WHEN NEW.status = 'expired'                                     THEN 'expired'
      WHEN NEW.status = 'draft' AND OLD.status = 'rejected' AND NOT v_cambia THEN 'reopened'
      ELSE 'edit'
    END;
    v_src := OLD;
  END IF;

  INSERT INTO fluxion.system_evidence_versions (
    evidence_id, changed_by, change_type,
    title, description, evidence_type, status, external_url, storage_path,
    version, issued_at, expires_at, validation_notes
  ) VALUES (
    NEW.id, v_actor, v_tipo,
    v_src.title, v_src.description, v_src.evidence_type, v_src.status, v_src.external_url, v_src.storage_path,
    v_src.version, v_src.issued_at, v_src.expires_at, v_src.validation_notes
  );

  RETURN NEW;
END;
$$;

ALTER FUNCTION fluxion.trg_evidence_versions() OWNER TO postgres;

DROP TRIGGER IF EXISTS trg_evidence_versions ON fluxion.system_evidences;
CREATE TRIGGER trg_evidence_versions
  AFTER INSERT OR UPDATE ON fluxion.system_evidences
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_evidence_versions();


-- ── 4. Evidencias válidas sin revisión ───────────────────────────────────────
-- Las generadas por el expediente (etiqueta `generado`) salen de un documento
-- aprobado y no se marcan.

UPDATE fluxion.system_evidences
SET tags = array_append(tags, 'sin-revision')
WHERE status = 'valid'
  AND reviewed_by IS NULL
  AND NOT ('generado' = ANY (tags))
  AND NOT ('sin-revision' = ANY (tags));
