'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  Plug, Plus, Trash2, Loader2, AlertCircle, CheckCircle2, XCircle,
  AlertTriangle, RefreshCw, X, Play,
} from 'lucide-react';

import {
  getConnectorConnections, getConnectorRuns, saveConnectorConnection,
  deleteConnectorConnection, requestConnectorSync,
  type ConnectorConnectionRow, type ConnectorRunRow,
} from '../actions';
import { FieldLabel, inputCls, selectCls, SelectArrow, formatRelative } from './shared';

const CONNECTOR_TYPES = [
  { value: 'mlflow', label: 'MLflow',
    hint: 'Registro de modelos: publica cada versión como señal.',
    urlPlaceholder: 'https://mlflow.tu-dominio.com', auth: 'basic' as const },
  { value: 'github', label: 'GitHub',
    hint: 'Busca IA no declarada en el código: librerías, llamadas a proveedores y credenciales expuestas.',
    urlPlaceholder: 'https://api.github.com', auth: 'token' as const },
  { value: 'gitlab', label: 'GitLab',
    hint: 'Igual que GitHub, sobre grupos de GitLab.',
    urlPlaceholder: 'https://gitlab.com', auth: 'token' as const },
]

const ES_REPOSITORIO = (t: string) => t === 'github' || t === 'gitlab'

const INTERVALS = [
  { value: 300,   label: 'Cada 5 minutos' },
  { value: 900,   label: 'Cada 15 minutos' },
  { value: 3600,  label: 'Cada hora' },
  { value: 21600, label: 'Cada 6 horas' },
  { value: 86400, label: 'Una vez al día' },
]

// ── Estado ────────────────────────────────────────────────────────────────────

function StatusPill({ status, at }: { status: string | null; at: string | null }) {
  if (!at) {
    return (
      <span className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm">
        <AlertCircle size={13} /> Sin sincronizar todavía
      </span>
    )
  }

  const map: Record<string, { icon: React.ReactNode; text: string; cls: string }> = {
    ok:      { icon: <CheckCircle2  size={13} />, text: 'Correcta', cls: 'text-gr' },
    partial: { icon: <AlertTriangle size={13} />, text: 'Con incidencias', cls: 'text-or' },
    error:   { icon: <XCircle       size={13} />, text: 'Con error', cls: 'text-re' },
  }
  const s = map[status ?? ''] ?? map.error

  return (
    <span className={`inline-flex items-center gap-1.5 font-sora text-[12px] ${s.cls}`}>
      {s.icon} {s.text} · <span className="text-lttm">{formatRelative(at)}</span>
    </span>
  )
}

// ── Historial de sincronizaciones ─────────────────────────────────────────────

function RunHistory({ connectionId }: { connectionId: string }) {
  const [runs, setRuns] = useState<ConnectorRunRow[] | null>(null)

  useEffect(() => {
    getConnectorRuns(connectionId, 8).then(setRuns)
  }, [connectionId])

  if (runs === null) {
    return <p className="font-sora text-[12px] text-lttm flex items-center gap-1.5">
      <Loader2 size={12} className="animate-spin" /> Cargando historial…
    </p>
  }

  if (runs.length === 0) {
    return <p className="font-sora text-[12px] text-lttm">
      Todavía no hay sincronizaciones registradas.
    </p>
  }

  return (
    <div className="flex flex-col gap-1">
      {runs.map((run) => (
        <div key={run.id} className="flex items-start gap-3 font-plex text-[11.5px] py-1 border-b border-ltb last:border-0">
          <span className="text-lttm w-28 shrink-0">{formatRelative(run.started_at)}</span>
          <span className={`w-24 shrink-0 uppercase tracking-[0.4px] ${
            run.status === 'ok' ? 'text-gr' : run.status === 'partial' ? 'text-or' : 'text-re'
          }`}>{run.status}</span>
          <span className="text-ltt">
            {run.objects_seen} objeto{run.objects_seen === 1 ? '' : 's'} ·{' '}
            {run.signals_published} nueva{run.signals_published === 1 ? '' : 's'} ·{' '}
            {run.signals_duplicated} ya conocida{run.signals_duplicated === 1 ? '' : 's'}
            {run.signals_rejected > 0 && <span className="text-re"> · {run.signals_rejected} rechazada(s)</span>}
          </span>
          {run.error_message && (
            <span className="text-re flex-1 truncate" title={run.error_message}>{run.error_message}</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Formulario ────────────────────────────────────────────────────────────────

type FormState = {
  id?:                   string
  connector_type:        string
  name:                  string
  base_url:              string
  auth_type:             'none' | 'basic' | 'token'
  username:              string
  password:              string
  poll_interval_seconds: number
  is_active:             boolean
  has_secret:            boolean
}

const EMPTY_FORM: FormState = {
  connector_type: 'mlflow',
  name: '',
  base_url: '',
  auth_type: 'basic',
  username: '',
  password: '',
  poll_interval_seconds: 900,
  is_active: true,
  has_secret: false,
}

function ConnectionForm({
  initial, onSaved, onCancel,
}: {
  initial: FormState
  onSaved: () => void
  onCancel: () => void
}) {
  const [form, setForm]       = useState<FormState>(initial)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState<string | null>(null)

  const typeInfo = CONNECTOR_TYPES.find((t) => t.value === form.connector_type)

  async function handleSave() {
    setSaving(true)
    setError(null)
    const res = await saveConnectorConnection({
      id:                    form.id,
      connector_type:        form.connector_type,
      name:                  form.name,
      base_url:              form.base_url,
      auth_type:             form.auth_type,
      username:              form.username,
      password:              form.password || null,
      poll_interval_seconds: form.poll_interval_seconds,
      is_active:             form.is_active,
    })
    setSaving(false)
    if ('error' in res) setError(res.error)
    else onSaved()
  }

  return (
    <div className="bg-ltbg border border-ltb rounded-[10px] p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
          {form.id ? 'Editar conexión' : 'Nueva conexión'}
        </p>
        <button onClick={onCancel} className="text-lttm hover:text-ltt"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Tipo</FieldLabel>
          <div className="relative">
            <select
              value={form.connector_type}
              onChange={(e) => {
                const tipo = CONNECTOR_TYPES.find((t) => t.value === e.target.value)
                setForm({
                  ...form,
                  connector_type: e.target.value,
                  // Cada tipo tiene su forma de autenticarse. Dejar la anterior
                  // era la puerta a guardar un token en el campo de usuario.
                  auth_type: tipo?.auth ?? 'basic',
                  base_url: form.base_url || tipo?.urlPlaceholder || '',
                })
              }}
              className={selectCls}
              disabled={Boolean(form.id)}
            >
              {CONNECTOR_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <SelectArrow />
          </div>
          {typeInfo && <p className="font-sora text-[11.5px] text-lttm mt-1.5">{typeInfo.hint}</p>}
        </div>

        <div>
          <FieldLabel>Nombre <span className="text-re">*</span></FieldLabel>
          <input
            type="text" value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Ej. MLflow producción" className={inputCls}
          />
        </div>
      </div>

      <div>
        <FieldLabel>URL del servidor <span className="text-re">*</span></FieldLabel>
        <input
          type="text" value={form.base_url}
          onChange={(e) => setForm({ ...form, base_url: e.target.value })}
          placeholder={typeInfo?.urlPlaceholder ?? 'https://…'} className={inputCls}
        />
      </div>

      {/* Credenciales — etiquetadas sin ambigüedad a propósito: es el error que
          comete todo el mundo la primera vez. */}
      <div className="border border-ltb rounded-[8px] p-4 bg-ltcard flex flex-col gap-4">
        <div>
          <p className="font-sora text-[13px] text-ltt font-semibold">
            Credenciales del servidor {typeInfo?.label ?? 'externo'}
          </p>
          <p className="font-sora text-[11.5px] text-lttm mt-0.5">
            Son las del sistema al que nos conectamos, <strong>no las de tu cuenta de Fluxion</strong>.
            Se guardan cifradas y no vuelven a mostrarse.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <FieldLabel>Autenticación</FieldLabel>
            <div className="relative">
              <select
                value={form.auth_type}
                onChange={(e) => setForm({ ...form, auth_type: e.target.value as 'none' | 'basic' | 'token' })}
                className={selectCls}
                disabled={ES_REPOSITORIO(form.connector_type)}
              >
                {ES_REPOSITORIO(form.connector_type)
                  ? <option value="token">Token de acceso</option>
                  : <>
                      <option value="basic">Usuario y contraseña</option>
                      <option value="none">Sin autenticación</option>
                    </>}
              </select>
              <SelectArrow />
            </div>
          </div>

          {form.auth_type === 'token' && (
            <>
              <div>
                <FieldLabel>Organización o grupo <span className="text-re">*</span></FieldLabel>
                <input
                  type="text" value={form.username} autoComplete="off"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  placeholder="mi-organizacion" className={inputCls}
                />
                <p className="font-sora text-[11px] text-lttm mt-1">
                  Cuya cuenta se escanea. Si es tu cuenta personal, tu propio usuario.
                </p>
              </div>
              <div>
                <FieldLabel>Token de solo lectura <span className="text-re">*</span></FieldLabel>
                <input
                  type="password" value={form.password} autoComplete="new-password"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={form.has_secret ? '•••••••• (sin cambios)' : 'ghp_… o github_pat_…'}
                  className={inputCls}
                />
                <p className="font-sora text-[11px] text-lttm mt-1">
                  Solo lectura de contenidos. Nunca uno con permiso de escritura.
                </p>
              </div>
            </>
          )}

          {form.auth_type === 'basic' && (
            <>
              <div>
                <FieldLabel>Usuario en {typeInfo?.label ?? 'el servidor'}</FieldLabel>
                <input
                  type="text" value={form.username} autoComplete="off"
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Contraseña</FieldLabel>
                <input
                  type="password" value={form.password} autoComplete="new-password"
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder={form.has_secret ? '•••••••• (sin cambios)' : ''}
                  className={inputCls}
                />
                {form.has_secret && (
                  <p className="font-sora text-[11px] text-lttm mt-1">
                    Déjalo vacío para conservar la actual.
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <FieldLabel>Frecuencia de sincronización</FieldLabel>
          <div className="relative">
            <select
              value={form.poll_interval_seconds}
              onChange={(e) => setForm({ ...form, poll_interval_seconds: Number(e.target.value) })}
              className={selectCls}
            >
              {INTERVALS.map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}
            </select>
            <SelectArrow />
          </div>
        </div>
        <div className="flex items-end">
          <label className="flex items-center gap-2 cursor-pointer pb-2">
            <input
              type="checkbox" checked={form.is_active}
              onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              className="accent-[var(--brand-cyan,#00a3c4)]"
            />
            <span className="font-sora text-[13px] text-ltt">Conexión activa</span>
          </label>
        </div>
      </div>

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving || !form.name.trim() || !form.base_url.trim()}
          className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {form.id ? 'Guardar cambios' : 'Crear conexión'}
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm">
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Pestaña ───────────────────────────────────────────────────────────────────

export function ConectoresTab() {
  const [rows, setRows]       = useState<ConnectorConnectionRow[] | null>(null)
  const [editing, setEditing] = useState<FormState | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(() => {
    getConnectorConnections().then(setRows)
  }, [])

  useEffect(() => { load() }, [load])

  const [pidiendo, setPidiendo] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)

  async function handleSync(row: ConnectorConnectionRow) {
    setPidiendo(row.id)
    setAviso(null)
    const r = await requestConnectorSync(row.id)
    setPidiendo(null)
    // «Solicitada», no «hecha»: el conector la ejecuta en su siguiente sondeo.
    setAviso(r.error ?? `Sincronización solicitada para «${row.name}». El conector la ejecutará en su próximo sondeo.`)
    load()
  }

  async function handleDelete(row: ConnectorConnectionRow) {
    if (!confirm(`¿Eliminar la conexión «${row.name}»? También se borrará su credencial guardada.`)) return
    await deleteConnectorConnection(row.id)
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      {aviso && (
        <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-2.5 flex items-start justify-between gap-3">
          <span className="font-sora text-[12.5px] text-ltt2">{aviso}</span>
          <button onClick={() => setAviso(null)} className="text-lttm hover:text-ltt shrink-0">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <Plug size={12} /> Conectores ({rows?.length ?? 0})
          </p>
          <p className="font-sora text-[12.5px] text-lttm mt-1.5 max-w-2xl">
            Sistemas externos que Fluxion consulta periódicamente para mantener al día el
            expediente de tus sistemas de IA. Cada conexión necesita que su módulo esté
            desplegado y con una clave API con permiso <code className="font-plex">connectors:sync</code>.
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing({ ...EMPTY_FORM })}
            className="shrink-0 px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] flex items-center gap-1.5"
          >
            <Plus size={14} /> Nueva conexión
          </button>
        )}
      </div>

      {editing && (
        <ConnectionForm
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
            Todavía no hay ninguna conexión configurada.
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
                  {row.connector_type}
                </span>
                {!row.is_active && (
                  <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-ltb text-lttm">
                    inactiva
                  </span>
                )}
              </div>
              <p className="font-plex text-[11.5px] text-lttm mt-1 truncate">{row.base_url}</p>
              <div className="mt-1.5"><StatusPill status={row.last_sync_status} at={row.last_sync_at} /></div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleSync(row)}
                disabled={pidiendo === row.id || !row.is_active}
                title="Sincronizar ahora"
                className="p-1.5 rounded-[6px] text-lttm hover:text-brand-cyan hover:bg-ltbg disabled:opacity-40"
              >
                {pidiendo === row.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              </button>
              <button
                onClick={() => setExpanded(expanded === row.id ? null : row.id)}
                title="Historial de sincronizaciones"
                className="p-1.5 rounded-[6px] text-lttm hover:text-brand-cyan hover:bg-ltbg"
              >
                <RefreshCw size={14} />
              </button>
              <button
                onClick={() => setEditing({
                  id: row.id, connector_type: row.connector_type, name: row.name,
                  base_url: row.base_url, auth_type: row.auth_type,
                  username: row.username ?? '', password: '',
                  poll_interval_seconds: row.poll_interval_seconds,
                  is_active: row.is_active, has_secret: row.has_secret,
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
            <div className="border-t border-ltb pt-3">
              <RunHistory connectionId={row.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
