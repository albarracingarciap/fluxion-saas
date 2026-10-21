-- ============================================================================
-- Plan de tratamiento: solo se aprueba en Flujos de aprobación (B11e)
-- ============================================================================
-- Hasta B11e, un plan sin política aplicable se aprobaba por su vía propia: un
-- «aprobador asignado» (`treatment_plans.approver_id`) que aprobaba o devolvía
-- desde la pantalla del plan. Esa vía desaparece: el plan solo se envía si hay
-- una política para su nivel, y Ajustes impide dejar un nivel sin política.
--
--   1. Planes «En revisión» sin solicitud pendiente (los envió la vía antigua):
--      se les abre su solicitud con la política de su nivel. Si no hay política
--      o no se encuentra quién la pidió, el plan vuelve a borrador con una nota.
--   2. `approver_id` deja de ser el aprobador asignado: pasa a ser quien emitió
--      la decisión final (lo rellena la aprobación). Se vacía en los planes que
--      aún no están aprobados.
--
-- Los avisos de las solicitudes abiertas aquí no se envían: aparecen en la
-- bandeja de Aprobaciones de quien decide.
--
-- Idempotente: solo actúa sobre planes en revisión sin solicitud pendiente y
-- sobre `approver_id` de planes no aprobados.
-- ============================================================================

DO $$
DECLARE
  p          record;
  v_perfil   uuid;
  v_req      uuid;
  v_abiertas integer := 0;
  v_devueltos integer := 0;
BEGIN
  FOR p IN
    SELECT tp.id, tp.organization_id, tp.approval_level, tp.created_by, tp.code
      FROM fluxion.treatment_plans tp
     WHERE tp.status = 'in_review'
       AND NOT EXISTS (
         SELECT 1 FROM fluxion.approval_requests r
          WHERE r.object_type = 'treatment_plan'
            AND r.object_id = tp.id
            AND r.status = 'pending')
  LOOP
    -- Quien lo envió: el perfil de su autor en la organización.
    SELECT pr.id INTO v_perfil
      FROM fluxion.profiles pr
     WHERE pr.user_id = p.created_by
       AND pr.organization_id = p.organization_id
     LIMIT 1;

    v_req := NULL;
    IF v_perfil IS NOT NULL THEN
      v_req := fluxion.approval_open(
        p.organization_id, 'treatment_plan', p.id, v_perfil,
        jsonb_build_object('approval_level', p.approval_level));
    END IF;

    IF v_req IS NOT NULL THEN
      v_abiertas := v_abiertas + 1;
    ELSE
      UPDATE fluxion.treatment_plans
         SET status = 'draft',
             approved_at = NULL,
             approval_committee_notes = '[DEVUELTO] El plan estaba en revisión sin circuito de aprobación. '
               || 'Revisa las políticas del plan en Ajustes › Aprobaciones y vuelve a enviarlo.'
       WHERE id = p.id;
      v_devueltos := v_devueltos + 1;
    END IF;
  END LOOP;

  RAISE NOTICE 'B11e: % solicitudes abiertas, % planes devueltos a borrador', v_abiertas, v_devueltos;
END;
$$;

UPDATE fluxion.treatment_plans
   SET approver_id = NULL
 WHERE status IN ('draft', 'in_review')
   AND approver_id IS NOT NULL;

COMMENT ON COLUMN fluxion.treatment_plans.approver_id IS
  'auth.users.id de quien emitió la decisión final en Flujos de aprobación (B11e). Ya no es un aprobador asignado.';
