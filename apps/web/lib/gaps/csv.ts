import type { UnifiedGapRecord, ExcludedGapRecord } from './data'

const LAYER_LABELS_ES: Record<string, string> = {
  normativo: 'Normativo',
  fmea: 'FMEA',
  control: 'Control',
  caducidad: 'Caducidad',
}

const SEVERITY_LABELS_ES: Record<string, string> = {
  critico: 'Crítico',
  alto: 'Alto',
  medio: 'Medio',
}

function escapeCsvField(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

const HEADERS = [
  'Clave',
  'Capa',
  'Severidad',
  'Sistema (código)',
  'Sistema',
  'Título',
  'Responsable',
  'Fecha límite',
  'Vencido',
  'Días hasta vencimiento',
  'Contexto',
  'Origen',
]

export function gapsToCsv(gaps: UnifiedGapRecord[]): string {
  const rows: string[] = [
    '﻿' + HEADERS.map(escapeCsvField).join(';'),
    ...gaps.map((gap) =>
      [
        gap.key,
        LAYER_LABELS_ES[gap.layer] ?? gap.layer,
        SEVERITY_LABELS_ES[gap.severity] ?? gap.severity,
        gap.system_code,
        gap.system_name,
        gap.title,
        gap.owner_name ?? '',
        gap.due_date ?? '',
        gap.overdue ? 'Sí' : 'No',
        gap.days_until_due !== null && gap.days_until_due !== undefined ? String(gap.days_until_due) : '',
        gap.context_label,
        gap.source_ref,
      ]
        .map(escapeCsvField)
        .join(';')
    ),
  ]
  return rows.join('\r\n')
}

export function downloadGapsCsv(gaps: UnifiedGapRecord[], fileName?: string): void {
  const csv = gapsToCsv(gaps)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ?? `gaps_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

const EXCLUDED_HEADERS = [
  'Clave',
  'Capa',
  'Severidad',
  'Sistema (código)',
  'Sistema',
  'Título',
  'Responsable',
  'Fecha límite',
  'Contexto',
  'Origen',
  'Tipo exclusión',
  'Justificación',
  'Decidido por',
  'Fecha decisión',
  'Caduca exclusión',
]

const DISPOSITION_LABELS: Record<string, string> = {
  accepted: 'Aceptado',
  not_applicable: 'No aplica',
}

export function excludedGapsToCsv(gaps: ExcludedGapRecord[]): string {
  const rows: string[] = [
    '﻿' + EXCLUDED_HEADERS.map(escapeCsvField).join(';'),
    ...gaps.map((gap) =>
      [
        gap.key,
        LAYER_LABELS_ES[gap.layer] ?? gap.layer,
        SEVERITY_LABELS_ES[gap.severity] ?? gap.severity,
        gap.system_code,
        gap.system_name,
        gap.title,
        gap.owner_name ?? '',
        gap.due_date ?? '',
        gap.context_label,
        gap.source_ref,
        DISPOSITION_LABELS[gap.disposition.disposition] ?? gap.disposition.disposition,
        gap.disposition.rationale,
        gap.disposition.decided_by_name ?? '',
        gap.disposition.decided_at.slice(0, 10),
        gap.disposition.expires_at ? gap.disposition.expires_at.slice(0, 10) : '',
      ]
        .map(escapeCsvField)
        .join(';')
    ),
  ]
  return rows.join('\r\n')
}

export function downloadExcludedGapsCsv(gaps: ExcludedGapRecord[], fileName?: string): void {
  const csv = excludedGapsToCsv(gaps)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName ?? `gaps_excluidos_${new Date().toISOString().slice(0, 10)}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
