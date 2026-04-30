import { calculateFmeaZone } from '@/lib/fmea/domain'
import type { TreatmentOption, TreatmentPlanActionView } from '@/lib/fmea/treatment-plan'

export type EditableTreatmentAction = TreatmentPlanActionView & {
  control_template_id: string | null
}

const OPTION_LABELS: Record<TreatmentOption, string> = {
  mitigar: 'Mitigar',
  aceptar: 'Aceptar',
  transferir: 'Transferir',
  evitar: 'Evitar',
  diferir: 'Diferir',
}

export function getSeverityMeta(value: number) {
  if (value >= 9) {
    return {
      label: 'Zona I',
      pill: 'bg-red-dim border-reb text-re',
      circle: 'border-reb bg-[#fff1ef] text-re',
    }
  }
  if (value >= 8) {
    return {
      label: 'Zona II',
      pill: 'bg-ordim border-orb text-or',
      circle: 'border-orb bg-[#fff8ec] text-or',
    }
  }
  return {
    label: 'Zona III / IV',
    pill: 'bg-cyan-dim border-cyan-border text-brand-cyan',
    circle: 'border-cyan-border bg-[#edf8fe] text-brand-cyan',
  }
}

export function getOptionLabel(option: TreatmentOption | null) {
  return option ? OPTION_LABELS[option] : 'Pendiente'
}

export function getProjectedSeverity(action: EditableTreatmentAction) {
  if (action.option === 'mitigar' && typeof action.s_residual_target === 'number') {
    return action.s_residual_target
  }
  return action.s_actual_at_creation
}

export function getProjectedZone(
  actions: EditableTreatmentAction[],
  aiActLevel: string | null | undefined
) {
  return calculateFmeaZone(
    actions.map((action) => ({
      id: action.id,
      dimension_id: action.dimension_id,
      s_default_frozen: action.s_default_frozen,
      o_value: null,
      d_real_value: null,
      s_actual: getProjectedSeverity(action),
      status: 'evaluated' as const,
    })),
    aiActLevel
  )
}

export function buildInitialActions(actions: TreatmentPlanActionView[]): EditableTreatmentAction[] {
  return actions.map((action) => ({
    ...action,
    control_template_id: action.control_template_id,
  }))
}

export function getComparableActionSignature(action: EditableTreatmentAction) {
  return JSON.stringify({
    id: action.id,
    option: action.option,
    control_template_id: action.control_template_id,
    control_id: action.control_id,
    s_residual_target: action.s_residual_target,
    justification: action.justification ?? '',
    owner_id: action.owner_id,
    due_date: action.due_date,
    review_due_date: action.review_due_date,
  })
}

export function getDaysFromToday(dateValue: string | null) {
  if (!dateValue) return null
  const today = new Date()
  const target = new Date(`${dateValue}T00:00:00`)
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}
