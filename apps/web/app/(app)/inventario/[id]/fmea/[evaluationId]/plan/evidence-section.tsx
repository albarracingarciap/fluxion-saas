'use client'

import { useState, useTransition } from 'react'
import { ExternalLink, FileUp, Link2, Link2Off, Loader2 } from 'lucide-react'
import { type EditableTreatmentAction } from '@/lib/fmea/treatment-plan-utils'
import {
  getEvidenceSignedUrlAction,
  linkUrlEvidenceToActionAction,
  unlinkEvidenceFromActionAction,
  uploadEvidenceForActionAction,
} from './actions'

const EVIDENCE_VERIFICATION_META: Record<string, { label: string; pill: string }> = {
  pending:   { label: 'Pendiente de validar', pill: 'bg-ordim border-orb text-or' },
  validated: { label: 'Validada',             pill: 'bg-grdim border-grb text-gr' },
  rejected:  { label: 'Rechazada',            pill: 'bg-red-dim border-reb text-re' },
}

type Props = {
  action: EditableTreatmentAction
  aiSystemId: string
  evaluationId: string
  readOnly: boolean
}

export function EvidenceSection({ action, aiSystemId, evaluationId, readOnly }: Props) {
  const [tab, setTab] = useState<'upload' | 'url'>('upload')
  const [fileTitle, setFileTitle] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [urlTitle, setUrlTitle] = useState('')
  const [urlValue, setUrlValue] = useState('')
  const [evidenceError, setEvidenceError] = useState<string | null>(null)
  const [isUploading, startUploading] = useTransition()
  const [isLinkingUrl, startLinkingUrl] = useTransition()
  const [isUnlinking, startUnlinking] = useTransition()
  const [isOpeningFile, setIsOpeningFile] = useState(false)

  const hasEvidence = !!action.evidence_id

  function handleOpenFile() {
    if (!action.evidence_storage_path) {
      const url = action.evidence_external_url || action.evidence_url
      if (url) window.open(url, '_blank', 'noopener')
      return
    }
    setIsOpeningFile(true)
    getEvidenceSignedUrlAction(action.evidence_storage_path).then((res) => {
      setIsOpeningFile(false)
      if ('url' in res) window.open(res.url, '_blank', 'noopener')
      else setEvidenceError(res.error)
    })
  }

  function handleUnlink() {
    setEvidenceError(null)
    startUnlinking(async () => {
      const res = await unlinkEvidenceFromActionAction({ actionId: action.id, aiSystemId, evaluationId })
      if ('error' in res) setEvidenceError(res.error)
    })
  }

  function handleUpload() {
    if (!selectedFile) { setEvidenceError('Selecciona un archivo.'); return }
    if (!fileTitle.trim()) { setEvidenceError('El título es obligatorio.'); return }
    setEvidenceError(null)
    const fd = new FormData()
    fd.set('file', selectedFile)
    fd.set('title', fileTitle.trim())
    fd.set('actionId', action.id)
    fd.set('aiSystemId', aiSystemId)
    fd.set('evaluationId', evaluationId)
    startUploading(async () => {
      const res = await uploadEvidenceForActionAction(fd)
      if ('error' in res) setEvidenceError(res.error)
      else { setSelectedFile(null); setFileTitle('') }
    })
  }

  function handleLinkUrl() {
    if (!urlTitle.trim() || !urlValue.trim()) {
      setEvidenceError('Título y URL son obligatorios.')
      return
    }
    setEvidenceError(null)
    startLinkingUrl(async () => {
      const res = await linkUrlEvidenceToActionAction({
        actionId: action.id,
        aiSystemId,
        evaluationId,
        title: urlTitle.trim(),
        externalUrl: urlValue.trim(),
      })
      if ('error' in res) setEvidenceError(res.error)
      else { setUrlTitle(''); setUrlValue('') }
    })
  }

  return (
    <div className="rounded-[10px] border border-ltb bg-ltcard overflow-hidden">
      <div className="px-4 py-3 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <FileUp className="w-4 h-4 text-lttm" />
          <span className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">Evidencia</span>
        </div>
        {action.evidence_description && (
          <span className="font-sora text-[11px] text-lttm truncate max-w-[260px]">
            {action.evidence_description}
          </span>
        )}
      </div>

      {hasEvidence ? (
        <div className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-sora text-[13.5px] font-semibold text-ltt leading-snug truncate">
                {action.evidence_title ?? 'Evidencia vinculada'}
              </div>
              {action.evidence_verification_status && (
                <span
                  className={`inline-flex items-center mt-1.5 px-2.5 py-0.5 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] ${
                    EVIDENCE_VERIFICATION_META[action.evidence_verification_status]?.pill ?? 'bg-ltbg border-ltb text-lttm'
                  }`}
                >
                  {EVIDENCE_VERIFICATION_META[action.evidence_verification_status]?.label ?? action.evidence_verification_status}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleOpenFile}
                disabled={isOpeningFile}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-cyan-border bg-cyan-dim text-brand-cyan font-sora text-[12px] font-medium hover:bg-white transition-colors disabled:opacity-60"
              >
                {isOpeningFile ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ExternalLink className="w-3.5 h-3.5" />}
                Ver
              </button>
              {!readOnly && (
                <button
                  type="button"
                  onClick={handleUnlink}
                  disabled={isUnlinking}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-lttm font-sora text-[12px] hover:border-reb hover:text-re transition-colors disabled:opacity-60"
                >
                  {isUnlinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2Off className="w-3.5 h-3.5" />}
                  Desvincular
                </button>
              )}
            </div>
          </div>
          {evidenceError && (
            <p className="font-sora text-[12px] text-re">{evidenceError}</p>
          )}
        </div>
      ) : (
        !readOnly && (
          <div className="p-4 space-y-3">
            <div className="flex gap-2">
              {(['upload', 'url'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => { setTab(t); setEvidenceError(null) }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border font-plex text-[10px] uppercase tracking-[1px] transition-colors ${
                    tab === t
                      ? 'border-cyan-border bg-cyan-dim text-brand-cyan'
                      : 'border-ltb bg-ltbg text-lttm hover:border-cyan-border'
                  }`}
                >
                  {t === 'upload' ? <FileUp className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                  {t === 'upload' ? 'Subir archivo' : 'URL externa'}
                </button>
              ))}
            </div>

            {tab === 'upload' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={fileTitle}
                  onChange={(e) => setFileTitle(e.target.value)}
                  placeholder="Título de la evidencia"
                  className="w-full rounded-[7px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[12.5px] text-ltt outline-none focus:border-cyan-border"
                />
                <div className="flex items-center gap-2">
                  <label className="flex-1 flex items-center gap-2 rounded-[7px] border border-ltb bg-ltbg px-3 py-2 cursor-pointer hover:border-cyan-border transition-colors">
                    <FileUp className="w-4 h-4 text-lttm shrink-0" />
                    <span className="font-sora text-[12.5px] text-ltt truncate">
                      {selectedFile ? selectedFile.name : 'Seleccionar archivo (máx. 20 MB)'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleUpload}
                    disabled={isUploading || !selectedFile || !fileTitle.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[7px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12px] font-medium transition-all hover:-translate-y-[1px] disabled:opacity-50"
                  >
                    {isUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
                    Subir
                  </button>
                </div>
              </div>
            )}

            {tab === 'url' && (
              <div className="space-y-2">
                <input
                  type="text"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  placeholder="Título de la evidencia"
                  className="w-full rounded-[7px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[12.5px] text-ltt outline-none focus:border-cyan-border"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="url"
                    value={urlValue}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://drive.google.com/..."
                    className="flex-1 rounded-[7px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[12.5px] text-ltt outline-none focus:border-cyan-border"
                  />
                  <button
                    type="button"
                    onClick={handleLinkUrl}
                    disabled={isLinkingUrl || !urlTitle.trim() || !urlValue.trim()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-[7px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12px] font-medium transition-all hover:-translate-y-[1px] disabled:opacity-50"
                  >
                    {isLinkingUrl ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Link2 className="w-3.5 h-3.5" />}
                    Vincular
                  </button>
                </div>
              </div>
            )}

            {evidenceError && (
              <p className="font-sora text-[12px] text-re">{evidenceError}</p>
            )}
          </div>
        )
      )}
    </div>
  )
}
