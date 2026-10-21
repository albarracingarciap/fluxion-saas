import 'server-only';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { captureSnapshot } from '@/lib/fmea/treatment-plan-snapshots';
import { createNoCacheAdminClient } from '@/lib/supabase/ingest';

export * from './lifecycle-rules';

type AprobacionResultado = {
  plan_status: string;
  accepted_actions: number;
  superseded_evaluations: string[];
  superseded_plans: string[];
  cancelled_actions: number;
  next_review_at: string | null;
};

/**
 * Lo que pasa cuando se aprueba un plan de tratamiento (B07).
 *
 * Se llama con el plan ya en `approved` desde Flujos de aprobación
 * (`lib/approvals/effects.ts`), la única vía desde B11e. La transición la hace
 * `fluxion.fmea_aplicar_aprobacion_plan` en una sola transacción:
 * aceptaciones aprobadas, evaluación aprobada con su próxima revisión,
 * versiones anteriores sustituidas y plan en ejecución o cerrado.
 *
 * Aquí se añade lo que no es de la base de datos: instantáneas del plan y
 * eventos en el historial del sistema.
 *
 * No lanza: la aprobación ya está registrada. Si la transición falla, se
 * devuelve un aviso para enseñarlo.
 *
 * `approverUserId` es auth.users.id (P1).
 */
export async function applyRiskEvaluationApproval(params: {
  planId: string;
  approverUserId: string | null;
}): Promise<{ aviso?: string }> {
  const admin = createNoCacheAdminClient();

  const { data: plan } = await admin
    .from('treatment_plans')
    .select('id, code, organization_id, system_id, evaluation_id')
    .eq('id', params.planId)
    .maybeSingle();

  if (!plan) return { aviso: 'El plan aprobado no se encontró para cerrar la evaluación.' };

  const { data, error } = await admin.rpc('fmea_aplicar_aprobacion_plan', {
    p_plan_id: params.planId,
    p_aprobador: params.approverUserId,
  });

  if (error || !data) {
    console.error('[fmea/lifecycle] no se pudo aplicar la aprobación del plan:', error);
    return {
      aviso:
        'El plan quedó aprobado, pero la evaluación no se pudo marcar como aprobada: '
        + (error?.message ?? 'sin respuesta de la base de datos'),
    };
  }

  const resultado = data as AprobacionResultado;

  const { data: evaluacion } = await admin
    .from('fmea_evaluations')
    .select('version')
    .eq('id', plan.evaluation_id)
    .maybeSingle();

  // Instantáneas del arranque o cierre del plan y de los planes sustituidos.
  // Llevan autor: sin él (no debería pasar) se omiten antes que inventarlo.
  if (params.approverUserId) {
    await captureSnapshot({
      fluxion: admin,
      planId: plan.id,
      organizationId: plan.organization_id,
      trigger: resultado.plan_status === 'closed' ? 'closed' : 'started',
      actorUserId: params.approverUserId,
      metadata: { accepted_actions: resultado.accepted_actions },
    });

    for (const planSustituido of resultado.superseded_plans) {
      await captureSnapshot({
        fluxion: admin,
        planId: planSustituido,
        organizationId: plan.organization_id,
        trigger: 'superseded',
        actorUserId: params.approverUserId,
        metadata: { superseded_by_plan_id: plan.id, superseded_by_evaluation_id: plan.evaluation_id },
      });
    }
  }

  const version = evaluacion?.version ?? null;
  const sustituidas = resultado.superseded_evaluations.length;

  await insertAiSystemHistoryEvents(admin, [
    {
      ai_system_id: plan.system_id,
      organization_id: plan.organization_id,
      event_type: 'fmea_evaluation_approved',
      event_title: 'Evaluación de riesgos aprobada',
      event_summary:
        `La evaluación FMEA${version ? ` v${version}` : ''} quedó aprobada con el plan ${plan.code}`
        + (resultado.plan_status === 'closed' ? ', que se cierra al no tener acciones abiertas.' : ', que pasa a ejecución.'),
      actor_user_id: params.approverUserId,
      payload: {
        evaluation_id: plan.evaluation_id,
        treatment_plan_id: plan.id,
        plan_status: resultado.plan_status,
        accepted_actions: resultado.accepted_actions,
        next_review_at: resultado.next_review_at,
      },
    },
    ...(sustituidas > 0
      ? [
          {
            ai_system_id: plan.system_id,
            organization_id: plan.organization_id,
            event_type: 'fmea_evaluation_superseded',
            event_title: 'Versión anterior sustituida',
            event_summary:
              `La evaluación FMEA${version ? ` v${version}` : ''} sustituye a la versión anterior.`
              + (resultado.cancelled_actions > 0
                ? ` Se cancelaron ${resultado.cancelled_actions} acciones abiertas del plan sustituido.`
                : ''),
            actor_user_id: params.approverUserId,
            payload: {
              evaluation_id: plan.evaluation_id,
              superseded_evaluations: resultado.superseded_evaluations,
              superseded_plans: resultado.superseded_plans,
              cancelled_actions: resultado.cancelled_actions,
            },
          },
        ]
      : []),
  ]);

  return {};
}
