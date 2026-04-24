'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Boxes, ShieldCheck, ShieldAlert, Target, Plus } from 'lucide-react'

type FocusKey = 'inventory' | 'compliance' | 'risk' | 'governance'

const FOCUS_CONFIG: Record<FocusKey, {
  label: string
  shortLabel: string
  Icon: React.ComponentType<{ size?: number | string; className?: string }>
  steps: { title: string; desc: string }[]
  cta: string
  href: string
}> = {
  inventory: {
    label: 'Inventario de Sistemas IA',
    shortLabel: 'Inventario',
    Icon: Boxes,
    steps: [
      { title: 'Registra el primer sistema', desc: 'Nombre, propósito, responsable y contexto de uso.' },
      { title: 'Clasifícalo según el AI Act', desc: 'Riesgo mínimo, limitado, alto o prohibido.' },
      { title: 'Mide tu cumplimiento', desc: 'El dashboard activa métricas y seguimiento automático.' },
    ],
    cta: 'Registrar primer sistema',
    href: '/inventario/nuevo',
  },
  compliance: {
    label: 'Cumplimiento Regulatorio',
    shortLabel: 'Cumplimiento',
    Icon: ShieldCheck,
    steps: [
      { title: 'Registra al menos un sistema', desc: 'El análisis de gaps requiere un sistema registrado.' },
      { title: 'Ejecuta el análisis de gaps', desc: 'Identifica incumplimientos frente a AI Act e ISO 42001.' },
      { title: 'Prioriza y asigna acciones', desc: 'Cierra los gaps con planes de tratamiento trazables.' },
    ],
    cta: 'Registrar primer sistema',
    href: '/inventario/nuevo',
  },
  risk: {
    label: 'Gestión de Riesgos',
    shortLabel: 'Riesgos',
    Icon: ShieldAlert,
    steps: [
      { title: 'Registra el sistema a evaluar', desc: 'El inventario es la base de toda evaluación FMEA.' },
      { title: 'Inicia la evaluación FMEA', desc: 'Analiza modos de fallo, impacto y probabilidad.' },
      { title: 'Define el plan de tratamiento', desc: 'Asigna acciones correctivas y rastrea su ejecución.' },
    ],
    cta: 'Registrar primer sistema',
    href: '/inventario/nuevo',
  },
  governance: {
    label: 'Gobernanza y Comités',
    shortLabel: 'Gobernanza',
    Icon: Target,
    steps: [
      { title: 'Configura tu organización', desc: 'Define la estructura de comités y sus responsables.' },
      { title: 'Asigna miembros al comité', desc: 'Roles internos y externos con sus competencias.' },
      { title: 'Registra el primer sistema', desc: 'Activa el ciclo completo de gobernanza y trazabilidad.' },
    ],
    cta: 'Ir a mi organización',
    href: '/organizacion',
  },
}

const FOCUS_KEYS: FocusKey[] = ['inventory', 'compliance', 'risk', 'governance']

export function OnboardingGuide({ firstFocus }: { firstFocus?: string }) {
  const defaultKey = (firstFocus && firstFocus in FOCUS_CONFIG ? firstFocus : 'inventory') as FocusKey
  const [activeKey, setActiveKey] = useState<FocusKey>(defaultKey)
  const focus = FOCUS_CONFIG[activeKey]
  const FocusIcon = focus.Icon

  return (
    <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_2px_12px_rgba(0,74,173,0.04)] overflow-hidden">
      {/* Header */}
      <div className="bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">Guía de despliegue</p>
          <p className="font-sora text-[13px] font-semibold text-ltt mt-0.5">
            Todos los módulos te esperan — empieza por el que más valor te aporte
          </p>
        </div>
        <span className="font-plex text-[10px] uppercase tracking-[0.8px] px-2 py-1 rounded-full bg-cyan-dim text-brand-cyan border border-cyan-border hidden sm:block">
          Primeros pasos
        </span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-ltb overflow-x-auto">
        {FOCUS_KEYS.map((key) => {
          const cfg = FOCUS_CONFIG[key]
          const TabIcon = cfg.Icon
          const isActive = key === activeKey
          const isPriority = key === defaultKey
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveKey(key)}
              className={`flex items-center gap-2 px-5 py-3.5 border-b-2 font-sora text-[13px] whitespace-nowrap transition-colors ${
                isActive
                  ? 'border-brand-cyan text-brand-cyan bg-cyan-dim/40'
                  : 'border-transparent text-ltt2 hover:text-ltt hover:bg-ltbg'
              }`}
            >
              <TabIcon size={14} />
              {cfg.shortLabel}
              {isPriority && (
                <span className="font-plex text-[9px] uppercase tracking-[0.6px] px-1.5 py-0.5 rounded-full bg-cyan-dim2 border border-cyan-border text-brand-cyan">
                  Tu foco
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Content */}
      <div className="p-6 grid gap-5 md:grid-cols-[1fr_1fr_1fr_auto] md:items-center">
        {focus.steps.map((step, i) => (
          <div key={i} className="flex gap-3 items-start">
            <div className="w-6 h-6 rounded-full bg-cyan-dim2 border border-cyan-border flex items-center justify-center shrink-0 mt-0.5">
              <span className="font-plex text-[10px] font-semibold text-brand-cyan">{i + 1}</span>
            </div>
            <div>
              <p className="font-sora text-[13px] font-semibold text-ltt">{step.title}</p>
              <p className="font-sora text-[12px] text-ltt2 mt-0.5 leading-snug">{step.desc}</p>
            </div>
          </div>
        ))}
        <div className="flex justify-end">
          <Link
            href={focus.href}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-[9px] font-sora font-semibold text-[13px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_14px_#00adef30] hover:shadow-[0_4px_20px_#00adef45] hover:-translate-y-px transition-all whitespace-nowrap"
          >
            <Plus size={15} strokeWidth={2.5} />
            {focus.cta}
          </Link>
        </div>
      </div>
    </div>
  )
}
