'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Loader2,
  Save,
  UserPlus,
  X,
} from 'lucide-react';

import type { FmeaEvaluationData, FmeaEvaluationItemRecord, FmeaItemHistoryEntry } from '@/lib/fmea/data';
import type { TaskPriority } from '@/lib/tasks/types';
import { TASK_PRIORITY_LABELS, TASK_STATUS_LABELS } from '@/lib/tasks/types';
import {
  calculateFmeaZone,
  calculateSuggestedSActual,
  getFmeaProgress,
  getSeverityClasses,
  getZoneClasses,
  getZoneLabel,
  requiresJustification,
} from '@/lib/fmea/domain';
import type { SystemCausalGraph } from '@/lib/causal-graph/system-graph';

import { bulkResetFmeaItemsAction, bulkSkipFmeaItemsAction, delegateFmeaItemAsTaskAction, resolveFmeaSecondReview, saveFmeaDraft, saveFmeaItem, submitFmeaForReview } from './actions';

const DIMENSION_META: Record<string, { label: string; badge: string }> = {
  tecnica: { label: 'Técnica', badge: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  seguridad: { label: 'Seguridad', badge: 'bg-ordim border-orb text-or' },
  etica: { label: 'Ética', badge: 'bg-red-dim border-reb text-re' },
  gobernanza: { label: 'Gobernanza', badge: 'bg-[#f1ebff] border-[#d2c1ff] text-[#8850ff]' },
  roi: { label: 'ROI', badge: 'bg-grdim border-grb text-gr' },
  legal_b: { label: 'Legal tipo B', badge: 'bg-[#fff8da] border-[#f1dd8d] text-[#8f6a00]' },
};

const CONTROL_STATUS_META: Record<string, { label: string; pill: string }> = {
  planned: { label: 'Planificado', pill: 'bg-ltcard2 border-ltb text-lttm' },
  partial: { label: 'Parcial', pill: 'bg-ordim border-orb text-or' },
  implemented: { label: 'Implementado', pill: 'bg-grdim border-grb text-gr' },
  excluded: { label: 'Excluido', pill: 'bg-ltcard2 border-ltb text-lttm' },
};

const ITEM_STATUS_META: Record<
  'pending' | 'evaluated' | 'skipped',
  { label: string; dot: string; pill: string }
> = {
  pending: {
    label: 'Pendiente',
    dot: 'border border-ltb bg-white',
    pill: 'bg-ltcard border-ltb text-lttm',
  },
  evaluated: {
    label: 'Confirmado',
    dot: 'bg-gr',
    pill: 'bg-grdim border-grb text-gr',
  },
  skipped: {
    label: 'Pospuesto',
    dot: 'bg-[#7c5cff]',
    pill: 'bg-[#f1ebff] border-[#d2c1ff] text-[#7c5cff]',
  },
};

type FilterValue = 'all' | 'pending' | 'evaluated' | 'skipped' | 'high_severity' | string;

type EditableItemState = FmeaEvaluationItemRecord & {
  manualSActual: number | null;
  manualMode: boolean;
};

const SECOND_REVIEW_STATUS_META: Record<
  'not_required' | 'pending' | 'approved' | 'rejected',
  { label: string; pill: string }
> = {
  not_required: {
    label: 'Sin 2ª revisión',
    pill: 'bg-ltcard border-ltb text-lttm',
  },
  pending: {
    label: '2ª revisión pendiente',
    pill: 'bg-ordim border-orb text-or',
  },
  approved: {
    label: '2ª revisión aprobada',
    pill: 'bg-grdim border-grb text-gr',
  },
  rejected: {
    label: '2ª revisión rechazada',
    pill: 'bg-red-dim border-reb text-re',
  },
};

const TASK_STATUS_PILL: Record<string, string> = {
  todo:        'bg-ltcard border-ltb text-lttm',
  in_progress: 'bg-cyan-dim border-cyan-border text-brand-cyan',
  blocked:     'bg-red-dim border-reb text-re',
  in_review:   'bg-ordim border-orb text-or',
  done:        'bg-grdim border-grb text-gr',
  cancelled:   'bg-ltcard2 border-ltb text-lttm',
};

function FmeaODHeatmap({ items }: { items: EditableItemState[] }) {
  const evaluated = items.filter(
    (item) => item.status === 'evaluated' && item.o_value !== null && item.d_real_value !== null
  );

  if (evaluated.length === 0) {
    return (
      <div className="font-sora text-[12.5px] text-lttm text-center py-4">
        El mapa de calor estará disponible cuando haya modos evaluados con O y D real.
      </div>
    );
  }

  // cell[o][d] = list of s_actual values (o,d: 1-5 index 0-4)
  const cells: (number[] | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
  for (const item of evaluated) {
    const oIdx = (item.o_value as number) - 1;
    const dIdx = (item.d_real_value as number) - 1;
    if (oIdx < 0 || oIdx > 4 || dIdx < 0 || dIdx > 4) continue;
    if (cells[oIdx][dIdx] === null) cells[oIdx][dIdx] = [];
    (cells[oIdx][dIdx] as number[]).push(item.s_actual ?? item.s_default_frozen);
  }

  function cellBg(bucket: number[] | null): string {
    if (!bucket || bucket.length === 0) return 'bg-ltbg';
    const max = Math.max(...bucket);
    if (max === 9) return 'bg-[rgba(217,45,32,0.85)] text-white';
    if (max === 8) return 'bg-[rgba(217,45,32,0.55)] text-white';
    if (max >= 6) return 'bg-[rgba(245,158,11,0.55)] text-white';
    if (max >= 4) return 'bg-[rgba(245,158,11,0.25)]';
    return 'bg-[rgba(34,197,94,0.25)]';
  }

  return (
    <div>
      <div className="flex items-end gap-2 mb-2">
        <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">D_real →</div>
        <div className="grid grid-cols-5 gap-1 flex-1">
          {[1, 2, 3, 4, 5].map((d) => (
            <div key={d} className="text-center font-plex text-[10px] text-lttm">{d}</div>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <div className="flex flex-col gap-1 justify-around">
          {[1, 2, 3, 4, 5].map((o) => (
            <div key={o} className="font-plex text-[10px] text-lttm w-5 text-right">{o}</div>
          ))}
        </div>
        <div className="flex-1">
          <div className="space-y-1">
            {[0, 1, 2, 3, 4].map((oIdx) => (
              <div key={oIdx} className="grid grid-cols-5 gap-1">
                {[0, 1, 2, 3, 4].map((dIdx) => {
                  const bucket = cells[oIdx][dIdx];
                  const count = bucket?.length ?? 0;
                  return (
                    <div
                      key={dIdx}
                      title={count > 0 ? `O=${oIdx + 1}, D=${dIdx + 1}: ${count} modo${count > 1 ? 's' : ''}` : undefined}
                      className={`aspect-square rounded-[5px] border border-ltb flex items-center justify-center font-plex text-[11px] font-medium transition-colors ${cellBg(bucket)}`}
                    >
                      {count > 0 ? count : ''}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="font-plex text-[10px] text-lttm flex items-center" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
          O ↑
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3 flex-wrap">
        <div className="font-plex text-[9.5px] text-lttm">{evaluated.length} modos evaluados</div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[rgba(34,197,94,0.25)] border border-ltb" />
          <span className="font-plex text-[9.5px] text-lttm">Bajo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[rgba(245,158,11,0.55)] border border-ltb" />
          <span className="font-plex text-[9.5px] text-lttm">Medio</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-[3px] bg-[rgba(217,45,32,0.85)] border border-ltb" />
          <span className="font-plex text-[9.5px] text-lttm">Crítico</span>
        </div>
      </div>
    </div>
  );
}

const HISTORY_EVENT_META: Record<FmeaItemHistoryEntry['event_type'], { label: string; dot: string }> = {
  evaluated:               { label: 'Confirmado',          dot: 'bg-gr' },
  skipped:                 { label: 'Pospuesto',           dot: 'bg-[#7c5cff]' },
  second_review_approved:  { label: '2ª revisión aprobada', dot: 'bg-gr' },
  second_review_rejected:  { label: '2ª revisión rechazada', dot: 'bg-re' },
};

function formatHistoryDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function ItemHistoryTimeline({ history }: { history: FmeaItemHistoryEntry[] }) {
  if (history.length === 0) {
    return (
      <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
        Aún no hay cambios registrados para este modo de fallo.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {history.map((entry) => {
        const meta = HISTORY_EVENT_META[entry.event_type];
        const hasValueDelta =
          entry.prev_o !== entry.new_o ||
          entry.prev_d !== entry.new_d ||
          entry.prev_s_actual !== entry.new_s_actual;

        return (
          <div key={entry.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={`mt-1 w-2 h-2 rounded-full shrink-0 ${meta.dot}`} />
              <span className="w-px flex-1 bg-ltb mt-1" />
            </div>
            <div className="pb-3 min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sora text-[12.5px] font-medium text-ltt">{meta.label}</span>
                <span className="font-plex text-[10.5px] text-lttm">
                  {entry.actor_name ?? 'Usuario'}
                </span>
              </div>
              <div className="flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3 text-lttm shrink-0" />
                <span className="font-plex text-[10.5px] text-lttm">{formatHistoryDate(entry.changed_at)}</span>
              </div>
              {hasValueDelta && (
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {entry.prev_o !== entry.new_o && entry.new_o !== null && (
                    <span className="inline-flex items-center gap-1 font-plex text-[10.5px] text-ltt2 bg-ltbg border border-ltb px-2 py-0.5 rounded-[6px]">
                      O: <span className="text-lttm line-through">{entry.prev_o ?? '—'}</span>
                      <span className="text-ltt font-medium">→ {entry.new_o}</span>
                    </span>
                  )}
                  {entry.prev_d !== entry.new_d && entry.new_d !== null && (
                    <span className="inline-flex items-center gap-1 font-plex text-[10.5px] text-ltt2 bg-ltbg border border-ltb px-2 py-0.5 rounded-[6px]">
                      D: <span className="text-lttm line-through">{entry.prev_d ?? '—'}</span>
                      <span className="text-ltt font-medium">→ {entry.new_d}</span>
                    </span>
                  )}
                  {entry.prev_s_actual !== entry.new_s_actual && entry.new_s_actual !== null && (
                    <span className="inline-flex items-center gap-1 font-plex text-[10.5px] text-ltt2 bg-ltbg border border-ltb px-2 py-0.5 rounded-[6px]">
                      S: <span className="text-lttm line-through">{entry.prev_s_actual ?? '—'}</span>
                      <span className="text-ltt font-medium">→ {entry.new_s_actual}</span>
                    </span>
                  )}
                </div>
              )}
              {entry.notes && (
                <div className="mt-1.5 font-sora text-[12px] text-ltt2 leading-relaxed line-clamp-3">
                  {entry.notes}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

type DelegateTaskSectionProps = {
  item: EditableItemState;
  aiSystemId: string;
  evaluationId: string;
  members: FmeaEvaluationData['members'];
  readOnly: boolean;
  onTaskCreated: (itemId: string, taskId: string) => void;
};

function DelegateTaskSection({ item, aiSystemId, evaluationId, members, readOnly, onTaskCreated }: DelegateTaskSectionProps) {
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState(`Evaluar modo: ${item.failure_mode_name}`);
  const [assigneeId, setAssigneeId] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasTask = item.linked_task_id !== null;

  if (hasTask) {
    const taskStatusLabel = item.linked_task_status ? (TASK_STATUS_LABELS[item.linked_task_status as keyof typeof TASK_STATUS_LABELS] ?? item.linked_task_status) : '—';
    const taskStatusPill = TASK_STATUS_PILL[item.linked_task_status ?? ''] ?? TASK_STATUS_PILL.todo;

    return (
      <div className="mt-4 rounded-[10px] border border-ltb bg-ltbg p-4">
        <div className="flex items-center justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-lttm shrink-0" />
            <span className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm">Tarea delegada</span>
          </div>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${taskStatusPill}`}>
            {taskStatusLabel}
          </span>
        </div>
        <div className="space-y-1 font-sora text-[12.5px] text-ltt2">
          {item.linked_task_assignee_name && (
            <div><span className="text-ltt font-medium">Asignado a:</span> {item.linked_task_assignee_name}</div>
          )}
          {item.linked_task_due_date && (
            <div><span className="text-ltt font-medium">Fecha límite:</span> {item.linked_task_due_date}</div>
          )}
        </div>
        <Link
          href="/tareas"
          className="mt-3 inline-flex items-center gap-1.5 font-sora text-[12px] text-brand-cyan hover:underline"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ver en Tareas
        </Link>
      </div>
    );
  }

  if (readOnly) return null;

  return (
    <div className="mt-4 rounded-[10px] border border-ltb bg-ltbg p-4">
      {!showForm ? (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-2 font-sora text-[12.5px] text-ltt2 hover:text-brand-cyan transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Delegar como tarea
        </button>
      ) : (
        <div className="space-y-3">
          <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">Delegar modo de fallo como tarea</div>

          <div>
            <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Título</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Asignar a</label>
              <select
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
                className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
              >
                <option value="">Sin asignar</option>
                {members.map((member) => (
                  <option key={member.user_id} value={member.user_id}>
                    {member.full_name ?? member.user_id.slice(0, 8)} ({member.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Prioridad</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
              >
                {(Object.entries(TASK_PRIORITY_LABELS) as [TaskPriority, string][]).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Fecha límite (opcional)</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-re font-sora text-[12px]">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={isPending || !title.trim()}
              onClick={() => {
                setError(null);
                startTransition(async () => {
                  const result = await delegateFmeaItemAsTaskAction({
                    aiSystemId,
                    evaluationId,
                    itemId: item.id,
                    title: title.trim(),
                    assigneeId: assigneeId || null,
                    priority,
                    dueDate: dueDate || null,
                  });
                  if (result?.error) {
                    setError(result.error);
                    return;
                  }
                  if (result?.taskId) {
                    onTaskCreated(item.id, result.taskId);
                  }
                  setShowForm(false);
                });
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              Crear tarea
            </button>
            <button
              type="button"
              onClick={() => { setShowForm(false); setError(null); }}
              className="font-sora text-[12.5px] text-lttm hover:text-ltt transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function getContextLabel(value: number | null, kind: 'o' | 'd') {
  if (value === null) return 'Sin evaluar';
  if (value <= 2) return kind === 'o' ? 'Improbable' : 'Detectable';
  if (value === 3) return 'Moderado';
  return kind === 'o' ? 'Probable' : 'Difícil de detectar';
}

function getNormalizedOValue(value: number | null) {
  return value ?? 3;
}

function getNormalizedDRealValue(value: number | null) {
  return value ?? 3;
}

function buildInitialState(items: FmeaEvaluationItemRecord[]): EditableItemState[] {
  return items.map((item) => ({
    ...item,
    manualSActual: item.s_actual,
    manualMode: item.s_actual !== null && item.s_actual !== calculateSuggestedSActual({
      oValue: getNormalizedOValue(item.o_value),
      dRealValue: getNormalizedDRealValue(item.d_real_value),
      sDefault: item.s_default_frozen,
    }),
  }));
}

function getComparableItemSignature(item: EditableItemState) {
  return JSON.stringify({
    id: item.id,
    o_value: item.o_value,
    d_real_value: item.d_real_value,
    s_actual: item.s_actual,
    narrative_justification: item.narrative_justification ?? '',
    status: item.status,
    requires_second_review: item.requires_second_review,
    second_review_status: item.second_review_status,
    second_reviewed_by: item.second_reviewed_by,
    second_reviewed_at: item.second_reviewed_at,
    second_review_notes: item.second_review_notes ?? '',
    manualSActual: item.manualSActual,
    manualMode: item.manualMode,
  });
}

function getZoneNarrative(zone: ReturnType<typeof calculateFmeaZone>) {
  switch (zone) {
    case 'zona_i':
      return 'Zona I · requiere escalado';
    case 'zona_ii':
      return 'Zona II · revisión prioritaria';
    case 'zona_iii':
      return 'Zona III · seguimiento';
    case 'zona_iv':
    default:
      return 'Zona IV · estable';
  }
}

function getAiActLabel(level: string | null) {
  switch (level) {
    case 'prohibited':
      return 'Prohibido';
    case 'high':
      return 'Alto riesgo';
    case 'limited':
      return 'Riesgo limitado';
    case 'minimal':
      return 'Riesgo mínimo';
    case 'gpai':
      return 'GPAI';
    case 'pending':
      return 'Pendiente';
    default:
      return level ?? '—';
  }
}

function getDimensionGuidance(dimensionId: string) {
  switch (dimensionId) {
    case 'seguridad':
      return 'Valora O y D_real frente a exposición operativa, superficie de ataque y controles ya implantados.';
    case 'etica':
      return 'Pon el foco en impacto sobre personas, sesgos, explicabilidad y consecuencias no deseadas del sistema.';
    case 'legal_b':
      return 'Revisa si el uso previsto, la trazabilidad y la documentación actual sostienen el cumplimiento exigible.';
    case 'gobernanza':
      return 'Evalúa si la supervisión humana, la trazabilidad y la responsabilidad operativa son realmente viables en este sistema.';
    case 'tecnica':
      return 'Ajusta la detectabilidad según observabilidad, testing, drift y controles técnicos disponibles hoy.';
    case 'roi':
      return 'Contextualiza la ocurrencia y la detectabilidad con el valor esperado, la medición disponible y el coste de corregir.';
    default:
      return 'Ajusta O y D_real para este sistema y documenta cualquier desviación relevante respecto al prior del catálogo.';
  }
}

export function FmeaEvaluationClient({ data, causalGraph }: { data: FmeaEvaluationData; causalGraph?: SystemCausalGraph }) {
  const PAGE_SIZE = 20;
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<EditableItemState[]>(() => buildInitialState(data.items));
  const [savedItems, setSavedItems] = useState<EditableItemState[]>(() => buildInitialState(data.items));
  const [activeFilter, setActiveFilter] = useState<FilterValue>(() => {
    const requestedFamily = searchParams.get('family');
    if (requestedFamily) {
      const dimensionId = Object.keys(DIMENSION_META).find(
        (key) => DIMENSION_META[key].label === requestedFamily
      );
      if (dimensionId) return dimensionId;
    }
    return 'all';
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(() => {
    const requestedItemId = searchParams.get('item');
    if (requestedItemId && data.items.some((item) => item.id === requestedItemId)) {
      return requestedItemId;
    }
    return data.items[0]?.id ?? null;
  });
  const [collapsedDimensions, setCollapsedDimensions] = useState<Record<string, boolean>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSavingItem, startSavingItem] = useTransition();
  const [isSavingDraft, startSavingDraft] = useTransition();
  const [isSubmittingReview, startSubmittingReview] = useTransition();
  const [isResolvingSecondReview, startResolvingSecondReview] = useTransition();
  const [isBulkActing, startBulkActing] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showHeatmap, setShowHeatmap] = useState(false);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [secondReviewDrafts, setSecondReviewDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.items.map((item) => [item.id, item.second_review_notes ?? '']))
  );
  const [pendingCausalConfirmation, setPendingCausalConfirmation] = useState<{
    item: EditableItemState;
    downstreamImpacts: {
      targetNode: NonNullable<SystemCausalGraph['nodes'][number]>;
      edgeType: string;
      modeNames: string[];
    }[];
  } | null>(null);

  const isReadOnly = data.evaluation.state === 'approved' || data.evaluation.state === 'superseded';

  function toggleSelection(itemId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => {
      if (ids.every((id) => prev.has(id))) return new Set();
      return new Set(ids);
    });
  }

  function handleBulkSkip() {
    const ids = Array.from(selectedIds);
    startBulkActing(async () => {
      const result = await bulkSkipFmeaItemsAction({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        itemIds: ids,
      });
      if (result?.error) { setGlobalError(result.error); return; }
      setItems((current) =>
        current.map((item) =>
          ids.includes(item.id)
            ? { ...item, status: 'skipped', o_value: null, d_real_value: null, s_actual: null, manualSActual: null }
            : item
        )
      );
      setSelectedIds(new Set());
    });
  }

  function handleBulkReset() {
    const ids = Array.from(selectedIds);
    startBulkActing(async () => {
      const result = await bulkResetFmeaItemsAction({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        itemIds: ids,
      });
      if (result?.error) { setGlobalError(result.error); return; }
      setItems((current) =>
        current.map((item) =>
          ids.includes(item.id)
            ? { ...item, status: 'pending', o_value: null, d_real_value: null, s_actual: null, manualSActual: null, requires_second_review: false, second_review_status: 'not_required' }
            : item
        )
      );
      setSelectedIds(new Set());
    });
  }

  function handleTaskCreated(itemId: string, taskId: string) {
    setItems((current) =>
      current.map((row) =>
        row.id === itemId
          ? { ...row, linked_task_id: taskId, linked_task_status: 'todo', linked_task_assignee_name: null, linked_task_due_date: null }
          : row
      )
    );
  }

  useEffect(() => {
    const requestedItemId = searchParams.get('item');
    if (requestedItemId && items.some((item) => item.id === requestedItemId)) {
      setExpandedItemId(requestedItemId);
      return;
    }

    if (expandedItemId && items.some((item) => item.id === expandedItemId)) {
      return;
    }

    setExpandedItemId(items[0]?.id ?? null);
  }, [searchParams, items, expandedItemId]);

  const progress = useMemo(
    () =>
      getFmeaProgress(
        items.map((item) => ({
          id: item.id,
          dimension_id: item.dimension_id,
          s_default_frozen: item.s_default_frozen,
          o_value: item.o_value,
          d_real_value: item.d_real_value,
          s_actual: item.status === 'evaluated' ? item.s_actual : null,
          status: item.status,
        }))
      ),
    [items]
  );

  const currentZone = useMemo(
    () =>
      calculateFmeaZone(
        items.map((item) => ({
          id: item.id,
          dimension_id: item.dimension_id,
          s_default_frozen: item.s_default_frozen,
          o_value: item.o_value,
          d_real_value: item.d_real_value,
          s_actual: item.status === 'evaluated' ? item.s_actual : null,
          status: item.status,
        })),
        data.system.aiact_risk_level
      ),
    [items, data.system.aiact_risk_level]
  );

  const selectedItem = items.find((item) => item.id === expandedItemId) ?? null;
  const selectedSuggestedSActual = selectedItem
    ? calculateSuggestedSActual({
        oValue: getNormalizedOValue(selectedItem.o_value),
        dRealValue: getNormalizedDRealValue(selectedItem.d_real_value),
        sDefault: selectedItem.s_default_frozen,
      })
    : null;
  const selectedEffectiveSActual = selectedItem
    ? selectedItem.status === 'evaluated'
      ? selectedItem.s_actual
      : selectedItem.manualMode
        ? selectedItem.manualSActual
        : selectedSuggestedSActual
    : null;
  const highestSeverityCount = useMemo(
    () => items.filter((item) => item.status === 'evaluated' && item.s_actual === 9).length,
    [items]
  );
  const secondReviewCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status === 'evaluated' &&
          item.requires_second_review &&
          item.second_review_status !== 'approved'
      ).length,
    [items]
  );
  const hasPendingLocalChanges = useMemo(() => {
    if (items.length !== savedItems.length) return true;

    const savedMap = new Map(savedItems.map((item) => [item.id, getComparableItemSignature(item)]));
    return items.some((item) => savedMap.get(item.id) !== getComparableItemSignature(item));
  }, [items, savedItems]);
  const draftSyncLabel = isSavingDraft || isSavingItem || isSubmittingReview
    ? 'Guardando…'
    : hasPendingLocalChanges
      ? 'Cambios pendientes'
      : 'Borrador sincronizado';
  const linkedTasksCount = useMemo(
    () => items.filter((item) => item.linked_task_id !== null).length,
    [items]
  );
  const isFallbackEvaluation = data.activationSummary.seedStrategy === 'all_activated';
  const unresolvedCount = progress.pending + progress.skipped;
  const totalBlockingCount = unresolvedCount + secondReviewCount;
  const requiresExecutiveEscalation = highestSeverityCount > 0;
  const aiActFloorZone = calculateFmeaZone([], data.system.aiact_risk_level);

  useEffect(() => {
    if (isReadOnly || !hasPendingLocalChanges || isSavingItem || isSavingDraft || isSubmittingReview) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    autosaveTimerRef.current = setTimeout(() => {
      startSavingDraft(async () => {
        const result = await saveFmeaDraft({
          aiSystemId: data.system.id,
          evaluationId: data.evaluation.id,
          cachedZone: currentZone,
          items: items.map((item) => {
            const suggested = calculateSuggestedSActual({
              oValue: getNormalizedOValue(item.o_value),
              dRealValue: getNormalizedDRealValue(item.d_real_value),
              sDefault: item.s_default_frozen,
            });
            const effectiveSActual = item.manualMode ? item.manualSActual : suggested;

            return {
              itemId: item.id,
              oValue: item.status === 'skipped' ? null : getNormalizedOValue(item.o_value),
              dRealValue: item.status === 'skipped' ? null : getNormalizedDRealValue(item.d_real_value),
              sActual: item.status === 'skipped' ? null : effectiveSActual,
              justification: item.narrative_justification,
              status: item.status,
              requiresSecondReview: item.requires_second_review,
            };
          }),
        });

        if (result?.error) {
          setGlobalError(result.error);
          return;
        }

        setSavedItems(items);
      });
    }, 2500);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    currentZone,
    data.evaluation.id,
    data.system.id,
    hasPendingLocalChanges,
    isReadOnly,
    isSavingDraft,
    isSavingItem,
    isSubmittingReview,
    items,
    startSavingDraft,
  ]);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return items.filter((item) => {
      if (activeFilter === 'all') return true;
      if (activeFilter === 'pending') return item.status === 'pending';
      if (activeFilter === 'evaluated') return item.status === 'evaluated';
      if (activeFilter === 'skipped') return item.status === 'skipped';
      if (activeFilter === 'second_review') return item.requires_second_review;
      if (activeFilter === 'high_severity') return item.s_default_frozen >= 8;
      return item.dimension_id === activeFilter;
    }).filter((item) => {
      if (!normalizedSearch) return true;
      const haystack = `${item.failure_mode_code} ${item.failure_mode_name}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [activeFilter, items, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(visibleItems.length / PAGE_SIZE));

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchTerm]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    if (!expandedItemId) return;
    const itemIndex = visibleItems.findIndex((item) => item.id === expandedItemId);
    if (itemIndex === -1) return;
    const targetPage = Math.floor(itemIndex / PAGE_SIZE) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [PAGE_SIZE, currentPage, expandedItemId, visibleItems]);

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return visibleItems.slice(startIndex, startIndex + PAGE_SIZE);
  }, [PAGE_SIZE, currentPage, visibleItems]);

  const pageStart = visibleItems.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const pageEnd = visibleItems.length === 0 ? 0 : Math.min(currentPage * PAGE_SIZE, visibleItems.length);

  const groupedItems = useMemo(() => {
    const groups = new Map<string, { label: string; items: EditableItemState[] }>();

    for (const item of paginatedItems) {
      const meta = DIMENSION_META[item.dimension_id] ?? {
        label: item.dimension_name,
        badge: 'bg-ltcard2 border-ltb text-lttm',
      };

      const existing = groups.get(item.dimension_id);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.set(item.dimension_id, { label: meta.label, items: [item] });
      }
    }

    return Array.from(groups.entries()).map(([dimensionId, value]) => ({
      dimensionId,
      label: value.label,
      items: value.items,
    }));
  }, [paginatedItems]);

  useEffect(() => {
    if (!expandedItemId) return;
    const selectedNode = itemRefs.current[expandedItemId];
    if (!selectedNode) return;
    selectedNode.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [currentPage, expandedItemId, groupedItems]);

  const zoneMeta = getZoneClasses(currentZone);

  function patchItem(itemId: string, updater: (item: EditableItemState) => EditableItemState) {
    setItems((current) => current.map((item) => (item.id === itemId ? updater(item) : item)));
  }

  function commitConfirmItem(item: EditableItemState) {
    setGlobalError(null);
    setPendingCausalConfirmation(null);

    const suggested = calculateSuggestedSActual({
      oValue: getNormalizedOValue(item.o_value),
      dRealValue: getNormalizedDRealValue(item.d_real_value),
      sDefault: item.s_default_frozen,
    });
    const effectiveSActual = item.manualMode ? item.manualSActual : suggested;

    startSavingItem(async () => {
      const result = await saveFmeaItem({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        itemId: item.id,
        oValue: getNormalizedOValue(item.o_value),
        dRealValue: getNormalizedDRealValue(item.d_real_value),
        sActual: effectiveSActual,
        manualMode: item.manualMode,
        justification: item.narrative_justification,
        status: 'evaluated',
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                s_actual: effectiveSActual,
                manualSActual: effectiveSActual,
                status: 'evaluated',
                requires_second_review: result?.requiresSecondReview ?? row.requires_second_review,
                second_review_status:
                  result?.requiresSecondReview ?? row.requires_second_review ? 'pending' : 'not_required',
                second_reviewed_by: null,
                second_reviewed_at: null,
                second_review_notes: null,
              }
            : row
        )
      );
      setSavedItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                o_value: item.o_value,
                d_real_value: item.d_real_value,
                s_actual: effectiveSActual,
                manualSActual: effectiveSActual,
                manualMode: item.manualMode,
                narrative_justification: item.narrative_justification,
                status: 'evaluated',
                requires_second_review: result?.requiresSecondReview ?? row.requires_second_review,
                second_review_status:
                  result?.requiresSecondReview ?? row.requires_second_review ? 'pending' : 'not_required',
                second_reviewed_by: null,
                second_reviewed_at: null,
                second_review_notes: null,
              }
            : row
        )
      );

      const nextPending = items.find((row) => row.id !== item.id && row.status === 'pending');
      setExpandedItemId(nextPending?.id ?? null);
    });
  }

  function handleConfirmItem(item: EditableItemState) {
    const suggested = calculateSuggestedSActual({
      oValue: getNormalizedOValue(item.o_value),
      dRealValue: getNormalizedDRealValue(item.d_real_value),
      sDefault: item.s_default_frozen,
    });
    const effectiveSActual = item.manualMode ? item.manualSActual : suggested;

    // Check downstream impacts if causalGraph available and severity is relevant
    if (causalGraph && effectiveSActual && effectiveSActual >= 4) {
      const parentNode = causalGraph.nodes.find((n) =>
        n.active_failure_modes.some((m) => m.id === item.failure_mode_id)
      );

      if (parentNode) {
        const outEdges = causalGraph.edges.filter((e) => e.source === parentNode.id && (e.type === 'causes' || e.type === 'amplifies'));
        
        const downstreamImpacts = outEdges
          .map((e) => {
            const targetNode = causalGraph.nodes.find((n) => n.id === e.target && n.active);
            if (!targetNode) return null;
            return {
              targetNode,
              edgeType: e.type,
              modeNames: targetNode.active_failure_modes.map((m) => m.name),
            };
          })
          .filter((i): i is NonNullable<typeof i> => i !== null);

        if (downstreamImpacts.length > 0) {
          setPendingCausalConfirmation({ item, downstreamImpacts });
          return;
        }
      }
    }

    commitConfirmItem(item);
  }

  function handleSkipItem(item: EditableItemState) {
    setGlobalError(null);

    startSavingItem(async () => {
      const result = await saveFmeaItem({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        itemId: item.id,
        oValue: null,
        dRealValue: null,
        sActual: null,
        manualMode: false,
        justification: item.narrative_justification,
        status: 'skipped',
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      patchItem(item.id, (current) => ({
        ...current,
        status: 'skipped',
        o_value: null,
        d_real_value: null,
        s_actual: null,
        manualSActual: null,
        manualMode: false,
      }));
      setSavedItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                status: 'skipped',
                o_value: null,
                d_real_value: null,
                s_actual: null,
                manualSActual: null,
                manualMode: false,
                narrative_justification: item.narrative_justification,
                requires_second_review: false,
                second_review_status: 'not_required',
                second_reviewed_by: null,
                second_reviewed_at: null,
                second_review_notes: null,
              }
            : row
        )
      );
      setExpandedItemId(null);
    });
  }

  function handleSaveDraft() {
    setGlobalError(null);
    startSavingDraft(async () => {
      const result = await saveFmeaDraft({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        cachedZone: currentZone,
        items: items.map((item) => {
          const suggested = calculateSuggestedSActual({
            oValue: getNormalizedOValue(item.o_value),
            dRealValue: getNormalizedDRealValue(item.d_real_value),
            sDefault: item.s_default_frozen,
          });
          const effectiveSActual = item.manualMode ? item.manualSActual : suggested;

          return {
            itemId: item.id,
            oValue: item.status === 'skipped' ? null : getNormalizedOValue(item.o_value),
            dRealValue: item.status === 'skipped' ? null : getNormalizedDRealValue(item.d_real_value),
            sActual: item.status === 'skipped' ? null : effectiveSActual,
            justification: item.narrative_justification,
            status: item.status,
            requiresSecondReview: item.requires_second_review,
          };
        }),
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      setSavedItems(items);
    });
  }

  function handleSubmitForReview() {
    setGlobalError(null);

    if (
      requiresExecutiveEscalation &&
      !window.confirm(
        `Esta evaluación contiene ${highestSeverityCount} modo${highestSeverityCount === 1 ? '' : 's'} con S_actual = 9.\n\nSe enviará como caso de escalado a alta dirección. ¿Quieres continuar?`
      )
    ) {
      return;
    }

    startSubmittingReview(async () => {
      const result = await submitFmeaForReview({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        cachedZone: currentZone,
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      if (result?.planPath) {
        router.push(result.planPath);
      }
    });
  }

  function handleResolveSecondReview(item: EditableItemState, decision: 'approved' | 'rejected') {
    setGlobalError(null);

    startResolvingSecondReview(async () => {
      const result = await resolveFmeaSecondReview({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        itemId: item.id,
        decision,
        notes: secondReviewDrafts[item.id] ?? item.second_review_notes,
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      setItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                second_review_status: result?.secondReviewStatus ?? row.second_review_status,
                second_reviewed_by: result?.secondReviewedBy ?? row.second_reviewed_by,
                second_reviewed_at: result?.secondReviewedAt ?? row.second_reviewed_at,
                second_review_notes: result?.secondReviewNotes ?? row.second_review_notes,
              }
            : row
        )
      );
      setSavedItems((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                second_review_status: result?.secondReviewStatus ?? row.second_review_status,
                second_reviewed_by: result?.secondReviewedBy ?? row.second_reviewed_by,
                second_reviewed_at: result?.secondReviewedAt ?? row.second_reviewed_at,
                second_review_notes: result?.secondReviewNotes ?? row.second_review_notes,
              }
            : row
        )
      );
    });
  }

  return (
    <div className="max-w-[1500px] mx-auto w-full animate-fadein pb-10">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider mb-3">
            <Link href={`/inventario/${data.system.id}`} className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
              <ArrowLeft size={14} className="text-lttm" />
              <span>Volver al sistema</span>
            </Link>
            <span>/</span>
            <span className="text-ltt">Evaluación FMEA</span>
          </div>
          <h1 className="font-fraunces text-[32px] leading-none font-semibold text-ltt mb-2">{data.system.name}</h1>
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
            {data.system.internal_id ?? data.system.id.slice(0, 8)} · Evaluación FMEA · Versión {data.evaluation.version}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/inventario/${data.system.id}/fmea/${data.evaluation.id}/exportar`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-lttm font-sora text-[12.5px] font-medium hover:border-ltb2 hover:text-ltt transition-colors"
          >
            <FileText className="w-4 h-4" />
            Exportar PDF
          </Link>
          {data.evaluation.version > 1 && (
            <Link
              href={`/inventario/${data.system.id}/fmea/${data.evaluation.id}/comparar`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-lttm font-sora text-[12.5px] font-medium hover:border-ltb2 hover:text-ltt transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              Comparar versiones
            </Link>
          )}
          {!isReadOnly && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt font-sora text-[12.5px] font-medium hover:border-cyan-border hover:text-brand-cyan transition-colors disabled:opacity-60"
              >
                {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar borrador
              </button>
              <button
                type="button"
                onClick={handleSubmitForReview}
                disabled={totalBlockingCount > 0 || isSubmittingReview}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-[8px] text-white font-sora text-[12.5px] font-medium transition-all disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none ${
                  requiresExecutiveEscalation
                    ? 'bg-gradient-to-br from-[#d92d20] to-[#ff6b57] hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(217,45,32,0.28)]'
                    : 'bg-gradient-to-br from-[#00adef] to-[#33c3f5] hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)]'
                }`}
                title={
                  totalBlockingCount > 0
                    ? requiresExecutiveEscalation
                      ? `Hay un caso de escalado a alta dirección, pero aún faltan ${progress.pending} pendientes, ${progress.skipped} pospuestos y ${secondReviewCount} ítems pendientes de 2ª revisión antes del envío.`
                      : `Quedan ${progress.pending} pendientes, ${progress.skipped} pospuestos y ${secondReviewCount} ítems pendientes de 2ª revisión antes del envío.`
                    : requiresExecutiveEscalation
                      ? 'Esta evaluación incluye modos con S_actual = 9 y requiere escalado a alta dirección.'
                    : undefined
                }
              >
                {isSubmittingReview ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : requiresExecutiveEscalation ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
                {requiresExecutiveEscalation ? 'Enviar a alta dirección' : 'Enviar a revisión'}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-5 rounded-[12px] border border-ltb bg-[#070c14] text-white overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr_1fr_1fr_auto] divide-y xl:divide-y-0 xl:divide-x divide-[#18324a]">
          <div className="px-5 py-4 flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${zoneMeta.dot} ${currentZone === 'zona_i' || currentZone === 'zona_ii' ? 'animate-pulse' : ''}`} />
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8]">Zona activa</div>
            <div className={`font-fraunces text-[22px] ${zoneMeta.text}`}>{getZoneLabel(currentZone)}</div>
            <div className="font-sora text-[12.5px] text-[#c3d6e7]">{getZoneNarrative(currentZone)}</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Evaluados</div>
            <div className="font-sora text-[14px] text-white">{progress.completed} / {progress.total}</div>
          </div>
          <div className="px-5 py-4">
                  <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Pendientes</div>
            <div className="font-sora text-[14px] text-white">{progress.pending}</div>
          </div>
          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Estado borrador</div>
            <div className="font-sora text-[14px] text-white">{draftSyncLabel}</div>
          </div>
          <div className="px-5 py-4 flex items-center justify-end">
            <span className={`inline-flex items-center px-3 py-1 rounded-[8px] border font-fraunces text-[14px] ${zoneMeta.pill}`}>
              {getZoneLabel(currentZone)}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 divide-y md:divide-y-0 md:divide-x divide-[#18324a] border-t border-[#18324a]">
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Pospuestos</div>
            <div className="font-sora text-[13px] text-white">{progress.skipped}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">2ª revisión</div>
            <div className="font-sora text-[13px] text-white">{secondReviewCount}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">S_actual = 9</div>
            <div className="font-sora text-[13px] text-white">{highestSeverityCount > 0 ? `${highestSeverityCount} críticos` : 'Ninguno'}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Suelo AI Act</div>
            <div className="font-sora text-[13px] text-white">{getZoneLabel(calculateFmeaZone([], data.system.aiact_risk_level))}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Tareas delegadas</div>
            <div className="font-sora text-[13px] text-white">{linkedTasksCount > 0 ? linkedTasksCount : 'Ninguna'}</div>
          </div>
        </div>
      </div>

      {/* ── Heatmap O×D ──────────────────────────────────────────────────────── */}
      <div className="mb-5 rounded-[12px] border border-ltb bg-ltcard overflow-hidden">
        <button
          type="button"
          onClick={() => setShowHeatmap((v) => !v)}
          className="w-full px-5 py-3 flex items-center gap-2 hover:bg-ltcard2 transition-colors text-left"
        >
          <BarChart2 className="w-4 h-4 text-lttm shrink-0" />
          <span className="font-plex text-[11px] uppercase tracking-[1px] text-lttm flex-1">
            Mapa de calor O × D_real
          </span>
          {showHeatmap ? (
            <ChevronDown className="w-4 h-4 text-lttm" />
          ) : (
            <ChevronRight className="w-4 h-4 text-lttm" />
          )}
        </button>
        {showHeatmap && (
          <div className="px-5 pb-5 border-t border-ltb pt-4">
            <FmeaODHeatmap items={items} />
          </div>
        )}
      </div>

      {globalError && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-reb bg-red-dim px-4 py-3 text-re font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {isFallbackEvaluation && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-orb bg-ordim px-4 py-3 text-or font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Esta evaluación incluye todos los modos activados porque este sistema aún no tiene una cola priorizada. Se han sembrado {data.activationSummary.activatedCount} modos y la priorización inicial todavía no ha generado una selección `prioritized`.
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="space-y-5">
          <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
              <div className="flex items-center justify-between gap-4 mb-3">
                <div>
                  <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Progreso</div>
                  <div className="font-sora text-[14px] text-ltt2">{progress.completed} de {progress.total} modos confirmados</div>
                </div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">{progress.percent}%</div>
              </div>
              <div className="h-2 bg-ltb rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[#00adef] to-[#3871c1]" style={{ width: `${progress.percent}%` }} />
              </div>
            </div>

            <div className="px-5 py-4 border-b border-ltb flex flex-wrap gap-2">
                {[
                { key: 'all', label: 'Todos' },
                { key: 'pending', label: 'Pendientes' },
                { key: 'evaluated', label: 'Evaluados' },
                { key: 'skipped', label: 'Pospuestos' },
                { key: 'second_review', label: '2ª revisión' },
                { key: 'high_severity', label: 'S ≥ 8' },
                ...Object.entries(DIMENSION_META).map(([key, meta]) => ({ key, label: meta.label })),
              ].map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  onClick={() => setActiveFilter(filter.key)}
                  className={`inline-flex items-center px-3 py-1 rounded-[7px] border font-sora text-[12px] transition-colors ${
                    activeFilter === filter.key
                      ? 'bg-cyan-dim border-cyan-border text-brand-cyan'
                      : 'bg-ltcard text-lttm border-ltb hover:text-ltt hover:border-cyan-border'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
              <div className="max-w-[420px]">
                <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                  Buscar modo de fallo
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Código o nombre..."
                  className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-b border-ltb bg-ltcard flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {!isReadOnly && (
                  <input
                    type="checkbox"
                    title="Seleccionar todos los visibles"
                    checked={paginatedItems.length > 0 && paginatedItems.every((item) => selectedIds.has(item.id))}
                    onChange={() => toggleSelectAll(paginatedItems.map((item) => item.id))}
                    className="w-4 h-4 rounded border-ltb accent-brand-cyan cursor-pointer"
                  />
                )}
                <div className="font-sora text-[13px] text-ltt2">
                  Mostrando <span className="font-semibold text-ltt">{pageStart}-{pageEnd}</span> de{' '}
                  <span className="font-semibold text-ltt">{visibleItems.length}</span> modos
                  {activeFilter !== 'all' && (
                    <span className="text-lttm"> con el filtro actual</span>
                  )}
                  {searchTerm.trim().length > 0 && (
                    <span className="text-lttm"> y la búsqueda aplicada</span>
                  )}
                  {selectedIds.size > 0 && (
                    <span className="text-brand-cyan font-medium"> · {selectedIds.size} seleccionados</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex items-center px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-lttm font-sora text-[12px] transition-colors hover:text-ltt hover:border-cyan-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <span className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm">
                  Página {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((current) => Math.min(totalPages, current + 1))}
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard text-lttm font-sora text-[12px] transition-colors hover:text-ltt hover:border-cyan-border disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {groupedItems.length === 0 && (
                <div className="rounded-[10px] border border-ltb bg-ltbg p-6 text-center">
                  <div className="font-sora text-[14px] text-ltt2">No hay modos visibles con el filtro actual.</div>
                </div>
              )}

              {groupedItems.map((group) => {
                const completed = group.items.filter((item) => item.status !== 'pending').length;
                const isCollapsed = collapsedDimensions[group.dimensionId] ?? false;
                const meta = DIMENSION_META[group.dimensionId] ?? {
                  label: group.label,
                  badge: 'bg-ltcard2 border-ltb text-lttm',
                };

                return (
                  <div key={group.dimensionId} className="rounded-[12px] border border-ltb overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setCollapsedDimensions((current) => ({
                          ...current,
                          [group.dimensionId]: !isCollapsed,
                        }))
                      }
                      className="w-full flex items-center justify-between gap-4 px-4 py-3.5 bg-ltcard2 hover:bg-ltbg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight className="w-4 h-4 text-lttm" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-lttm" />
                        )}
                        <span className="font-plex text-[11px] uppercase tracking-[1px] text-ltt">{meta.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-[60px] h-[5px] bg-ltb rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-[#00adef] to-[#3871c1]" style={{ width: `${group.items.length === 0 ? 0 : Math.round((completed / group.items.length) * 100)}%` }} />
                        </div>
                        <span className="font-plex text-[10.5px] text-lttm">{completed}/{group.items.length} conf.</span>
                      </div>
                    </button>

                    {!isCollapsed && (
                      <div className="p-3 bg-ltcard space-y-3">
                        {group.items.map((item) => {
                          const isExpanded = expandedItemId === item.id;
                          const statusMeta = ITEM_STATUS_META[item.status];
                          const secondReviewMeta = SECOND_REVIEW_STATUS_META[item.second_review_status];
                          const suggestedSActual = calculateSuggestedSActual({
                            oValue: getNormalizedOValue(item.o_value),
                            dRealValue: getNormalizedDRealValue(item.d_real_value),
                            sDefault: item.s_default_frozen,
                          });
                          const effectiveSActual = item.manualMode ? item.manualSActual : suggestedSActual;
                          const sActualMeta = getSeverityClasses(item.status === 'evaluated' ? item.s_actual : effectiveSActual);
                          const justificationNeeded = requiresJustification({
                            sDefault: item.s_default_frozen,
                            sActual: effectiveSActual,
                            status: item.status,
                            justification: item.narrative_justification,
                          });
                          const canResolveSecondReview =
                            !isReadOnly &&
                            item.status === 'evaluated' &&
                            item.requires_second_review &&
                            data.viewerUserId !== data.evaluation.evaluator_id;

                          return (
                            <div
                              key={item.id}
                              id={`fmea-item-${item.id}`}
                              ref={(node) => {
                                itemRefs.current[item.id] = node;
                              }}
                              className={`rounded-[10px] border transition-colors ${
                                selectedIds.has(item.id)
                                  ? 'border-cyan-border bg-cyan-dim'
                                  : isExpanded
                                    ? 'border-cyan-border bg-[#e6f5fd]'
                                    : item.status === 'evaluated'
                                      ? 'border-grb bg-[#f3fbf5] hover:bg-[#eef8f1]'
                                      : item.status === 'skipped'
                                        ? 'border-[#d9cef8] bg-[#f7f3ff] hover:bg-[#f2edff]'
                                        : 'border-ltb bg-ltbg hover:bg-ltcard2'
                              }`}
                            >
                              <div className="flex items-stretch">
                                {!isReadOnly && (
                                  <div
                                    className="pl-3 flex items-center"
                                    onClick={(e) => { e.stopPropagation(); toggleSelection(item.id); }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedIds.has(item.id)}
                                      onChange={() => toggleSelection(item.id)}
                                      className="w-4 h-4 rounded border-ltb accent-brand-cyan cursor-pointer"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                  </div>
                                )}
                              <button
                                type="button"
                                onClick={() => setExpandedItemId((current) => (current === item.id ? null : item.id))}
                                className="flex-1 px-4 py-3 text-left"
                              >
                                <div className="flex flex-wrap items-center gap-3">
                                  <span className={`w-2.5 h-2.5 rounded-full ${item.status === 'pending' && item.s_default_frozen >= 9 ? 'bg-re animate-pulse' : statusMeta.dot}`} />
                                  <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm w-[72px]">{item.failure_mode_code}</span>
                                  <span className="font-sora text-[13px] font-medium text-ltt flex-1 min-w-[220px]">{item.failure_mode_name}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${statusMeta.pill}`}>
                                    {statusMeta.label}
                                  </span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${meta.badge}`}>{meta.label}</span>
                                  <span className="inline-flex flex-col items-center px-2.5 py-1 rounded-[7px] border border-ltb bg-ltcard font-plex text-[10px] text-lttm min-w-[52px]">
                                    <span className="uppercase tracking-[0.7px]">def</span>
                                    <span className="text-ltt">{item.s_default_frozen}</span>
                                  </span>
                                  <span className={`inline-flex flex-col items-center px-2.5 py-1 rounded-[7px] border font-plex text-[10px] min-w-[52px] ${sActualMeta.pill}`}>
                                    <span className="uppercase tracking-[0.7px]">act</span>
                                    <span>{item.status === 'evaluated' ? item.s_actual : effectiveSActual ?? '—'}</span>
                                  </span>
                                  {item.linked_task_id !== null && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${TASK_STATUS_PILL[item.linked_task_status ?? ''] ?? TASK_STATUS_PILL.todo}`}>
                                      <ClipboardList className="w-3 h-3" />
                                      {item.linked_task_status ? (TASK_STATUS_LABELS[item.linked_task_status as keyof typeof TASK_STATUS_LABELS] ?? item.linked_task_status) : 'Tarea'}
                                    </span>
                                  )}
                                </div>
                              </button>
                              </div>

                              {isExpanded && (
                                <div className="px-4 pb-4">
                                  {item.status === 'evaluated' && (
                                    <div className="mb-4 rounded-[10px] border border-grb bg-grdim px-3 py-2.5 flex items-start gap-2">
                                      <CheckCircle2 className="w-4 h-4 text-gr shrink-0 mt-0.5" />
                                      <div>
                                        <div className="font-sora text-[12.5px] font-medium text-gr">
                                          S_actual confirmado
                                        </div>
                                        <div className="font-sora text-[12px] text-ltt2">
                                          Este modo de fallo ya quedó confirmado con S_actual {item.s_actual}.
                                          Puedes reabrirlo y volver a confirmarlo si necesitas corregir la evaluación.
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  <p className="font-sora text-[12.5px] text-ltt2 leading-relaxed mb-4">
                                    {item.failure_mode_description}
                                  </p>

                                  <div className="mb-4">
                                    <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">Criterios R·I·D·E (catálogo)</div>
                                    <div className="flex flex-wrap gap-2">
                                      {[
                                        ['R', item.r_value],
                                        ['I', item.i_value],
                                        ['D', item.d_value],
                                        ['E', item.e_value],
                                      ].map(([label, value]) => (
                                        <span
                                          key={`${item.id}-${label}`}
                                          className="inline-flex items-center px-2.5 py-1 rounded-[7px] border border-ltb bg-ltcard2 font-plex text-[11px] text-ltt"
                                        >
                                          {label}={value}
                                        </span>
                                      ))}
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                                    <div className="rounded-[10px] border border-ltb bg-ltcard p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-sora text-[12px] text-ltt">O · Ocurrencia en este sistema</div>
                                        <div className="font-plex text-[12px] text-ltt">{getNormalizedOValue(item.o_value)}</div>
                                      </div>
                                      <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        step={1}
                                        disabled={isReadOnly}
                                        value={item.o_value ?? 3}
                                        onChange={(event) =>
                                          patchItem(item.id, (current) => ({
                                            ...current,
                                            o_value: Number(event.target.value),
                                          }))
                                        }
                                        className="w-full accent-[#00adef]"
                                      />
                                      <div className="mt-2 font-sora text-[12px] text-lttm">
                                        {getContextLabel(getNormalizedOValue(item.o_value), 'o')}
                                      </div>
                                    </div>

                                    <div className="rounded-[10px] border border-ltb bg-ltcard p-4">
                                      <div className="flex items-center justify-between mb-2">
                                        <div className="font-sora text-[12px] text-ltt">D_real · Detectabilidad real</div>
                                        <div className="font-plex text-[12px] text-ltt">{getNormalizedDRealValue(item.d_real_value)}</div>
                                      </div>
                                      <input
                                        type="range"
                                        min={1}
                                        max={5}
                                        step={1}
                                        disabled={isReadOnly}
                                        value={item.d_real_value ?? 3}
                                        onChange={(event) =>
                                          patchItem(item.id, (current) => ({
                                            ...current,
                                            d_real_value: Number(event.target.value),
                                          }))
                                        }
                                        className="w-full accent-[#00adef]"
                                      />
                                      <div className="mt-2 font-sora text-[12px] text-lttm">
                                        {getContextLabel(getNormalizedDRealValue(item.d_real_value), 'd')}
                                      </div>
                                    </div>
                                  </div>

                                  <div className={`rounded-[10px] border p-4 mb-4 ${effectiveSActual === 9 ? 'border-re bg-red-dim' : 'border-ltb bg-ltcard'}`}>
                                    <div className="flex items-center justify-between gap-4">
                                      <div>
                                        <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">S_actual sugerido</div>
                                        <div className="font-plex text-[11px] text-lttm">S_default: {item.s_default_frozen} → sistema concreto</div>
                                      </div>
                                      <div className={`font-fraunces text-[28px] leading-none ${getSeverityClasses(effectiveSActual).text}`}>
                                        {effectiveSActual ?? '—'}
                                      </div>
                                    </div>
                                    {effectiveSActual === 9 && (
                                      <div className="mt-2 font-sora text-[12px] text-re">
                                        ⚠ S_actual = 9 activa Zona I y bloquea el despliegue hasta revisión.
                                      </div>
                                    )}
                                  </div>

                                  <div className="mb-4">
                                    <button
                                      type="button"
                                      disabled={isReadOnly}
                                      onClick={() =>
                                        patchItem(item.id, (current) => ({
                                          ...current,
                                          manualMode: !current.manualMode,
                                          manualSActual:
                                            current.manualSActual ??
                                            calculateSuggestedSActual({
                                              oValue: getNormalizedOValue(current.o_value),
                                              dRealValue: getNormalizedDRealValue(current.d_real_value),
                                              sDefault: current.s_default_frozen,
                                            }),
                                        }))
                                      }
                                      className="font-sora text-[12px] text-ltt2 hover:text-brand-cyan transition-colors disabled:opacity-60"
                                    >
                                      {item.manualMode ? 'Usar valor sugerido' : 'Ajustar S_actual manualmente'}
                                    </button>

                                    {item.manualMode && (
                                      <div className="mt-3">
                                        <input
                                          type="number"
                                          min={2}
                                          max={9}
                                          step={1}
                                          disabled={isReadOnly}
                                          value={item.manualSActual ?? ''}
                                          onChange={(event) =>
                                            patchItem(item.id, (current) => ({
                                              ...current,
                                              manualSActual: event.target.value === '' ? null : Number(event.target.value),
                                            }))
                                          }
                                          className="w-[140px] rounded-[8px] border border-ltb bg-white px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
                                        />
                                        {item.manualSActual !== null &&
                                          suggestedSActual !== null &&
                                          Math.abs(item.manualSActual - suggestedSActual) >= 2 && (
                                            <div className="mt-2 text-[12px] text-or font-sora">
                                              Desviación significativa respecto al sugerido. Se pedirá justificación.
                                            </div>
                                          )}
                                      </div>
                                    )}
                                  </div>

                                  {(justificationNeeded || (item.narrative_justification?.length ?? 0) > 0) && (
                                    <div className="mb-4">
                                      <label className={`block font-sora text-[12px] mb-2 ${justificationNeeded ? 'text-re' : 'text-ltt2'}`}>
                                        {justificationNeeded ? '⚠ Justificación requerida' : 'Justificación'}
                                      </label>
                                      <textarea
                                        rows={3}
                                        disabled={isReadOnly}
                                        value={item.narrative_justification ?? ''}
                                        onChange={(event) =>
                                          patchItem(item.id, (current) => ({
                                            ...current,
                                            narrative_justification: event.target.value,
                                          }))
                                        }
                                        placeholder="Describe por qué S_actual difiere del prior para este sistema específico..."
                                        className="w-full rounded-[10px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
                                      />
                                      {justificationNeeded && (
                                        <div className="mt-2 font-plex text-[10px] text-lttm">
                                          {(item.narrative_justification?.trim().length ?? 0)}/50
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {item.requires_second_review && (
                                    <div className="mb-4 rounded-[10px] border border-orb bg-ordim px-3 py-3">
                                      <div className="flex flex-wrap items-center gap-2 mb-2">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${secondReviewMeta.pill}`}>
                                          {secondReviewMeta.label}
                                        </span>
                                      </div>
                                      <div className="text-[12px] text-or font-sora">
                                        Reducción de 3 o más puntos respecto al prior. Este ítem requiere validación por un segundo evaluador antes del envío.
                                      </div>
                                      {item.second_review_notes && (
                                        <div className="mt-2 font-sora text-[12px] text-ltt2 leading-relaxed">
                                          {item.second_review_notes}
                                        </div>
                                      )}
                                      {item.second_review_status !== 'approved' && !canResolveSecondReview && (
                                        <div className="mt-2 font-sora text-[12px] text-ltt2">
                                          {data.viewerUserId === data.evaluation.evaluator_id
                                            ? 'Otro usuario debe validar esta segunda revisión.'
                                            : 'Puedes resolver esta segunda revisión desde este panel.'}
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {item.requires_second_review && canResolveSecondReview && item.second_review_status !== 'approved' && (
                                    <div className="mb-4 rounded-[10px] border border-ltb bg-ltcard p-4">
                                      <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">
                                        Resolución de 2ª revisión
                                      </div>
                                      <textarea
                                        rows={3}
                                        value={secondReviewDrafts[item.id] ?? item.second_review_notes ?? ''}
                                        onChange={(event) =>
                                          setSecondReviewDrafts((current) => ({
                                            ...current,
                                            [item.id]: event.target.value,
                                          }))
                                        }
                                        placeholder="Añade una nota de validación o indica por qué debe revisarse de nuevo..."
                                        className="w-full rounded-[10px] border border-ltb bg-ltbg px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border focus:ring-2 focus:ring-cyan-200"
                                      />
                                      <div className="mt-3 flex items-center gap-3">
                                        <button
                                          type="button"
                                          disabled={isResolvingSecondReview}
                                          onClick={() => handleResolveSecondReview(item, 'approved')}
                                          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
                                        >
                                          {isResolvingSecondReview ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <CheckCircle2 className="w-4 h-4" />
                                          )}
                                          Aprobar 2ª revisión
                                        </button>
                                        <button
                                          type="button"
                                          disabled={
                                            isResolvingSecondReview ||
                                            (secondReviewDrafts[item.id]?.trim().length ?? 0) < 50
                                          }
                                          onClick={() => handleResolveSecondReview(item, 'rejected')}
                                          className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-reb bg-red-dim text-re font-sora text-[12.5px] font-medium transition-colors hover:bg-[#fff1f0] disabled:opacity-60"
                                        >
                                          Solicitar revisión de nuevo
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  <DelegateTaskSection
                                    item={item}
                                    aiSystemId={data.system.id}
                                    evaluationId={data.evaluation.id}
                                    members={data.members}
                                    readOnly={isReadOnly}
                                    onTaskCreated={handleTaskCreated}
                                  />

                                  {!isReadOnly && (
                                    <div className="mt-4 flex items-center gap-3">
                                      <button
                                        type="button"
                                        disabled={
                                          isSavingItem ||
                                          effectiveSActual === null ||
                                          (justificationNeeded && (item.narrative_justification?.trim().length ?? 0) < 50)
                                        }
                                        onClick={() => handleConfirmItem(item)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60 disabled:translate-y-0 disabled:shadow-none"
                                      >
                                        {isSavingItem ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                        Confirmar S_actual
                                      </button>
                                      <button
                                        type="button"
                                        disabled={isSavingItem}
                                        onClick={() => handleSkipItem(item)}
                                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt font-sora text-[12.5px] font-medium hover:border-cyan-border hover:text-brand-cyan transition-colors disabled:opacity-60"
                                      >
                                        Posponer
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <aside className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden xl:sticky xl:top-6">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Contexto FMEA</div>
            <div className="font-sora text-[14px] text-ltt">
              {selectedItem ? selectedItem.failure_mode_code : 'Sin modo seleccionado'}
            </div>
          </div>

          <div className="p-5 space-y-5">
            {!selectedItem && (
              <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
                Selecciona un modo de fallo para ver su contexto, los controles de mitigación relacionados y su estado actual en el sistema.
              </div>
            )}

            {selectedItem && (
              <>
                <div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">Modo de fallo</div>
                  <div className="font-sora text-[14px] font-semibold text-ltt mb-2">{selectedItem.failure_mode_name}</div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border border-ltb bg-ltbg font-plex text-[10px] text-lttm">
                      {selectedItem.failure_mode_code}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${DIMENSION_META[selectedItem.dimension_id]?.badge ?? 'bg-ltcard border-ltb text-lttm'}`}>
                      {selectedItem.dimension_name}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border border-ltb bg-ltbg font-plex text-[10px] text-lttm">
                      {selectedItem.bloque}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border border-ltb bg-ltbg font-plex text-[10px] text-lttm">
                      {selectedItem.subcategoria}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[6px] border border-ltb bg-ltbg font-plex text-[10px] text-lttm">
                      {selectedItem.tipo}
                    </span>
                  </div>
                  <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">{selectedItem.failure_mode_description}</div>
                </div>

                <div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">Contexto del sistema</div>
                  <div className="space-y-2 text-[12.5px] font-sora text-ltt2">
                    <div><span className="text-ltt font-medium">AI Act:</span> {getAiActLabel(data.system.aiact_risk_level)}</div>
                    {data.system.aiact_risk_reason && (
                      <div><span className="text-ltt font-medium">Motivo AI Act:</span> {data.system.aiact_risk_reason}</div>
                    )}
                    <div><span className="text-ltt font-medium">Suelo AI Act:</span> {getZoneLabel(aiActFloorZone)}</div>
                    <div><span className="text-ltt font-medium">Zona activa:</span> {getZoneLabel(currentZone)}</div>
                    <div><span className="text-ltt font-medium">Dominio:</span> {data.system.domain}</div>
                    <div><span className="text-ltt font-medium">Uso previsto:</span> {data.system.intended_use ?? '—'}</div>
                    <div><span className="text-ltt font-medium">Versión evaluación:</span> {data.evaluation.version}</div>
                    <div><span className="text-ltt font-medium">Estado:</span> {data.evaluation.state}</div>
                    {selectedEffectiveSActual !== null && (
                      <div>
                        <span className="text-ltt font-medium">Lectura actual:</span>{' '}
                        S_default {selectedItem.s_default_frozen} → S_actual {selectedEffectiveSActual}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">Controles relacionados</div>
                  {selectedItem.control_refs.length === 0 ? (
                    <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
                      Todavía no hay controles relacionados mapeados para este modo de fallo en el catálogo aplicado.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {selectedItem.control_refs.map((control) => {
                        const status = control.status ? CONTROL_STATUS_META[control.status] ?? CONTROL_STATUS_META.planned : null;
                        return (
                          <div key={`${selectedItem.id}-${control.control_template_id}`} className="rounded-[10px] border border-ltb bg-ltbg p-3">
                            <div className="flex items-start justify-between gap-3 mb-1.5">
                              <div className="min-w-0">
                                <div className="font-sora text-[12.5px] font-semibold text-ltt">{control.control_name}</div>
                                <div className="font-plex text-[10.5px] text-lttm">{control.control_code}</div>
                              </div>
                              {status && (
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-[6px] border font-plex text-[10px] ${status.pill}`}>
                                  {status.label}
                                </span>
                              )}
                            </div>
                            <div className="font-sora text-[12px] text-ltt2 leading-relaxed">{control.control_description}</div>
                            <div className="mt-2 space-y-1 text-[12px] font-sora text-ltt2">
                              <div><span className="text-ltt font-medium">Área:</span> {control.control_area ?? '—'}</div>
                              <div><span className="text-ltt font-medium">Cobertura actual:</span> {typeof control.compliance_score === 'number' ? `${control.compliance_score}%` : 'Sin medir'}</div>
                              {control.notes && (
                                <div><span className="text-ltt font-medium">Notas:</span> {control.notes}</div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">Notas operativas</div>
                  <div className="rounded-[10px] border border-ltb bg-ltbg p-3 space-y-2 text-[12.5px] font-sora text-ltt2 leading-relaxed">
                    <div>{getDimensionGuidance(selectedItem.dimension_id)}</div>
                    <div>
                      Usa <span className="text-ltt font-medium">O</span> para reflejar ocurrencia operativa y{' '}
                      <span className="text-ltt font-medium">D_real</span> para medir si los controles actuales permiten detectar el fallo a tiempo.
                    </div>
                    {selectedItem.control_refs.length > 0 ? (
                      <div>
                        Este modo tiene <span className="text-ltt font-medium">{selectedItem.control_refs.length}</span> control
                        {selectedItem.control_refs.length === 1 ? '' : 'es'} relacionados; ajusta la detectabilidad teniendo en cuenta su estado real, no solo su existencia en catálogo.
                      </div>
                    ) : (
                      <div>
                        No hay controles mapeados para este modo; si la detectabilidad depende de mecanismos no documentados, conviene reflejarlo en la justificación.
                      </div>
                    )}
                    {selectedItem.s_default_frozen >= 8 && (
                      <div>
                        Este modo parte de una <span className="text-ltt font-medium">severidad estructural alta</span>; cualquier reducción fuerte de S_actual exigirá trazabilidad adicional y puede activar 2ª revisión.
                      </div>
                    )}
                    {selectedEffectiveSActual === 9 && (
                      <div className="text-re">
                        La lectura actual sitúa este modo en <span className="font-medium">S_actual = 9</span>; mantendrá la evaluación en Zona I y requerirá escalado.
                      </div>
                    )}
                    {selectedItem.requires_second_review && (
                      <div>
                        Este ítem ya supera el umbral de reducción respecto al prior y necesita validación de un segundo evaluador antes del envío.
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2 flex items-center gap-1.5">
                    <Clock className="w-3 h-3" />
                    Historial de cambios
                  </div>
                  <ItemHistoryTimeline history={selectedItem.history} />
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      {pendingCausalConfirmation && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-lg rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="bg-ltcard2 px-5 py-4 border-b border-ltb flex justify-between items-start">
              <div>
                <h3 className="font-sora text-[15px] font-semibold text-ltt flex items-center gap-2">
                  <AlertTriangle className="text-or w-4 h-4" />
                  Advertencia de propagación causal
                </h3>
                <p className="font-sora text-[12.5px] text-lttm mt-1 text-balance">
                  Esta evaluación (S_actual ≥ 4) puede desencadenar o agravar riesgos en modos conectados del sistema.
                </p>
              </div>
            </div>
            
            <div className="p-5 overflow-y-auto flex-1">
              <div className="space-y-3">
                {pendingCausalConfirmation.downstreamImpacts.map((impact, idx) => (
                  <div key={idx} className="border border-ltb bg-ltbg rounded-[8px] p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`inline-flex font-plex text-[8.5px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${
                        impact.targetNode.domain === 'TEC' ? 'bg-cyan-dim border-cyan-border text-brand-cyan' :
                        impact.targetNode.domain === 'GOV' ? 'bg-[rgba(124,92,255,0.12)] border-[#7c5cff40] text-[#7c5cff]' :
                        impact.targetNode.domain === 'ETI' ? 'bg-grdim border-grb text-gr' :
                        impact.targetNode.domain === 'LEG' ? 'bg-red-dim border-reb text-re' :
                        'bg-ordim border-orb text-or'
                      }`}>
                        {impact.targetNode.domain || 'GEN'}
                      </span>
                      <span className="font-sora font-semibold text-[13px] text-ltt">
                        {impact.targetNode.name}
                      </span>
                    </div>
                    <div className="font-sora text-[12px] text-ltt2 space-y-1">
                      {impact.modeNames.map((modeName, mi) => (
                        <div key={mi} className="flex gap-2">
                          <span className={`font-medium ${impact.edgeType === 'amplifies' ? 'text-or' : 'text-re'}`}>
                            {impact.edgeType === 'amplifies' ? 'Amplifica' : 'Causa'}:
                          </span> 
                          {modeName}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-ltcard2 px-5 py-4 border-t border-ltb flex items-center justify-end gap-3 rounded-b-xl">
              <button
                type="button"
                onClick={() => setPendingCausalConfirmation(null)}
                className="px-4 py-2 font-sora text-[12.5px] font-medium text-lttm hover:text-ltt border border-transparent rounded-[8px] transition-colors"
                disabled={isSavingItem}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => commitConfirmItem(pendingCausalConfirmation.item)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-orb bg-ordim text-or font-sora text-[12.5px] font-medium hover:border-[#f59e0b] hover:text-[#f59e0b] hover:bg-[rgba(245,158,11,0.15)] transition-all"
                disabled={isSavingItem}
              >
                {isSavingItem && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirmar y propagar riesgo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk action toolbar ───────────────────────────────────────────────── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-fadein">
          <div className="flex items-center gap-3 bg-[#0e1c2e] border border-[#1e3a54] text-white rounded-[14px] shadow-2xl px-5 py-3">
            <span className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8]">
              {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>
            <div className="w-px h-5 bg-[#1e3a54]" />
            <button
              type="button"
              disabled={isBulkActing}
              onClick={handleBulkSkip}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#1e3a54] bg-[#152438] text-[#94b0c8] font-sora text-[12px] font-medium hover:border-[#d9cef8] hover:text-[#d9cef8] transition-colors disabled:opacity-60"
            >
              {isBulkActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
              Posponer seleccionados
            </button>
            <button
              type="button"
              disabled={isBulkActing}
              onClick={handleBulkReset}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[8px] border border-[#1e3a54] bg-[#152438] text-[#94b0c8] font-sora text-[12px] font-medium hover:border-cyan-border hover:text-brand-cyan transition-colors disabled:opacity-60"
            >
              Restablecer a pendiente
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="p-1.5 rounded-[7px] hover:bg-[#1e3a54] transition-colors text-[#94b0c8] hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
