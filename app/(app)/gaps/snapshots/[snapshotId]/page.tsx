import { notFound, redirect } from 'next/navigation'

import type { GapsDataResult } from '@/lib/gaps/data'
import { createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'

import { GapAnalysisPrintButton } from '../../gap-analysis-print-button'
import { GapAnalysisSnapshotView } from '../../gap-analysis-snapshot-view'
import { ExportCsvButton } from '../../export-csv-button'

type GapAnalysisSnapshotPageProps = {
  params: { snapshotId: string }
}

export default async function GapAnalysisSnapshotPage({
  params,
}: GapAnalysisSnapshotPageProps) {
  const supabase = createClient()
  const fluxion = createFluxionClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: membership, error: membershipError } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single()

  if (!membership && membershipError?.code === 'PGRST116') redirect('/onboarding')
  if (membershipError || !membership) notFound()

  const { data: snapshot, error: snapshotError } = await fluxion
    .from('system_report_snapshots')
    .select('id, ai_system_id, title, payload, created_at')
    .eq('organization_id', membership.organization_id)
    .is('ai_system_id', null)
    .eq('id', params.snapshotId)
    .eq('report_type', 'gap_analysis')
    .single()

  if (snapshotError || !snapshot) notFound()

  const data = snapshot.payload as GapsDataResult

  return (
    <GapAnalysisSnapshotView
      title={snapshot.title}
      data={data}
      createdAt={snapshot.created_at}
      titleSuffix="snapshot"
      actions={
        <div className="flex items-center gap-2 print:hidden">
          <ExportCsvButton
            gaps={data.gaps}
            fileName={`gaps_snapshot_${(snapshot.id as string).slice(0, 8)}.csv`}
          />
          <GapAnalysisPrintButton />
        </div>
      }
      backHref="/gaps/snapshots"
    />
  )
}
