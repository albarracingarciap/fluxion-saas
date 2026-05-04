import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ShieldCheck, MinusCircle } from 'lucide-react'

import { getAppAuthState } from '@/lib/auth/app-state'
import { buildGapsData, type ExcludedGapRecord } from '@/lib/gaps/data'
import { LAYER_META, LAYER_LABELS, SEVERITY_META } from '../gap-ui-constants'
import { RevertDispositionButton } from '../revert-disposition-button'
import { ExportExcludedCsvButton } from '../export-excluded-csv-button'

export default async function ExcludedGapsPage() {
  const { user, membership, onboardingCompleted } = await getAppAuthState()
  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const data = await buildGapsData(membership.organization_id)
  const { excluded } = data

  const accepted = excluded.filter((g) => g.disposition.disposition === 'accepted')
  const notApplicable = excluded.filter((g) => g.disposition.disposition === 'not_applicable')

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <Link
              href="/gaps"
              className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
            >
              <ArrowLeft size={13} />
              Volver a análisis de gaps
            </Link>
            <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-2">
              Análisis de gaps
            </p>
            <h1 className="font-fraunces text-[32px] leading-none text-ltt">Gaps excluidos</h1>
            <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[700px]">
              Gaps marcados como aceptados o fuera de alcance. No aparecen en la cola activa pero siguen siendo auditables.
            </p>
          </div>
          {excluded.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <ExportExcludedCsvButton
                gaps={excluded}
                fileName={`gaps_excluidos_${new Date().toISOString().slice(0, 10)}.csv`}
              />
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[14px] border border-ltb bg-ltcard p-5">
          <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">Total excluidos</p>
          <p className="font-fraunces text-[34px] text-ltt mt-2">{excluded.length}</p>
          <p className="font-sora text-[12px] text-ltt2 mt-1">No aparecen en la cola activa</p>
        </div>
        <div className="rounded-[14px] border border-ltb bg-ltcard p-5">
          <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">Aceptados</p>
          <p className="font-fraunces text-[34px] text-brand-cyan mt-2">{accepted.length}</p>
          <p className="font-sora text-[12px] text-ltt2 mt-1">Riesgo conocido y asumido</p>
        </div>
        <div className="rounded-[14px] border border-ltb bg-ltcard p-5">
          <p className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">No aplica</p>
          <p className="font-fraunces text-[34px] text-lttm mt-2">{notApplicable.length}</p>
          <p className="font-sora text-[12px] text-ltt2 mt-1">Fuera del alcance definido</p>
        </div>
      </section>

      {excluded.length === 0 ? (
        <section className="bg-ltcard border border-dashed border-ltb rounded-[14px] p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-ltbg border border-ltb flex items-center justify-center mx-auto mb-4">
            <ShieldCheck size={20} className="text-lttm" />
          </div>
          <p className="font-sora text-[14px] font-semibold text-ltt">Sin gaps excluidos</p>
          <p className="font-sora text-[13px] text-ltt2 mt-2 max-w-[400px] mx-auto">
            Cuando aceptes o marques como &quot;no aplica&quot; algún gap desde la cola activa, aparecerá aquí.
          </p>
          <Link
            href="/gaps"
            className="inline-flex items-center gap-2 mt-5 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
          >
            <ArrowLeft size={14} />
            Ir a la cola activa
          </Link>
        </section>
      ) : (
        <>
          {accepted.length > 0 && (
            <ExcludedSection
              title="Aceptados · riesgo conocido y asumido"
              icon="accepted"
              gaps={accepted}
            />
          )}
          {notApplicable.length > 0 && (
            <ExcludedSection
              title="No aplica · fuera del alcance"
              icon="not_applicable"
              gaps={notApplicable}
            />
          )}
        </>
      )}
    </div>
  )
}

function ExcludedSection({
  title,
  icon,
  gaps,
}: {
  title: string
  icon: 'accepted' | 'not_applicable'
  gaps: ExcludedGapRecord[]
}) {
  return (
    <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
      <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center gap-3">
        {icon === 'accepted' ? (
          <ShieldCheck size={15} className="text-brand-cyan shrink-0" />
        ) : (
          <MinusCircle size={15} className="text-lttm shrink-0" />
        )}
        <h2 className="font-plex text-[11px] uppercase tracking-[0.9px] text-ltt2">{title}</h2>
        <span className="ml-auto font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
          {gaps.length}
        </span>
      </div>
      <div className="p-5 space-y-3">
        {gaps.map((gap) => (
          <ExcludedGapCard key={gap.key} gap={gap} />
        ))}
      </div>
    </section>
  )
}

function ExcludedGapCard({ gap }: { gap: ExcludedGapRecord }) {
  const { disposition } = gap
  const isAccepted = disposition.disposition === 'accepted'

  return (
    <div className="rounded-[12px] border border-ltb bg-ltbg hover:border-cyan-border transition-all">
      <div className="flex items-stretch gap-0">
        <div className={`w-1 shrink-0 rounded-l-[12px] ${LAYER_META[gap.layer].bar} opacity-40`} />
        <div className="flex-1 px-4 py-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${LAYER_META[gap.layer].pill}`}>
                  {LAYER_LABELS[gap.layer]}
                </span>
                <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${SEVERITY_META[gap.severity].badge}`}>
                  {SEVERITY_META[gap.severity].label}
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltcard text-lttm">
                  {gap.system_code}
                </span>
                <span
                  className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${
                    isAccepted
                      ? 'bg-cyan-dim2 text-brand-cyan border-cyan-border'
                      : 'bg-ltcard text-lttm border-ltb'
                  }`}
                >
                  {isAccepted ? 'Aceptado' : 'No aplica'}
                </span>
              </div>
              <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">{gap.title}</p>
              <p className="font-sora text-[12px] text-ltt2 mt-1">{gap.context_label}</p>
            </div>
          </div>

          <div className="mt-3 rounded-[10px] border border-ltb bg-ltcard px-3 py-2.5">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">
              Justificación
            </p>
            <p className="font-sora text-[12px] text-ltt2">{disposition.rationale}</p>
          </div>

          <div className="grid gap-2 md:grid-cols-3 mt-3">
            <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Decidido por</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {disposition.decided_by_name ?? 'Desconocido'}
              </p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Fecha decisión</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {disposition.decided_at.slice(0, 10)}
              </p>
            </div>
            <div className="rounded-[10px] border border-ltb bg-ltcard px-3 py-2">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Caduca exclusión</p>
              <p className="font-sora text-[12px] font-medium text-ltt mt-1">
                {disposition.expires_at ? disposition.expires_at.slice(0, 10) : '—'}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-ltb">
            <Link
              href={gap.detail_url}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-ltt2 font-sora text-[11px] hover:border-cyan-border hover:text-brand-cyan transition-colors"
            >
              Ver origen
            </Link>
            <RevertDispositionButton dispositionId={disposition.id} />
          </div>
        </div>
      </div>
    </div>
  )
}
