'use client';

import { useMemo, useState } from 'react';
import { History, GitCommit, Zap, ChevronDown, Maximize2 } from 'lucide-react';

import type { PlanSnapshot, PlanActionEvent } from '@/lib/fmea/treatment-plan';
import { PlanSnapshotModal } from './plan-snapshot-modal';

// ─── Labels ──────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  submitted_for_review: 'Enviado a aprobación',
  approved: 'Aprobado',
  rejected: 'Devuelto al autor',
  started: 'Ejecución iniciada',
  closed: 'Plan cerrado',
  superseded: 'Reemplazado por nuevo plan',
};

const EVENT_LABELS: Record<string, string> = {
  option_selected: 'Opción seleccionada',
  owner_changed: 'Responsable cambiado',
  duedate_changed: 'Fecha objetivo cambiada',
  residual_target_changed: 'S residual objetivo cambiado',
  residual_achieved_recorded: 'S residual alcanzado registrado',
  slippage_accepted: 'Slippage aceptado',
  task_status_changed: 'Tarea actualizada',
  closed: 'Acción cerrada',
};

const OPTION_LABELS: Record<string, string> = {
  mitigar: 'Mitigar',
  aceptar: 'Aceptar',
  transferir: 'Transferir',
  evitar: 'Evitar',
  diferir: 'Diferir',
};

const TASK_STATUS_LABELS: Record<string, string> = {
  todo: 'Pendiente',
  in_progress: 'En progreso',
  done: 'Completada',
  cancelled: 'Cancelada',
};

const PLAN_STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  in_review: 'En revisión',
  approved: 'Aprobado',
  in_progress: 'En ejecución',
  closed: 'Cerrado',
  superseded: 'Reemplazado',
};

// ─── Types ───────────────────────────────────────────────────────────────────

type HistoryEntry =
  | { kind: 'snapshot'; id: string; ts: string; data: PlanSnapshot }
  | { kind: 'action_event'; id: string; ts: string; data: PlanActionEvent };

type FilterKey = 'all' | 'snapshots' | 'action_events';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'snapshots', label: 'Transiciones de estado' },
  { key: 'action_events', label: 'Decisiones de acción' },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmt(value: string) {
  return new Date(value).toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function dateBucket(ts: string) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - ((today.getDay() + 6) % 7));

  const d = new Date(ts);
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  if (midnight.getTime() === today.getTime()) return 'Hoy';
  if (midnight.getTime() === yesterday.getTime()) return 'Ayer';
  if (midnight >= weekStart) return 'Esta semana';
  return midnight.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}

// ─── Delta renderer ──────────────────────────────────────────────────────────

function renderValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (key === 'option' && typeof value === 'string') return OPTION_LABELS[value] ?? value;
  if (key === 'task_status' && typeof value === 'string') return TASK_STATUS_LABELS[value] ?? value;
  if (key === 'due_date' && typeof value === 'string') {
    return new Date(`${value}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
  }
  if (key === 'owner_id' || key === 'actor_user_id') return String(value).slice(0, 8) + '…';
  return String(value);
}

const FIELD_LABELS: Record<string, string> = {
  option: 'Opción',
  owner_id: 'Responsable (ID)',
  due_date: 'Fecha objetivo',
  s_residual_target: 'S residual objetivo',
  s_residual_achieved: 'S residual alcanzado',
  control_id: 'Control',
  justification: 'Justificación',
  task_status: 'Estado tarea',
  task_id: 'Tarea',
  status: 'Estado',
};

function DeltaRow({ label, before, after }: { label: string; before: string; after: string }) {
  const changed = before !== after;
  return (
    <div className="flex items-start gap-2 text-[11px] font-plex">
      <span className="text-lttm w-28 shrink-0">{label}</span>
      {changed ? (
        <span className="flex items-center gap-1.5 flex-wrap">
          <span className="line-through text-lttm">{before}</span>
          <span className="text-lttm">→</span>
          <span className="font-semibold text-ltt">{after}</span>
        </span>
      ) : (
        <span className="text-ltt2">{after}</span>
      )}
    </div>
  );
}

function ActionEventDetail({ data }: { data: PlanActionEvent }) {
  const allKeys = new Set([
    ...Object.keys(data.before_state),
    ...Object.keys(data.after_state),
  ]);
  const rows = Array.from(allKeys)
    .filter((k) => k !== 'task_id')
    .map((k) => ({
      key: k,
      label: FIELD_LABELS[k] ?? k,
      before: renderValue(k, data.before_state[k]),
      after: renderValue(k, data.after_state[k]),
    }));

  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <DeltaRow key={r.key} label={r.label} before={r.before} after={r.after} />
      ))}
      {data.justification && (
        <div className="mt-2 pt-2 border-t border-ltb">
          <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block mb-1">Justificación</span>
          <p className="font-sora text-[12px] text-ltt2 leading-relaxed">{data.justification}</p>
        </div>
      )}
    </div>
  );
}

function SnapshotDetail({ data }: { data: PlanSnapshot }) {
  const ps = data.plan_state as Record<string, unknown>;
  const actionsCount = Array.isArray(data.actions_state) ? data.actions_state.length : 0;
  const meta = data.metadata as Record<string, unknown>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        {Boolean(ps.status) && (
          <div>
            <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block">Estado</span>
            <span className="font-sora text-[12px] text-ltt">{PLAN_STATUS_LABELS[ps.status as string] ?? String(ps.status)}</span>
          </div>
        )}
        {Boolean(ps.zone_at_creation) && (
          <div>
            <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block">Zona creación</span>
            <span className="font-sora text-[12px] text-ltt">{String(ps.zone_at_creation).toUpperCase().replace('_', ' ')}</span>
          </div>
        )}
        {Boolean(ps.zone_target) && (
          <div>
            <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block">Zona objetivo</span>
            <span className="font-sora text-[12px] text-ltt">{String(ps.zone_target).toUpperCase().replace('_', ' ')}</span>
          </div>
        )}
        {Boolean(ps.deadline) && (
          <div>
            <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block">Deadline</span>
            <span className="font-sora text-[12px] text-ltt">
              {new Date(`${String(ps.deadline)}T00:00:00`).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
            </span>
          </div>
        )}
        {Boolean(ps.approval_level) && (
          <div>
            <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block">Nivel aprobación</span>
            <span className="font-sora text-[12px] text-ltt">{String(ps.approval_level)}</span>
          </div>
        )}
        <div>
          <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block">Acciones capturadas</span>
          <span className="font-sora text-[12px] text-ltt">{actionsCount}</span>
        </div>
      </div>
      {Boolean(meta.rejection_reason) && (
        <div className="pt-2 border-t border-ltb">
          <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block mb-1">Motivo de devolución</span>
          <p className="font-sora text-[12px] text-ltt2 leading-relaxed">{String(meta.rejection_reason)}</p>
        </div>
      )}
      {Boolean(meta.committee_notes) && (
        <div className="pt-2 border-t border-ltb">
          <span className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm block mb-1">Notas de comité</span>
          <p className="font-sora text-[12px] text-ltt2 leading-relaxed">{String(meta.committee_notes)}</p>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function PlanHistoryTab({
  snapshots,
  actionEvents,
}: {
  snapshots: PlanSnapshot[];
  actionEvents: PlanActionEvent[];
}) {
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [modalSnapshot, setModalSnapshot] = useState<PlanSnapshot | null>(null);

  const allEntries = useMemo<HistoryEntry[]>(() => {
    const snaps: HistoryEntry[] = snapshots.map((s) => ({
      kind: 'snapshot',
      id: s.id,
      ts: s.captured_at,
      data: s,
    }));
    const evts: HistoryEntry[] = actionEvents.map((e) => ({
      kind: 'action_event',
      id: e.id,
      ts: e.occurred_at,
      data: e,
    }));
    return [...snaps, ...evts].sort((a, b) => b.ts.localeCompare(a.ts));
  }, [snapshots, actionEvents]);

  const filtered = useMemo(() => {
    if (activeFilter === 'all') return allEntries;
    if (activeFilter === 'snapshots') return allEntries.filter((e) => e.kind === 'snapshot');
    return allEntries.filter((e) => e.kind === 'action_event');
  }, [allEntries, activeFilter]);

  const grouped = useMemo(() => {
    const buckets = new Map<string, HistoryEntry[]>();
    for (const entry of filtered) {
      const label = dateBucket(entry.ts);
      if (!buckets.has(label)) buckets.set(label, []);
      buckets.get(label)!.push(entry);
    }
    return Array.from(buckets.entries()).map(([label, entries]) => ({ label, entries }));
  }, [filtered]);

  function toggle(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  const snapshotCount = snapshots.length;
  const eventCount = actionEvents.length;

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
      {/* Header */}
      <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
        <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
          Historial de auditoría
        </span>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
            <GitCommit className="w-3 h-3" />
            {snapshotCount} snapshots
          </span>
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
            <Zap className="w-3 h-3" />
            {eventCount} decisiones
          </span>
        </div>
      </div>

      {/* Filtros */}
      {allEntries.length > 0 && (
        <div className="px-5 py-3 flex gap-2 flex-wrap border-b border-ltb bg-ltbg">
          {FILTERS.map((f) => {
            const count =
              f.key === 'all'
                ? allEntries.length
                : f.key === 'snapshots'
                ? snapshotCount
                : eventCount;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-[6px] font-plex text-[10.5px] font-medium border transition-all ${
                  activeFilter === f.key
                    ? 'bg-brand-blue text-white border-brand-blue'
                    : 'bg-ltcard text-lttm border-ltb hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                {f.label}
                <span className={`text-[9.5px] ${activeFilter === f.key ? 'opacity-75' : 'opacity-50'}`}>
                  ({count})
                </span>
              </button>
            );
          })}
        </div>
      )}

      {/* Timeline */}
      <div className="p-5">
        {allEntries.length === 0 ? (
          <div className="py-10 text-center">
            <History className="w-8 h-8 text-lttm mx-auto mb-3 opacity-40" />
            <p className="font-sora text-[13px] text-lttm">
              Aún no hay eventos en el historial de este plan.
            </p>
            <p className="font-sora text-[12px] text-lttm opacity-60 mt-1">
              Los eventos aparecerán cuando se realicen transiciones o decisiones.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-8 text-center font-sora text-[13px] text-lttm">
            Sin eventos en esta categoría
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((group) => (
              <div key={group.label}>
                <div className="flex items-center gap-3 mb-4">
                  <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm whitespace-nowrap">
                    {group.label}
                  </span>
                  <div className="flex-1 h-px bg-ltb" />
                </div>

                <div className="space-y-3">
                  {group.entries.map((entry, index, arr) => {
                    const isSnap = entry.kind === 'snapshot';
                    const expanded = expandedIds.has(entry.id);

                    const title = isSnap
                      ? TRIGGER_LABELS[(entry.data as PlanSnapshot).trigger] ?? (entry.data as PlanSnapshot).trigger
                      : EVENT_LABELS[(entry.data as PlanActionEvent).event_type] ?? (entry.data as PlanActionEvent).event_type;

                    const actor = isSnap
                      ? (entry.data as PlanSnapshot).actor_name
                      : (entry.data as PlanActionEvent).actor_name;

                    const iconBg = isSnap
                      ? 'bg-[#e8f0fe] border-[#a8c0fa] text-brand-blue'
                      : 'bg-ltcard2 border-ltb text-lttm';

                    const badge = isSnap
                      ? 'bg-[#e8f0fe] border-[#a8c0fa] text-brand-blue'
                      : 'bg-ltcard2 border-ltb text-lttm';

                    const badgeLabel = isSnap ? 'Snapshot' : 'Evento';

                    return (
                      <div key={entry.id} className="relative pl-8">
                        {index !== arr.length - 1 && (
                          <div className="absolute left-[11px] top-7 bottom-[-14px] w-px bg-ltb" />
                        )}
                        <div
                          className={`absolute left-0 top-1.5 w-[22px] h-[22px] rounded-full border flex items-center justify-center ${iconBg}`}
                        >
                          {isSnap ? (
                            <GitCommit className="w-3 h-3" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                        </div>

                        <div
                          className="border border-ltb rounded-[10px] bg-ltbg cursor-pointer hover:border-[#004aad30] transition-colors"
                          onClick={() => toggle(entry.id)}
                        >
                          <div className="p-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className="font-sora text-[13px] font-semibold text-ltt">
                                    {title}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${badge}`}
                                  >
                                    {badgeLabel}
                                  </span>
                                </div>
                                {!isSnap && (
                                  <p className="font-plex text-[10.5px] text-lttm">
                                    Acción: <span className="font-mono">{(entry.data as PlanActionEvent).action_id.slice(0, 8)}…</span>
                                  </p>
                                )}
                              </div>
                              <div className="text-right shrink-0 flex items-start gap-2">
                                <div>
                                  <div className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-lttm">
                                    {fmt(entry.ts)}
                                  </div>
                                  <div className="font-sora text-[11.5px] text-lttm mt-0.5">
                                    {actor ?? 'Usuario de la organización'}
                                  </div>
                                </div>
                                {isSnap && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setModalSnapshot(entry.data as PlanSnapshot);
                                    }}
                                    className="p-1 rounded-[6px] text-lttm hover:text-brand-blue hover:bg-[#e8f0fe] transition-colors mt-0.5"
                                    title="Ver snapshot completo"
                                  >
                                    <Maximize2 size={13} />
                                  </button>
                                )}
                                <ChevronDown
                                  size={14}
                                  className={`text-lttm mt-0.5 shrink-0 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
                                />
                              </div>
                            </div>
                          </div>

                          {expanded && (
                            <div className="px-4 pb-4 pt-3 border-t border-ltb bg-ltcard">
                              {isSnap ? (
                                <SnapshotDetail data={entry.data as PlanSnapshot} />
                              ) : (
                                <ActionEventDetail data={entry.data as PlanActionEvent} />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {modalSnapshot && (
        <PlanSnapshotModal
          snapshot={modalSnapshot}
          prevSnapshot={
            snapshots[snapshots.findIndex((s) => s.id === modalSnapshot.id) + 1] ?? null
          }
          onClose={() => setModalSnapshot(null)}
        />
      )}
    </div>
  );
}
