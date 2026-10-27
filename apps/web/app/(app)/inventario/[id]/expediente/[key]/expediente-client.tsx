'use client'


import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, FileText, AlertTriangle, CheckCircle2, Circle, Loader2,
  Pencil, Database, History, ShieldAlert, Info, FileDown, Download, Hash, Stamp,
} from 'lucide-react'

import type { ComposedDocument, ComposedSection } from '@/lib/documents/compose'
import {
  saveDocumentSection, changeDocumentStatus, reopenDocument, generateDocumentRender,
  type RenderRow, type GeneratedDocRow, type DocumentNotificationRow,
} from './actions'
import type { DocumentAction } from '@/lib/documents/lifecycle-rules'
import type { TemplateOption } from '@/lib/documents/templates'
import { ExpedienteTabs } from './expediente-tabs'
import { NotificationPanel } from './notification-panel'
import { ANNUAL_REVIEW_TEMPLATES, documentReviewDueOn } from '@/lib/evaluation-status/reevaluation'

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

function Section({ section, documentId, aiSystemId, templateKey, readOnly }: {
  section: ComposedSection
  documentId: string
  aiSystemId: string
  templateKey: string
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
      const res = await saveDocumentSection({ documentId, ref: section.ref, text, aiSystemId, templateKey })
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

function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`
  if (b < 1048576) return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}

const FRAMEWORK_LABEL: Record<string, string> = {
  ai_act: 'AI Act', gdpr: 'RGPD', iso42001: 'ISO 42001',
}

export function ExpedienteClient({ doc, renders, templates, templateKey, aiSystemId, generados, inApprovalCircuit, notifications }: {
  doc: ComposedDocument
  renders: RenderRow[]
  generados: GeneratedDocRow[]
  templates: TemplateOption[]
  templateKey: string
  aiSystemId: string
  /** Tiene una solicitud pendiente en Aprobaciones (B11f: la única vía). */
  inApprovalCircuit: boolean
  /** Notificaciones del documento aprobado (FRIA, ficha para el registro UE; B17b). */
  notifications: DocumentNotificationRow[]
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()
  const [rendering, startRender] = useTransition()

  function generate() {
    setError(null)
    startRender(async () => {
      const res = await generateDocumentRender({ documentId: doc.document.id, aiSystemId, templateKey })
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  const actual = templates.find((t) => t.key === templateKey)
  // Solo se edita en borrador (B09).
  const readOnly = doc.document.status !== 'draft'
  const status = doc.document.status
  const pct = Math.round(doc.completeness * 100)
  const barColor = pct === 100 ? 'bg-gr' : pct >= 60 ? 'bg-or' : 'bg-re'

  function changeStatus(action: DocumentAction) {
    setError(null)
    start(async () => {
      const res = await changeDocumentStatus({ documentId: doc.document.id, action, aiSystemId, templateKey })
      if ('error' in res) setError(res.error)
      else router.refresh()
    })
  }

  function reopen() {
    if (!window.confirm(
      `Se abrirá la versión ${doc.document.version + 1} en borrador con el mismo contenido. `
      + `La versión ${doc.document.version} aprobada queda como sustituida y sus PDF se conservan. ¿Continuar?`,
    )) return
    setError(null)
    start(async () => {
      const res = await reopenDocument({ documentId: doc.document.id, aiSystemId, templateKey })
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
          <FileText size={12} /> {FRAMEWORK_LABEL[actual?.framework ?? ''] ?? 'Cumplimiento'} · Expediente regulatorio
        </p>
        <h1 className="font-fraunces text-[26px] text-ltt mt-1">{actual?.title ?? doc.document.title}</h1>
        {actual?.description && (
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">{actual.description}</p>
        )}
        <p className="font-sora text-[12.5px] text-lttm mt-2 max-w-2xl">
          Está organizado por los epígrafes de la norma, no por las pantallas de
          Fluxion, para que lo que falte se pueda citar por su número.
        </p>
      </div>

      <ExpedienteTabs templates={templates} templateKey={templateKey} aiSystemId={aiSystemId} />

      {actual && actual.mode !== 'redactar' && (
        <div className="flex items-start gap-2 rounded-[10px] border border-orb bg-ordim px-4 py-3 font-sora text-[12.5px] text-ltt2">
          <Info size={14} className="text-or shrink-0 mt-0.5" />
          <span>
            Según su clasificación y su rol en la cadena de valor, este documento
            {actual.mode === 'proveedor' ? ' ya no se redacta para este sistema: lo aporta el proveedor' : ' ya no aplica a este sistema'}.
            {' '}{actual.reason} Se conserva lo redactado.
          </span>
        </div>
      )}

      {/* Estado y cobertura */}
      <div className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Estado</span>
            <span className="font-sora text-[13px] text-ltt font-semibold">
              {STATUS_LABEL[doc.document.status]}
            </span>
            <span className="font-plex text-[10.5px] text-lttm">
              · versión {doc.document.version} · plantilla v{doc.document.template_version}
              {status === 'approved' && doc.document.approved_at
                ? ` · aprobado el ${new Date(doc.document.approved_at).toLocaleDateString('es-ES')}`
                : ''}
            </span>
            {/* Revisión anual de la FRIA y la AISIA (B21b). */}
            {status === 'approved' && doc.document.approved_at && (ANNUAL_REVIEW_TEMPLATES as readonly string[]).includes(templateKey) && (() => {
              const revision = documentReviewDueOn(doc.document.approved_at)
              const vencida = revision < new Date().toISOString().slice(0, 10)
              return (
                <span className={`font-plex text-[10.5px] ${vencida ? 'text-re' : 'text-lttm'}`}>
                  · {vencida ? 'revisión anual vencida desde el' : 'revisión anual antes del'} {new Date(revision).toLocaleDateString('es-ES')}
                </span>
              )
            })()}
          </div>

          <div className="flex gap-2 flex-wrap">
            {status === 'draft' && (
              <button
                onClick={() => changeStatus('submit')} disabled={pending}
                className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm disabled:opacity-50 flex items-center gap-1.5"
              >
                {pending && <Loader2 size={12} className="animate-spin" />} Enviar a revisión
              </button>
            )}
            {status === 'in_review' && (
              <>
                <button
                  onClick={() => changeStatus('return')} disabled={pending}
                  className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm disabled:opacity-50"
                >
                  Volver a borrador
                </button>
                <span className="font-sora text-[12px] text-lttm self-center max-w-[320px]">
                  {inApprovalCircuit ? (
                    <>La aprobación se decide en <a href="/aprobaciones" className="text-brand-cyan hover:underline">Aprobaciones</a>, con la política de la organización.</>
                  ) : (
                    'Sin solicitud de aprobación abierta: vuelve a borrador y envíalo de nuevo.'
                  )}
                </span>
              </>
            )}
            {status === 'approved' && (
              <button
                onClick={reopen} disabled={pending}
                className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm disabled:opacity-50"
              >
                Reabrir (versión nueva)
              </button>
            )}
          </div>
        </div>

        {status === 'in_review' && (
          <p className="font-sora text-[12px] text-lttm flex items-center gap-1.5">
            <Info size={12} className="shrink-0" />
            En revisión no se edita. Para cambiar algo, vuelve a borrador.
          </p>
        )}

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

      <NotificationPanel
        templateKey={templateKey}
        documentId={doc.document.id}
        aiSystemId={aiSystemId}
        status={doc.document.status}
        notifications={notifications}
      />

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

      {/* Entregables */}
      <div className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
              <FileDown size={12} /> Entregables
            </p>
            <p className="font-sora text-[12px] text-lttm mt-1 max-w-lg">
              Cada generación produce un PDF inmutable con su huella. Se registra
              como evidencia con caducidad, y no se puede borrar durante los diez
              años que exige el artículo 18.
            </p>
          </div>
          <button
            onClick={generate} disabled={rendering}
            className="px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-1.5 shrink-0"
          >
            {rendering ? <Loader2 size={13} className="animate-spin" /> : <FileDown size={13} />}
            Generar PDF
          </button>
        </div>

        {renders.length === 0 ? (
          <p className="font-sora text-[12.5px] text-lttm italic">
            Todavía no se ha generado ningún entregable.
          </p>
        ) : (
          <div className="flex flex-col gap-2">
            {renders.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 border border-ltb rounded-[8px] px-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-sora text-[12.5px] text-ltt">
                      {new Date(r.rendered_at).toLocaleString('es-ES')}
                    </span>
                    <span className="font-plex text-[10.5px] text-lttm">
                      v{r.document_version} · {STATUS_LABEL[r.document_status] ?? r.document_status}
                    </span>
                    <span className="font-plex text-[10.5px] text-lttm">{formatBytes(r.byte_size)}</span>
                    {r.gaps.length > 0 ? (
                      <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-or">
                        incompleto · {r.gaps.length} apartados
                      </span>
                    ) : (
                      <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-gr">
                        completo
                      </span>
                    )}
                  </div>
                  <div className="font-plex text-[10px] text-lttm flex items-center gap-1 mt-0.5 truncate">
                    <Hash size={9} className="shrink-0" />
                    {r.checksum_sha256.slice(0, 32)}…
                    {r.rendered_by_name && <span className="ml-1">· {r.rendered_by_name}</span>}
                  </div>
                </div>
                <a
                  href={`/api/documents/v1/renders/${r.id}/download`}
                  className="shrink-0 px-2.5 py-1.5 rounded-[7px] border border-ltb font-sora text-[12px] text-lttm hover:text-brand-cyan hover:border-cyan-border flex items-center gap-1.5"
                >
                  <Download size={12} /> Descargar
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      <DocumentosGenerados docs={generados} />

      <div className="flex flex-col gap-3">
        {doc.sections.map((s) => (
          <Section
            key={s.ref}
            section={s}
            documentId={doc.document.id}
            aiSystemId={aiSystemId}
            templateKey={templateKey}
            readOnly={readOnly}
          />
        ))}
      </div>
    </div>
  )
}

// ── Registros generados por la plataforma ───────────────────────────────────

function tamano(bytes: number | null) {
  if (!bytes) return null
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function DocumentosGenerados({ docs }: { docs: GeneratedDocRow[] }) {
  if (!docs.length) return null

  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-5">
      <div className="mb-3">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
          <Stamp size={12} /> Registros generados
        </p>
        <p className="font-sora text-[12px] text-lttm mt-1 max-w-2xl">
          Documentos que produce la plataforma a partir de lo que ya ocurrió: no se
          redactan ni se editan. Un acta de aprobación sale de los votos registrados,
          así que no puede decir algo distinto de lo que pasó.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {docs.map((d) => (
          <div
            key={d.id}
            className="flex items-center justify-between gap-4 rounded-[9px] border border-ltb bg-ltcard2 px-4 py-2.5"
          >
            <div className="min-w-0">
              <p className="font-sora text-[12.5px] text-ltt">{d.title}</p>
              <p className="font-sora text-[11.5px] text-lttm mt-0.5">
                {d.templateName}
                {' · '}
                {new Date(d.createdAt).toLocaleString('es-ES', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
                {tamano(d.byteSize) ? ` · ${tamano(d.byteSize)}` : ''}
              </p>
            </div>

            {d.renderId ? (
              <a
                href={`/api/documents/v1/renders/${d.renderId}/download`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12px] text-lttm hover:text-ltt shrink-0"
              >
                <FileDown size={13} /> Descargar
              </a>
            ) : (
              // El documento existe pero su PDF no llegó a generarse. Se dice, en
              // lugar de enseñar un botón que no lleva a ninguna parte.
              <span className="font-sora text-[11.5px] text-or shrink-0">Sin PDF generado</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
