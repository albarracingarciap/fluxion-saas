-- ============================================================================
-- Sesiones de comité con acta (B20b)
-- ============================================================================
--   DP-09 (decidida el 2026-10-20; detalle del 2026-10-28) y decisión 62:
--   `committee_sessions` existía sin uso. Los comités de Organización ›
--   Comités convocan sesiones con orden del día (que puede incluir solicitudes
--   de aprobación pendientes del comité), registran asistentes y acuerdos y
--   cierran la sesión: el acta queda bloqueada y se guarda como PDF y como
--   evidencia de la organización. Los votos siguen en Aprobaciones.
--
--   - session_type: ordinaria, extraordinaria o revisión por la dirección
--     (B20c, solo en el comité «Revisión por la Dirección»).
--   - Escriben el Administrador, el Responsable del SGAI, el CAIO y el
--     presidente o el secretario del comité.
--   - Con el acta bloqueada la sesión no cambia, salvo el enlace a la
--     evidencia del acta; una sesión celebrada no se borra.
--   - Los acuerdos con responsable crean una tarea de origen
--     `committee_session`.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Columnas ────────────────────────────────────────────────────────────

ALTER TABLE fluxion.committee_sessions
  ADD COLUMN IF NOT EXISTS minutes_evidence_id uuid REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS cancelled_reason text,
  ADD COLUMN IF NOT EXISTS quorum_met boolean;

COMMENT ON COLUMN fluxion.committee_sessions.agenda IS
  'Orden del día: [{id, title, notes, approval_request_id}] (B20b).';
COMMENT ON COLUMN fluxion.committee_sessions.attendees IS
  'Asistentes: [{member_id, name, committee_role, voting, present}] y, sin member_id, invitados (B20b).';
COMMENT ON COLUMN fluxion.committee_sessions.decisions IS
  'Acuerdos: [{id, text, agenda_item_id, owner_profile_id, due_date, task_id}] (B20b).';
COMMENT ON COLUMN fluxion.committee_sessions.minutes_evidence_id IS
  'Evidencia con el PDF del acta, generada al cerrar la sesión (B20b).';
COMMENT ON COLUMN fluxion.committee_sessions.quorum_met IS
  'Si al cerrar asistían los miembros con voto que fija el quórum del comité (B20b).';

-- La tabla no tenía uso: cualquier valor anterior pasa a ordinaria.
UPDATE fluxion.committee_sessions SET session_type = 'ordinary'
 WHERE session_type NOT IN ('ordinary', 'extraordinary', 'management_review');

DO $$ BEGIN
  ALTER TABLE fluxion.committee_sessions
    ADD CONSTRAINT committee_sessions_type_check
    CHECK (session_type IN ('ordinary', 'extraordinary', 'management_review'));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 2. RLS ─────────────────────────────────────────────────────────────────
-- Antes: auth_user_org_id() (una sola organización) y el rol mirado en
-- cualquier organización del usuario.

DROP POLICY IF EXISTS sessions_select_org ON fluxion.committee_sessions;
DROP POLICY IF EXISTS sessions_manage ON fluxion.committee_sessions;
DROP POLICY IF EXISTS committee_sessions_select ON fluxion.committee_sessions;
DROP POLICY IF EXISTS committee_sessions_write ON fluxion.committee_sessions;

CREATE POLICY committee_sessions_select ON fluxion.committee_sessions FOR SELECT USING (
  organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()));

CREATE POLICY committee_sessions_write ON fluxion.committee_sessions FOR ALL USING (
  EXISTS (SELECT 1 FROM fluxion.profiles p
           WHERE p.user_id = auth.uid() AND p.organization_id = committee_sessions.organization_id
             AND (p.roles && ARRAY['org_admin', 'sgai_manager', 'caio']::fluxion.org_role[]
                  OR EXISTS (SELECT 1 FROM fluxion.committee_members m
                              WHERE m.committee_id = committee_sessions.committee_id
                                AND m.profile_id = p.id AND m.is_active
                                AND m.committee_role IN ('president', 'secretary')))))
WITH CHECK (
  EXISTS (SELECT 1 FROM fluxion.profiles p
           WHERE p.user_id = auth.uid() AND p.organization_id = committee_sessions.organization_id
             AND (p.roles && ARRAY['org_admin', 'sgai_manager', 'caio']::fluxion.org_role[]
                  OR EXISTS (SELECT 1 FROM fluxion.committee_members m
                              WHERE m.committee_id = committee_sessions.committee_id
                                AND m.profile_id = p.id AND m.is_active
                                AND m.committee_role IN ('president', 'secretary')))));

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.committee_sessions TO authenticated;
GRANT ALL ON fluxion.committee_sessions TO service_role;


-- ── 3. Coherencia y acta bloqueada ─────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.committee_session_guard()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_tipo fluxion.committee_type;
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.minutes_locked OR OLD.status = 'completed' THEN
      RAISE EXCEPTION 'Una sesión celebrada no se puede borrar';
    END IF;
    RETURN OLD;
  END IF;

  SELECT type INTO v_tipo FROM fluxion.committees
   WHERE id = NEW.committee_id AND organization_id = NEW.organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'El comité no es de la organización de la sesión';
  END IF;
  IF NEW.session_type = 'management_review' AND v_tipo <> 'director_review' THEN
    RAISE EXCEPTION 'Solo el comité de Revisión por la Dirección celebra revisiones por la dirección';
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.minutes_locked THEN
    -- Solo puede cambiar el enlace a la evidencia del acta.
    IF (to_jsonb(NEW) - 'minutes_evidence_id' - 'updated_at')
       IS DISTINCT FROM (to_jsonb(OLD) - 'minutes_evidence_id' - 'updated_at') THEN
      RAISE EXCEPTION 'El acta de la sesión está cerrada: no se puede modificar';
    END IF;
  END IF;

  IF NEW.minutes_locked AND NEW.status <> 'completed' THEN
    RAISE EXCEPTION 'Solo se bloquea el acta de una sesión celebrada';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_committee_session_guard ON fluxion.committee_sessions;
CREATE TRIGGER trg_committee_session_guard
  BEFORE INSERT OR UPDATE OR DELETE ON fluxion.committee_sessions
  FOR EACH ROW EXECUTE FUNCTION fluxion.committee_session_guard();


-- ── 4. Tareas de los acuerdos ──────────────────────────────────────────────

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;
ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check CHECK (source_type IN (
  'manual', 'treatment_action', 'gap', 'evaluation', 'fmea_item', 'gap_group', 'signal', 'incident',
  'authority_request', 'reevaluation', 'annual_report', 'cease_use', 'committee_session'
));
