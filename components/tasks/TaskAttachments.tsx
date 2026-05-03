'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import {
  Paperclip, Upload, Loader2, Trash2, Download, FileText,
  Image as ImageIcon, FileSpreadsheet, FileCode, File, AlertCircle,
} from 'lucide-react'
import {
  getAttachmentsAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  type AttachmentRow,
} from '@/app/(app)/tareas/actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return ''
  if (bytes < 1024)         return `${bytes} B`
  if (bytes < 1024 * 1024)  return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function MimeIcon({ mime }: { mime: string | null }) {
  const cls = 'shrink-0'
  if (!mime) return <File size={18} className={`${cls} text-lttm`} />
  if (mime === 'application/pdf')           return <FileText size={18} className={`${cls} text-re`} />
  if (mime.startsWith('image/'))            return <ImageIcon size={18} className={`${cls} text-brand-cyan`} />
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime.includes('csv'))
    return <FileSpreadsheet size={18} className={`${cls} text-gr`} />
  if (mime.includes('word') || mime.includes('document'))
    return <FileText size={18} className={`${cls} text-brand-blue`} />
  if (mime.startsWith('text/'))             return <FileCode size={18} className={`${cls} text-or`} />
  return <File size={18} className={`${cls} text-lttm`} />
}

const ALLOWED_ACCEPT = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain', 'text/csv',
].join(',')

// ── Attachment row ────────────────────────────────────────────────────────────

function AttachmentItem({
  attachment,
  canDelete,
  onDeleted,
}: {
  attachment: AttachmentRow
  canDelete:  boolean
  onDeleted:  (id: string) => void
}) {
  const [confirmDel, setConfirmDel] = useState(false)
  const [loading,    setLoading]    = useState(false)

  async function handleDelete() {
    setLoading(true)
    const res = await deleteAttachmentAction(attachment.id)
    setLoading(false)
    if ('ok' in res) onDeleted(attachment.id)
    else setConfirmDel(false)
  }

  return (
    <div className="flex items-center gap-3 p-3 bg-ltbg border border-ltb rounded-[9px] group">
      <MimeIcon mime={attachment.mime_type} />

      <div className="flex-1 min-w-0">
        <p className="font-sora text-[12.5px] text-ltt font-medium truncate">{attachment.file_name}</p>
        <p className="font-sora text-[11px] text-lttm">
          {formatBytes(attachment.file_size)}
          {attachment.uploader_name ? ` · ${attachment.uploader_name}` : ''}
          {` · ${formatDate(attachment.created_at)}`}
        </p>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {attachment.signed_url && (
          <a
            href={attachment.signed_url}
            target="_blank"
            rel="noopener noreferrer"
            download={attachment.file_name}
            className="p-1.5 text-lttm hover:text-brand-cyan hover:bg-cyan-dim rounded-[6px] transition-colors"
            title="Descargar"
          >
            <Download size={14} />
          </a>
        )}
        {canDelete && (
          confirmDel ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleDelete}
                disabled={loading}
                className="px-2 py-1 bg-re text-white rounded-[6px] font-sora text-[11px] disabled:opacity-60"
              >
                {loading ? <Loader2 size={10} className="animate-spin" /> : 'Eliminar'}
              </button>
              <button
                onClick={() => setConfirmDel(false)}
                className="px-2 py-1 border border-ltb rounded-[6px] font-sora text-[11px] text-lttm hover:bg-ltbg"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDel(true)}
              className="p-1.5 text-lttm hover:text-re hover:bg-redim rounded-[6px] transition-colors opacity-0 group-hover:opacity-100"
              title="Eliminar adjunto"
            >
              <Trash2 size={13} />
            </button>
          )
        )}
      </div>
    </div>
  )
}

// ── Dropzone ──────────────────────────────────────────────────────────────────

function DropZone({
  taskId,
  onUploaded,
}: {
  taskId:     string
  onUploaded: () => void
}) {
  const [dragging,  setDragging]  = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function upload(file: File) {
    setUploading(true)
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadAttachmentAction(taskId, fd)
    setUploading(false)
    if ('error' in res) setError(res.error)
    else onUploaded()
  }

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    void upload(files[0]!)
  }

  return (
    <div>
      <div
        onDragEnter={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          setDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
        onClick={() => inputRef.current?.click()}
        className={`border-2 border-dashed rounded-[10px] p-5 text-center cursor-pointer transition-all ${
          dragging
            ? 'border-brand-cyan bg-cyan-dim'
            : 'border-ltb hover:border-brand-cyan/50 hover:bg-ltbg'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED_ACCEPT}
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={20} className="text-brand-cyan animate-spin" />
            <p className="font-sora text-[12px] text-lttm">Subiendo…</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={20} className="text-lttm" />
            <p className="font-sora text-[12px] text-lttm">
              Arrastra un archivo aquí o <span className="text-brand-cyan">selecciona uno</span>
            </p>
            <p className="font-sora text-[10.5px] text-lttm">
              PDF, imágenes, Office, CSV · Máx 25 MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <p className="mt-2 font-sora text-[12px] text-re flex items-center gap-1.5">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function TaskAttachments({
  taskId,
  currentProfileId,
}: {
  taskId:           string
  currentProfileId: string
}) {
  const [attachments, setAttachments] = useState<AttachmentRow[]>([])
  const [loading,     setLoading]     = useState(true)

  const load = useCallback(async () => {
    const data = await getAttachmentsAction(taskId)
    setAttachments(data)
    setLoading(false)
  }, [taskId])

  useEffect(() => { void load() }, [load])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-20">
        <Loader2 size={16} className="text-brand-cyan animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <DropZone taskId={taskId} onUploaded={load} />

      {attachments.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
            {attachments.length} adjunto{attachments.length !== 1 ? 's' : ''}
          </p>
          {attachments.map((a) => (
            <AttachmentItem
              key={a.id}
              attachment={a}
              canDelete={a.uploader_id === currentProfileId}
              onDeleted={(id) => setAttachments((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}
    </div>
  )
}
