'use server';

import { revalidatePath } from 'next/cache';

import { canPrepareTreatmentPlan } from '@/lib/auth/roles-flujo';
import { createFmeaEvaluationVersion } from '@/lib/fmea/data';
import { newVersionBlocker } from '@/lib/fmea/lifecycle-rules';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Abre una versión nueva de la evaluación de riesgos de un sistema a partir de
 * la vigente (B07, GAP-13/GAP-32).
 *
 * La versión vigente sigue siéndolo hasta que se apruebe el plan de la nueva:
 * entonces pasa a sustituida, con su plan (`fmea_aplicar_aprobacion_plan`).
 * Mientras tanto, el sistema conserva una evaluación aprobada.
 *
 * La abren quienes preparan la evaluación y el plan (DP-01): Analista de
 * riesgos y Responsable del sistema.
 */
export async function startFmeaReevaluationAction(input: {
  aiSystemId: string;
  evaluationId: string;
}): Promise<{ evaluarPath: string } | { error: string }> {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return { error: 'No autenticado.' };

  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id, role, roles')
    .eq('user_id', user.id)
    .single();
  if (!membership) return { error: 'Perfil no encontrado.' };

  if (!canPrepareTreatmentPlan(membership)) {
    return { error: 'Solo el Analista de riesgos o el Responsable del sistema pueden abrir una versión nueva.' };
  }

  const { data: evaluations, error: evaluationsError } = await fluxion
    .from('fmea_evaluations')
    .select('id, state, version')
    .eq('organization_id', membership.organization_id)
    .eq('system_id', input.aiSystemId)
    .order('version', { ascending: false });

  if (evaluationsError || !evaluations) return { error: 'No se pudieron leer las evaluaciones del sistema.' };

  const current = evaluations.find((row) => row.id === input.evaluationId);
  if (!current) return { error: 'Evaluación no encontrada.' };

  const blocker = newVersionBlocker({
    state: current.state,
    isLatestVersion: evaluations[0]?.id === current.id,
    hasOpenVersion: evaluations.some((row) => ['draft', 'in_review'].includes(row.state)),
  });
  if (blocker) return { error: blocker };

  const result = await createFmeaEvaluationVersion({
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
    userId: user.id,
    copyFromEvaluationId: current.id,
  });

  if (!result.evaluationId) {
    return { error: result.error ?? 'No se pudo abrir la versión nueva de la evaluación.' };
  }

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath(`/inventario/${input.aiSystemId}/fmea/${input.evaluationId}/plan`);
  revalidatePath('/evaluaciones');

  return { evaluarPath: `/inventario/${input.aiSystemId}/fmea/${result.evaluationId}/evaluar` };
}
