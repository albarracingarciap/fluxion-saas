import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'

import type { GapsDataResult } from '@/lib/gaps/data'
import { getAppAuthState } from '@/lib/auth/app-state'
import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

import { SnapshotList } from './compare-selector'

export default async function GapSnapshotsIndexPage() {
  const { user, membership, onboardingCompleted } = await getAppAuthState()

  if (!user) redirect('/login')
  if (!membership || !onboardingCompleted) redirect('/onboarding')

  const adminFluxion = createAdminFluxionClient()

  const { data: snapshots, error } = await adminFluxion
    .from('system_report_snapshots')
    .select('id, title, created_at, payload')
    .eq('organization_id', membership.organization_id)
    .eq('report_type', 'gap_analysis')
    .is('ai_system_id', null)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) notFound()

  const rows = (snapshots ?? []).map((s) => {
    const data = s.payload as GapsDataResult
    return {
      id: s.id as string,
      title: s.title as string,
      created_at: s.created_at as string,
      total: data.summary?.total ?? 0,
      critico: data.summary?.critico ?? 0,
      alto: data.summary?.alto ?? 0,
      medio: data.summary?.medio ?? 0,
    }
  })

  return (
    <div className="max-w-[1280px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      {/* Header */}
      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)]">
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
          <h1 className="font-sora font-bold text-[28px] leading-none text-ltt">
            Historial de snapshots
          </h1>
          <p className="font-sora text-[13px] text-ltt2 mt-2">
            {rows.length === 0
              ? 'Aún no hay snapshots guardados.'
              : `${rows.length} snapshot${rows.length !== 1 ? 's' : ''} guardado${rows.length !== 1 ? 's' : ''}.`}
          </p>
        </div>
      </section>

      {/* Lista */}
      {rows.length === 0 ? (
        <section className="bg-ltcard border border-ltb rounded-[14px] p-12 flex flex-col items-center gap-4 text-center">
          <Camera size={32} className="text-lttm opacity-40" />
          <p className="font-sora text-[14px] text-ltt2 max-w-[360px]">
            Guarda un snapshot desde la pantalla de análisis de gaps para comenzar a registrar el estado de la organización en el tiempo.
          </p>
          <Link
            href="/gaps"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors"
          >
            Ir a análisis de gaps
          </Link>
        </section>
      ) : (
        <section className="bg-ltcard border border-ltb rounded-[14px] overflow-hidden shadow-[0_2px_12px_rgba(0,74,173,0.03)]">
          <SnapshotList snapshots={rows} />
        </section>
      )}
    </div>
  )
}
