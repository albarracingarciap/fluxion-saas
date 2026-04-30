import type { GapLayer, GapSeverity } from '@/lib/gaps/data'

export const LAYER_LABELS: Record<GapLayer, string> = {
  normativo: 'Normativo',
  fmea: 'FMEA',
  control: 'Control',
  caducidad: 'Caducidad',
}

export const SEVERITY_META: Record<GapSeverity, { label: string; badge: string; section: string }> = {
  critico: {
    label: 'Crítico',
    badge: 'bg-red-dim text-re border-reb',
    section: 'Críticos · acción inmediata',
  },
  alto: {
    label: 'Alto',
    badge: 'bg-ordim text-or border-orb',
    section: 'Altos · plan de mitigación requerido',
  },
  medio: {
    label: 'Medio',
    badge: 'bg-cyan-dim text-brand-cyan border-cyan-border',
    section: 'Medios · monitorización activa',
  },
}

export const LAYER_META: Record<GapLayer, { pill: string; bar: string }> = {
  normativo: { pill: 'bg-red-dim text-re border-reb', bar: 'bg-re' },
  fmea: { pill: 'bg-ordim text-or border-orb', bar: 'bg-or' },
  control: { pill: 'bg-cyan-dim text-brand-cyan border-cyan-border', bar: 'bg-brand-cyan' },
  caducidad: { pill: 'bg-[#f4f0fb] text-[#6b3bbf] border-[#c2a8e8]', bar: 'bg-[#6b3bbf]' },
}

export const ZONE_META: Record<string, string> = {
  zona_i: 'bg-red-dim text-re border-reb',
  zona_ii: 'bg-ordim text-or border-orb',
  zona_iii: 'bg-cyan-dim text-brand-cyan border-cyan-border',
  zona_iv: 'bg-grdim text-gr border-grb',
}
