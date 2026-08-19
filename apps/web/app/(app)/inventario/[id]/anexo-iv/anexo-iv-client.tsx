'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, AlertTriangle, CheckCircle2, Circle, Loader2,
  Pencil, Database, History, ShieldAlert, Info,
} from 'lucide-react'

import type { ComposedDocument, ComposedSection } from '@/lib/documents/compose'
import { saveDocumentSection, setDocumentStatus } from './actions'

const SOURCE_META: Record<string, { label: string; icon: React.ReactNode }> = {
  'derived:system':  { label: 'Ficha del sistema',  icon: <Database size={11} /> },
  'derived:fmea':    { label: 'FMEA y tratamiento', icon: <ShieldAlert size={11} /> },
  'derived:history': { label: 'Historial',          icon: <History size={11} /> },
  manual:            { label: 'Redacción propia',   icon: <Pencil size={11} /> },
}

const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador', in_review: 'En revisión',
  approved: 'Aprobado', superseded: 'Sustituido',
}

// ── Una sección ───────────────────────────────────────────────────────────────

function Section({ section, documentId, aiSystemId, readOnly }: {
  section: ComposedSection
  documentId: string
  aiSystemId: string
  readOnly: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState(section.manual ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  if (section.kind === 'heading') {
    return (
      <div className="pt-6 pb-1 flex items-baseline gap-2.5">
        <span className="font-plex text-[12px] text-brand-cyan">{section.ref}</span>
        <h2 className="font-fraunces text-[17px] text-ltt">{section.title}</h2>
      </div>
    )
  }

  function save() {
    setError(null)
    start(async () => {
      const res = await saveDocumentSection({ documentId, ref: section.ref, text, aiSystemId })
      if ('error' in res) setError(res.error)
      else { setEditing(false); router.refresh() }
    })
  }

  const src = SOURCE_META[section.source]

  return (
    <div
      className={`border rounded-[10px] overflow-hidden ${
        section.missing ? 'border-orb bg-[var(--or-dim,#fff8ef)]' : 'border-ltb bg-ltcard'
      }`}
    >
      <div className="px-4 py-2.5 border-b border-ltb flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-plex text-[11px] text-lttm">{section.ref}</span>
            <span className="font-sora text-[13.5px] text-ltt font-semibold">{section.title}</span>
            {!section.required && (
              <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-ltb text-lttm">
                cuando proceda
              </span>
            )}
            {section.missing && (
              <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-or flex items-center gap-1">
                <AlertTriangle size={10} /> sin cubrir
              </span>
            )}
          </div>
          <p className="font-sora text-[11.5px] text-lttm mt-1 leading-snug">{section.guidance}</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {src && (
            <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-lttm flex items-center gap-1">
              {src.icon} {src.label}
            </span>
          )}
          {!readOnly && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="text-lttm hover:text-brand-cyan"
              title="Escribir o completar"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        {section.derived && (
          <div>
            <p className="font-plex text-[9.5px] uppercase tracking-[0.7px] text-lttm mb-1">
              Derivado automáticamente
            </p>
            <pre className="font-sora text-[12.5px] text-ltt whitespace-pre-wrap leading-relaxed m-0">
              {section.derived}
            </pre>
          </div>
        )}

        {editing ? (
          <div className="flex flex-col gap-2">
            <textarea
              value={text} onChange={(e) => setText(e.target.value)} rows={6} autoFocus
              placeholder={section.derived
                ? 'Añade lo que el dato derivado no cubre…'
                : 'Redacta este apartado…'}
              className="w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltbg font-sora text-[13px] text-ltt outline-none focus:border-brand-cyan resize-y"
            />
            {error && (
              <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
                <AlertTriangle size={12} /> {error}
              </p>
            )}
            <div className="flex gap-2">
              <button
                onClick={save} disabled={pending}
                className="px-3 py-1.5 rounded-[7px] bg-brand-cyan text-white font-sora text-[12.5px] disabled:opacity-50 flex items-center gap-1.5"
              >
                {pending && <Loader2 size={12} className="animate-spin" />} Guardar
              </button>
              <button
                onClick={() => { setEditing(false); setText(section.manual ?? ''); setError(null) }}
                className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : section.manual ? (
          <div>
            {section.derived && (
              <p className="font-plex text-[9.5px] uppercase tracking-[0.7px] text-lttm mb-1">
                Redactado
              </p>
            )}
            <p className="font-sora text-[13px] text-ltt whitespace-pre-wrap leading-relaxed">
              {section.manual}
            </p>
          </div>
        ) : !section.derived ? (
          <p className="font-sora text-[12.5px] text-lttm italic">
            Sin contenido. {section.required
              ? 'Es un apartado obligatorio del expediente.'
              : 'El Reglamento lo condiciona a que proceda; si no aplica a este sistema, déjalo así.'}
          </p>
        ) : null}
      </div>
    </div>
  )
}

// ── Pantalla ──────────────────────────────────────────────────────────────────

export function AnexoIvClient({ doc, aiSystemId }: {
  doc: ComposedDocument
  aiSystemId: string
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const readOnly = doc.document.status === 'approved'
  const pct = Math.round(doc.completeness * 100)
  const barColor = pct === 100 ? 'bg-gr' : pct >= 60 ? 'bg-or' : 'bg-re'

  function changeStatus(status: 'draft' | 'in_review' | 'approved') {
    setError(null)
    start(async () => {
      const res = await setDocumentStatus({ documentId: doc.document.id, status, aiSystemId })
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <Link
        href={`/inventario/${aiSystemId}`}
        className="font-sora text-[12.5px] text-lttm hover:text-ltt flex items-center gap-1.5 w-fit"
      >
        <ArrowLeft size={14} /> {doc.system?.name ?? 'Sistema'}
      </Link>

      <div>
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
          <FileText size={12} /> Reglamento (UE) 2024/1689 · Artículo 11.1
        </p>
        <h1 className="font-fraunces text-[26px] text-ltt mt-1">Documentación técnica · Anexo IV</h1>
        <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
          El expediente que hay que poder entregar a una autoridad o a un organismo
          notificado. Está organizado por los epígrafes del Anexo IV, no por las
          pantallas de Fluxion, para que lo que falte se pueda citar por su número.
        </p>
      </div>

      {/* Estado y cobertura */}
      <div className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Estado</span>
            <span className="font-sora text-[13px] text-ltt font-semibold">
              {STATUS_LABEL[doc.document.status]}
            </span>
            <span className="font-plex text-[10.5px] text-lttm">
              · plantilla v{doc.document.template_version}
            </span>
          </div>

          {!readOnly ? (
            <div className="flex gap-2">
              {doc.document.status !== 'in_review' && (
                <button
                  onClick={() => changeStatus('in_review')} disabled={pending}
                  className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm disabled:opacity-50"
                >
                  Pasar a revisión
                </button>
              )}
              <button
                onClick={() => changeStatus('approved')} disabled={pending || doc.gaps.length > 0}
                title={doc.gaps.length > 0 ? 'Quedan apartados obligatorios sin cubrir' : undefined}
                className="px-3 py-1.5 rounded-[7px] bg-brand-cyan text-white font-sora text-[12.5px] disabled:opacity-40 flex items-center gap-1.5"
              >
                {pending && <Loader2 size={12} className="animate-spin" />} Aprobar expediente
              </button>
            </div>
          ) : (
            <button
              onClick={() => changeStatus('draft')} disabled={pending}
              className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm disabled:opacity-50"
            >
              Reabrir para editar
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-ltb overflow-hidden">
            <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
          </div>
          <span className="font-plex text-[11px] text-lttm shrink-0">
            {pct}% de los apartados obligatorios
          </span>
        </div>

        {error && (
          <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
            <AlertTriangle size={12} /> {error}
          </p>
        )}

        {doc.staleSince && (
          <p className="font-sora text-[12px] text-or flex items-center gap-1.5">
            <Info size={12} className="shrink-0" />
            La ficha del sistema cambió el {new Date(doc.staleSince).toLocaleDateString('es-ES')},
            después de la última edición del expediente. Revisa los apartados derivados.
          </p>
        )}
      </div>

      {/* Lo que falta — el producto real de esta pantalla */}
      {doc.gaps.length > 0 ? (
        <div className="border border-reb bg-red-dim rounded-[12px] p-4">
          <p className="font-sora text-[13px] text-re font-semibold flex items-center gap-1.5">
            <AlertTriangle size={14} />
            Faltan {doc.gaps.length} apartados obligatorios
          </p>
          <ul className="mt-2 flex flex-col gap-1">
            {doc.gaps.map((g) => (
              <li key={g.ref} className="font-sora text-[12.5px] text-ltt flex items-start gap-2">
                <Circle size={7} className="mt-1.5 shrink-0 text-re" />
                <span><span className="font-plex text-[11.5px] text-lttm">{g.ref}</span> · {g.title}</span>
              </li>
            ))}
          </ul>
          <p className="font-sora text-[11.5px] text-lttm mt-3">
            Esto es exactamente lo que un auditor echaría en falta, con la referencia
            que él usaría para pedirlo.
          </p>
        </div>
      ) : (
        <div className="border border-grb bg-[var(--gr-dim,#eefaf1)] rounded-[12px] p-4">
          <p className="font-sora text-[13px] text-gr font-semibold flex items-center gap-1.5">
            <CheckCircle2 size={14} /> Todos los apartados obligatorios están cubiertos
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {doc.sections.map((s) => (
          <Section
            key={s.ref}
            section={s}
            documentId={doc.document.id}
            aiSystemId={aiSystemId}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  )
}
