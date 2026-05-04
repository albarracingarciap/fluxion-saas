'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Download,
  FileText,
  Loader2,
  Trash2,
  X,
} from 'lucide-react'

import type { EvidenceDetail, EvidenceVersionWithDiff } from '@/lib/evidences/detail'
import { getChangeTypeLabel } from '@/lib/evidences/versions'
import { getSignedUrl, getPreviewType } from '@/lib/evidences/storage'
import {
  reviewSystemEvidence,
  deleteSystemEvidence,
  type ReviewAction,
} from '@/app/(app)/evidencias/actions'

// ─── Review flow ─────────────────────────────────────────────────────────────

export function ReviewActions({ evidence }: { evidence: EvidenceDetail }) {
  const router = useRouter()
  const [isReviewing, startReviewTransition] = useTransition()
  const [rejectNotes, setRejectNotes] = useState('')
  const [showRejectInput, setShowRejectInput] = useState(false)

  const handle = (action: ReviewAction, notes?: string) => {
    startReviewTransition(async () => {
      await reviewSystemEvidence(evidence.id, evidence.system_id ?? '', action, notes)
      setShowRejectInput(false)
      setRejectNotes('')
      router.refresh()
    })
  }

  const { status } = evidence

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === 'draft' && (
        <button
          onClick={() => handle('request_review')}
          disabled={isReviewing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium text-or bg-ordim border border-orb hover:opacity-80 disabled:opacity-50 transition-opacity"
        >
          {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          Enviar a revisión
        </button>
      )}

      {status === 'pending_review' && !showRejectInput && (
        <>
          <button
            onClick={() => handle('approve')}
            disabled={isReviewing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium text-gr bg-grdim border border-grb hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            {isReviewing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle className="w-3.5 h-3.5" />}
            Aprobar
          </button>
          <button
            onClick={() => setShowRejectInput(true)}
            disabled={isReviewing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium text-re bg-red-dim border border-reb hover:opacity-80 disabled:opacity-50 transition-opacity"
          >
            <X className="w-3.5 h-3.5" />
            Rechazar
          </button>
        </>
      )}

      {status === 'pending_review' && showRejectInput && (
        <div className="flex flex-col gap-2 w-full max-w-sm">
          <textarea
            rows={2}
            placeholder="Motivo del rechazo (obligatorio)"
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            className="w-full bg-ltbg border border-reb rounded-[6px] px-2.5 py-1.5 text-[12px] font-sora outline-none focus:border-re resize-none"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setShowRejectInput(false)}
              className="px-3 py-1.5 rounded-[6px] font-sora text-[11px] text-lttm border border-ltb hover:bg-ltcard2 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={() => handle('reject', rejectNotes)}
              disabled={isReviewing || !rejectNotes.trim()}
              className="px-3 py-1.5 rounded-[6px] font-sora text-[11px] font-medium text-white bg-re hover:opacity-90 disabled:opacity-50 transition-opacity"
            >
              {isReviewing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirmar rechazo'}
            </button>
          </div>
        </div>
      )}

      {status === 'rejected' && (
        <button
          onClick={() => handle('reopen')}
          disabled={isReviewing}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] font-medium text-lttm bg-ltbg border border-ltb hover:bg-ltcard2 disabled:opacity-50 transition-colors"
        >
          Reabrir borrador
        </button>
      )}
    </div>
  )
}

// ─── Delete action ────────────────────────────────────────────────────────────

export function DeleteAction({ evidence }: { evidence: EvidenceDetail }) {
  const router = useRouter()
  const [confirming, setConfirming] = useState(false)
  const [isDeleting, startDeleteTransition] = useTransition()

  const handle = () => {
    startDeleteTransition(async () => {
      await deleteSystemEvidence(evidence.id, evidence.system_id ?? '')
      router.push('/evidencias')
    })
  }

  if (!confirming) {
    return (
      <button
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] text-lttm bg-ltbg border border-ltb hover:bg-red-dim hover:text-re hover:border-reb transition-colors"
      >
        <Trash2 className="w-3.5 h-3.5" />
        Eliminar
      </button>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="font-sora text-[12px] text-re">¿Eliminar permanentemente?</span>
      <button
        onClick={handle}
        disabled={isDeleting}
        className="px-3 py-1.5 rounded-[6px] font-sora text-[11px] font-medium text-white bg-re hover:opacity-90 disabled:opacity-60 transition-opacity"
      >
        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Sí, eliminar'}
      </button>
      <button
        onClick={() => setConfirming(false)}
        className="px-3 py-1.5 rounded-[6px] font-sora text-[11px] text-lttm border border-ltb hover:bg-ltcard2 transition-colors"
      >
        Cancelar
      </button>
    </div>
  )
}

// ─── File preview ─────────────────────────────────────────────────────────────

export function FilePreviewButton({ storagePath, title }: { storagePath: string; title: string }) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const handleOpen = async () => {
    if (!previewUrl) {
      setLoading(true)
      const url = await getSignedUrl(storagePath)
      setPreviewUrl(url)
      setLoading(false)
    }
    setOpen(true)
  }

  const ext = storagePath.split('.').pop()?.toLowerCase() ?? ''
  const type = getPreviewType(
    ext === 'pdf' ? 'application/pdf'
    : ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext) ? `image/${ext}`
    : 'application/octet-stream',
  )

  return (
    <>
      <button
        onClick={handleOpen}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] font-sora text-[12px] text-lttm bg-ltbg border border-ltb hover:bg-ltcard2 hover:text-ltt transition-colors disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        Vista previa
      </button>

      {open && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-4xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-5 py-3 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
              <p className="font-sora text-[13px] font-medium text-ltt truncate">{title}</p>
              <div className="flex items-center gap-2 shrink-0">
                {previewUrl && (
                  <a href={previewUrl} download className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltbg font-sora text-[12px] text-lttm hover:bg-ltcard2 transition-colors">
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </a>
                )}
                <button onClick={() => setOpen(false)} className="text-lttm hover:text-ltt transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              {!previewUrl ? (
                <div className="flex items-center justify-center h-64">
                  <p className="font-sora text-[13px] text-lttm">No se pudo generar la previsualización.</p>
                </div>
              ) : type === 'pdf' ? (
                <iframe src={previewUrl} className="w-full h-full min-h-[560px]" title={title} />
              ) : type === 'image' ? (
                <div className="flex items-center justify-center p-6 bg-ltbg h-full min-h-[400px]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt={title} className="max-w-full max-h-[560px] rounded-lg object-contain shadow-lg" />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 gap-4">
                  <FileText className="w-12 h-12 text-lttm opacity-40" />
                  <a href={previewUrl} download className="inline-flex items-center gap-2 px-4 py-2 rounded-[9px] bg-gradient-to-r from-brand-cyan to-brand-blue text-white font-sora text-[13px] font-medium">
                    <Download className="w-4 h-4" />
                    Descargar archivo
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Version history ──────────────────────────────────────────────────────────

const CHANGE_COLORS: Record<string, string> = {
  edit: 'bg-ltbg text-lttm border-ltb',
  review_requested: 'bg-ordim text-or border-orb',
  approved: 'bg-grdim text-gr border-grb',
  rejected: 'bg-red-dim text-re border-reb',
  reopened: 'bg-ltbg text-lttm border-ltb',
  created: 'bg-cyan-dim text-brand-cyan border-cyan-border',
}

export function VersionHistory({ versions }: { versions: EvidenceVersionWithDiff[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  if (versions.length === 0) {
    return (
      <p className="font-sora text-[12.5px] text-lttm py-4">
        Sin cambios registrados todavía. Los cambios se registran desde el próximo guardado.
      </p>
    )
  }

  return (
    <ol className="relative border-l border-ltb ml-3 space-y-0">
      {versions.map((v) => {
        const badgeClass = CHANGE_COLORS[v.change_type] ?? 'bg-ltbg text-lttm border-ltb'
        const isExpanded = expandedId === v.id

        return (
          <li key={v.id} className="ml-5 pb-5">
            <span className="absolute -left-[5px] flex h-2.5 w-2.5 items-center justify-center rounded-full bg-ltcard border-2 border-ltb" />
            <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
              <div className="flex items-center justify-between gap-2">
                <span className={`font-plex text-[10px] uppercase tracking-[0.6px] px-2 py-0.5 rounded-full border ${badgeClass}`}>
                  {getChangeTypeLabel(v.change_type)}
                </span>
                <span className="font-plex text-[10px] text-lttm">
                  {new Date(v.changed_at).toLocaleDateString('es-ES', {
                    day: 'numeric', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>
              {v.changed_by_name && (
                <p className="font-sora text-[11px] text-lttm mt-1.5">
                  por <span className="text-ltt font-medium">{v.changed_by_name}</span>
                </p>
              )}
              {v.diffs.length > 0 && (
                <div className="mt-2.5">
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : v.id)}
                    className="inline-flex items-center gap-1 font-sora text-[11px] text-lttm hover:text-ltt transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {v.diffs.length} campo{v.diffs.length !== 1 ? 's' : ''} modificado{v.diffs.length !== 1 ? 's' : ''}
                  </button>
                  {isExpanded && (
                    <div className="mt-2 space-y-2">
                      {v.diffs.map((diff) => (
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
        )
      })}
    </ol>
  )
}
