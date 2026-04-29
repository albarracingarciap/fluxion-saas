'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  Loader2,
  Pencil,
  Trash2,
  X,
} from 'lucide-react';

import type { OrganizationEvidenceRecord } from '@/lib/evidences/data';
import {
  getEvidenceVersions,
  getChangeTypeLabel,
  computeVersionDiff,
  type EvidenceVersionRecord,
} from '@/lib/evidences/versions';
import {
  updateSystemEvidence,
  deleteSystemEvidence,
  reviewSystemEvidence,
  createOrganizationEvidence,
  type ReviewAction,
} from './actions';

const STATUS_META: Record<string, { label: string; pill: string }> = {
  draft:          { label: 'Borrador',          pill: 'bg-ltbg text-lttm border-ltb' },
  pending_review: { label: 'Pend. revisión',    pill: 'bg-ordim text-or border-orb' },
  valid:          { label: 'Válida',            pill: 'bg-grdim text-gr border-grb' },
  expired:        { label: 'Caducada',          pill: 'bg-red-dim text-re border-reb' },
  rejected:       { label: 'Rechazada',         pill: 'bg-red-dim text-re border-reb' },
};

const EVIDENCE_TYPE_OPTIONS = [
  { value: 'technical_doc',       label: 'Documento técnico' },
  { value: 'dpia',                label: 'DPIA' },
  { value: 'policy',              label: 'Política' },
  { value: 'contract',            label: 'Contrato' },
  { value: 'audit_report',        label: 'Informe de auditoría' },
  { value: 'training_record',     label: 'Registro formativo' },
  { value: 'test_result',         label: 'Resultado de pruebas' },
  { value: 'monitoring_log',      label: 'Log de monitorización' },
  { value: 'risk_assessment',     label: 'Evaluación de riesgos' },
  { value: 'certification',       label: 'Certificado' },
  { value: 'other',               label: 'Otro' },
];

function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return value;
  }
}

function getExpiryLabel(evidence: OrganizationEvidenceRecord): string {
  if (evidence.status === 'expired') return 'Caducada';
  if (typeof evidence.days_until_expiry !== 'number') return 'Sin caducidad';
  if (evidence.days_until_expiry < 0) return 'Caducada';
  if (evidence.days_until_expiry === 0) return 'Caduca hoy';
  if (evidence.days_until_expiry <= 7) return `Caduca en ${evidence.days_until_expiry}d`;
  if (evidence.days_until_expiry <= 30) return `Caduca en ${evidence.days_until_expiry}d`;
  return `Caduca en ${evidence.days_until_expiry}d`;
}

type EditForm = {
  title: string;
  evidenceType: string;
  externalUrl: string;
  description: string;
  status: string;
  version: string;
  issuedAt: string;
  expiresAt: string;
};

type Props = {
  evidences: OrganizationEvidenceRecord[];
};

export function EvidencesLibraryClient({ evidences }: Props) {
  const router = useRouter();
  const [editingEvidence, setEditingEvidence] = useState<OrganizationEvidenceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', evidenceType: 'technical_doc', externalUrl: '',
    description: '', status: 'draft', version: '', issuedAt: '', expiresAt: '',
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [isReviewing, startReviewTransition] = useTransition();

  // Version history drawer
  const [historyEvidence, setHistoryEvidence] = useState<OrganizationEvidenceRecord | null>(null);
  const [historyVersions, setHistoryVersions] = useState<EvidenceVersionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [expandedVersionId, setExpandedVersionId] = useState<string | null>(null);

  const handleOpenHistory = async (evidence: OrganizationEvidenceRecord) => {
    setHistoryEvidence(evidence);
    setHistoryVersions([]);
    setExpandedVersionId(null);
    setIsLoadingHistory(true);
    try {
      const versions = await getEvidenceVersions(evidence.id);
      setHistoryVersions(versions);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Org-scope evidence creation
  const [isOrgModalOpen, setIsOrgModalOpen] = useState(false);
  const [orgForm, setOrgForm] = useState({ title: '', evidenceType: 'policy', externalUrl: '', description: '', status: 'draft', version: '', issuedAt: '', expiresAt: '' });
  const [orgError, setOrgError] = useState<string | null>(null);
  const [isCreatingOrg, startOrgTransition] = useTransition();

  const openEdit = (evidence: OrganizationEvidenceRecord) => {
    setEditingEvidence(evidence);
    setEditForm({
      title: evidence.title,
      evidenceType: evidence.evidence_type,
      externalUrl: evidence.external_url ?? '',
      description: evidence.description ?? '',
      status: evidence.status,
      version: evidence.version ?? '',
      issuedAt: evidence.issued_at ?? '',
      expiresAt: evidence.expires_at ?? '',
    });
    setEditError(null);
  };

  const closeEdit = () => {
    setEditingEvidence(null);
    setEditError(null);
  };

  const handleEditSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingEvidence) return;
    setEditError(null);

    startSubmitTransition(async () => {
      const result = await updateSystemEvidence({
        evidenceId: editingEvidence.id,
        aiSystemId: editingEvidence.system_id,
        title: editForm.title,
        description: editForm.description,
        evidenceType: editForm.evidenceType,
        externalUrl: editForm.externalUrl,
        status: editForm.status,
        version: editForm.version,
        issuedAt: editForm.issuedAt,
        expiresAt: editForm.expiresAt,
      });

      if (result?.error) {
        setEditError(result.error);
        return;
      }

      closeEdit();
      router.refresh();
    });
  };

  const handleDelete = (evidence: OrganizationEvidenceRecord) => {
    startDeleteTransition(async () => {
      const result = await deleteSystemEvidence(evidence.id, evidence.system_id);
      if (!result?.error) {
        setDeletingId(null);
        router.refresh();
      }
    });
  };

  const handleReview = (evidence: OrganizationEvidenceRecord, action: ReviewAction, notes?: string) => {
    startReviewTransition(async () => {
      await reviewSystemEvidence(evidence.id, evidence.system_id, action, notes);
      setRejectingId(null);
      setRejectNotes('');
      router.refresh();
    });
  };

  const handleOrgSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setOrgError(null);
    startOrgTransition(async () => {
      const result = await createOrganizationEvidence({
        title: orgForm.title,
        description: orgForm.description,
        evidenceType: orgForm.evidenceType,
        externalUrl: orgForm.externalUrl,
        status: orgForm.status,
        version: orgForm.version,
        issuedAt: orgForm.issuedAt,
        expiresAt: orgForm.expiresAt,
      });
      if (result?.error) { setOrgError(result.error); return; }
      setIsOrgModalOpen(false);
      setOrgForm({ title: '', evidenceType: 'policy', externalUrl: '', description: '', status: 'draft', version: '', issuedAt: '', expiresAt: '' });
      router.refresh();
    });
  };

  return (
    <>
      {/* Botón de nueva evidencia organizacional */}
      <div className="flex justify-end">
        <button
          onClick={() => setIsOrgModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12.5px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
        >
          + Evidencia organizacional
        </button>
      </div>

      {evidences.map((evidence) => {
        const statusMeta = STATUS_META[evidence.status] ?? STATUS_META.draft;
        const isConfirmingDelete = deletingId === evidence.id;
        const isRejectingThis = rejectingId === evidence.id;

        return (
          <div
            key={evidence.id}
            className="rounded-[16px] border border-ltb bg-ltcard hover:border-cyan-border hover:shadow-[0_6px_20px_rgba(0,74,173,0.08)] transition-all"
          >
            <div className="px-5 py-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${statusMeta.pill}`}>
                      {statusMeta.label}
                    </span>
                    {evidence.scope === 'organization' ? (
                      <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-cyan-border bg-cyan-dim text-brand-cyan">
                        ORG
                      </span>
                    ) : (
                      <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                        {evidence.system_code}
                      </span>
                    )}
                    <span className="font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border border-ltb bg-ltbg text-lttm">
                      {evidence.origin_label}
                    </span>
                  </div>
                  <p className="font-sora text-[14px] font-semibold text-ltt leading-[1.35]">
                    {evidence.title}
                  </p>
                  <p className="font-sora text-[12px] text-ltt2 mt-2">
                    {evidence.system_name} · {evidence.evidence_type} · {evidence.owner_name ?? 'Sin owner'}
                  </p>
                </div>
                <div className="shrink-0 flex flex-col items-end gap-2">
                  <span
                    className={`font-plex text-[10px] uppercase tracking-[0.7px] ${
                      evidence.status === 'expired' || (typeof evidence.days_until_expiry === 'number' && evidence.days_until_expiry < 0)
                        ? 'text-re'
                        : evidence.status === 'pending_review'
                          ? 'text-or'
                          : 'text-lttm'
                    }`}
                  >
                    {getExpiryLabel(evidence)}
                  </span>
                  {/* Review flow */}
                  {evidence.status === 'draft' && (
                    <button
                      onClick={() => handleReview(evidence, 'request_review')}
                      disabled={isReviewing}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[11px] font-medium text-or bg-ordim border border-orb hover:opacity-80 disabled:opacity-50 transition-opacity"
                    >
                      {isReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                      Enviar a revisión
                    </button>
                  )}
                  {evidence.status === 'pending_review' && (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleReview(evidence, 'approve')}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] font-sora text-[11px] font-medium text-gr bg-grdim border border-grb hover:opacity-80 disabled:opacity-50 transition-opacity"
                        >
                          Aprobar
                        </button>
                        <button
                          onClick={() => { setRejectingId(evidence.id); setRejectNotes(''); }}
                          disabled={isReviewing}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] font-sora text-[11px] font-medium text-re bg-red-dim border border-reb hover:opacity-80 disabled:opacity-50 transition-opacity"
                        >
                          Rechazar
                        </button>
                      </div>
                      {isRejectingThis && (
                        <div className="flex flex-col items-end gap-1.5 w-full max-w-[280px]">
                          <textarea
                            rows={2}
                            placeholder="Motivo del rechazo (obligatorio)"
                            value={rejectNotes}
                            onChange={(e) => setRejectNotes(e.target.value)}
                            className="w-full bg-ltbg border border-reb rounded-[6px] px-2.5 py-1.5 text-[11.5px] font-sora outline-none focus:border-re resize-none"
                          />
                          <div className="flex gap-1.5">
                            <button
                              onClick={() => setRejectingId(null)}
                              className="px-2.5 py-1 rounded-[5px] font-sora text-[11px] text-lttm border border-ltb hover:bg-ltcard2 transition-colors"
                            >
                              Cancelar
                            </button>
                            <button
                              onClick={() => handleReview(evidence, 'reject', rejectNotes)}
                              disabled={isReviewing || !rejectNotes.trim()}
                              className="px-2.5 py-1 rounded-[5px] font-sora text-[11px] font-medium text-white bg-re hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                              {isReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar'}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  {evidence.status === 'rejected' && (
                    <button
                      onClick={() => handleReview(evidence, 'reopen')}
                      disabled={isReviewing}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] font-sora text-[11px] font-medium text-lttm bg-ltbg border border-ltb hover:bg-ltcard2 disabled:opacity-50 transition-colors"
                    >
                      Reabrir
                    </button>
                  )}
                  {evidence.validation_notes && (evidence.status === 'rejected' || evidence.status === 'valid') && (
                    <p className="font-sora text-[10.5px] text-lttm italic max-w-[220px] text-right leading-tight">
                      "{evidence.validation_notes}"
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <button
                      onClick={() => handleOpenHistory(evidence)}
                      className="p-1.5 rounded-[6px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors"
                      title="Ver historial de versiones"
                    >
                      <Clock className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => openEdit(evidence)}
                      className="p-1.5 rounded-[6px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors"
                      title="Editar evidencia"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <span className="font-sora text-[11px] text-re">¿Eliminar?</span>
                        <button
                          onClick={() => handleDelete(evidence)}
                          disabled={isDeleting}
                          className="px-2 py-1 rounded-[5px] font-sora text-[11px] font-medium text-white bg-re hover:opacity-90 disabled:opacity-60 transition-opacity"
                        >
                          {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí'}
                        </button>
                        <button
                          onClick={() => setDeletingId(null)}
                          className="px-2 py-1 rounded-[5px] font-sora text-[11px] text-lttm border border-ltb hover:bg-ltcard2 transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeletingId(evidence.id)}
                        className="p-1.5 rounded-[6px] text-lttm hover:bg-red-dim hover:text-re border border-transparent hover:border-reb transition-colors"
                        title="Eliminar evidencia"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {evidence.scope === 'system' && (
                      <Link
                        href={evidence.system_url}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltbg text-ltt font-sora text-[11px] hover:bg-ltcard2 transition-colors"
                      >
                        Ver sistema
                      </Link>
                    )}
                    {evidence.external_url && (
                      <a
                        href={evidence.external_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltbg text-ltt font-sora text-[11px] hover:bg-ltcard2 transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Abrir
                      </a>
                    )}
                    <Link
                      href={evidence.detail_url}
                      className="inline-flex items-center gap-1 px-4 py-2 rounded-[9px] border border-transparent bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[12px] hover:-translate-y-px transition-all shadow-[0_2px_12px_rgba(0,173,239,0.22)]"
                    >
                      Abrir evidencias
                      <ArrowRight size={13} />
                    </Link>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-4 mt-5">
                <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Owner</p>
                  <p className="font-sora text-[12px] font-medium text-ltt mt-1">{evidence.owner_name ?? 'Sin owner'}</p>
                </div>
                <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Obligaciones vinculadas</p>
                  <p className="font-sora text-[12px] font-medium text-ltt mt-1">{evidence.linked_obligations_count}</p>
                </div>
                <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Emitida</p>
                  <p className="font-sora text-[12px] font-medium text-ltt mt-1">{formatDate(evidence.issued_at)}</p>
                </div>
                <div className="rounded-[12px] border border-ltb bg-ltbg px-3.5 py-3">
                  <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Trazabilidad</p>
                  <p className={`font-sora text-[12px] font-medium mt-1 ${evidence.is_orphan ? 'text-or' : 'text-gr'}`}>
                    {evidence.is_orphan ? 'Huérfana' : `${evidence.linked_obligations_count} obl.`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal de edición */}
      {editingEvidence && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-2xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <div>
                <h2 className="font-fraunces text-lg font-semibold text-ltt">Editar evidencia</h2>
                <p className="font-sora text-[12px] text-lttm mt-1 truncate max-w-[380px]">
                  {editingEvidence.system_name}
                </p>
              </div>
              <button onClick={closeEdit} className="text-lttm hover:text-ltt transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="global-evidence-form" onSubmit={handleEditSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {editError && (
                  <div className="md:col-span-2 text-[12px] font-sora text-re bg-red-dim border border-reb rounded-lg px-3 py-2.5">
                    {editError}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Título</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Tipo</label>
                  <select
                    value={editForm.evidenceType}
                    onChange={(e) => setEditForm((f) => ({ ...f, evidenceType: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Estado</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    <option value="draft">Borrador</option>
                    <option value="pending_review">Pendiente de revisión</option>
                    <option value="valid">Válida</option>
                    <option value="expired">Caducada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">URL externa</label>
                  <input
                    type="url"
                    required
                    value={editForm.externalUrl}
                    onChange={(e) => setEditForm((f) => ({ ...f, externalUrl: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Descripción</label>
                  <textarea
                    rows={3}
                    value={editForm.description}
                    onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Versión</label>
                  <input
                    type="text"
                    value={editForm.version}
                    onChange={(e) => setEditForm((f) => ({ ...f, version: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                    <CalendarClock className="inline w-3 h-3 mr-1" />
                    Fecha de emisión
                  </label>
                  <input
                    type="date"
                    value={editForm.issuedAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, issuedAt: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Caducidad</label>
                  <input
                    type="date"
                    value={editForm.expiresAt}
                    onChange={(e) => setEditForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeEdit}
                className="px-4 py-2 rounded-lg border border-ltb text-[13px] font-sora text-lttm hover:bg-ltcard transition-colors"
              >
                Cancelar
              </button>
              <button
                form="global-evidence-form"
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Drawer de historial de versiones */}
      {historyEvidence && (
        <div className="fixed inset-0 z-[10010] flex">
          {/* Backdrop */}
          <div
            className="flex-1 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setHistoryEvidence(null)}
          />
          {/* Panel */}
          <div className="w-full max-w-[480px] bg-ltcard border-l border-ltb flex flex-col h-full shadow-2xl animate-slide-in-right">
            <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-start gap-3">
              <div className="min-w-0">
                <h2 className="font-fraunces text-[16px] font-semibold text-ltt">Historial de versiones</h2>
                <p className="font-sora text-[11.5px] text-lttm mt-0.5 truncate">{historyEvidence.title}</p>
              </div>
              <button onClick={() => setHistoryEvidence(null)} className="shrink-0 text-lttm hover:text-ltt transition-colors mt-0.5">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              {isLoadingHistory ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-5 h-5 animate-spin text-lttm" />
                </div>
              ) : historyVersions.length === 0 ? (
                <div className="text-center py-16">
                  <Clock className="w-8 h-8 text-lttm mx-auto mb-3 opacity-40" />
                  <p className="font-sora text-[13px] text-lttm">Sin cambios registrados todavía.</p>
                  <p className="font-sora text-[11.5px] text-lttm/60 mt-1">Los cambios se registran desde el próximo guardado.</p>
                </div>
              ) : (
                <ol className="relative border-l border-ltb ml-3 space-y-0">
                  {historyVersions.map((version, idx) => {
                    // diff: compare this snapshot (before) vs what came after (either current or prev snapshot)
                    const afterState: EvidenceVersionRecord | null =
                      idx === 0
                        ? ({
                            title: historyEvidence.title,
                            description: historyEvidence.description,
                            evidence_type: historyEvidence.evidence_type,
                            status: historyEvidence.status,
                            external_url: historyEvidence.external_url,
                            version: historyEvidence.version,
                            issued_at: historyEvidence.issued_at,
                            expires_at: historyEvidence.expires_at,
                            validation_notes: historyEvidence.validation_notes,
                          } as EvidenceVersionRecord)
                        : historyVersions[idx - 1];

                    const diffs = afterState ? computeVersionDiff(version, afterState) : [];
                    const isExpanded = expandedVersionId === version.id;
                    const CHANGE_COLORS: Record<string, string> = {
                      edit:             'bg-ltbg text-lttm border-ltb',
                      review_requested: 'bg-ordim text-or border-orb',
                      approved:         'bg-grdim text-gr border-grb',
                      rejected:         'bg-red-dim text-re border-reb',
                      reopened:         'bg-ltbg text-lttm border-ltb',
                      created:          'bg-cyan-dim text-brand-cyan border-cyan-border',
                    };
                    const badgeClass = CHANGE_COLORS[version.change_type] ?? 'bg-ltbg text-lttm border-ltb';

                    return (
                      <li key={version.id} className="ml-5 pb-6">
                        {/* Dot */}
                        <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-ltcard border-2 border-ltb" />

                        <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
                              {getChangeTypeLabel(version.change_type)}
                            </span>
                            <span className="font-plex text-[10px] text-lttm">
                              {new Date(version.changed_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>

                          {version.changed_by_name && (
                            <p className="font-sora text-[11px] text-lttm mt-1.5">
                              por <span className="text-ltt font-medium">{version.changed_by_name}</span>
                            </p>
                          )}

                          {diffs.length > 0 && (
                            <div className="mt-2.5">
                              <button
                                onClick={() => setExpandedVersionId(isExpanded ? null : version.id)}
                                className="inline-flex items-center gap-1 font-sora text-[11px] text-lttm hover:text-ltt transition-colors"
                              >
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                {diffs.length} campo{diffs.length !== 1 ? 's' : ''} modificado{diffs.length !== 1 ? 's' : ''}
                              </button>

                              {isExpanded && (
                                <div className="mt-2 space-y-2">
                                  {diffs.map((diff) => (
                                    <div key={diff.field} className="rounded-[8px] bg-ltcard border border-ltb px-3 py-2">
                                      <p className="font-plex text-[9.5px] uppercase tracking-[0.5px] text-lttm mb-1">{diff.label}</p>
                                      <p className="font-sora text-[11px] text-re line-through leading-snug">{diff.from ?? '—'}</p>
                                      <p className="font-sora text-[11px] text-gr leading-snug">{diff.to ?? '—'}</p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal nueva evidencia organizacional */}
      {isOrgModalOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-2xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <div>
                <h2 className="font-fraunces text-lg font-semibold text-ltt">Nueva evidencia organizacional</h2>
                <p className="font-sora text-[12px] text-lttm mt-1">
                  Políticas corporativas, certificaciones ISO, planes de formación y otros documentos que aplican a toda la organización.
                </p>
              </div>
              <button onClick={() => setIsOrgModalOpen(false)} className="text-lttm hover:text-ltt transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="org-evidence-form" onSubmit={handleOrgSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {orgError && (
                  <div className="md:col-span-2 text-[12px] font-sora text-re bg-red-dim border border-reb rounded-lg px-3 py-2.5">
                    {orgError}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Título</label>
                  <input
                    type="text"
                    required
                    value={orgForm.title}
                    onChange={(e) => setOrgForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="Ej. Política de IA corporativa v2, Certificación ISO 42001..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Tipo</label>
                  <select
                    value={orgForm.evidenceType}
                    onChange={(e) => setOrgForm((f) => ({ ...f, evidenceType: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Estado</label>
                  <select
                    value={orgForm.status}
                    onChange={(e) => setOrgForm((f) => ({ ...f, status: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    <option value="draft">Borrador</option>
                    <option value="pending_review">Pendiente de revisión</option>
                    <option value="valid">Válida</option>
                    <option value="expired">Caducada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">URL del documento</label>
                  <input
                    type="url"
                    required
                    value={orgForm.externalUrl}
                    onChange={(e) => setOrgForm((f) => ({ ...f, externalUrl: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Descripción</label>
                  <textarea
                    rows={3}
                    value={orgForm.description}
                    onChange={(e) => setOrgForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                    placeholder="Alcance, versión, referencias normativas..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Versión</label>
                  <input
                    type="text"
                    value={orgForm.version}
                    onChange={(e) => setOrgForm((f) => ({ ...f, version: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Fecha de emisión</label>
                  <input
                    type="date"
                    value={orgForm.issuedAt}
                    onChange={(e) => setOrgForm((f) => ({ ...f, issuedAt: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Caducidad</label>
                  <input
                    type="date"
                    value={orgForm.expiresAt}
                    onChange={(e) => setOrgForm((f) => ({ ...f, expiresAt: e.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={() => setIsOrgModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ltb text-[13px] font-sora text-lttm hover:bg-ltcard transition-colors"
              >
                Cancelar
              </button>
              <button
                form="org-evidence-form"
                type="submit"
                disabled={isCreatingOrg}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isCreatingOrg && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear evidencia organizacional
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
