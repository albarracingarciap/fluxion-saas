/**
 * Reglas puras del plan de tratamiento: nivel de aprobación, cadencia y plazo
 * por zona, y elección del aprobador sin política.
 *
 * No dependen de la base de datos ni de Next, así que se pueden probar con
 * `npm test` (tests/). `lib/fmea/treatment-plan.ts` las reexporta para no
 * cambiar a quien ya las importa desde allí.
 */
import type { FmeaZone } from './domain';
import { PLAN_APPROVER_ROLES } from '../auth/roles-flujo';

export type TreatmentApprovalLevel = 'level_1' | 'level_2' | 'level_3';

/** Zona I → nivel 3 (Dirección); Zona II → nivel 2 (Comité); Zonas III y IV → nivel 1 (Responsable). */
export function getApprovalLevelForZone(zone: FmeaZone): TreatmentApprovalLevel {
  if (zone === 'zona_i') return 'level_3';
  if (zone === 'zona_ii') return 'level_2';
  return 'level_1';
}

export function getReviewCadenceForZone(zone: FmeaZone) {
  switch (zone) {
    case 'zona_i':
      return 'monthly';
    case 'zona_ii':
      return 'quarterly';
    case 'zona_iii':
      return 'biannual';
    case 'zona_iv':
    default:
      return 'annual';
  }
}

/** Plazo del plan según la zona: 30, 90, 180 o 365 días. */
export function getDefaultDeadlineForZone(zone: FmeaZone, from = new Date()) {
  const date = new Date(from);

  switch (zone) {
    case 'zona_i':
      date.setDate(date.getDate() + 30);
      break;
    case 'zona_ii':
      date.setDate(date.getDate() + 90);
      break;
    case 'zona_iii':
      date.setDate(date.getDate() + 180);
      break;
    case 'zona_iv':
    default:
      date.setDate(date.getDate() + 365);
      break;
  }

  return date.toISOString().slice(0, 10);
}

const APPROVAL_LEVEL_LABELS: Record<TreatmentApprovalLevel, string> = {
  level_1: 'Nivel 1 · Responsable',
  level_2: 'Nivel 2 · Comité',
  level_3: 'Nivel 3 · Dirección',
};

/** Nombre de negocio del nivel de aprobación (glosario). */
export function getApprovalLevelLabel(level: string | null | undefined): string {
  return APPROVAL_LEVEL_LABELS[level as TreatmentApprovalLevel] ?? 'Nivel sin definir';
}

/** Roles que pueden aprobar el plan sin política de Flujos de aprobación (DP-01). */
export function getApproverRolePriority(level: TreatmentApprovalLevel): readonly string[] {
  return PLAN_APPROVER_ROLES[level] ?? PLAN_APPROVER_ROLES.level_1;
}

export type ApproverCandidate = { user_id: string; role: string; is_active: boolean | null };

/**
 * Elige el aprobador entre los miembros: activo, con un rol aprobador del nivel
 * y distinto de quien envía (quien prepara no aprueba). Respeta el orden de
 * prioridad de los roles y, dentro de cada rol, el orden recibido. Sin
 * candidato devuelve null: nunca se asigna «cualquier miembro».
 */
export function pickPlanApprover(
  members: ApproverCandidate[],
  approvalLevel: TreatmentApprovalLevel,
  actorUserId: string,
): string | null {
  const roles = getApproverRolePriority(approvalLevel);
  const candidates = members.filter(
    (member) => member.is_active !== false && member.user_id !== actorUserId && roles.includes(member.role),
  );
  for (const role of roles) {
    const match = candidates.find((member) => member.role === role);
    if (match) return match.user_id;
  }
  return null;
}
