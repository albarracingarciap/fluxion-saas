// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any;

export type SnapshotTrigger =
  | 'submitted_for_review'
  | 'approved'
  | 'rejected'
  | 'started'
  | 'closed'
  | 'superseded';

const IDEMPOTENCY_WINDOW_MS = 60_000;

/**
 * Captura un snapshot inmutable del plan de tratamiento + sus acciones en el
 * momento de una transición de estado formal.
 *
 * Idempotencia: si ya existe un snapshot con el mismo trigger para el mismo
 * plan en los últimos 60 segundos, no inserta un duplicado.
 *
 * Fire-and-forget: los errores se loguean pero no rompen el flujo principal.
 */
export async function captureSnapshot(params: {
  fluxion: FluxionClient;
  planId: string;
  organizationId: string;
  trigger: SnapshotTrigger;
  actorUserId: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const { fluxion, planId, organizationId, trigger, actorUserId, metadata } = params;

  try {
    // Idempotencia: evitar duplicados si se llama varias veces en ráfaga
    const since = new Date(Date.now() - IDEMPOTENCY_WINDOW_MS).toISOString();
    const { data: existing } = await fluxion
      .from('treatment_plan_snapshots')
      .select('id')
      .eq('plan_id', planId)
      .eq('trigger', trigger)
      .gte('captured_at', since)
      .limit(1)
      .maybeSingle();

    if (existing) return;

    // Nombre del actor (denormalizado)
    const { data: profile } = await fluxion
      .from('profiles')
      .select('full_name, display_name')
      .eq('user_id', actorUserId)
      .maybeSingle();

    const actorName =
      (profile?.display_name || profile?.full_name || '').trim() || null;

    // Estado completo del plan tras la transición
    const { data: plan, error: planError } = await fluxion
      .from('treatment_plans')
      .select(`
        id, code, status, organization_id, system_id, evaluation_id,
        zone_at_creation, zone_target, ai_act_floor, s_max_at_creation,
        modes_count_total, modes_count_zone_i, modes_count_zone_ii,
        actions_total, actions_completed, pivot_node_ids,
        residual_risk_notes, accepted_risk_count,
        approval_level, approver_id, approved_at,
        approval_minutes_ref, approval_committee_notes,
        deadline, review_cadence,
        created_by, created_at, updated_at
      `)
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      console.error('[captureSnapshot] Error cargando el plan:', planError?.message);
      return;
    }

    // Estado de todas las acciones en el momento del snapshot
    const { data: actions, error: actionsError } = await fluxion
      .from('treatment_actions')
      .select(`
        id, fmea_item_id, option, status,
        s_actual_at_creation, s_residual_target, s_residual_achieved,
        control_id, justification, evidence_description,
        owner_id, due_date, review_due_date,
        evidence_id, acceptance_approved_by, acceptance_approved_at,
        completed_at, created_at, updated_at
      `)
      .eq('plan_id', planId)
      .order('created_at', { ascending: true });

    if (actionsError) {
      console.error('[captureSnapshot] Error cargando las acciones:', actionsError.message);
      return;
    }

    const { error: insertError } = await fluxion
      .from('treatment_plan_snapshots')
      .insert({
        plan_id: planId,
        organization_id: organizationId,
        trigger,
        actor_user_id: actorUserId,
        actor_name: actorName,
        plan_state: plan,
        actions_state: actions ?? [],
        metadata: metadata ?? {},
      });

    if (insertError) {
      console.error('[captureSnapshot] Error insertando el snapshot:', insertError.message);
    }
  } catch (err) {
    console.error('[captureSnapshot] Error inesperado:', err);
  }
}
