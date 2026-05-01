// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any;

export type TreatmentActionEventType =
  | 'option_selected'
  | 'owner_changed'
  | 'duedate_changed'
  | 'residual_target_changed'
  | 'residual_achieved_recorded'
  | 'slippage_accepted'
  | 'task_status_changed'
  | 'closed'
  | 'periodic_review';

export type TreatmentActionEventInput = {
  planId: string;
  actionId: string;
  organizationId: string;
  eventType: TreatmentActionEventType;
  actorUserId: string;
  actorName?: string | null;
  beforeState: Record<string, unknown>;
  afterState: Record<string, unknown>;
  justification?: string | null;
};

/**
 * Inserta uno o varios eventos de auditoría de acción en treatment_action_events.
 * Fire-and-forget: los errores se loguean pero no rompen el flujo principal.
 *
 * Si actorName no se proporciona, se resuelve automáticamente desde profiles.
 */
export async function recordTreatmentActionEvents(params: {
  fluxion: FluxionClient;
  actorUserId: string;
  events: Omit<TreatmentActionEventInput, 'actorUserId' | 'actorName'>[];
}): Promise<void> {
  const { fluxion, actorUserId, events } = params;
  if (events.length === 0) return;

  try {
    const { data: profile } = await fluxion
      .from('profiles')
      .select('full_name, display_name')
      .eq('user_id', actorUserId)
      .maybeSingle();

    const actorName =
      (profile?.display_name || profile?.full_name || '').trim() || null;

    const rows = events.map((e) => ({
      plan_id: e.planId,
      action_id: e.actionId,
      organization_id: e.organizationId,
      event_type: e.eventType,
      actor_user_id: actorUserId,
      actor_name: actorName,
      before_state: e.beforeState,
      after_state: e.afterState,
      justification: e.justification ?? null,
    }));

    const { error } = await fluxion
      .from('treatment_action_events')
      .insert(rows);

    if (error) {
      console.error('[recordTreatmentActionEvents] Error insertando eventos:', error.message);
    }
  } catch (err) {
    console.error('[recordTreatmentActionEvents] Error inesperado:', err);
  }
}

export async function recordTreatmentActionEvent(params: {
  fluxion: FluxionClient;
  actorUserId: string;
  event: Omit<TreatmentActionEventInput, 'actorUserId' | 'actorName'>;
}): Promise<void> {
  return recordTreatmentActionEvents({
    fluxion: params.fluxion,
    actorUserId: params.actorUserId,
    events: [params.event],
  });
}
