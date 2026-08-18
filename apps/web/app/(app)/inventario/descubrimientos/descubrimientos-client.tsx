'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Radar, Link2, XCircle, RotateCcw, ExternalLink, Loader2,
  AlertCircle, Plus, ChevronRight,
} from 'lucide-react';

import {
  linkDiscovery, ignoreDiscovery, reopenDiscovery, createSystemFromDiscovery,
  type DiscoveryRow, type SystemOption,
} from './actions';

const DOMAINS = [
  'finanzas', 'seguros', 'credito', 'salud', 'rrhh', 'educacion', 'seguridad',
  'justicia', 'migracion', 'infra', 'marketing', 'operaciones', 'atencion',
  'cumplimiento', 'otro',
]

const STATUSES = [
  { value: 'desarrollo', label: 'En desarrollo' },
  { value: 'piloto',     label: 'Piloto' },
  { value: 'produccion', label: 'En producción' },
]

const TABS: Array<{ key: DiscoveryRow['status']; label: string }> = [
  { key: 'pending', label: 'Pendientes' },
  { key: 'linked',  label: 'Vinculados' },
  { key: 'ignored', label: 'Descartados' },
]

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan'

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Tarjeta ───────────────────────────────────────────────────────────────────

function DiscoveryCard({
  row, systems, onDone,
}: {
  row: DiscoveryRow
  systems: SystemOption[]
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [mode, setMode]   = useState<'idle' | 'link' | 'ignore' | 'create'>('idle')
  const [error, setError] = useState<string | null>(null)

  const [systemId, setSystemId] = useState('')
  const [reason, setReason]     = useState('')
  const [newName, setNewName]   = useState(row.name)
  const [newDomain, setNewDomain] = useState('otro')
  const [newStatus, setNewStatus] = useState('desarrollo')

  const meta = row.metadata as { versions?: number; latest_version?: number; production_versions?: string[] }

  function run(fn: () => Promise<{ error?: string } | { systemId: string }>) {
    setError(null)
    startTransition(async () => {
      const res = await fn()
      if ('error' in res && res.error) { setError(res.error); return }
      if ('systemId' in res) { router.push(`/inventario/${res.systemId}`); return }
      setMode('idle')
      onDone()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] p-5 bg-ltcard flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-sora text-[15px] text-ltt font-semibold">{row.name}</span>
            <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-ltb text-lttm">
              {row.asset_type}
            </span>
            <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-ltb text-lttm">
              {row.source_module}
            </span>
          </div>

          {row.description && (
            <p className="font-sora text-[12.5px] text-lttm mt-1.5">{row.description}</p>
          )}

          <p className="font-plex text-[11.5px] text-lttm mt-2">
            {meta.versions != null && <>{meta.versions} versión{meta.versions === 1 ? '' : 'es'}</>}
            {meta.latest_version != null && <> · última: v{meta.latest_version}</>}
            {meta.production_versions && meta.production_versions.length > 0 && (
              <span className="text-or"> · en producción: v{meta.production_versions.join(', v')}</span>
            )}
          </p>

          <p className="font-plex text-[11px] text-lttm mt-1">
            Detectado el {fmt(row.first_seen_at)} · visto por última vez el {fmt(row.last_seen_at)}
          </p>

          {row.status === 'linked' && row.linked_system_id && (
            <p className="font-sora text-[12.5px] text-gr mt-2 flex items-center gap-1.5">
              <Link2 size={13} /> Vinculado a{' '}
              <Link href={`/inventario/${row.linked_system_id}`} className="underline">
                {row.linked_system_name ?? 'el sistema'}
              </Link>
            </p>
          )}

          {row.status === 'ignored' && (
            <p className="font-sora text-[12.5px] text-lttm mt-2 flex items-start gap-1.5">
              <XCircle size={13} className="mt-0.5 shrink-0" />
              <span>Descartado: {row.ignore_reason}</span>
            </p>
          )}
        </div>

        {row.external_url && (
          <a
            href={row.external_url} target="_blank" rel="noopener noreferrer"
            className="shrink-0 font-sora text-[12px] text-brand-cyan flex items-center gap-1 hover:underline"
          >
            Ver en origen <ExternalLink size={12} />
          </a>
        )}
      </div>

      {/* ── Acciones ── */}
      {row.status === 'pending' && mode === 'idle' && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setMode('link')}
            className="px-3 py-1.5 rounded-[8px] bg-brand-cyan text-white font-sora text-[12.5px] flex items-center gap-1.5"
          >
            <Link2 size={13} /> Vincular a un sistema
          </button>
          <button
            onClick={() => setMode('create')}
            className="px-3 py-1.5 rounded-[8px] border border-ltb font-sora text-[12.5px] text-ltt flex items-center gap-1.5"
          >
            <Plus size={13} /> Crear sistema nuevo
          </button>
          <button
            onClick={() => setMode('ignore')}
            className="px-3 py-1.5 rounded-[8px] border border-ltb font-sora text-[12.5px] text-lttm flex items-center gap-1.5"
          >
            <XCircle size={13} /> Descartar
          </button>
        </div>
      )}

      {row.status !== 'pending' && (
        <div>
          <button
            onClick={() => run(() => reopenDiscovery(row.id))}
            disabled={pending}
            className="px-3 py-1.5 rounded-[8px] border border-ltb font-sora text-[12.5px] text-lttm flex items-center gap-1.5"
          >
            <RotateCcw size={13} /> Reabrir
          </button>
        </div>
      )}

      {mode === 'link' && (
        <div className="border-t border-ltb pt-4 flex flex-col gap-3">
          <p className="font-sora text-[12.5px] text-lttm">
            ¿A qué sistema del inventario corresponde este activo? A partir de la vinculación,
            sus cambios aparecerán en la cronología de ese sistema.
          </p>
          <div className="flex gap-2">
            <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className={inputCls}>
              <option value="">Selecciona un sistema…</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button
              onClick={() => run(() => linkDiscovery(row.id, systemId))}
              disabled={pending || !systemId}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 whitespace-nowrap"
            >
              Vincular
            </button>
            <button onClick={() => setMode('idle')} className="px-3 py-2 font-sora text-[13px] text-lttm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === 'ignore' && (
        <div className="border-t border-ltb pt-4 flex flex-col gap-3">
          <p className="font-sora text-[12.5px] text-lttm">
            Explica por qué este activo no es un sistema de IA sujeto a gobernanza.
            Esta justificación es la que verá un auditor.
          </p>
          <div className="flex gap-2">
            <input
              type="text" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="Ej. Modelo de pruebas internas, sin uso productivo"
              className={inputCls}
            />
            <button
              onClick={() => run(() => ignoreDiscovery(row.id, reason))}
              disabled={pending || !reason.trim()}
              className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] disabled:opacity-50 whitespace-nowrap"
            >
              Descartar
            </button>
            <button onClick={() => setMode('idle')} className="px-3 py-2 font-sora text-[13px] text-lttm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {mode === 'create' && (
        <div className="border-t border-ltb pt-4 flex flex-col gap-3">
          <p className="font-sora text-[12.5px] text-lttm">
            Se crea el sistema con lo mínimo imprescindible. Después te llevamos a su ficha
            para clasificarlo y completar el expediente.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <input
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre del sistema" className={inputCls}
            />
            <select value={newDomain} onChange={(e) => setNewDomain(e.target.value)} className={inputCls}>
              {DOMAINS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={inputCls}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => run(() => createSystemFromDiscovery(row.id, {
                name: newName, domain: newDomain, status: newStatus,
              }))}
              disabled={pending || !newName.trim()}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-1.5"
            >
              {pending && <Loader2 size={13} className="animate-spin" />}
              Crear y vincular <ChevronRight size={13} />
            </button>
            <button onClick={() => setMode('idle')} className="px-3 py-2 font-sora text-[13px] text-lttm">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertCircle size={13} /> {error}
        </p>
      )}
    </div>
  )
}

// ── Página ────────────────────────────────────────────────────────────────────

export function DescubrimientosClient({
  initial, systems,
}: {
  initial: Record<DiscoveryRow['status'], DiscoveryRow[]>
  systems: SystemOption[]
}) {
  const router = useRouter()
  const [tab, setTab] = useState<DiscoveryRow['status']>('pending')

  const rows = initial[tab] ?? []

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <div>
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
          <Radar size={12} /> Inventario · Descubrimientos
        </p>
        <h1 className="font-fraunces text-[26px] text-ltt mt-1">Descubrimientos</h1>
        <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
          Activos que los conectores han encontrado en tus sistemas externos.
          Nada entra en el inventario automáticamente: decide si cada uno corresponde
          a un sistema de IA de la organización, o descártalo indicando por qué.
        </p>
      </div>

      <div className="flex gap-1 border-b border-ltb">
        {TABS.map((t) => {
          const count = initial[t.key]?.length ?? 0
          const active = t.key === tab
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 font-sora text-[13px] border-b-2 -mb-px transition-colors ${
                active
                  ? 'border-brand-cyan text-ltt'
                  : 'border-transparent text-lttm hover:text-ltt'
              }`}
            >
              {t.label}
              <span className="ml-1.5 font-plex text-[11px] text-lttm">{count}</span>
            </button>
          )
        })}
      </div>

      {rows.length === 0 ? (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13px] text-lttm">
            {tab === 'pending'
              ? 'No hay descubrimientos pendientes. Los conectores activos reportarán aquí lo que encuentren.'
              : tab === 'linked'
                ? 'Todavía no has vinculado ningún descubrimiento a un sistema.'
                : 'No has descartado ningún descubrimiento.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {rows.map((row) => (
            <DiscoveryCard
              key={row.id} row={row} systems={systems}
              onDone={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
