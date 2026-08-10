'use server';

import { createFluxionClient } from '@/lib/supabase/fluxion';
import type { EvidenceVersionRecord } from './versions';

export async function getEvidenceVersions(
  evidenceId: string,
): Promise<EvidenceVersionRecord[]> {
  const fluxion = createFluxionClient();

  const { data, error } = await fluxion
    .from('system_evidence_versions')
    .select(`
      id,
      evidence_id,
      changed_by,
      changed_at,
      change_type,
      title,
      description,
      evidence_type,
      status,
      external_url,
      version,
      issued_at,
      expires_at,
      validation_notes
    `)
    .eq('evidence_id', evidenceId)
    .order('changed_at', { ascending: false });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return [];

  const profileIds = Array.from(new Set(data.map((v) => v.changed_by).filter(Boolean))) as string[];

  const { data: profiles } = await fluxion
    .from('profiles')
    .select('id, first_name, last_name')
    .in('id', profileIds.length > 0 ? profileIds : ['00000000-0000-0000-0000-000000000000']);

  const profileMap = new Map((profiles ?? []).map((p) => [
    p.id,
    [p.first_name, p.last_name].filter(Boolean).join(' ') || null,
  ]));

  return data.map((v) => ({
    ...v,
    change_type: v.change_type as EvidenceVersionRecord['change_type'],
    changed_by_name: v.changed_by ? (profileMap.get(v.changed_by) ?? null) : null,
  }));
}
