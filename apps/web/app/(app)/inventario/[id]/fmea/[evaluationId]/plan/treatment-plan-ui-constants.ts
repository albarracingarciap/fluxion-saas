import type { TreatmentActionStatus, TreatmentOption } from '@/lib/fmea/treatment-plan'
import type { TaskStatus } from '@/lib/tasks/types'

export const OPTION_META: Record<
  TreatmentOption,
  { label: string; active: string; description: string }
> = {
  mitigar: {
    label: 'Mitigar',
    active: 'bg-cyan-dim border-cyan-border text-brand-cyan',
    description: 'Implementa un control y reduce la severidad objetivo del riesgo.',
  },
  aceptar: {
    label: 'Aceptar',
    active: 'bg-ordim border-orb text-or',
    description: 'Asume formalmente el riesgo con justificación y revisión periódica.',
  },
  transferir: {
    label: 'Transferir',
    active: 'bg-[#f1ebff] border-[#d2c1ff] text-[#7c5cff]',
    description: 'Traslada el riesgo a un tercero mediante contrato, SLA o instrumento equivalente.',
  },
  evitar: {
    label: 'Evitar',
    active: 'bg-red-dim border-reb text-re',
    description: 'Elimina o rediseña el sistema para evitar la materialización del riesgo.',
  },
  diferir: {
    label: 'Diferir',
    active: 'bg-ltcard2 border-ltb text-ltt2',
    description: 'Pospone la actuación con calendario, hitos y justificación documentada.',
  },
}

export const PLAN_STATUS_META: Record<string, { label: string; pill: string }> = {
  draft:      { label: 'Borrador',      pill: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  in_review:  { label: 'En aprobación', pill: 'bg-ordim border-orb text-or' },
  approved:   { label: 'Aprobado',      pill: 'bg-grdim border-grb text-gr' },
  in_progress:{ label: 'En ejecución',  pill: 'bg-[#f1ebff] border-[#d2c1ff] text-[#7c5cff]' },
  closed:     { label: 'Cerrado',       pill: 'bg-grdim border-grb text-gr' },
  superseded: { label: 'Sustituido',    pill: 'bg-ltcard2 border-ltb text-lttm' },
}

export const APPROVAL_LEVEL_META: Record<string, { label: string; narrative: string }> = {
  level_1: { label: 'Nivel 1', narrative: 'Aprobación del responsable del SGAI' },
  level_2: { label: 'Nivel 2', narrative: 'Aprobación SGAI + dirección de riesgos' },
  level_3: { label: 'Nivel 3', narrative: 'Aprobación de alta dirección / comité' },
}

export const DIMENSION_META: Record<string, string> = {
  tecnica:    'Técnica',
  seguridad:  'Seguridad',
  etica:      'Ética',
  gobernanza: 'Gobernanza',
  roi:        'ROI',
  legal_b:    'Legal tipo B',
}

export const ACTION_STATUS_META: Record<
  TreatmentActionStatus,
  { label: string; color: string; bar: string }
> = {
  pending:          { label: 'Pendiente',       color: 'text-lttm',       bar: 'bg-ltb' },
  in_progress:      { label: 'En progreso',     color: 'text-brand-cyan', bar: 'bg-brand-cyan' },
  evidence_pending: { label: 'Evidencia pdte.', color: 'text-or',         bar: 'bg-or' },
  completed:        { label: 'Completada',      color: 'text-gr',         bar: 'bg-gr' },
  accepted:         { label: 'Aceptada',        color: 'text-gr',         bar: 'bg-gr' },
  cancelled:        { label: 'Cancelada',       color: 'text-lttm',       bar: 'bg-ltb' },
}

export const TASK_STATUS_CHIP: Record<TaskStatus, string> = {
  todo:        'bg-ltbg border-ltb text-lttm',
  in_progress: 'bg-cyan-dim border-cyan-border text-brand-cyan',
  blocked:     'bg-red-dim border-reb text-re',
  in_review:   'bg-ordim border-orb text-or',
  done:        'bg-grdim border-grb text-gr',
  cancelled:   'bg-ltbg border-ltb text-lttm',
}

export const TASK_STATUS_OPTIONS: TaskStatus[] = [
  'todo',
  'in_progress',
  'blocked',
  'in_review',
  'done',
  'cancelled',
]
