'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Loader2, Send } from 'lucide-react'

import { DOCUMENT_NOTIFICATION, type TemplateKey } from '@/lib/documents/templates'
import { addDocumentNotification, type DocumentNotificationRow } from './actions'

const inputCls =
  'w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan'

/**
 * Notificación del documento aprobado (B17b): la FRIA a la autoridad de
 * vigilancia del mercado (Art. 27.3) y la ficha para el registro UE en la base
 * de datos de la UE (Art. 49). Fluxion no envía nada; deja constancia.
 */
export function NotificationPanel({ templateKey, documentId, aiSystemId, status, notifications }: {
  templateKey: string
  documentId: string
  aiSystemId: string
  status: string
  notifications: DocumentNotificationRow[]
}) {
  const meta = DOCUMENT_NOTIFICATION[templateKey as TemplateKey]
  const router = useRouter()
  const [abierto, setAbierto] = useState(false)
  const [authority, setAuthority] = useState(meta?.authorityDefault ?? '')
  const [notifiedAt, setNotifiedAt] = useState(new Date().toISOString().slice(0, 10))
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (!meta) return null
  const aprobado = status === 'approved'

  function guardar() {
    setError(null)
    start(async () => {
      const res = await addDocumentNotification({
        documentId, aiSystemId, templateKey, authority, notifiedAt, reference, notes,
      })
      if ('error' in res) { setError(res.error); return }
      setAbierto(false); setReference(''); setNotes('')
      router.refresh()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">{meta.legalRef}</p>
          <p className="font-sora text-[13.5px] text-ltt font-semibold">{meta.title}</p>
        </div>
        {aprobado && !abierto && (
          <button
            type="button"
            onClick={() => setAbierto(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-cyan-border bg-cyan-dim font-sora text-[12px] text-brand-cyan"
          >
            <Send size={13} /> Registrar notificación
          </button>
        )}
      </div>

      {aprobado && notifications.length === 0 && (
        <p className="flex items-start gap-1.5 font-sora text-[12.5px] text-or">
          <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {meta.pendingWarning}
        </p>
      )}
      {!aprobado && notifications.length === 0 && (
        <p className="font-sora text-[12.5px] text-lttm">Se registra cuando el documento esté aprobado.</p>
      )}

      {notifications.length > 0 && (
        <ul className="flex flex-col gap-2">
          {notifications.map((n) => (
            <li key={n.id} className="font-sora text-[12.5px] text-ltt2">
              <span className="text-ltt font-medium">{new Date(n.notifiedAt).toLocaleDateString('es-ES')}</span>
              {' · '}{n.authority}
              {n.reference && <> · referencia <span className="font-plex">{n.reference}</span></>}
              {n.createdByName && <span className="text-lttm"> · registrada por {n.createdByName}</span>}
              {n.notes && <span className="block text-lttm">{n.notes}</span>}
            </li>
          ))}
        </ul>
      )}

      {abierto && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 border-t border-ltb pt-3">
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="font-sora text-[12px] text-ltt2">{meta.authorityLabel}</span>
            <input id="notif-authority" className={inputCls} value={authority} onChange={(e) => setAuthority(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-sora text-[12px] text-ltt2">Fecha</span>
            <input id="notif-date" type="date" className={inputCls} value={notifiedAt}
              max={new Date().toISOString().slice(0, 10)} onChange={(e) => setNotifiedAt(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="font-sora text-[12px] text-ltt2">Referencia o acuse</span>
            <input id="notif-ref" className={inputCls} value={reference} onChange={(e) => setReference(e.target.value)} />
          </label>
          <label className="flex flex-col gap-1 md:col-span-2">
            <span className="font-sora text-[12px] text-ltt2">Notas</span>
            <input id="notif-notes" className={inputCls} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </label>
          {error && <p className="md:col-span-3 font-sora text-[12px] text-re">{error}</p>}
          <div className="md:col-span-3 flex justify-end gap-3">
            <button type="button" onClick={() => setAbierto(false)} className="font-sora text-[12.5px] text-lttm">Cancelar</button>
            <button
              type="button"
              onClick={guardar}
              disabled={pending || !authority.trim() || !notifiedAt}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[7px] bg-brand-cyan text-white font-sora text-[12.5px] disabled:opacity-50"
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Registrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
