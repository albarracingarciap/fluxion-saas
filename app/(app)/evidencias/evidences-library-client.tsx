'use client';

import { useState, useTransition, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  CheckSquare,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Paperclip,
  Pencil,
  Square,
  Trash2,
  X,
} from 'lucide-react';

import type { OrganizationEvidenceRecord } from '@/lib/evidences/data';
import {
  getChangeTypeLabel,
  computeVersionDiff,
  type EvidenceVersionRecord,
} from '@/lib/evidences/versions';
import { getEvidenceVersions } from '@/lib/evidences/versions-actions';
import {
  uploadEvidenceFile,
  getSignedUrl,
  getPreviewType,
  formatFileSize,
} from '@/lib/evidences/storage';
import {
  updateSystemEvidence,
  deleteSystemEvidence,
  reviewSystemEvidence,
  createOrganizationEvidence,
  setEvidenceStoragePath,
  bulkReviewEvidences,
  bulkLinkToObligation,
  getOrganizationObligations,
  type ReviewAction,
  type BulkReviewAction,
  type ObligationOption,
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
  storagePath: string | null;
  tags: string[];
};

function TagEditor({
  tags,
  onChange,
}: {
  tags: string[];
  onChange: (next: string[]) => void;
}) {
  const [input, setInput] = useState('');

  const addTag = (raw: string) => {
    const tag = raw.trim().toLowerCase();
    if (!tag || tags.includes(tag)) { setInput(''); return; }
    onChange([...tags, tag]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(input);
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange(tags.slice(0, -1));
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5 items-center min-h-[38px] w-full bg-ltbg border border-ltb rounded-lg px-2.5 py-1.5 focus-within:border-brand-cyan transition-colors">
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-dim border border-cyan-border text-brand-cyan font-plex text-[10px] uppercase tracking-[0.5px]"
        >
          {tag}
          <button
            type="button"
            onClick={() => onChange(tags.filter((t) => t !== tag))}
            className="hover:opacity-60 transition-opacity leading-none"
          >
            <X className="w-2.5 h-2.5" />
          </button>
        </span>
      ))}
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => { if (input.trim()) addTag(input); }}
        placeholder={tags.length === 0 ? 'Escribe un tag y pulsa Enter…' : ''}
        className="flex-1 min-w-[120px] bg-transparent font-sora text-[12.5px] text-ltt outline-none placeholder:text-lttm"
      />
    </div>
  );
}

type Props = {
  evidences: OrganizationEvidenceRecord[];
  organizationId: string;
};

export function EvidencesLibraryClient({ evidences, organizationId }: Props) {
  const router = useRouter();
  const [editingEvidence, setEditingEvidence] = useState<OrganizationEvidenceRecord | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    title: '', evidenceType: 'technical_doc', externalUrl: '',
    description: '', status: 'draft', version: '', issuedAt: '', expiresAt: '',
    storagePath: null, tags: [],
  });
  const [editError, setEditError] = useState<string | null>(null);
  const [isSubmitting, startSubmitTransition] = useTransition();

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();

  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState('');
  const [isReviewing, startReviewTransition] = useTransition();

  // File upload (edit modal)
  const [isUploadingEdit, setIsUploadingEdit] = useState(false);
  const [uploadEditError, setUploadEditError] = useState<string | null>(null);
  const [pendingEditFile, setPendingEditFile] = useState<{ name: string; size: number } | null>(null);
  const editFileInputRef = useRef<HTMLInputElement>(null);

  // File upload (org modal)
  const [isUploadingOrg, setIsUploadingOrg] = useState(false);
  const [uploadOrgError, setUploadOrgError] = useState<string | null>(null);
  const [pendingOrgFile, setPendingOrgFile] = useState<{ name: string; size: number; path: string } | null>(null);
  const orgFileInputRef = useRef<HTMLInputElement>(null);

  // File preview
  const [previewEvidence, setPreviewEvidence] = useState<OrganizationEvidenceRecord | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const handleOpenPreview = async (evidence: OrganizationEvidenceRecord) => {
    if (!evidence.storage_path) return;
    setPreviewEvidence(evidence);
    setPreviewUrl(null);
    setIsLoadingPreview(true);
    const url = await getSignedUrl(evidence.storage_path);
    setPreviewUrl(url);
    setIsLoadingPreview(false);
  };

  const handleEditFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editingEvidence) return;
    setUploadEditError(null);
    setIsUploadingEdit(true);
    const result = await uploadEvidenceFile(file, organizationId, editingEvidence.id);
    setIsUploadingEdit(false);
    if (result.error) {
      setUploadEditError(result.error);
      return;
    }
    setPendingEditFile({ name: file.name, size: file.size });
    setEditForm((f) => ({ ...f, storagePath: result.path ?? null }));
  };

  const handleOrgFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadOrgError(null);
    // For new org evidences we don't have an ID yet — store the file locally and upload after creation
    setPendingOrgFile({ name: file.name, size: file.size, path: '' });
    // Mark as pending (upload happens post-creation in handleOrgSubmit)
    setPendingOrgFile({ name: file.name, size: file.size, path: '__pending__' });
    // Store the File object to upload it after evidence creation
    (orgFileInputRef.current as unknown as { _pendingFile?: File })._pendingFile = file;
  };

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
  const [orgForm, setOrgForm] = useState({ title: '', evidenceType: 'policy', externalUrl: '', description: '', status: 'draft', version: '', issuedAt: '', expiresAt: '', tags: [] as string[] });
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
      storagePath: evidence.storage_path ?? null,
      tags: evidence.tags ?? [],
    });
    setEditError(null);
    setUploadEditError(null);
    setPendingEditFile(null);
  };

  const closeEdit = () => {
    setEditingEvidence(null);
    setEditError(null);
    setUploadEditError(null);
    setPendingEditFile(null);
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
        storagePath: editForm.storagePath,
        tags: editForm.tags,
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
        tags: orgForm.tags,
      });
      if (result?.error) { setOrgError(result.error); return; }

      // Upload pending file after evidence creation (we now have the ID)
      const pendingFile = (orgFileInputRef.current as unknown as { _pendingFile?: File })?._pendingFile;
      const createdId = 'id' in result ? result.id : undefined;
      if (pendingFile && createdId) {
        setIsUploadingOrg(true);
        const uploadResult = await uploadEvidenceFile(pendingFile, organizationId, createdId);
        setIsUploadingOrg(false);
        if (!uploadResult.error && uploadResult.path) {
          await setEvidenceStoragePath(createdId, uploadResult.path);
        }
        if (orgFileInputRef.current) {
          (orgFileInputRef.current as unknown as { _pendingFile?: File })._pendingFile = undefined;
        }
      }

      setIsOrgModalOpen(false);
      setOrgForm({ title: '', evidenceType: 'policy', externalUrl: '', description: '', status: 'draft', version: '', issuedAt: '', expiresAt: '', tags: [] });
      setPendingOrgFile(null);
      setUploadOrgError(null);
      router.refresh();
    });
  };

  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  // ── Bulk selection ───────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isBulkReviewing, startBulkReviewTransition] = useTransition();
  const [isBulkLinking, startBulkLinkTransition] = useTransition();
  const [bulkResult, setBulkResult] = useState<string | null>(null);

  // Obligation picker for bulk link
  const [obligationPickerOpen, setObligationPickerOpen] = useState(false);
  const [obligations, setObligations] = useState<ObligationOption[]>([]);
  const [obligationSearch, setObligationSearch] = useState('');
  const [isLoadingObligations, setIsLoadingObligations] = useState(false);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === visibleEvidences.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(visibleEvidences.map((e) => e.id)));
    }
  };

  const clearSelection = () => setSelected(new Set());

  const handleBulkReview = (action: BulkReviewAction) => {
    startBulkReviewTransition(async () => {
      const result = await bulkReviewEvidences(Array.from(selected), action);
      if (result.error) {
        setBulkResult(`Error: ${result.error}`);
      } else {
        setBulkResult(`${result.updated} actualizada${result.updated !== 1 ? 's' : ''}${result.skipped > 0 ? ` · ${result.skipped} omitida${result.skipped !== 1 ? 's' : ''} (estado incompatible)` : ''}`);
        clearSelection();
        router.refresh();
      }
    });
  };

  const handleOpenObligationPicker = async () => {
    setObligationPickerOpen(true);
    if (obligations.length === 0) {
      setIsLoadingObligations(true);
      const data = await getOrganizationObligations();
      setObligations(data);
      setIsLoadingObligations(false);
    }
  };

  const handleBulkLink = (obligationId: string) => {
    startBulkLinkTransition(async () => {
      const result = await bulkLinkToObligation(Array.from(selected), obligationId);
      if (result.error) {
        setBulkResult(`Error: ${result.error}`);
      } else {
        setBulkResult(`${result.linked} evidencia${result.linked !== 1 ? 's' : ''} vinculada${result.linked !== 1 ? 's' : ''} a la obligación`);
        setObligationPickerOpen(false);
        clearSelection();
        router.refresh();
      }
    });
  };

  const handleExportCSV = () => {
    const toExport = visibleEvidences.filter((e) => selected.has(e.id));
    const headers = ['id', 'titulo', 'tipo', 'estado', 'ambito', 'sistema', 'codigo_sistema', 'owner', 'version', 'emitida', 'caducidad', 'tags', 'url_externa', 'creada', 'actualizada'];
    const rows = toExport.map((e) => [
      e.id,
      `"${e.title.replace(/"/g, '""')}"`,
      e.evidence_type,
      e.status,
      e.scope,
      `"${e.system_name.replace(/"/g, '""')}"`,
      e.system_code,
      e.owner_name ?? '',
      e.version ?? '',
      e.issued_at ?? '',
      e.expires_at ?? '',
      `"${e.tags.join(';')}"`,
      e.external_url ?? '',
      e.created_at,
      e.updated_at,
    ].join(','));
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evidencias_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const allTags = Array.from(new Set(evidences.flatMap((e) => e.tags))).sort();
  const visibleEvidences = activeTagFilter
    ? evidences.filter((e) => e.tags.includes(activeTagFilter))
    : evidences;

  return (
    <>
      {/* Controles de la biblioteca */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Tags:</span>
            {allTags.map((tag) => (
              <button
                key={tag}
                onClick={() => setActiveTagFilter(activeTagFilter === tag ? null : tag)}
                className={`px-2 py-0.5 rounded-full border font-plex text-[10px] uppercase tracking-[0.5px] transition-colors ${
                  activeTagFilter === tag
                    ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                    : 'border-ltb bg-ltbg text-lttm hover:border-cyan-border hover:text-brand-cyan'
                }`}
              >
                {tag}
              </button>
            ))}
            {activeTagFilter && (
              <button
                onClick={() => setActiveTagFilter(null)}
                className="font-sora text-[11px] text-lttm hover:text-ltt transition-colors"
              >
                <X className="w-3 h-3 inline" /> Quitar filtro
              </button>
            )}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          {visibleEvidences.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] font-sora text-[12px] text-lttm border border-ltb bg-ltbg hover:bg-ltcard2 hover:text-ltt transition-colors"
              title={selected.size === visibleEvidences.length ? 'Deseleccionar todo' : 'Seleccionar todo'}
            >
              {selected.size === visibleEvidences.length && visibleEvidences.length > 0
                ? <CheckSquare className="w-3.5 h-3.5 text-brand-cyan" />
                : <Square className="w-3.5 h-3.5" />
              }
              {selected.size > 0 ? `${selected.size} sel.` : 'Seleccionar'}
            </button>
          )}
          <button
            onClick={() => setIsOrgModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12.5px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
          >
            + Evidencia organizacional
          </button>
        </div>
      </div>

      {visibleEvidences.map((evidence) => {
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
                {/* Checkbox de selección */}
                <button
                  type="button"
                  onClick={() => toggleSelect(evidence.id)}
                  className="shrink-0 mt-0.5 text-lttm hover:text-brand-cyan transition-colors"
                  title={selected.has(evidence.id) ? 'Deseleccionar' : 'Seleccionar'}
                >
                  {selected.has(evidence.id)
                    ? <CheckSquare className="w-4 h-4 text-brand-cyan" />
                    : <Square className="w-4 h-4" />
                  }
                </button>
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
                  <Link
                    href={`/evidencias/${evidence.id}`}
                    className="font-sora text-[14px] font-semibold text-ltt leading-[1.35] hover:text-brand-cyan transition-colors"
                  >
                    {evidence.title}
                  </Link>
                  <p className="font-sora text-[12px] text-ltt2 mt-2">
                    {evidence.system_name} · {evidence.evidence_type} · {evidence.owner_name ?? 'Sin owner'}
                  </p>
                  {evidence.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {evidence.tags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-full bg-cyan-dim border border-cyan-border text-brand-cyan font-plex text-[9.5px] uppercase tracking-[0.5px]"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
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
                      &quot;{evidence.validation_notes}&quot;
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {evidence.storage_path && (
                      <button
                        onClick={() => handleOpenPreview(evidence)}
                        className="p-1.5 rounded-[6px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors"
                        title="Vista previa del archivo adjunto"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>
                    )}
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

      {/* ── Floating bulk action bar ─────────────────────────────────────── */}
      {selected.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[10005] animate-fadein">
          <div className="flex items-center gap-2 px-4 py-3 rounded-[14px] bg-ltcard border border-ltb shadow-[0_8px_32px_rgba(0,74,173,0.18)] backdrop-blur-md">
            <span className="font-plex text-[11px] uppercase tracking-[0.6px] text-lttm mr-1">
              {selected.size} evidencia{selected.size !== 1 ? 's' : ''}
            </span>

            <button
              onClick={() => handleBulkReview('request_review')}
              disabled={isBulkReviewing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[11.5px] font-medium text-or bg-ordim border border-orb hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {isBulkReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Enviar a revisión
            </button>

            <button
              onClick={() => handleBulkReview('approve')}
              disabled={isBulkReviewing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[11.5px] font-medium text-gr bg-grdim border border-grb hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              {isBulkReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
              Aprobar
            </button>

            <button
              onClick={handleOpenObligationPicker}
              disabled={isBulkLinking}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[11.5px] font-medium text-brand-cyan bg-cyan-dim border border-cyan-border hover:opacity-80 disabled:opacity-50 transition-opacity"
            >
              <Link2 className="w-3.5 h-3.5" />
              Vincular obligación
            </button>

            <button
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[11.5px] font-medium text-lttm bg-ltbg border border-ltb hover:bg-ltcard2 hover:text-ltt transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              CSV
            </button>

            <button
              onClick={clearSelection}
              className="p-1.5 rounded-[7px] text-lttm hover:bg-ltcard2 hover:text-ltt border border-transparent hover:border-ltb transition-colors"
              title="Limpiar selección"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {bulkResult && (
            <div className="mt-2 mx-auto max-w-fit px-4 py-2 rounded-[10px] bg-grdim border border-grb font-sora text-[11.5px] text-gr text-center shadow">
              {bulkResult}
              <button onClick={() => setBulkResult(null)} className="ml-2 text-lttm hover:text-ltt">
                <X className="w-3 h-3 inline" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Obligation picker modal ───────────────────────────────────────── */}
      {obligationPickerOpen && (
        <div className="fixed inset-0 z-[10015] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-lg rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[70vh]">
            <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-fraunces text-[16px] font-semibold text-ltt">Vincular a obligación</h2>
                <p className="font-sora text-[11.5px] text-lttm mt-0.5">
                  {selected.size} evidencia{selected.size !== 1 ? 's' : ''} seleccionada{selected.size !== 1 ? 's' : ''}
                </p>
              </div>
              <button
                onClick={() => setObligationPickerOpen(false)}
                className="shrink-0 text-lttm hover:text-ltt transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 py-3 border-b border-ltb">
              <input
                type="text"
                value={obligationSearch}
                onChange={(e) => setObligationSearch(e.target.value)}
                placeholder="Buscar por código o título…"
                className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[12.5px] font-sora outline-none focus:border-brand-cyan"
                autoFocus
              />
            </div>

            <div className="flex-1 overflow-y-auto p-3">
              {isLoadingObligations ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-lttm" />
                </div>
              ) : obligations.length === 0 ? (
                <p className="text-center font-sora text-[12.5px] text-lttm py-10">
                  No hay obligaciones disponibles.
                </p>
              ) : (
                <div className="space-y-1">
                  {obligations
                    .filter((ob) => {
                      if (!obligationSearch.trim()) return true;
                      const q = obligationSearch.toLowerCase();
                      return ob.obligation_code.toLowerCase().includes(q) || ob.title.toLowerCase().includes(q);
                    })
                    .map((ob) => (
                      <button
                        key={ob.id}
                        onClick={() => handleBulkLink(ob.id)}
                        disabled={isBulkLinking}
                        className="w-full text-left rounded-[10px] border border-ltb bg-ltbg hover:border-cyan-border hover:bg-ltcard2 px-4 py-3 transition-colors disabled:opacity-50"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-plex text-[10px] uppercase tracking-[0.6px] text-lttm">
                            {ob.obligation_code}
                          </span>
                          {ob.system_name && (
                            <span className="font-plex text-[9.5px] uppercase tracking-[0.5px] text-lttm/70">
                              {ob.system_name}
                            </span>
                          )}
                          {isBulkLinking && <Loader2 className="w-3 h-3 animate-spin ml-auto text-lttm" />}
                        </div>
                        <p className="font-sora text-[12.5px] text-ltt leading-snug">{ob.title}</p>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-ltb bg-ltbg">
              <button
                onClick={() => setObligationPickerOpen(false)}
                className="w-full px-4 py-2 rounded-lg border border-ltb font-sora text-[12.5px] text-lttm hover:bg-ltcard transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

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

                {/* Archivo adjunto */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                    Archivo adjunto
                    <span className="ml-1.5 normal-case text-lttm">(PDF, imagen, Word, Excel — máx. 20 MB)</span>
                  </label>
                  <input
                    ref={editFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.xlsx,.pptx,.txt,.csv"
                    onChange={handleEditFileChange}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      disabled={isUploadingEdit}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-ltb bg-ltbg font-sora text-[12px] text-lttm hover:bg-ltcard2 hover:text-ltt disabled:opacity-50 transition-colors"
                    >
                      {isUploadingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                      {isUploadingEdit ? 'Subiendo…' : 'Adjuntar archivo'}
                    </button>
                    {pendingEditFile && (
                      <div className="flex items-center gap-2 rounded-[8px] border border-grb bg-grdim px-3 py-2">
                        <FileText className="w-3.5 h-3.5 text-gr shrink-0" />
                        <span className="font-sora text-[11.5px] text-ltt truncate max-w-[200px]">{pendingEditFile.name}</span>
                        <span className="font-plex text-[10px] text-lttm">{formatFileSize(pendingEditFile.size)}</span>
                      </div>
                    )}
                    {!pendingEditFile && editForm.storagePath && (
                      <div className="flex items-center gap-2 rounded-[8px] border border-ltb bg-ltbg px-3 py-2">
                        <FileText className="w-3.5 h-3.5 text-lttm shrink-0" />
                        <span className="font-sora text-[11.5px] text-lttm">Archivo adjunto existente</span>
                        <button
                          type="button"
                          onClick={() => setEditForm((f) => ({ ...f, storagePath: null }))}
                          className="text-re hover:opacity-80"
                          title="Quitar archivo adjunto"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {uploadEditError && (
                    <p className="mt-1.5 font-sora text-[11.5px] text-re">{uploadEditError}</p>
                  )}
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

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                    Tags
                    <span className="ml-1.5 normal-case text-lttm">Enter o coma para añadir · Backspace para eliminar el último</span>
                  </label>
                  <TagEditor
                    tags={editForm.tags}
                    onChange={(next) => setEditForm((f) => ({ ...f, tags: next }))}
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

      {/* Modal de vista previa de archivo */}
      {previewEvidence && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-4xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-fraunces text-[16px] font-semibold text-ltt truncate">{previewEvidence.title}</h2>
                <p className="font-sora text-[11.5px] text-lttm mt-0.5 truncate">
                  {previewEvidence.storage_path?.split('/').pop()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {previewUrl && (
                  <a
                    href={previewUrl}
                    download
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltbg font-sora text-[12px] text-lttm hover:bg-ltcard2 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </a>
                )}
                <button onClick={() => { setPreviewEvidence(null); setPreviewUrl(null); }} className="text-lttm hover:text-ltt transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              {isLoadingPreview ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-6 h-6 animate-spin text-lttm" />
                </div>
              ) : !previewUrl ? (
                <div className="flex flex-col items-center justify-center h-64 gap-3">
                  <FileText className="w-10 h-10 text-lttm opacity-40" />
                  <p className="font-sora text-[13px] text-lttm">No se pudo generar la URL de previsualización.</p>
                </div>
              ) : (() => {
                const ext = previewEvidence.storage_path?.split('.').pop()?.toLowerCase() ?? '';
                const type = getPreviewType(
                  ext === 'pdf' ? 'application/pdf'
                  : ['png','jpg','jpeg','webp','gif'].includes(ext) ? `image/${ext}`
                  : 'application/octet-stream'
                );

                if (type === 'pdf') {
                  return (
                    <iframe
                      src={previewUrl}
                      className="w-full h-full min-h-[560px]"
                      title={previewEvidence.title}
                    />
                  );
                }

                if (type === 'image') {
                  return (
                    <div className="flex items-center justify-center p-6 bg-ltbg h-full min-h-[400px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewUrl}
                        alt={previewEvidence.title}
                        className="max-w-full max-h-[560px] rounded-lg object-contain shadow-lg"
                      />
                    </div>
                  );
                }

                return (
                  <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <FileText className="w-12 h-12 text-lttm opacity-40" />
                    <p className="font-sora text-[13px] text-lttm">Vista previa no disponible para este tipo de archivo.</p>
                    <a
                      href={previewUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[13px] font-medium shadow-[0_2px_12px_rgba(0,173,239,0.22)]"
                    >
                      <Download className="w-4 h-4" />
                      Descargar archivo
                    </a>
                  </div>
                );
              })()}
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

                {/* Archivo adjunto */}
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                    Archivo adjunto
                    <span className="ml-1.5 normal-case text-lttm">(opcional · PDF, imagen, Word, Excel — máx. 20 MB)</span>
                  </label>
                  <input
                    ref={orgFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.gif,.docx,.xlsx,.pptx,.txt,.csv"
                    onChange={handleOrgFileChange}
                  />
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => orgFileInputRef.current?.click()}
                      disabled={isUploadingOrg}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[8px] border border-ltb bg-ltbg font-sora text-[12px] text-lttm hover:bg-ltcard2 hover:text-ltt disabled:opacity-50 transition-colors"
                    >
                      {isUploadingOrg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
                      {isUploadingOrg ? 'Subiendo…' : 'Adjuntar archivo'}
                    </button>
                    {pendingOrgFile && (
                      <div className="flex items-center gap-2 rounded-[8px] border border-orb bg-ordim px-3 py-2">
                        <FileText className="w-3.5 h-3.5 text-or shrink-0" />
                        <span className="font-sora text-[11.5px] text-ltt truncate max-w-[200px]">{pendingOrgFile.name}</span>
                        <span className="font-plex text-[10px] text-lttm">{formatFileSize(pendingOrgFile.size)}</span>
                        <span className="font-plex text-[9px] text-or uppercase">Se sube al guardar</span>
                        <button
                          type="button"
                          onClick={() => {
                            setPendingOrgFile(null);
                            if (orgFileInputRef.current) {
                              (orgFileInputRef.current as unknown as { _pendingFile?: File })._pendingFile = undefined;
                              orgFileInputRef.current.value = '';
                            }
                          }}
                          className="text-re hover:opacity-80"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                  </div>
                  {uploadOrgError && (
                    <p className="mt-1.5 font-sora text-[11.5px] text-re">{uploadOrgError}</p>
                  )}
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

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                    Tags
                    <span className="ml-1.5 normal-case text-lttm">Enter o coma para añadir</span>
                  </label>
                  <TagEditor
                    tags={orgForm.tags}
                    onChange={(next) => setOrgForm((f) => ({ ...f, tags: next }))}
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
