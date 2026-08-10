// Tipos y helpers puros para versiones de evidencias.
// La función async getEvidenceVersions vive en ./versions-actions.ts
// porque marcar este archivo entero como 'use server' choca con los
// helpers síncronos exportados (Next.js 14.2+ valida esto estrictamente).

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

