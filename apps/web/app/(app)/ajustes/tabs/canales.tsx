'use client';

import { useEffect, useState, useCallback, useTransition } from 'react';
import {
  MessageSquare, Plus, Trash2, Loader2, AlertCircle, CheckCircle2,
  XCircle, Send, X, History,
} from 'lucide-react';

import {
  getNotificationChannels, getChannelDeliveries, saveNotificationChannel,
  deleteNotificationChannel, testNotificationChannel,
  type NotificationChannelRow, type ChannelDeliveryRow,
} from '../actions';
import { FieldLabel, inputCls, selectCls, SelectArrow, formatRelative } from './shared';

const CHANNEL_TYPES = [
  {
    value: 'slack' as const,
    label: 'Slack',
    help: 'Crea un webhook entrante en tu espacio de Slack y pega aquí la URL que te dé.',
  },
  {
    value: 'teams' as const,
    label: 'Microsoft Teams',
    help: 'Usa un conector entrante del canal. Si tu Teams ya solo permite flujos de Power Automate, el envío puede fallar con error 400 — avísame y añadimos ese formato.',
  },
]

// Eventos a los que se puede suscribir un canal. Vacío = todos.
const EVENTS = [
  { value: 'incident.created',         label: 'Incidente registrado' },
  { value: 'incident.deadline_half',   label: 'Mitad del plazo de notificación' },
  { value: 'incident.deadline_urgent', label: '80 % del plazo consumido' },
  { value: 'incident.deadline_overdue',label: 'Plazo de notificación vencido' },
  { value: 'cost.budget_threshold',    label: 'Presupuesto de IA superado' },
  { value: 'hitl.discordance_spike',  label: 'Sube la discordancia humana' },
]

// ── Historial de entregas ─────────────────────────────────────────────────────

function DeliveryHistory({ channelId }: { channelId: string }) {
  const [rows, setRows] = useState<ChannelDeliveryRow[] | null>(null)

  useEffect(() => { getChannelDeliveries(channelId, 8).then(setRows) }, [channelId])

  if (rows === null) {
    return <p className="font-sora text-[12px] text-lttm flex items-center gap-1.5">
      <Loader2 size={12} className="animate-spin" /> Cargando…
    </p>
  }

  if (rows.length === 0) {
    return <p className="font-sora text-[12px] text-lttm">Todavía no se ha enviado nada por este canal.</p>
  }

  return (
    <div className="flex flex-col gap-1">
      {rows.map((r) => (
        <div key={r.id} className="flex items-start gap-3 font-plex text-[11.5px] py-1 border-b border-ltb last:border-0">
          <span className="text-lttm w-28 shrink-0">{formatRelative(r.created_at)}</span>
          <span className={`w-24 shrink-0 uppercase tracking-[0.4px] ${
            r.status === 'sent' ? 'text-gr' : r.status === 'abandoned' ? 'text-re' : 'text-or'
          }`}>{r.status}</span>
          <span className="text-ltt">{r.event_type}</span>
          {r.attempts > 1 && <span className="text-lttm">· {r.attempts} intentos</span>}
          {r.last_error && (
            <span className="text-re flex-1 truncate" title={r.last_error}>
              {r.http_status ? `${r.http_status} · ` : ''}{r.last_error}
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Formulario ────────────────────────────────────────────────────────────────

type FormState = {
  id?:          string
  channel_type: 'slack' | 'teams'
  name:         string
  url:          string
  events:       string[]
  is_active:    boolean
  has_url:      boolean
}

const EMPTY: FormState = {
  channel_type: 'slack', name: '', url: '', events: [], is_active: true, has_url: false,
}

function ChannelForm({ initial, onSaved, onCancel }: {
  initial: FormState; onSaved: () => void; onCancel: () => void
}) {
  const [form, setForm]     = useState<FormState>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  const typeInfo = CHANNEL_TYPES.find((t) => t.value === form.channel_type)

  function toggleEvent(value: string) {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(value)
        ? prev.events.filter((e) => e !== value)
        : [...prev.events, value],
    }))
  }

  async function handleSave() {
    setSaving(true); setError(null)
    const res = await saveNotificationChannel({
      id: form.id, channel_type: form.channel_type, name: form.name,
      url: form.url || null, events: form.events, is_active: form.is_active,
    })
    setSaving(false)
    if ('error' in res) setError(res.error)
    else onSaved()
  }

  return (
    <div className="bg-ltbg border border-ltb rounded-[10px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
          {form.id ? 'Editar canal' : 'Nuevo canal'}
        </p>
        <button onClick={onCancel} className="text-lttm hover:text-ltt"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Plataforma</FieldLabel>
          <div className="relative">
            <select
              value={form.channel_type}
              onChange={(e) => setForm({ ...form, channel_type: e.target.value as 'slack' | 'teams' })}
              className={selectCls}
            >
              {CHANNEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <SelectArrow />
          </div>
        </div>
        <div>
          <FieldLabel>Nombre <span className="text-re">*</span></FieldLabel>
          <input
            type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. #cumplimiento-ia" className={inputCls}
          />
        </div>
      </div>

      <div>
        <FieldLabel>
          URL del webhook {!form.id && <span className="text-re">*</span>}
        </FieldLabel>
        <input
          type="password" value={form.url} autoComplete="new-password"
          onChange={(e) => setForm({ ...form, url: e.target.value })}
          placeholder={form.has_url ? '•••••••• (sin cambios)' : 'https://hooks.slack.com/services/…'}
          className={inputCls}
        />
        <p className="font-sora text-[11.5px] text-lttm mt-1.5">
          {typeInfo?.help} Se guarda cifrada y no vuelve a mostrarse — cualquiera
          con esa URL puede publicar en el canal.
        </p>
      </div>

      <div>
        <FieldLabel>Avisos que recibe</FieldLabel>
        <p className="font-sora text-[11.5px] text-lttm mb-2">
          Sin marcar ninguno, el canal recibe todos.
        </p>
        <div className="flex flex-col gap-1.5">
          {EVENTS.map((e) => (
            <label key={e.value} className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox" checked={form.events.includes(e.value)}
                onChange={() => toggleEvent(e.value)}
                className="accent-[var(--brand-cyan,#00a3c4)]"
              />
              <span className="font-sora text-[13px] text-ltt">{e.label}</span>
              <span className="font-plex text-[10.5px] text-lttm">{e.value}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox" checked={form.is_active}
          onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          className="accent-[var(--brand-cyan,#00a3c4)]"
        />
        <span className="font-sora text-[13px] text-ltt">Canal activo</span>
      </label>

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave} disabled={saving || !form.name.trim()}
          className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {form.id ? 'Guardar cambios' : 'Crear canal'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Pestaña ───────────────────────────────────────────────────────────────────

export function CanalesTab() {
  const [rows, setRows]         = useState<NotificationChannelRow[] | null>(null)
  const [editing, setEditing]   = useState<FormState | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [testMsg, setTestMsg]   = useState<{ id: string; ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  const load = useCallback(() => { getNotificationChannels().then(setRows) }, [])
  useEffect(() => { load() }, [load])

  function handleTest(id: string) {
    setTestMsg(null)
    startTransition(async () => {
      const res = await testNotificationChannel(id)
      setTestMsg({
        id,
        ok: Boolean(res.success),
        text: res.success ? 'Mensaje enviado. Compruébalo en el canal.' : (res.error ?? 'Falló el envío.'),
      })
      load()
    })
  }

  async function handleDelete(row: NotificationChannelRow) {
    if (!confirm(`¿Eliminar el canal «${row.name}»?`)) return
    await deleteNotificationChannel(row.id)
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <MessageSquare size={12} /> Canales de aviso ({rows?.length ?? 0})
          </p>
          <p className="font-sora text-[12.5px] text-lttm mt-1.5 max-w-2xl">
            Dónde avisar cuando corre un plazo regulatorio. Los avisos siempre llegan
            además a la campana de la aplicación: un canal se puede silenciar o borrar,
            y una obligación del artículo 73 no debe depender de eso.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing({ ...EMPTY })}
            className="shrink-0 px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] flex items-center gap-1.5"
          >
            <Plus size={14} /> Nuevo canal
          </button>
        )}
      </div>

      {editing && (
        <ChannelForm
          initial={editing}
          onCancel={() => setEditing(null)}
          onSaved={() => { setEditing(null); load() }}
        />
      )}

      {rows === null && (
        <p className="font-sora text-[13px] text-lttm flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Cargando…
        </p>
      )}

      {rows?.length === 0 && !editing && (
        <div className="border border-dashed border-ltb rounded-[10px] p-8 text-center">
          <p className="font-sora text-[13px] text-lttm">
            No hay ningún canal configurado. Los avisos solo llegan a la campana.
          </p>
        </div>
      )}

      {rows?.map((row) => (
        <div key={row.id} className="border border-ltb rounded-[10px] p-4 flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sora text-[14px] text-ltt font-semibold">{row.name}</span>
                <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-ltb text-lttm">
                  {row.channel_type}
                </span>
                {!row.is_active && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-ltb text-lttm">
                    inactivo
                  </span>
                )}
                {!row.has_url && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-reb text-re">
                    sin URL
                  </span>
                )}
              </div>

              <p className="font-sora text-[12px] text-lttm mt-1.5">
                {row.events.length === 0
                  ? 'Recibe todos los avisos'
                  : `${row.events.length} tipo(s) de aviso`}
              </p>

              {row.last_success_at && (
                <p className="font-sora text-[12px] text-gr mt-1 flex items-center gap-1.5">
                  <CheckCircle2 size={12} /> Último envío correcto {formatRelative(row.last_success_at)}
                </p>
              )}
              {row.last_error && (
                <p className="font-sora text-[12px] text-re mt-1 flex items-start gap-1.5">
                  <XCircle size={12} className="mt-0.5 shrink-0" />
                  <span>Último error: {row.last_error}</span>
                </p>
              )}

              {testMsg?.id === row.id && (
                <p className={`font-sora text-[12px] mt-1.5 flex items-center gap-1.5 ${testMsg.ok ? 'text-gr' : 'text-re'}`}>
                  {testMsg.ok ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />} {testMsg.text}
                </p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleTest(row.id)} disabled={pending || !row.has_url}
                title="Enviar mensaje de prueba"
                className="p-1.5 rounded-[6px] text-lttm hover:text-brand-cyan hover:bg-ltbg disabled:opacity-40"
              >
                {pending && testMsg?.id === row.id ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              </button>
              <button
                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                title="Historial de envíos"
                className="p-1.5 rounded-[6px] text-lttm hover:text-brand-cyan hover:bg-ltbg"
              >
                <History size={14} />
              </button>
              <button
                onClick={() => setEditing({
                  id: row.id, channel_type: row.channel_type, name: row.name,
                  url: '', events: row.events, is_active: row.is_active, has_url: row.has_url,
                })}
                className="px-2.5 py-1.5 rounded-[6px] border border-ltb font-sora text-[12px] text-lttm hover:text-ltt"
              >
                Editar
              </button>
              <button
                onClick={() => handleDelete(row)}
                className="p-1.5 rounded-[6px] text-lttm hover:text-re hover:bg-red-dim"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>

          {expanded === row.id && (
            <div className="border-t border-ltb pt-3"><DeliveryHistory channelId={row.id} /></div>
          )}
        </div>
      ))}
    </div>
  )
}
