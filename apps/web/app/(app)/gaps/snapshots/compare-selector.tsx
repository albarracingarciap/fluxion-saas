'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { GitCompare, Eye } from 'lucide-react'
import Link from 'next/link'
import { DeleteSnapshotButton } from './delete-snapshot-button'

type SnapshotRow = {
  id: string
  title: string
  created_at: string
  total: number
  critico: number
  alto: number
  medio: number
}

export function SnapshotList({ snapshots }: { snapshots: SnapshotRow[] }) {
  const router = useRouter()
  const [selected, setSelected] = useState<string[]>([])

  function toggle(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id)
      if (prev.length >= 2) return [prev[1], id]
      return [...prev, id]
    })
  }

  const canCompare = selected.length === 2

  return (
    <div className="flex flex-col gap-0">
      {/* Barra de comparación */}
      {snapshots.length >= 2 && (
        <div className="px-5 py-3 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
          <p className="font-sora text-[12px] text-ltt2">
            {selected.length === 0
              ? 'Selecciona dos snapshots para comparar'
              : selected.length === 1
                ? '1 seleccionado — selecciona otro para comparar'
                : '2 seleccionados'}
          </p>
          <button
            type="button"
            disabled={!canCompare}
            onClick={() =>
              router.push(`/gaps/snapshots/compare?a=${selected[0]}&b=${selected[1]}`)
            }
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] border border-ltb bg-ltbg text-ltt2 font-sora text-[11px] hover:border-brand-cyan hover:text-brand-cyan transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <GitCompare size={12} />
            Comparar
          </button>
        </div>
      )}

      {/* Filas */}
      <div className="divide-y divide-ltb">
        {snapshots.map((snap) => {
          const isSelected = selected.includes(snap.id)
          return (
            <div
              key={snap.id}
              className={`flex items-center gap-4 px-5 py-4 transition-colors ${isSelected ? 'bg-cyan-dim2' : 'hover:bg-ltbg'}`}
            >
              {/* Checkbox de selección */}
              {snapshots.length >= 2 && (
                <button
                  type="button"
                  onClick={() => toggle(snap.id)}
                  className={`w-5 h-5 shrink-0 rounded-[5px] border flex items-center justify-center transition-colors ${
                    isSelected
                      ? 'bg-brand-cyan border-brand-cyan text-white'
                      : 'border-ltb bg-ltbg hover:border-brand-cyan'
                  }`}
                  aria-label={isSelected ? 'Deseleccionar' : 'Seleccionar para comparar'}
                >
                  {isSelected && (
                    <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                      <path
                        d="M1 4l3 3 5-6"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              )}

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-sora text-[13px] font-semibold text-ltt truncate">{snap.title}</p>
                <p className="font-sora text-[11px] text-lttm mt-0.5">
                  {new Date(snap.created_at).toLocaleString('es-ES', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </p>
              </div>

              {/* Counters */}
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-plex text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-red-dim text-re border border-reb">
                  {snap.critico}C
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-ordim text-or border border-orb">
                  {snap.alto}A
                </span>
                <span className="font-plex text-[10px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded bg-cyan-dim text-brand-cyan border border-cyan-border">
                  {snap.medio}M
                </span>
                <span className="font-sora text-[11px] text-lttm w-14 text-right">
                  {snap.total} gaps
                </span>
              </div>

              {/* Acciones */}
              <div className="flex items-center gap-1 shrink-0">
                <Link
                  href={`/gaps/snapshots/${snap.id}`}
                  className="w-7 h-7 flex items-center justify-center rounded-[7px] text-lttm hover:text-brand-cyan hover:bg-cyan-dim2 transition-colors"
                  title="Ver snapshot"
                >
                  <Eye size={13} />
                </Link>
                <DeleteSnapshotButton snapshotId={snap.id} snapshotTitle={snap.title} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
