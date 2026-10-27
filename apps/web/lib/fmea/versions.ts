import { canPrepareTreatmentPlan } from '@/lib/auth/roles-flujo';
import type { RoleHolder } from '@/lib/auth/roles';

import { newVersionBlocker, type EvaluationState } from './lifecycle-rules';

type VersionRef = { id: string; version: number };

/**
 * Situación de una evaluación entre las versiones de su sistema (B07): qué
 * versión está vigente, si hay otra en curso y si desde esta se puede abrir una
 * nueva. Lo usan la evaluación y el plan para la barra de versiones.
 */
export type EvaluationVersionsInfo = {
  state: EvaluationState;
  approved_at: string | null;
  next_review_at: string | null;
  /** Modos que quedaron para la segunda ronda al enviar un plan parcial (DP-08); 0 si el envío fue completo. */
  deferred_items_count: number;
  /** Fecha límite de la segunda ronda de un plan parcial (TODO 282). */
  second_round_due_date: string | null;
  /** Última versión aprobada del sistema (la vigente). */
  current_version: VersionRef | null;
  /** Versión en borrador o en revisión distinta de esta. */
  open_version: VersionRef | null;
  /** Motivo por el que no se puede abrir una versión nueva desde esta; null si se puede. */
  new_version_blocker: string | null;
  /** El usuario puede abrir la versión nueva (rol de preparación, DP-01). */
  can_start_new_version: boolean;
};

export async function loadEvaluationVersions(params: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fluxion: any;
  organizationId: string;
  aiSystemId: string;
  evaluationId: string;
  viewer: RoleHolder | string | null;
}): Promise<EvaluationVersionsInfo | null> {
  const { data: rows } = await params.fluxion
    .from('fmea_evaluations')
    .select('id, state, version, approved_at, next_review_at, deferred_items_count, second_round_due_date')
    .eq('organization_id', params.organizationId)
    .eq('system_id', params.aiSystemId)
    .order('version', { ascending: false });

  const evaluations = (rows ?? []) as Array<{
    id: string;
    state: EvaluationState;
    version: number;
    approved_at: string | null;
    next_review_at: string | null;
    deferred_items_count: number | null;
    second_round_due_date: string | null;
  }>;

  const current = evaluations.find((row) => row.id === params.evaluationId);
  if (!current) return null;

  const vigente = evaluations.find((row) => row.state === 'approved') ?? null;
  const open = evaluations.find((row) => row.id !== current.id && ['draft', 'in_review'].includes(row.state)) ?? null;

  const blocker = newVersionBlocker({
    state: current.state,
    isLatestVersion: evaluations[0]?.id === current.id,
    hasOpenVersion: evaluations.some((row) => ['draft', 'in_review'].includes(row.state)),
  });

  return {
    state: current.state,
    approved_at: current.approved_at,
    next_review_at: current.next_review_at,
    // En borrador el recuento es del último envío y ya no vale: se recalcula al reenviar.
    deferred_items_count: current.state === 'draft' ? 0 : current.deferred_items_count ?? 0,
    second_round_due_date: current.state === 'draft' ? null : current.second_round_due_date,
    current_version: vigente ? { id: vigente.id, version: vigente.version } : null,
    open_version: open ? { id: open.id, version: open.version } : null,
    new_version_blocker: blocker,
    can_start_new_version: blocker === null && canPrepareTreatmentPlan(params.viewer),
  };
}
