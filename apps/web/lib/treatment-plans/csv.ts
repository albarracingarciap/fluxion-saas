import type { TreatmentPlanMember } from '@/lib/fmea/treatment-plan'
import type { EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import type { TreatmentPlanListRow } from '@/lib/treatment-plans/data'

const OPTION_LABELS: Record<string, string> = {
  mitigar: 'Mitigar',
  aceptar: 'Aceptar',
  transferir: 'Transferir',
  evitar: 'Evitar',
  diferir: 'Diferir',
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente',
  in_progress: 'En progreso',
  evidence_pending: 'Evidencia pdte.',
  completed: 'Completada',
  accepted: 'Aceptada',
  cancelled: 'Cancelada',
}

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Por hacer',
  in_progress: 'En progreso',
  blocked: 'Bloqueada',
  in_review: 'En revisión',
  done: 'Hecha',
  cancelled: 'Cancelada',
}

function zone(s: number): string {
  if (s >= 9) return 'Zona I'
  if (s >= 8) return 'Zona II'
  if (s >= 7) return 'Zona III'
  return 'Zona IV'
}

function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const str = String(value)
  if (str.includes('"') || str.includes(',') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const HEADERS = [
  'Código modo de fallo',
  'Modo de fallo',
  'Dimensión',
  'Bloque',
  'S_actual',
  'Zona',
  'Opción',
  'Estado acción',
  'Responsable',
  'Fecha objetivo',
  'S residual objetivo',
  'Fecha revisión',
  'Estado tarea',
  'Justificación',
]

export function exportTreatmentActionsCsv(
  actions: EditableTreatmentAction[],
  members: TreatmentPlanMember[],
  selectedIds: Set<string>,
  planCode: string,
  taskStatuses: Record<string, string>
): void {
  const memberMap = new Map(members.map((m) => [m.id, m.full_name]))

  const rows = actions
    .filter((a) => selectedIds.has(a.id))
    .map((a) => [
      cell(a.failure_mode_code),
      cell(a.failure_mode_name),
      cell(a.dimension_name),
      cell(a.bloque),
      cell(a.s_actual_at_creation),
      cell(zone(a.s_actual_at_creation)),
      cell(a.option ? OPTION_LABELS[a.option] ?? a.option : 'Pendiente'),
      cell(STATUS_LABELS[a.status] ?? a.status),
      cell(a.owner_id ? (memberMap.get(a.owner_id) ?? a.owner_id) : ''),
      cell(a.due_date),
      cell(a.s_residual_target),
      cell(a.review_due_date),
      cell(
        a.task_id
          ? (TASK_STATUS_LABELS[taskStatuses[a.task_id] ?? a.task_status ?? ''] ??
              taskStatuses[a.task_id] ??
              a.task_status ??
              '')
          : ''
      ),
      cell(a.justification),
    ])

  const csv = [HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `plan-${planCode}-acciones.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

const PLAN_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En aprobación',
  approved: 'Aprobado',
  in_progress: 'En ejecución',
  closed: 'Cerrado',
  superseded: 'Reemplazado',
}

const APPROVAL_LEVEL_LABELS: Record<string, string> = {
  level_1: 'Nivel 1',
  level_2: 'Nivel 2',
  level_3: 'Alta dirección',
}

const ZONE_LABELS: Record<string, string> = {
  zona_i: 'Zona I',
  zona_ii: 'Zona II',
  zona_iii: 'Zona III',
  zona_iv: 'Zona IV',
}

const PLAN_HEADERS = [
  'Código plan',
  'Sistema',
  'ID Interno',
  'FMEA versión',
  'AI Act riesgo',
  'Estado',
  'Zona al crear',
  'Zona objetivo',
  'Suelo AI Act',
  'Nivel aprobación',
  'Aprobador',
  'Owner dominante',
  'Acciones totales',
  'Acciones completadas',
  'Progreso %',
  'Fecha límite',
  'Días al deadline',
  'Vencido',
  'Modos Zona I',
  'Modos Zona II',
  'Creado',
  'Actualizado',
]

export function exportTreatmentPlansCsv(
  plans: TreatmentPlanListRow[],
  memberById: Map<string, string>,
  filename = 'planes-tratamiento.csv'
): void {
  const rows = plans.map((p) => [
    cell(p.code),
    cell(p.system_name),
    cell(p.system_internal_id),
    cell(p.evaluation_version != null ? `v${p.evaluation_version}` : ''),
    cell(p.system_aiact_risk_level?.replaceAll('_', ' ') ?? ''),
    cell(PLAN_STATUS_LABELS[p.status] ?? p.status),
    cell(ZONE_LABELS[p.zone_at_creation] ?? p.zone_at_creation),
    cell(p.zone_target ? (ZONE_LABELS[p.zone_target] ?? p.zone_target) : ''),
    cell(ZONE_LABELS[p.ai_act_floor] ?? p.ai_act_floor),
    cell(APPROVAL_LEVEL_LABELS[p.approval_level] ?? p.approval_level),
    cell(p.approver_id ? (memberById.get(p.approver_id) ?? '') : ''),
    cell(p.dominant_owner_id ? (memberById.get(p.dominant_owner_id) ?? '') : ''),
    cell(p.actions_total),
    cell(p.actions_completed),
    cell(p.progress_pct),
    cell(p.deadline),
    cell(p.days_to_deadline),
    cell(p.is_overdue ? 'Sí' : 'No'),
    cell(p.modes_count_zone_i),
    cell(p.modes_count_zone_ii),
    cell(p.created_at.slice(0, 10)),
    cell(p.updated_at.slice(0, 10)),
  ])

  const csv = [PLAN_HEADERS.join(','), ...rows.map((r) => r.join(','))].join('\r\n')

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
