'use client';

import { useState } from 'react';
import { X, GitCommit, ArrowRight } from 'lucide-react';
import type { PlanSnapshot } from '@/lib/fmea/treatment-plan';

// ─── Labels ──────────────────────────────────────────────────────────────────

const TRIGGER_LABELS: Record<string, string> = {
  submitted_for_review: 'Enviado a aprobación',
  approved: 'Aprobado',
  rejected: 'Devuelto al autor',
  started: 'Ejecución iniciada',
  closed: 'Plan cerrado',
  superseded: 'Reemplazado por nuevo plan',
};

const PLAN_FIELD_LABELS: Record<string, string> = {
  code: 'Código',
  status: 'Estado',
  zone_at_creation: 'Zona creación',
  zone_target: 'Zona objetivo',
  ai_act_floor: 'Suelo AI Act',
  s_max_at_creation: 'S máx en creación',
  deadline: 'Fecha límite',
  review_cadence: 'Cadencia revisión',
  approval_level: 'Nivel aprobación',
  accepted_risk_count: 'Riesgos aceptados',
  actions_total: 'Total acciones',
  actions_completed: 'Acciones completadas',
  residual_risk_notes: 'Notas riesgo residual',
  approval_minutes_ref: 'Referencia acta',
  approval_committee_notes: 'Notas comité',
};

const PLAN_FIELD_ORDER = [
  'code', 'status', 'zone_at_creation', 'zone_target', 'ai_act_floor',
  's_max_at_creation', 'deadline', 'review_cadence', 'approval_level',
  'accepted_risk_count', 'actions_total', 'actions_completed',
  'residual_risk_notes', 'approval_minutes_ref', 'approval_committee_notes',
];

const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador', in_review: 'En revisión', approved: 'Aprobado',
  in_progress: 'En ejecución', closed: 'Cerrado', superseded: 'Reemplazado',
};

const OPTION_LABELS: Record<string, string> = {
  mitigar: 'Mitigar', aceptar: 'Aceptar', transferir: 'Transferir',
  evitar: 'Evitar', diferir: 'Diferir',
};

const ACTION_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendiente', in_progress: 'En progreso',
  evidence_pending: 'Evidencia pend.', completed: 'Completada',
  accepted: 'Aceptada', cancelled: 'Cancelada',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function fmtDate(value: unknown): string {
  if (!value) return '—';
  const s = String(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return new Date(`${s}T00:00:00`).toLocaleDateString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
    });
  }
  return new Date(s).toLocaleString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtPlanValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (key === 'status') return STATUS_LABELS[String(value)] ?? String(value);
  if (['zone_at_creation', 'zone_target', 'ai_act_floor'].includes(key))
    return String(value).toUpperCase().replace(/_/g, ' ');
  if (key === 'deadline') return fmtDate(value);
  if (key === 'review_cadence') {
    const map: Record<string, string> = {
      monthly: 'Mensual', quarterly: 'Trimestral',
      biannual: 'Semestral', annual: 'Anual',
    };
    return map[String(value)] ?? String(value);
  }
  if (key === 'approval_level') {
    const map: Record<string, string> = { level_1: 'Nivel 1', level_2: 'Nivel 2', level_3: 'Nivel 3 (alta dirección)' };
    return map[String(value)] ?? String(value);
  }
  return String(value);
}

function diffPlanState(
  current: Record<string, unknown>,
  prev: Record<string, unknown>,
): Set<string> {
  const changed = new Set<string>();
  for (const key of PLAN_FIELD_ORDER) {
    const a = current[key] ?? null;
    const b = prev[key] ?? null;
    if (String(a) !== String(b)) changed.add(key);
  }
  return changed;
}

type ActionRow = Record<string, unknown>;

function diffActions(
  current: ActionRow[],
  prev: ActionRow[],
): Map<string, Set<string>> {
  const prevById = new Map<string, ActionRow>(prev.map((a) => [String(a.id), a]));
  const result = new Map<string, Set<string>>();
  const ACTION_COMPARE_KEYS = ['option', 'status', 's_residual_target', 's_residual_achieved', 'owner_id', 'due_date'];
  for (const action of current) {
    const id = String(action.id);
    const prevAction = prevById.get(id);
    if (!prevAction) { result.set(id, new Set(['__new__'])); continue; }
    const changed = new Set<string>();
    for (const k of ACTION_COMPARE_KEYS) {
      if (String(action[k] ?? null) !== String(prevAction[k] ?? null)) changed.add(k);
    }
    if (changed.size > 0) result.set(id, changed);
  }
  return result;
}

// ─── Component ───────────────────────────────────────────────────────────────

type Tab = 'plan' | 'acciones';

export function PlanSnapshotModal({
  snapshot,
  prevSnapshot,
  onClose,
}: {
  snapshot: PlanSnapshot;
  prevSnapshot: PlanSnapshot | null;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<Tab>('plan');
  const [compareMode, setCompareMode] = useState(false);

  const ps = snapshot.plan_state as Record<string, unknown>;
  const prevPs = prevSnapshot ? (prevSnapshot.plan_state as Record<string, unknown>) : null;
  const actions = (snapshot.actions_state ?? []) as ActionRow[];
  const prevActions = (prevSnapshot?.actions_state ?? []) as ActionRow[];

  const planDiffs = compareMode && prevPs ? diffPlanState(ps, prevPs) : new Set<string>();
  const actionDiffs = compareMode && prevSnapshot ? diffActions(actions, prevActions) : new Map<string, Set<string>>();

  const changedPlanFields = planDiffs.size;
  const changedActionRows = actionDiffs.size;

  return (
    <>
      <div
        className="fixed inset-0 z-[70] bg-black/20"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-[71] flex items-center justify-center p-4">
        <div className="bg-ltcard border border-ltb rounded-[16px] shadow-[0_8px_40px_rgba(0,0,0,0.18)] w-full max-w-[760px] max-h-[85vh] flex flex-col overflow-hidden">

          {/* Header */}
          <div className="flex items-start justify-between px-5 py-4 border-b border-ltb bg-ltcard2 shrink-0">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-[#e8f0fe] border border-[#a8c0fa] flex items-center justify-center shrink-0 mt-0.5">
                <GitCommit className="w-4 h-4 text-brand-blue" />
              </div>
              <div>
                <h2 className="font-sora text-[15px] font-semibold text-ltt">
                  {TRIGGER_LABELS[snapshot.trigger] ?? snapshot.trigger}
                </h2>
                <p className="font-plex text-[11px] text-lttm mt-0.5">
                  {snapshot.actor_name ?? 'Usuario de la organización'}
                  {' · '}
                  {new Date(snapshot.captured_at).toLocaleString('es-ES', {
                    day: '2-digit', month: 'short', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-[7px] text-lttm hover:text-ltt hover:bg-ltbg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Tabs + compare toggle */}
          <div className="flex items-center justify-between px-5 border-b border-ltb bg-ltcard2 shrink-0">
            <div className="flex items-center">
              {(['plan', 'acciones'] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`px-4 py-2.5 font-plex text-[11px] uppercase tracking-[0.7px] font-medium border-b-2 transition-colors -mb-px ${
                    tab === t
                      ? 'border-brand-blue text-brand-blue'
                      : 'border-transparent text-lttm hover:text-ltt'
                  }`}
                >
                  {t === 'plan' ? `Plan ${compareMode && changedPlanFields > 0 ? `(${changedPlanFields} cambios)` : ''}` : `Acciones (${actions.length})${compareMode && changedActionRows > 0 ? ` · ${changedActionRows} con cambios` : ''}`}
                </button>
              ))}
            </div>
            {prevSnapshot && (
              <button
                onClick={() => setCompareMode((v) => !v)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-plex text-[10.5px] font-medium border transition-colors ${
                  compareMode
                    ? 'bg-amber-50 border-amber-300 text-amber-700'
                    : 'bg-ltcard border-ltb text-lttm hover:border-brand-blue hover:text-brand-blue'
                }`}
              >
                <ArrowRight size={12} />
                {compareMode ? 'Salir de comparación' : 'Comparar con anterior'}
              </button>
            )}
          </div>

          {/* Body */}
          <div className="overflow-y-auto flex-1 p-5">
            {tab === 'plan' && (
              <div className="space-y-1">
                {PLAN_FIELD_ORDER.map((key) => {
                  const val = ps[key];
                  if (val === null || val === undefined || val === '') return null;
                  const changed = planDiffs.has(key);
                  const prevVal = prevPs ? prevPs[key] : undefined;
                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-4 py-2.5 px-3 rounded-[8px] ${changed ? 'bg-amber-50 border border-amber-200' : 'odd:bg-ltbg'}`}
                    >
                      <span className="font-plex text-[10.5px] text-lttm w-44 shrink-0">
                        {PLAN_FIELD_LABELS[key] ?? key}
                        {changed && <span className="ml-1 text-amber-600 font-semibold">↑</span>}
                      </span>
                      <div className="flex-1 min-w-0">
                        {changed && prevVal !== null && prevVal !== undefined && prevVal !== '' ? (
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-sora text-[12px] text-lttm line-through">
                              {fmtPlanValue(key, prevVal)}
                            </span>
                            <ArrowRight size={11} className="text-amber-500 shrink-0" />
                            <span className="font-sora text-[12.5px] font-semibold text-amber-700">
                              {fmtPlanValue(key, val)}
                            </span>
                          </div>
                        ) : (
                          <span className={`font-sora text-[12.5px] ${changed ? 'font-semibold text-amber-700' : 'text-ltt'}`}>
                            {fmtPlanValue(key, val)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {tab === 'acciones' && (
              <div className="overflow-x-auto">
                {actions.length === 0 ? (
                  <p className="text-center font-sora text-[13px] text-lttm py-8">
                    No hay acciones capturadas en este snapshot.
                  </p>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-ltb">
                        {['Acción', 'Opción', 'Estado', 'S actual', 'S residual obj.', 'S residual alc.', 'Fecha obj.'].map((h) => (
                          <th key={h} className="pb-2 pr-4 font-plex text-[10px] uppercase tracking-[0.7px] text-lttm whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {actions.map((action) => {
                        const id = String(action.id);
                        const changedKeys = actionDiffs.get(id);
                        const isNew = changedKeys?.has('__new__');
                        const rowHighlight = changedKeys ? (isNew ? 'bg-green-50' : 'bg-amber-50') : '';

                        function cell(key: string, value: unknown): React.ReactNode {
                          const changed = changedKeys && !isNew && changedKeys.has(key);
                          const prevAction = prevActions.find((a) => String(a.id) === id);
                          const prevVal = prevAction ? prevAction[key] : undefined;
                          let display: string;
                          if (key === 'option') display = value ? (OPTION_LABELS[String(value)] ?? String(value)) : '—';
                          else if (key === 'status') display = value ? (ACTION_STATUS_LABELS[String(value)] ?? String(value)) : '—';
                          else if (key === 'due_date') display = fmtDate(value);
                          else display = value !== null && value !== undefined ? String(value) : '—';

                          if (!changed) return <span className="font-sora text-[12px] text-ltt">{display}</span>;

                          let prevDisplay: string;
                          if (key === 'option') prevDisplay = prevVal ? (OPTION_LABELS[String(prevVal)] ?? String(prevVal)) : '—';
                          else if (key === 'status') prevDisplay = prevVal ? (ACTION_STATUS_LABELS[String(prevVal)] ?? String(prevVal)) : '—';
                          else if (key === 'due_date') prevDisplay = fmtDate(prevVal);
                          else prevDisplay = prevVal !== null && prevVal !== undefined ? String(prevVal) : '—';

                          return (
                            <span className="flex items-center gap-1 flex-wrap">
                              <span className="font-sora text-[11px] text-lttm line-through">{prevDisplay}</span>
                              <ArrowRight size={10} className="text-amber-500 shrink-0" />
                              <span className="font-sora text-[12px] font-semibold text-amber-700">{display}</span>
                            </span>
                          );
                        }

                        return (
                          <tr key={id} className={`border-b border-ltb/50 ${rowHighlight}`}>
                            <td className="py-2 pr-4">
                              <div className="flex items-center gap-1.5">
                                {isNew && (
                                  <span className="font-plex text-[9px] px-1.5 py-0.5 bg-green-100 text-green-700 border border-green-200 rounded-[4px]">
                                    nuevo
                                  </span>
                                )}
                                <span className="font-mono text-[11px] text-lttm">{id.slice(0, 8)}…</span>
                              </div>
                            </td>
                            <td className="py-2 pr-4">{cell('option', action.option)}</td>
                            <td className="py-2 pr-4">{cell('status', action.status)}</td>
                            <td className="py-2 pr-4">
                              <span className="font-sora text-[12px] text-ltt">{action.s_actual_at_creation !== undefined ? String(action.s_actual_at_creation) : '—'}</span>
                            </td>
                            <td className="py-2 pr-4">{cell('s_residual_target', action.s_residual_target)}</td>
                            <td className="py-2 pr-4">{cell('s_residual_achieved', action.s_residual_achieved)}</td>
                            <td className="py-2 pr-4">{cell('due_date', action.due_date)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-ltb bg-ltcard2 shrink-0 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] font-plex text-[11.5px] font-medium bg-ltbg border border-ltb text-lttm hover:text-ltt transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
