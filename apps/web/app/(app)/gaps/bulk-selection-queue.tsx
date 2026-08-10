'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import type { UnifiedGapRecord, GapAssignableMember, GapSeverity, GapLayer } from '@/lib/gaps/data'
import type { TaskGapStatus } from '@/lib/tasks/queries'

import { GapCard } from './gap-card'
import { BulkActionBar } from './bulk-action-bar'
import { BulkAssignModal } from './bulk-assign-modal'
import { BulkCreateTasksModal } from './bulk-create-tasks-modal'
import { BulkDispositionModal } from './bulk-disposition-modal'
import { SEVERITY_META, LAYER_META, LAYER_LABELS } from './gap-ui-constants'

type Modal = 'assign' | 'create-tasks' | 'dispose' | null

type Props = {
  paginatedGaps: UnifiedGapRecord[]
  filteredCount: number
  totalPages: number
  currentPage: number
  members: GapAssignableMember[]
  taskStatusMap: Record<string, TaskGapStatus | null>
  paginationHrefs: { prev: string; next: string; current: string }
}

export function BulkSelectionQueue({
  paginatedGaps,
  filteredCount,
  totalPages,
  currentPage,
  members,
  taskStatusMap,
  paginationHrefs,
}: Props) {
  const router = useRouter()
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [modal, setModal] = useState<Modal>(null)

  const PAGE_SIZE = 15

  const toggleSelect = useCallback((key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }, [])

  const selectedGaps = paginatedGaps.filter((g) => selectedKeys.has(g.key))

  function handleSuccess() {
    setModal(null)
    setSelectedKeys(new Set())
    router.refresh()
  }

  const critical = paginatedGaps.filter((g) => g.severity === 'critico')
  const high = paginatedGaps.filter((g) => g.severity === 'alto')
  const medium = paginatedGaps.filter((g) => g.severity === 'medio')

  return (
    <>
      <div className="p-5 space-y-6">
        <div className="rounded-[12px] border border-ltb bg-ltbg px-4 py-3">
          <p className="font-sora text-[12px] text-ltt2">
            Mostrando <span className="font-semibold text-ltt">{paginatedGaps.length}</span> de{' '}
            <span className="font-semibold text-ltt">{filteredCount}</span> gaps con el filtro actual.
          </p>
        </div>

        <SeveritySection
          severity="critico"
          items={critical}
          members={members}
          taskStatusMap={taskStatusMap}
          selectedKeys={selectedKeys}
          onToggleSelect={toggleSelect}
        />
        <SeveritySection
          severity="alto"
          items={high}
          members={members}
          taskStatusMap={taskStatusMap}
          selectedKeys={selectedKeys}
          onToggleSelect={toggleSelect}
        />
        <SeveritySection
          severity="medio"
          items={medium}
          members={members}
          taskStatusMap={taskStatusMap}
          selectedKeys={selectedKeys}
          onToggleSelect={toggleSelect}
        />

        {filteredCount > PAGE_SIZE && (
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <p className="font-sora text-[12px] text-lttm">
              Página <span className="font-semibold text-ltt">{currentPage}</span> de{' '}
              <span className="font-semibold text-ltt">{totalPages}</span>
            </p>
            <div className="flex items-center gap-2">
              <Link
                href={paginationHrefs.prev}
                className={`px-3 py-2 rounded-[8px] border font-sora text-[12px] transition-colors ${
                  currentPage <= 1
                    ? 'pointer-events-none bg-ltcard text-lttm border-ltb opacity-60'
                    : 'bg-ltbg text-ltt border-ltb hover:border-cyan-border'
                }`}
              >
                Anterior
              </Link>
              <div className="px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-plex text-[11px] uppercase tracking-[0.7px] text-lttm">
                {currentPage} / {totalPages}
              </div>
              <Link
                href={paginationHrefs.next}
                className={`px-3 py-2 rounded-[8px] border font-sora text-[12px] transition-colors ${
                  currentPage >= totalPages
                    ? 'pointer-events-none bg-ltcard text-lttm border-ltb opacity-60'
                    : 'bg-ltbg text-ltt border-ltb hover:border-cyan-border'
                }`}
              >
                Siguiente
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Barra de acciones bulk */}
      {selectedGaps.length > 0 && (
        <BulkActionBar
          selectedGaps={selectedGaps}
          members={members}
          onClear={() => setSelectedKeys(new Set())}
          onAssign={() => setModal('assign')}
          onCreateTasks={() => setModal('create-tasks')}
          onDispose={() => setModal('dispose')}
        />
      )}

      {/* Modales */}
      {modal === 'assign' && (
        <BulkAssignModal
          selectedGaps={selectedGaps}
          members={members}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
      {modal === 'create-tasks' && (
        <BulkCreateTasksModal
          selectedGaps={selectedGaps}
          members={members}
          taskStatusMap={taskStatusMap}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
      {modal === 'dispose' && (
        <BulkDispositionModal
          selectedGaps={selectedGaps}
          onClose={() => setModal(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  )
}

function SeveritySection({
  severity,
  items,
  members,
  taskStatusMap,
  selectedKeys,
  onToggleSelect,
}: {
  severity: GapSeverity
  items: UnifiedGapRecord[]
  members: GapAssignableMember[]
  taskStatusMap: Record<string, TaskGapStatus | null>
  selectedKeys: Set<string>
  onToggleSelect: (key: string) => void
}) {
  if (items.length === 0) return null

  const meta = SEVERITY_META[severity]
  const layerBreakdown = (['normativo', 'fmea', 'control', 'caducidad'] as GapLayer[])
    .map((layer) => ({ layer, count: items.filter((item) => item.layer === layer).length }))
    .filter((entry) => entry.count > 0)

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-3">
        <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm font-semibold">
          {meta.section}
        </span>
        <span className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${meta.badge}`}>
          {items.length} gaps
        </span>
        {layerBreakdown.map((entry) => (
          <span
            key={`${severity}-${entry.layer}`}
            className={`font-plex text-[10px] uppercase tracking-[0.7px] px-2 py-1 rounded-full border ${LAYER_META[entry.layer].pill}`}
          >
            {LAYER_LABELS[entry.layer]} {entry.count}
          </span>
        ))}
      </div>
      <div className="space-y-3">
        {items.map((gap) => (
          <GapCard
            key={gap.key}
            gap={gap}
            members={members}
            taskStatus={taskStatusMap[gap.id] ?? null}
            selected={selectedKeys.has(gap.key)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </div>
    </div>
  )
}
