'use client'

import { Sun, Moon, Monitor, Palette, Info } from 'lucide-react'
import { SectionHeader, FieldLabel, type ProfileFormData } from './shared'
import { applyTheme, applyDensity } from '@/components/profile/ThemeApplier'

type ThemeChoice = ProfileFormData['theme']
type DensityChoice = ProfileFormData['table_density']

type Props = {
  formData: ProfileFormData
  setFormData: (data: ProfileFormData) => void
}

const THEMES: Array<{
  value: ThemeChoice
  label: string
  description: string
  icon: React.ReactNode
}> = [
  {
    value: 'light',
    label: 'Claro',
    description: 'Fondo claro con acentos cyan. La opción por defecto.',
    icon: <Sun size={14} />,
  },
  {
    value: 'dark',
    label: 'Oscuro',
    description: 'Fondo oscuro, ideal para entornos con baja luz.',
    icon: <Moon size={14} />,
  },
  {
    value: 'system',
    label: 'Sistema',
    description: 'Sigue la preferencia de tu sistema operativo.',
    icon: <Monitor size={14} />,
  },
]

const DENSITIES: Array<{
  value: DensityChoice
  label: string
  description: string
}> = [
  {
    value: 'comfortable',
    label: 'Cómoda',
    description: 'Filas de tabla con espaciado holgado para lectura prolongada.',
  },
  {
    value: 'compact',
    label: 'Compacta',
    description: 'Filas más estrechas para ver más información a la vez.',
  },
]

export function AparienciaTab({ formData, setFormData }: Props) {
  function handleThemeChange(theme: ThemeChoice) {
    setFormData({ ...formData, theme })
    applyTheme(theme)   // preview inmediato; el Save persiste
  }

  function handleDensityChange(density: DensityChoice) {
    setFormData({ ...formData, table_density: density })
    applyDensity(density)
  }

  return (
    <div>
      <SectionHeader
        icon={<Palette size={16} className="text-ltt2" />}
        title="Apariencia"
        description="Tema visual y densidad de información en la interfaz."
      />

      {/* ── Tema ───────────────────────────────────────────────────────────── */}
      <div className="mb-7">
        <FieldLabel>Tema</FieldLabel>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {THEMES.map((t) => {
            const selected = formData.theme === t.value
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => handleThemeChange(t.value)}
                className={`text-left rounded-[10px] border-2 p-3 transition-all ${
                  selected
                    ? 'border-brand-cyan bg-cyan-dim'
                    : 'border-ltb bg-ltcard hover:border-ltbl'
                }`}
              >
                <ThemePreview value={t.value} />
                <div className="flex items-center gap-1.5 mt-3">
                  <span className={selected ? 'text-brand-cyan' : 'text-lttm'}>{t.icon}</span>
                  <p className={`font-sora text-[13px] font-semibold ${selected ? 'text-brand-cyan' : 'text-ltt'}`}>
                    {t.label}
                  </p>
                </div>
                <p className="font-sora text-[11.5px] text-lttm mt-1 leading-snug">
                  {t.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Densidad ──────────────────────────────────────────────────────── */}
      <div className="mb-6">
        <FieldLabel>Densidad de tablas</FieldLabel>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {DENSITIES.map((d) => {
            const selected = formData.table_density === d.value
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => handleDensityChange(d.value)}
                className={`text-left rounded-[10px] border-2 p-3 transition-all ${
                  selected
                    ? 'border-brand-cyan bg-cyan-dim'
                    : 'border-ltb bg-ltcard hover:border-ltbl'
                }`}
              >
                <DensityPreview value={d.value} />
                <p className={`font-sora text-[13px] font-semibold mt-3 ${selected ? 'text-brand-cyan' : 'text-ltt'}`}>
                  {d.label}
                </p>
                <p className="font-sora text-[11.5px] text-lttm mt-1 leading-snug">
                  {d.description}
                </p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Aviso de vista previa ─────────────────────────────────────────── */}
      <div className="rounded-[10px] border border-cyan-border bg-cyan-dim px-4 py-3 flex items-start gap-2.5">
        <Info size={13} className="text-brand-cyan shrink-0 mt-0.5" />
        <p className="font-sora text-[12px] text-ltt leading-relaxed">
          <strong className="text-brand-cyan">Vista previa.</strong> El tema oscuro se aplica al
          área de contenido central; la barra lateral y la cabecera mantienen su estilo dark
          original. Algunas vistas concretas pueden recibir ajustes visuales adicionales en
          próximas versiones.
        </p>
      </div>
    </div>
  )
}

// ─── Mini-previews visuales ─────────────────────────────────────────────────

function ThemePreview({ value }: { value: ThemeChoice }) {
  if (value === 'system') {
    return (
      <div className="h-[60px] rounded-[6px] overflow-hidden border border-ltb flex">
        <div style={{ background: '#f0f5fc' }} className="flex-1 p-1.5">
          <div style={{ background: '#ffffff', borderColor: '#dce8f7' }} className="h-full rounded-[3px] border" />
        </div>
        <div style={{ background: '#0a1119' }} className="flex-1 p-1.5">
          <div style={{ background: '#131f2e', borderColor: '#1e3050' }} className="h-full rounded-[3px] border" />
        </div>
      </div>
    )
  }

  const palette =
    value === 'dark'
      ? { bg: '#0a1119', card: '#131f2e', border: '#1e3050', accent: '#00adef' }
      : { bg: '#f0f5fc', card: '#ffffff', border: '#dce8f7', accent: '#00adef' }

  return (
    <div
      className="h-[60px] rounded-[6px] overflow-hidden border flex flex-col gap-1 p-1.5"
      style={{ background: palette.bg, borderColor: palette.border }}
    >
      <div
        className="h-3 rounded-[2px]"
        style={{ background: palette.card, border: `1px solid ${palette.border}` }}
      />
      <div className="flex gap-1 flex-1">
        <div
          className="flex-1 rounded-[2px]"
          style={{ background: palette.card, border: `1px solid ${palette.border}` }}
        />
        <div
          className="w-3 rounded-[2px]"
          style={{ background: palette.accent, opacity: 0.6 }}
        />
      </div>
    </div>
  )
}

function DensityPreview({ value }: { value: DensityChoice }) {
  const rowHeight = value === 'compact' ? 8 : 12
  const gap = value === 'compact' ? 2 : 4

  return (
    <div className="rounded-[6px] border border-ltb bg-ltcard2 p-2 h-[60px] flex flex-col" style={{ gap: `${gap}px` }}>
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-[2px] bg-ltb"
          style={{ height: `${rowHeight}px` }}
        />
      ))}
    </div>
  )
}
