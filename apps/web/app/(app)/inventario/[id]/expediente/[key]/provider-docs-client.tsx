'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { AlertCircle, ArrowLeft, FileText, Info, Loader2, Paperclip, Link2, ExternalLink } from 'lucide-react'

import { PROVIDER_DOC_TYPES } from '@/lib/documents/applicability'
import type { TemplateOption } from '@/lib/documents/templates'
import { uploadEvidenceFile } from '@/lib/evidences/storage'
import { addProviderDocument, saveProviderRegistry, type ProviderDocRow, type ProviderRegistry } from './actions'
import { ExpedienteTabs } from './expediente-tabs'

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  pending_review: 'Pendiente de revisión',
  valid: 'Válida',
  expired: 'Caducada',
  rejected: 'Rechazada',
}

const inputCls =
  'w-full rounded-[8px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-brand-cyan'

/**
 * Documentación del proveedor (DP-11): la organización no es proveedora de este
 * sistema de alto riesgo, así que el documento no se redacta. Se adjuntan como
 * evidencias del sistema las instrucciones de uso, la declaración UE de
 * conformidad, el número de registro u otra documentación que entrega el
 * proveedor. Cada una sigue la revisión habitual de las evidencias.
 *
 * Desde 2026-10-28: cada documento admite fichero y URL a la vez; en el
 * registro UE se indican además el número y la URL del registro del
 * proveedor; y en el Anexo IV y el registro UE se puede adjuntar aunque el
 * documento no aplique (`optional`), si la organización no es la proveedora.
 */
export function ProviderDocsClient({
  systemName, organizationId, templates, templateKey, aiSystemId, reason, documents, hasDraftedDocument,
  optional = false, registry = null,
}: {
  systemName: string
  organizationId: string
  templates: TemplateOption[]
  templateKey: string
  aiSystemId: string
  reason: string
  documents: ProviderDocRow[]
  /** El sistema ya tenía el documento redactado (antes de cambiar su clasificación o su rol). */
  hasDraftedDocument: boolean
  /** El documento no aplica: adjuntar la documentación del proveedor es opcional. */
  optional?: boolean
  /** Solo en el registro UE: número y URL del registro del proveedor. */
  registry?: ProviderRegistry | null
}) {
  const router = useRouter()
  const actual = templates.find((t) => t.key === templateKey)
  const [docType, setDocType] = useState<string>(PROVIDER_DOC_TYPES[0].value)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setError(null)
    start(async () => {
      const res = await addProviderDocument({
        aiSystemId, templateKey, docType, title,
        externalUrl: url || null,
        hasPendingFile: Boolean(file),
      })
      if ('error' in res) { setError(res.error); return }
      if (file) {
        const up = await uploadEvidenceFile(file, organizationId, res.id)
        if (up.error) {
          setError(`El documento se registró, pero el fichero no se pudo subir: ${up.error} Súbelo desde Evidencias.`)
          router.refresh()
          return
        }
      }
      setTitle(''); setUrl(''); setFile(null)
      router.refresh()
    })
  }

  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <Link
        href={`/inventario/${aiSystemId}`}
        className="font-sora text-[12.5px] text-lttm hover:text-ltt flex items-center gap-1.5 w-fit"
      >
        <ArrowLeft size={14} /> {systemName}
      </Link>

      <div>
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
          <FileText size={12} /> Expediente regulatorio · Documentación del proveedor
        </p>
        <h1 className="font-fraunces text-[26px] text-ltt mt-1">{actual?.title ?? 'Documentación del proveedor'}</h1>
      </div>

      <ExpedienteTabs templates={templates} templateKey={templateKey} aiSystemId={aiSystemId} />

      {optional ? (
        <div className="border border-ltb bg-ltcard rounded-[12px] p-5 flex items-start gap-3">
          <AlertCircle size={18} className="text-lttm shrink-0 mt-0.5" />
          <div>
            <p className="font-sora text-[14px] text-ltt font-semibold">Este documento no aplica a este sistema</p>
            <p className="font-sora text-[13px] text-ltt2 mt-1">{reason}</p>
            <p className="font-sora text-[12.5px] text-lttm mt-2">
              Como la organización no es la proveedora, puedes adjuntar igualmente la documentación que te entregue el
              proveedor. Es opcional.
            </p>
          </div>
        </div>
      ) : (
      <div className="flex items-start gap-2 rounded-[10px] border border-cyan-border bg-cyan-dim px-4 py-3 font-sora text-[12.5px] text-ltt2">
        <Info size={14} className="text-brand-cyan shrink-0 mt-0.5" />
        <span>
          {reason} Normalmente son las instrucciones de uso (AI Act, Art. 13), la declaración UE de conformidad
          (Art. 47) y el número de registro en la base de datos de la UE (Art. 49). Se guardan como evidencias del
          sistema y pasan por su revisión.
          {hasDraftedDocument && (
            <>
              {' '}El sistema ya tenía este documento redactado:{' '}
              <Link href={`/inventario/${aiSystemId}/expediente/${templateKey}?vista=documento`} className="text-brand-cyan hover:underline">
                verlo
              </Link>.
            </>
          )}
        </span>
      </div>
      )}

      {registry && <RegistroProveedor aiSystemId={aiSystemId} registry={registry} />}

      <div className="border border-ltb rounded-[12px] bg-ltcard">
        <div className="px-5 py-3 border-b border-ltb font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
          Documentos aportados · {documents.length}
        </div>
        {documents.length === 0 ? (
          <p className="px-5 py-4 font-sora text-[12.5px] text-lttm">Todavía no se ha adjuntado ningún documento del proveedor.</p>
        ) : (
          <ul className="divide-y divide-ltb">
            {documents.map((d) => (
              <li key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-sora text-[13px] text-ltt truncate">{d.title}</p>
                  <p className="font-sora text-[11.5px] text-lttm">
                    {PROVIDER_DOC_TYPES.find((t) => t.value === d.docType)?.label ?? 'Documento del proveedor'}
                    {' · '}{STATUS_LABEL[d.status] ?? d.status}
                    {!d.hasFile && !d.externalUrl && ' · sin fichero'}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {d.externalUrl && (
                    <a href={d.externalUrl} target="_blank" rel="noreferrer" className="font-sora text-[12px] text-brand-cyan flex items-center gap-1">
                      <ExternalLink size={12} /> Abrir
                    </a>
                  )}
                  <Link href={`/evidencias/${d.id}`} className="font-sora text-[12px] text-brand-cyan">
                    Ver evidencia →
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border border-ltb rounded-[12px] bg-ltcard p-5 flex flex-col gap-4">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Añadir documento del proveedor</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-sora text-[12px] text-ltt2">Tipo</span>
            <select className={inputCls} value={docType} onChange={(e) => setDocType(e.target.value)}>
              {PROVIDER_DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sora text-[12px] text-ltt2">Título</span>
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Instrucciones de uso v2.1 del proveedor" />
          </label>
        </div>
        <p className="font-sora text-[12px] text-lttm">Adjunta el fichero, indica la URL o las dos cosas.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-sora text-[12px] text-ltt2 flex items-center gap-1.5"><Paperclip size={12} /> Fichero</span>
            <input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="font-sora text-[12.5px] text-ltt2" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="font-sora text-[12px] text-ltt2 flex items-center gap-1.5"><Link2 size={12} /> URL</span>
            <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
          </label>
        </div>
        {error && <p className="font-sora text-[12px] text-re">{error}</p>}
        <div>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !title.trim() || (!file && !url.trim())}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[12.5px] disabled:opacity-50"
          >
            {pending && <Loader2 size={14} className="animate-spin" />}
            Añadir como evidencia
          </button>
        </div>
      </div>
    </div>
  )
}

/** Número y URL del registro del proveedor en la base de datos de la UE (Art. 49). */
function RegistroProveedor({ aiSystemId, registry }: { aiSystemId: string; registry: ProviderRegistry }) {
  const router = useRouter()
  const [numero, setNumero] = useState(registry.number)
  const [url, setUrl] = useState(registry.url)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [pending, start] = useTransition()
  const cambiado = numero !== registry.number || url !== registry.url

  function guardar() {
    setError(null)
    setOk(false)
    start(async () => {
      const res = await saveProviderRegistry({ aiSystemId, number: numero, url })
      if ('error' in res) { setError(res.error); return }
      setOk(true)
      router.refresh()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-5 flex flex-col gap-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Registro del proveedor en la base de datos de la UE</p>
      <p className="font-sora text-[12px] text-lttm">Indica el número de registro, la URL de la entrada o las dos cosas (AI Act, Art. 49).</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-sora text-[12px] text-ltt2">Número de registro UE</span>
          <input className={inputCls} value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="Número que asigna la base de datos de la UE" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-sora text-[12px] text-ltt2">URL de la entrada</span>
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
        </label>
      </div>
      {error && <p className="font-sora text-[12px] text-re">{error}</p>}
      {ok && !cambiado && <p className="font-sora text-[12px] text-gr">Registro del proveedor guardado.</p>}
      <div>
        <button
          type="button"
          onClick={guardar}
          disabled={pending || !cambiado}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[12.5px] disabled:opacity-50"
        >
          {pending && <Loader2 size={14} className="animate-spin" />}
          Guardar registro
        </button>
      </div>
    </div>
  )
}
