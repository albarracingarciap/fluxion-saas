'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

import { buildGapReportData } from '@/lib/ai-systems/gap-report';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

type SaveGapReportAsEvidenceInput = {
  aiSystemId: string;
};

export async function saveGapReportAsEvidence(input: SaveGapReportAsEvidenceInput) {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  if (!input.aiSystemId) {
    return { error: 'Falta el sistema para generar el snapshot del gap report.' };
  }

  const { data: membership, error: membershipError } = await fluxion
    .from('organization_members')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (membershipError || !membership) {
    return { error: 'No se encontró organización asociada al usuario.' };
  }

  const report = await buildGapReportData({
    fluxion,
    compliance,
    organizationId: membership.organization_id,
    aiSystemId: input.aiSystemId,
  });

  if (!report) {
    return { error: 'No se pudo construir el gap report para este sistema.' };
  }

  const now = new Date().toISOString();
  const title = `Gap report · ${report.system.name} · ${now.slice(0, 10)}`;

  const { data: snapshot, error: snapshotError } = await fluxion
    .from('system_report_snapshots')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      report_type: 'gap_report',
      title,
      payload: report,
      generated_by: user.id,
    })
    .select('id')
    .single();

  if (snapshotError || !snapshot) {
    console.error('saveGapReportAsEvidence snapshot error:', snapshotError);
    return { error: snapshotError?.message ?? 'No se pudo guardar el snapshot del informe.' };
  }

  const origin = headers().get('origin');
  if (!origin) {
    return { error: 'No se pudo resolver el origen de la aplicación para enlazar la evidencia.' };
  }

  const externalUrl = `${origin}/inventario/${input.aiSystemId}/gap-report/snapshots/${snapshot.id}`;

  const { data: evidence, error: evidenceError } = await fluxion
    .from('system_evidences')
    .insert({
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      title,
      description: 'Snapshot congelado del gap report generado desde la ficha del sistema.',
      evidence_type: 'report',
      status: 'valid',
      external_url: externalUrl,
      version: now.slice(0, 10),
      owner_user_id: user.id,
      issued_at: now.slice(0, 10),
    })
    .select('id')
    .single();

  if (evidenceError || !evidence) {
    console.error('saveGapReportAsEvidence evidence error:', evidenceError);
    return { error: evidenceError?.message ?? 'No se pudo registrar la evidencia del informe.' };
  }

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: input.aiSystemId,
      organization_id: membership.organization_id,
      event_type: 'evidence_added',
      event_title: 'Gap report guardado como evidencia',
      event_summary: `Se generó un snapshot del gap report y se registró como evidencia vinculada al sistema.`,
      payload: {
        evidence_id: evidence.id,
        report_snapshot_id: snapshot.id,
        report_type: 'gap_report',
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${input.aiSystemId}`);
  revalidatePath(`/inventario/${input.aiSystemId}/gap-report`);

  return {
    success: true,
    evidenceId: evidence.id,
    snapshotId: snapshot.id,
  };
}
