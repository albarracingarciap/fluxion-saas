import { redirect } from 'next/navigation'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { buildSoAData } from '@/lib/templates/data'
import { InitSoAButton } from './init-soa-button'
import { SoAClientView } from './soa-client-view'
import { HeaderActions } from './header-actions'
import { SoAPrintView } from './soa-print-view'
import { SoAMetadataBar } from './metadata-bar'
import { ShieldCheck, Clock, CheckCircle2, FileEdit } from 'lucide-react'
import Link from 'next/link'

const LIFECYCLE_CONFIG = {
  draft: {
    label: 'Borrador',
    description: 'El documento está en edición. Los controles pueden modificarse libremente.',
    bg: 'bg-[#f0f9ff]',
    border: 'border-[#bae6fd]',
    text: 'text-[#0369a1]',
    icon: FileEdit,
  },
  under_review: {
    label: 'En revisión',
    description: 'El documento está bloqueado a la espera de aprobación. Solo los usuarios autorizados pueden aprobarlo.',
    bg: 'bg-[#fffbeb]',
    border: 'border-[#fde68a]',
    text: 'text-[#b45309]',
    icon: Clock,
  },
  approved: {
    label: 'Aprobado',
    description: 'El documento SoA ha sido aprobado formalmente. Para realizar cambios, inicia una nueva revisión.',
    bg: 'bg-[#f0fdf4]',
    border: 'border-[#bbf7d0]',
    text: 'text-[#15803d]',
    icon: CheckCircle2,
  },
}

export default async function SoAPage() {
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) {
    redirect('/login')
  }

  if (!membership || !onboardingCompleted) {
    redirect('/onboarding')
  }

  // Fetch user role for lifecycle gate
  const fluxion = createFluxionClient()
  const { data: profile } = await fluxion
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()
  const userRole: string = profile?.role ?? ''

  const data = await buildSoAData(membership.organization_id)

  const lifecycleStatus = data.metadata.lifecycle_status ?? 'draft'
  const isReadOnly = lifecycleStatus !== 'draft'
  const lifecycleCfg = LIFECYCLE_CONFIG[lifecycleStatus as keyof typeof LIFECYCLE_CONFIG] ?? LIFECYCLE_CONFIG.draft

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
              Plantilla Normativa
            </p>
            <h1 className="font-fraunces text-[32px] leading-none text-ltt">Declaración de Aplicabilidad (SoA)</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
              ISO/IEC 42001:2023. El SoA define qué controles del Anexo A aplican a tu organización y traza su implementación contra tus Sistemas de IA de forma centralizada.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
            >
              Volver al dashboard
            </Link>
            {data.isInitialized && (
              <HeaderActions
                metadata={data.metadata}
                availableTags={data.availableTags}
                userRole={userRole}
                lifecycleStatus={lifecycleStatus}
                controls={data.controls}
              />
            )}
          </div>
        </div>
      </section>

      {!data.isInitialized ? (
        <section className="bg-ltcard border border-ltb rounded-[14px] p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 rounded-full bg-cyan-dim2 border border-cyan-border flex items-center justify-center mb-5">
            <ShieldCheck size={28} className="text-brand-cyan" />
          </div>
          <h2 className="font-fraunces text-[24px] text-ltt mb-2">Inicializar Declaración de Aplicabilidad</h2>
          <p className="font-sora text-[14px] text-ltt2 max-w-[600px] mb-8">
            Tu organización aún no ha definido el alcance del ISO 42001. Inicializa la plantilla en blanco con los 38 controles del Anexo A para empezar a evaluar cuáles aplican a tus sistemas de IA.
          </p>
          <InitSoAButton />
        </section>
      ) : (
        <>
          {/* Lifecycle status banner */}
          <div className={`${lifecycleCfg.bg} border ${lifecycleCfg.border} rounded-[12px] px-5 py-3.5 flex items-center gap-3`}>
            <lifecycleCfg.icon size={16} className={`${lifecycleCfg.text} shrink-0`} />
            <div className="flex items-center gap-2 min-w-0">
              <span className={`font-plex text-[11px] uppercase tracking-[0.9px] font-semibold ${lifecycleCfg.text}`}>
                {lifecycleCfg.label}
              </span>
              <span className={`font-sora text-[13px] ${lifecycleCfg.text} opacity-80`}>
                — {lifecycleCfg.description}
              </span>
            </div>
          </div>

          <SoAMetadataBar metadata={data.metadata} />

          <section className="grid gap-4 md:grid-cols-3">
            <KpiCard
              label="Controles aplicables"
              value={`${data.kpis.applicableCount} / ${data.kpis.totalControls}`}
              detail="Incluidos en el alcance normativo"
              accent="blue"
            />
            <KpiCard
              label="Controles implantados"
              value={String(data.kpis.implementedCount)}
              detail={`${data.kpis.inProgressCount} en progreso`}
              accent="cyan"
            />
            <KpiCard
              label="Cumplimiento SoA"
              value={`${data.kpis.completionPercentage}%`}
              detail="Respecto a controles aplicables"
              accent="green"
            />
          </section>

          <SoAClientView
            controls={data.controls}
            aiSystems={data.aiSystems}
            inScopeSystems={data.inScopeSystems}
            evidences={data.evidences}
            members={data.members}
            aisiaStatusMap={data.aisiaStatusMap}
            isReadOnly={isReadOnly}
          />

          <SoAPrintView
            metadata={data.metadata}
            controls={data.controls}
            aiSystems={data.aiSystems.map(s => ({ id: s.id, name: s.name }))}
            evidences={data.evidences.map(e => ({ id: e.id, title: e.title }))}
          />
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  detail,
  accent,
}: {
  label: string
  value: string
  detail: string
  accent: 'cyan' | 'blue' | 'green'
}) {
  const accentClass =
    accent === 'green'
      ? 'border-t-[#22c55e] text-[#16a34a]'
      : accent === 'blue'
        ? 'border-t-[#3b82f6] text-[#2563eb]'
        : 'border-t-brand-cyan text-brand-cyan'

  return (
    <div className={`bg-ltcard border border-ltb border-t-[3px] rounded-[14px] p-5 shadow-[0_2px_12px_rgba(0,74,173,0.03)] ${accentClass}`}>
      <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">{label}</p>
      <p className="font-fraunces text-[34px] mt-2">{value}</p>
      <p className="font-sora text-[12px] text-ltt2 mt-1">{detail}</p>
    </div>
  )
}
