'use server';

import { createFluxionClient } from '@/lib/supabase/fluxion';

export type EvidenceVersionRecord = {
  id: string;
  evidence_id: string;
  changed_by: string | null;
  changed_by_name: string | null;
  changed_at: string;
  change_type: 'edit' | 'review_requested' | 'approved' | 'rejected' | 'reopened' | 'created';
  title: string;
  description: string | null;
  evidence_type: string;
  status: string;
  external_url: string | null;
  version: string | null;
  issued_at: string | null;
  expires_at: string | null;
  validation_notes: string | null;
};

export type EvidenceVersionDiff = {
  field: string;
  label: string;
  from: string | null;
  to: string | null;
};

const CHANGE_TYPE_LABELS: Record<EvidenceVersionRecord['change_type'], string> = {
  created: 'Creada',
  edit: 'Editada',
  review_requested: 'Enviada a revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
  reopened: 'Reabierta',
};

export function getChangeTypeLabel(type: EvidenceVersionRecord['change_type']): string {
  return CHANGE_TYPE_LABELS[type] ?? type;
}

const DIFFABLE_FIELDS: Array<{ key: keyof EvidenceVersionRecord; label: string }> = [
  { key: 'title', label: 'Título' },
  { key: 'description', label: 'Descripción' },
  { key: 'evidence_type', label: 'Tipo' },
  { key: 'status', label: 'Estado' },
  { key: 'external_url', label: 'URL' },
  { key: 'version', label: 'Versión' },
  { key: 'issued_at', label: 'Fecha emisión' },
  { key: 'expires_at', label: 'Fecha expiración' },
  { key: 'validation_notes', label: 'Notas de revisión' },
];

export function computeVersionDiff(
  prev: EvidenceVersionRecord,
  next: EvidenceVersionRecord,
): EvidenceVersionDiff[] {
  return DIFFABLE_FIELDS.flatMap(({ key, label }) => {
    const from = (prev[key] as string | null) ?? null;
    const to = (next[key] as string | null) ?? null;
    if (from === to) return [];
    return [{ field: key, label, from, to }];
  });
}

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
