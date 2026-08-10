'use client';

import { useEffect, useState } from 'react';
import { Key, Plus, Copy, Check, Trash2, Loader2, AlertCircle, X, Clock, Shield } from 'lucide-react';
import { getApiKeys, createApiKey, revokeApiKey, type ApiKeyRow } from '../actions';
import { FieldLabel, inputCls, selectCls, SelectArrow, formatRelative } from './shared';

const SCOPES = [
  { value: 'read',  label: 'Solo lectura',       desc: 'Consultar datos (GET)' },
  { value: 'write', label: 'Lectura y escritura', desc: 'Crear y modificar recursos' },
  { value: 'admin', label: 'Administrador',       desc: 'Acceso completo incluida configuración' },
]

const EXPIRY_OPTIONS = [
  { value: '',    label: 'Sin expiración' },
  { value: '30',  label: '30 días' },
  { value: '90',  label: '90 días' },
  { value: '180', label: '6 meses' },
  { value: '365', label: '1 año' },
]

function expiryDate(days: string): string | null {
  if (!days) return null
  const d = new Date()
  d.setDate(d.getDate() + Number(days))
  return d.toISOString()
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false
  return new Date(expiresAt) < new Date()
}

function ScopeBadge({ scope }: { scope: string }) {
  const cls =
    scope === 'admin' ? 'bg-red-dim border-reb text-re' :
    scope === 'write' ? 'bg-[var(--ye-dim,#fff3cd)] border-[var(--ye-border,#ffc107)] text-ye' :
    'bg-cyan-dim border-[var(--cyan-border)] text-brand-cyan'
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[4px] border font-plex text-[10px] uppercase tracking-[0.4px] ${cls}`}>
      <Shield size={9} />
      {scope}
    </span>
  )
}

// ── New key form ───────────────────────────────────────────────────────────────

function NewKeyForm({ onCreated }: { onCreated: (key: string) => void }) {
  const [name,   setName]   = useState('')
  const [scope,  setScope]  = useState('read')
  const [expiry, setExpiry] = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]  = useState<string | null>(null)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    const res = await createApiKey({ name: name.trim(), scopes: [scope], expires_at: expiryDate(expiry) })
    if ('error' in res) {
      setError(res.error)
    } else {
      onCreated(res.key)
    }
    setLoading(false)
  }

  return (
    <div className="bg-ltbg border border-ltb rounded-[10px] p-5 flex flex-col gap-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Nueva clave de API</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <FieldLabel>Nombre <span className="text-re">*</span></FieldLabel>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej. CI/CD pipeline"
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel>Permiso</FieldLabel>
          <div className="relative">
            <select value={scope} onChange={(e) => setScope(e.target.value)} className={selectCls}>
              {SCOPES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <SelectArrow />
          </div>
        </div>
        <div>
          <FieldLabel>Expiración</FieldLabel>
          <div className="relative">
            <select value={expiry} onChange={(e) => setExpiry(e.target.value)} className={selectCls}>
              {EXPIRY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <SelectArrow />
          </div>
        </div>
      </div>

      {SCOPES.find((s) => s.value === scope)?.desc && (
        <p className="font-sora text-[11.5px] text-lttm -mt-2">
          {SCOPES.find((s) => s.value === scope)?.desc}
        </p>
      )}

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={loading || !name.trim()}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white rounded-[8px] font-sora text-[12.5px] font-medium disabled:opacity-50 transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_16px_rgba(0,173,239,0.25)]"
        >
          {loading && <Loader2 size={13} className="animate-spin" />}
          Generar clave
        </button>
      </div>
    </div>
  )
}

// ── Secret reveal modal ───────────────────────────────────────────────────────

function SecretReveal({ secret, label, onClose }: { secret: string; label: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(secret)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-ltcard border border-ltb rounded-[14px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] p-6 w-full max-w-lg">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-sora text-[14px] font-semibold text-ltt">{label}</h3>
            <p className="font-sora text-[12px] text-re mt-0.5 flex items-center gap-1">
              <AlertCircle size={12} />
              Cópiala ahora — no se mostrará de nuevo
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-lttm hover:text-ltt rounded-[6px] hover:bg-ltbg transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="flex items-center gap-2 bg-ltbg border border-ltb rounded-[8px] p-3">
          <code className="flex-1 font-plex text-[12px] text-ltt break-all">{secret}</code>
          <button
            onClick={copy}
            className="shrink-0 p-2 border border-ltb rounded-[6px] text-lttm hover:text-ltt hover:border-brand-cyan transition-colors"
          >
            {copied ? <Check size={14} className="text-gr" /> : <Copy size={14} />}
          </button>
        </div>
        <button
          onClick={onClose}
          className="mt-4 w-full py-2.5 border border-ltb rounded-[8px] font-sora text-[13px] text-lttm hover:bg-ltbg transition-colors"
        >
          He guardado la clave
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function ApiKeysTab() {
  const [keys,    setKeys]    = useState<ApiKeyRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [revoking,  setRevoking]  = useState<string | null>(null)
  const [confirmRevoke, setConfirmRevoke] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    const res = await getApiKeys()
    if ('error' in res) setError(res.error)
    else setKeys(res.keys)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  async function handleRevoke(id: string) {
    setRevoking(id)
    await revokeApiKey(id)
    setRevoking(null)
    setConfirmRevoke(null)
    void load()
  }

  function handleCreated(key: string) {
    setShowForm(false)
    setNewSecret(key)
    void load()
  }

  const activeKeys  = keys.filter((k) => !k.revoked_at)
  const revokedKeys = keys.filter((k) => !!k.revoked_at)

  return (
    <>
      {newSecret && (
        <SecretReveal
          secret={newSecret}
          label="Clave API generada"
          onClose={() => setNewSecret(null)}
        />
      )}

      <div className="bg-ltcard rounded-[12px] border border-ltb shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key size={14} className="text-lttm" />
            <span className="font-plex text-[10.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
              Claves de API ({activeKeys.length} activas)
            </span>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-cyan text-white rounded-[7px] font-sora text-[12px] hover:bg-brand-cyan/90 transition-colors"
            >
              <Plus size={13} /> Nueva clave
            </button>
          )}
        </div>

        <div className="p-5">
          {showForm && (
            <div className="mb-5">
              <NewKeyForm onCreated={handleCreated} />
              <button
                onClick={() => setShowForm(false)}
                className="mt-2 font-sora text-[12px] text-lttm hover:text-ltt transition-colors flex items-center gap-1"
              >
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
          ) : activeKeys.length === 0 && !showForm ? (
            <div className="text-center py-8">
              <Key size={24} className="text-lttm mx-auto mb-2 opacity-40" />
              <p className="font-sora text-[13px] text-lttm">No hay claves de API activas.</p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-3 font-sora text-[12.5px] text-brand-cyan hover:underline"
              >
                Crear la primera clave
              </button>
            </div>
          ) : (
            <div className="divide-y divide-ltb">
              {activeKeys.map((key) => {
                const expired = isExpired(key.expires_at)
                return (
                  <div key={key.id} className="flex items-center justify-between gap-4 py-3.5 first:pt-0">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-sora text-[13px] font-medium text-ltt">{key.name}</span>
                        {key.scopes.map((s) => <ScopeBadge key={s} scope={s} />)}
                        {expired && (
                          <span className="font-plex text-[10px] text-re uppercase">Expirada</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                        <span className="font-plex text-[11px] text-lttm">{key.key_prefix}••••••••••••</span>
                        <span className="flex items-center gap-1 font-sora text-[11px] text-lttm">
                          <Clock size={10} />
                          {key.expires_at
                            ? `Expira ${formatDate(key.expires_at)}`
                            : 'Sin expiración'}
                        </span>
                        {key.last_used_at && (
                          <span className="font-sora text-[11px] text-lttm">
                            Usado {formatRelative(key.last_used_at)}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="shrink-0">
                      {confirmRevoke === key.id ? (
                        <div className="flex items-center gap-2">
                          <span className="font-sora text-[11.5px] text-lttm">¿Revocar?</span>
                          <button onClick={() => setConfirmRevoke(null)} className="px-2 py-1 border border-ltb rounded-[6px] font-sora text-[11px] text-lttm hover:bg-ltbg">Cancelar</button>
                          <button
                            onClick={() => handleRevoke(key.id)}
                            disabled={revoking === key.id}
                            className="flex items-center gap-1 px-2.5 py-1 bg-re text-white rounded-[6px] font-sora text-[11px] disabled:opacity-60"
                          >
                            {revoking === key.id && <Loader2 size={10} className="animate-spin" />}
                            Revocar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmRevoke(key.id)}
                          className="p-1.5 text-lttm hover:text-re hover:bg-red-dim rounded-[6px] transition-colors"
                          title="Revocar clave"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Revoked keys */}
        {revokedKeys.length > 0 && (
          <div className="border-t border-ltb px-5 py-3 bg-ltcard2/50">
            <p className="font-sora text-[11.5px] text-lttm">
              {revokedKeys.length} clave{revokedKeys.length !== 1 ? 's' : ''} revocada{revokedKeys.length !== 1 ? 's' : ''} · Se eliminan automáticamente tras 90 días.
            </p>
          </div>
        )}
      </div>

      {/* Docs note */}
      <div className="mt-4 p-4 bg-ltbg border border-ltb rounded-[9px]">
        <p className="font-sora text-[12px] text-lttm leading-relaxed">
          <span className="font-medium text-ltt">Autenticación:</span> incluye el header{' '}
          <code className="font-plex text-[11.5px] bg-ltcard border border-ltb rounded px-1.5 py-0.5 text-brand-cyan">Authorization: Bearer {'<tu_clave>'}</code>{' '}
          en cada llamada a la API de Fluxion.
        </p>
      </div>
    </>
  )
}
