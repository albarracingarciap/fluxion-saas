'use client';

import { useEffect, useState } from 'react';
import { Webhook, Plus, Copy, Check, Trash2, Loader2, AlertCircle, X, Zap, CheckCircle2 } from 'lucide-react';
import { getWebhooks, createWebhook, deleteWebhook, testWebhook, type WebhookRow } from '../actions';
import { FieldLabel, inputCls, formatRelative } from './shared';

// ── Available events ──────────────────────────────────────────────────────────

const WEBHOOK_EVENTS: Array<{ value: string; label: string; group: string }> = [
  { value: 'member.invited',       label: 'Miembro invitado',          group: 'Miembros' },
  { value: 'member.role_changed',  label: 'Rol cambiado',              group: 'Miembros' },
  { value: 'member.deactivated',   label: 'Miembro desactivado',       group: 'Miembros' },
  { value: 'member.removed',       label: 'Miembro eliminado',         group: 'Miembros' },
  { value: 'evaluation.completed', label: 'Evaluación completada',     group: 'Evaluaciones' },
  { value: 'evaluation.approved',  label: 'Evaluación aprobada',       group: 'Evaluaciones' },
  { value: 'gap.created',          label: 'GAP creado',                group: 'Cumplimiento' },
  { value: 'gap.closed',           label: 'GAP cerrado',               group: 'Cumplimiento' },
  { value: 'task.completed',       label: 'Tarea completada',          group: 'Tareas' },
  { value: 'system.created',       label: 'Sistema de IA creado',      group: 'Sistemas' },
]

const EVENT_GROUPS = Array.from(new Set(WEBHOOK_EVENTS.map((e) => e.group)))

// ── Secret modal ──────────────────────────────────────────────────────────────

function SecretReveal({ secret, onClose }: { secret: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-sora text-[14px] font-semibold text-ltt">Secreto del webhook</h3>
            <p className="font-sora text-[12px] text-re mt-0.5 flex items-center gap-1">
              <AlertCircle size={12} /> Solo se muestra una vez
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-lttm hover:text-ltt rounded-[6px] hover:bg-ltbg transition-colors">
            <X size={16} />
          </button>
        </div>
        <p className="font-sora text-[12px] text-lttm mb-3 leading-relaxed">
          Usa este secreto para verificar la firma <code className="font-plex text-[11px] bg-ltbg px-1 py-0.5 rounded">X-Fluxion-Signature</code> de cada payload recibido.
        </p>
        <div className="flex items-center gap-2 bg-ltbg border border-ltb rounded-[8px] p-3">
          <code className="flex-1 font-plex text-[11.5px] text-ltt break-all">{secret}</code>
          <button
            onClick={() => { navigator.clipboard.writeText(secret); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
            className="shrink-0 p-2 border border-ltb rounded-[6px] text-lttm hover:text-ltt hover:border-brand-cyan transition-colors"
          >
            {copied ? <Check size={14} className="text-gr" /> : <Copy size={14} />}
          </button>
        </div>
        <button onClick={onClose} className="mt-4 w-full py-2.5 border border-ltb rounded-[8px] font-sora text-[13px] text-lttm hover:bg-ltbg transition-colors">
          He guardado el secreto
        </button>
      </div>
    </div>
  )
}

// ── New webhook form ───────────────────────────────────────────────────────────

function NewWebhookForm({ onCreated }: { onCreated: (secret: string) => void }) {
  const [name,    setName]    = useState('')
  const [url,     setUrl]     = useState('')
  const [events,  setEvents]  = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  function toggleEvent(event: string) {
    setEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    )
  }

  function selectAll() { setEvents(WEBHOOK_EVENTS.map((e) => e.value)) }
  function selectNone() { setEvents([]) }

  async function handleCreate() {
    if (!name.trim() || !url.trim() || events.length === 0) return
    setLoading(true)
    setError(null)
    const res = await createWebhook({ name: name.trim(), url: url.trim(), events })
    if ('error' in res) {
      setError(res.error)
    } else {
      onCreated(res.secret)
    }
    setLoading(false)
  }

  return (
    <div className="bg-ltbg border border-ltb rounded-[10px] p-5 flex flex-col gap-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Nuevo webhook</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Nombre <span className="text-re">*</span></FieldLabel>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)}
            placeholder="Ej. Slack alertas" className={inputCls} />
        </div>
        <div>
          <FieldLabel>URL del endpoint <span className="text-re">*</span></FieldLabel>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)}
            placeholder="https://tu-sistema.com/webhook" className={inputCls} />
        </div>
      </div>

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <FieldLabel>Eventos ({events.length} seleccionados) <span className="text-re">*</span></FieldLabel>
          <div className="flex items-center gap-3">
            <button onClick={selectAll}  className="font-sora text-[11px] text-brand-cyan hover:underline">Todos</button>
            <button onClick={selectNone} className="font-sora text-[11px] text-lttm hover:text-ltt">Ninguno</button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {EVENT_GROUPS.map((group) => (
            <div key={group}>
              <p className="font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm mb-1.5 mt-2">{group}</p>
              {WEBHOOK_EVENTS.filter((e) => e.group === group).map((ev) => {
                const checked = events.includes(ev.value)
                return (
                  <label key={ev.value} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                    <div
                      onClick={() => toggleEvent(ev.value)}
                      className={`w-4 h-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                        checked ? 'bg-brand-cyan border-brand-cyan' : 'border-ltb bg-ltcard hover:border-brand-cyan/50'
                      }`}
                    >
                      {checked && <Check size={10} className="text-white" strokeWidth={3} />}
                    </div>
                    <span className="font-sora text-[12.5px] text-ltt2 group-hover:text-ltt transition-colors">
                      {ev.label}
                    </span>
                  </label>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || !name.trim() || !url.trim() || events.length === 0}
        className="self-start flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium disabled:opacity-50 transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,173,239,0.25)]"
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        Crear webhook
      </button>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function WebhooksTab() {
  const [webhooks, setWebhooks]   = useState<WebhookRow[]>([])
  const [loading,  setLoading]    = useState(true)
  const [error,    setError]      = useState<string | null>(null)
  const [showForm, setShowForm]   = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)
  const [testingId,  setTestingId]  = useState<string | null>(null)
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; status?: number; error?: string }>>({})

  async function load() {
    setLoading(true)
    const res = await getWebhooks()
    if ('error' in res) setError(res.error)
    else setWebhooks(res.webhooks)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleDelete(id: string) {
    setDeletingId(id)
    await deleteWebhook(id)
    setDeletingId(null)
    setConfirmDelete(null)
    void load()
  }

  async function handleTest(id: string) {
    setTestingId(id)
    const res = await testWebhook(id)
    setTestResult((prev) => ({
      ...prev,
      [id]: 'error' in res
        ? { ok: false, error: res.error }
        : { ok: (res.status ?? 0) >= 200 && (res.status ?? 0) < 300, status: res.status },
    }))
    setTestingId(null)
    setTimeout(() => setTestResult((prev) => { const n = { ...prev }; delete n[id]; return n }), 5000)
  }

  return (
    <>
      {newSecret && <SecretReveal secret={newSecret} onClose={() => setNewSecret(null)} />}

      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Webhook size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Webhooks ({webhooks.filter((w) => w.is_active).length} activos)
            </span>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan text-white rounded-[7px] font-sora text-[12px] hover:bg-brand-cyan/90 transition-colors"
            >
              <Plus size={13} /> Añadir webhook
            </button>
          )}
        </div>

        <div className="p-5">
          {showForm && (
            <div className="mb-5">
              <NewWebhookForm onCreated={(secret) => { setShowForm(false); setNewSecret(secret); void load() }} />
              <button onClick={() => setShowForm(false)} className="mt-2 font-sora text-[12px] text-lttm hover:text-ltt transition-colors flex items-center gap-1">
                <X size={12} /> Cancelar
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex items-center justify-center h-24">
              <Loader2 size={18} className="text-brand-cyan animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-start gap-2 bg-red-dim border border-reb rounded-[9px] p-3 text-re text-[12px] font-sora">
              <AlertCircle size={13} className="mt-0.5 shrink-0" /> {error}
            </div>
          ) : webhooks.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <Webhook size={24} className="text-lttm mx-auto mb-2 opacity-40" />
              <p className="font-sora text-[13px] text-lttm">No hay webhooks configurados.</p>
              <button onClick={() => setShowForm(true)} className="mt-3 font-sora text-[12.5px] text-brand-cyan hover:underline">
                Añadir el primero
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ltb">
              {webhooks.map((wh) => {
                const result = testResult[wh.id]
                return (
                  <div key={wh.id} className="py-4 first:pt-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sora text-[13px] font-medium text-ltt">{wh.name}</span>
                          {!wh.is_active && (
                            <span className="font-plex text-[10px] text-lttm uppercase border border-ltb rounded px-1.5 py-0.5">Inactivo</span>
                          )}
                        </div>
                        <p className="font-plex text-[11.5px] text-lttm mt-0.5 truncate max-w-[340px]">{wh.url}</p>
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {wh.events.slice(0, 4).map((ev) => (
                            <span key={ev} className="font-plex text-[10px] bg-ltbg border border-ltb rounded-[4px] px-1.5 py-0.5 text-lttm">
                              {ev}
                            </span>
                          ))}
                          {wh.events.length > 4 && (
                            <span className="font-plex text-[10px] text-lttm">+{wh.events.length - 4} más</span>
                          )}
                        </div>
                        {wh.last_triggered_at && (
                          <p className="font-sora text-[11px] text-lttm mt-1">
                            Último envío {formatRelative(wh.last_triggered_at)}
                          </p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {/* Test */}
                        {confirmDelete !== wh.id && (
                          <button
                            onClick={() => handleTest(wh.id)}
                            disabled={testingId === wh.id}
                            className="flex items-center gap-1.5 px-2.5 py-1.5 border border-ltb rounded-[7px] font-sora text-[11.5px] text-lttm hover:border-brand-cyan hover:text-brand-cyan transition-colors disabled:opacity-50"
                            title="Enviar payload de prueba"
                          >
                            {testingId === wh.id
                              ? <Loader2 size={12} className="animate-spin" />
                              : <Zap size={12} />}
                            Probar
                          </button>
                        )}

                        {/* Delete */}
                        {confirmDelete === wh.id ? (
                          <div className="flex items-center gap-2">
                            <span className="font-sora text-[11.5px] text-lttm">¿Eliminar?</span>
                            <button onClick={() => setConfirmDelete(null)} className="px-2 py-1 border border-ltb rounded-[6px] font-sora text-[11px] text-lttm hover:bg-ltbg">Cancelar</button>
                            <button
                              onClick={() => handleDelete(wh.id)}
                              disabled={deletingId === wh.id}
                              className="flex items-center gap-1 px-2.5 py-1 bg-re text-white rounded-[6px] font-sora text-[11px] disabled:opacity-60"
                            >
                              {deletingId === wh.id && <Loader2 size={10} className="animate-spin" />}
                              Eliminar
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDelete(wh.id)}
                            className="p-1.5 text-lttm hover:text-re hover:bg-red-dim rounded-[6px] transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Test result */}
                    {result && (
                      <div className={`mt-2 flex items-center gap-1.5 font-sora text-[12px] ${result.ok ? 'text-gr' : 'text-re'}`}>
                        {result.ok
                          ? <><CheckCircle2 size={13} /> Respuesta {result.status} — webhook funcionando</>
                          : <><AlertCircle size={13} /> {result.error ?? `Error ${result.status}`}</>}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Docs note */}
      <div className="mt-4 p-4 bg-ltbg border border-ltb rounded-[9px]">
        <p className="font-sora text-[12px] text-lttm leading-relaxed">
          <span className="font-medium text-ltt">Verificación:</span> cada payload incluye el header{' '}
          <code className="font-plex text-[11.5px] bg-ltcard border border-ltb rounded px-1.5 py-0.5">X-Fluxion-Signature: sha256=&lt;hmac&gt;</code>.
          Calcula <code className="font-plex text-[11.5px] bg-ltcard border border-ltb rounded px-1.5 py-0.5">HMAC-SHA256(secret, payload)</code> y compara.
        </p>
      </div>
    </>
  )
}
