'use client';

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertTriangle, ArrowLeft, CheckCircle2, ChevronRight, ListTodo, Loader2, Save, ShieldAlert, XCircle } from 'lucide-react';

import { getZoneClasses, getZoneLabel } from '@/lib/fmea/domain';
import type {
  TreatmentActionStatus,
  TreatmentOption,
  TreatmentPlanActionView,
  TreatmentPlanData,
} from '@/lib/fmea/treatment-plan';
import type { TaskStatus } from '@/lib/tasks/types';
import {
  buildInitialActions,
  getComparableActionSignature,
  getDaysFromToday,
  getOptionLabel,
  getProjectedSeverity,
  getProjectedZone,
  getSeverityMeta,
  type EditableTreatmentAction,
} from '@/lib/fmea/treatment-plan-utils';
import {
  ACTION_STATUS_META,
  APPROVAL_LEVEL_META,
  DIMENSION_META,
  OPTION_META,
  PLAN_STATUS_META,
} from './treatment-plan-ui-constants';
import { TaskStatusChip } from './task-status-chip';
import { PlanProgressPanel } from './plan-progress-panel';
import { EvidenceSection } from './evidence-section';
import { ApprovalReviewPanel } from './approval-review-panel';

import {
  saveTreatmentActionDecision,
  saveTreatmentPlanBatchDraft,
  saveTreatmentPlanDraft,
  submitTreatmentPlanForApproval,
  updateLinkedTaskStatusAction,
} from './actions';

export function TreatmentPlanClient({ data }: { data: TreatmentPlanData }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [actions, setActions] = useState<EditableTreatmentAction[]>(() => buildInitialActions(data.actions));
  const [savedActions, setSavedActions] = useState<EditableTreatmentAction[]>(() => buildInitialActions(data.actions));
  const [expandedActionId, setExpandedActionId] = useState<string | null>(() => {
    const requestedActionId = searchParams.get('action');
    if (requestedActionId && data.actions.some((action) => action.id === requestedActionId)) {
      return requestedActionId;
    }
    return data.actions[0]?.id ?? null;
  });
  const [planNotes, setPlanNotes] = useState(data.plan.residual_risk_notes ?? '');
  const [savedNotes, setSavedNotes] = useState(data.plan.residual_risk_notes ?? '');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [savingActionId, setSavingActionId] = useState<string | null>(null);
  const [isSavingAction, startSavingAction] = useTransition();
  const [isSavingDraft, startSavingDraft] = useTransition();
  const [isSubmittingPlan, startSubmittingPlan] = useTransition();
  const [controlResolutionByAction, setControlResolutionByAction] = useState<
    Record<string, 'linked' | 'created' | null>
  >({});
  const [taskStatuses, setTaskStatuses] = useState<Record<string, TaskStatus>>(() => {
    const map: Record<string, TaskStatus> = {};
    for (const action of data.actions) {
      if (action.task_id && action.task_status) {
        map[action.task_id] = action.task_status as TaskStatus;
      }
    }
    return map;
  });
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);
  const [, startTaskTransition] = useTransition();
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const readOnly = data.read_only || data.plan.status !== 'draft';
  const isExecutiveApproval = data.plan.approval_level === 'level_3';
  const projectedZone = useMemo(
    () => getProjectedZone(actions, data.system.aiact_risk_level),
    [actions, data.system.aiact_risk_level]
  );
  const projectedZoneMeta = getZoneClasses(projectedZone);
  const definedCount = actions.filter((action) => action.option !== null).length;
  const pendingCount = actions.length - definedCount;
  const hasUnsavedNotes = planNotes.trim() !== savedNotes.trim();
  const hasUnsavedActionChanges = useMemo(() => {
    if (actions.length !== savedActions.length) return true;
    const savedMap = new Map(savedActions.map((action) => [action.id, getComparableActionSignature(action)]));
    return actions.some((action) => savedMap.get(action.id) !== getComparableActionSignature(action));
  }, [actions, savedActions]);
  const hasPendingLocalChanges = hasUnsavedNotes || hasUnsavedActionChanges;
  const incompleteActionCount = useMemo(
    () =>
      actions.filter((action) => {
        if (!action.option) return false;
        if (!action.owner_id || !action.due_date) return true;
        if (action.due_date > data.plan.deadline) return true;
        if (action.option === 'mitigar') {
          return !action.control_id || action.s_residual_target === null;
        }
        if (action.option === 'aceptar') {
          return (action.justification?.trim().length ?? 0) < 100 || !action.review_due_date;
        }
        if (['transferir', 'evitar', 'diferir'].includes(action.option)) {
          if ((action.justification?.trim().length ?? 0) < 50) return true;
          if (
            action.option === 'diferir' &&
            (getDaysFromToday(action.due_date) ?? 0) > 90 &&
            (action.justification?.trim().length ?? 0) < 100
          ) {
            return true;
          }
          return false;
        }
        return false;
      }).length,
    [actions, data.plan.deadline]
  );
  const submitBlocked = pendingCount > 0 || incompleteActionCount > 0;
  const submitTitle =
    pendingCount > 0
      ? `Quedan ${pendingCount} acciones sin definir antes del envío.`
      : incompleteActionCount > 0
        ? `Hay ${incompleteActionCount} acciones incompletas o inconsistentes que debes revisar antes del envío.`
        : undefined;

  const groupedActions = useMemo(() => {
    const groups = [
      {
        id: 'zona_i',
        label: 'Tratamiento crítico · S_actual = 9',
        items: actions.filter((action) => action.s_actual_at_creation === 9),
      },
      {
        id: 'zona_ii',
        label: 'Tratamiento prioritario · S_actual = 8',
        items: actions.filter((action) => action.s_actual_at_creation === 8),
      },
      {
        id: 'zona_iii',
        label: 'Tratamiento relevante · S_actual = 7',
        items: actions.filter((action) => action.s_actual_at_creation === 7),
      },
    ];

    return groups.filter((group) => group.items.length > 0);
  }, [actions]);

  useEffect(() => {
    const requestedActionId = searchParams.get('action');
    if (requestedActionId && actions.some((action) => action.id === requestedActionId)) {
      setExpandedActionId(requestedActionId);
      return;
    }

    if (expandedActionId && actions.some((action) => action.id === expandedActionId)) {
      return;
    }

    setExpandedActionId(actions[0]?.id ?? null);
  }, [searchParams, actions, expandedActionId]);

  const draftSyncLabel = isSavingDraft || isSavingAction || isSubmittingPlan
    ? 'Guardando…'
    : hasPendingLocalChanges
      ? 'Cambios pendientes'
      : 'Borrador sincronizado';

  useEffect(() => {
    if (readOnly || !hasPendingLocalChanges || isSavingDraft || isSavingAction || isSubmittingPlan) {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
      return;
    }

    autosaveTimerRef.current = setTimeout(() => {
      startSavingDraft(async () => {
        const savedMap = new Map(savedActions.map((action) => [action.id, getComparableActionSignature(action)]));
        const dirtyActions = actions.filter(
          (action) => savedMap.get(action.id) !== getComparableActionSignature(action)
        );

        const result = await saveTreatmentPlanBatchDraft({
          aiSystemId: data.system.id,
          evaluationId: data.evaluation.id,
          notes: planNotes,
          actions: dirtyActions.map((action) => ({
            actionId: action.id,
            option: action.option,
            ownerId: action.owner_id,
            dueDate: action.due_date,
            justification: action.justification,
            sResidualTarget: action.s_residual_target,
            controlTemplateId: action.control_template_id,
            reviewDueDate: action.review_due_date,
          })),
        });

        if (result?.error) {
          setGlobalError(result.error);
          return;
        }

        setSavedNotes(planNotes);
        setSavedActions(actions);
      });
    }, 30000);

    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
        autosaveTimerRef.current = null;
      }
    };
  }, [
    actions,
    data.evaluation.id,
    data.system.id,
    hasPendingLocalChanges,
    isSavingAction,
    isSavingDraft,
    isSubmittingPlan,
    planNotes,
    readOnly,
    savedActions,
    startSavingDraft,
  ]);

  useEffect(() => {
    if (readOnly || !hasPendingLocalChanges) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasPendingLocalChanges, readOnly]);

  function handleTaskStatusChange(taskId: string, newStatus: TaskStatus) {
    const previous = taskStatuses[taskId];
    setTaskStatuses((prev) => ({ ...prev, [taskId]: newStatus }));
    setUpdatingTaskId(taskId);
    startTaskTransition(async () => {
      const res = await updateLinkedTaskStatusAction(
        taskId,
        newStatus,
        data.system.id,
        data.evaluation.id,
      );
      if ('error' in res) {
        setTaskStatuses((prev) => ({ ...prev, [taskId]: previous ?? 'todo' }));
      }
      setUpdatingTaskId(null);
    });
  }

  function patchAction(actionId: string, updater: (action: EditableTreatmentAction) => EditableTreatmentAction) {
    setActions((current) => current.map((action) => (action.id === actionId ? updater(action) : action)));
  }

  function handleSelectOption(actionId: string, option: TreatmentOption) {
    patchAction(actionId, (current) => ({
      ...current,
      option,
      s_residual_target:
        option === 'mitigar'
          ? current.s_residual_target ?? Math.max(current.s_actual_at_creation - 2, 1)
          : null,
      control_template_id: option === 'mitigar' ? current.control_template_id : null,
      control_id: option === 'mitigar' ? current.control_id : null,
      review_due_date: option === 'aceptar' ? current.review_due_date : null,
    }));
  }

  function handleSaveDraft() {
    setGlobalError(null);

    startSavingDraft(async () => {
      const result = await saveTreatmentPlanDraft({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        notes: planNotes,
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      setSavedNotes(planNotes);
      setSavedActions(actions);
    });
  }

  function handleSaveAction(action: EditableTreatmentAction) {
    if (!action.option) {
      setGlobalError('Selecciona una opción de tratamiento antes de guardar la acción.');
      return;
    }

    setGlobalError(null);
    setSavingActionId(action.id);

    startSavingAction(async () => {
      const result = await saveTreatmentActionDecision({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        actionId: action.id,
        option: action.option,
        ownerId: action.owner_id,
        dueDate: action.due_date,
        justification: action.justification,
        sResidualTarget: action.s_residual_target,
        controlTemplateId: action.control_template_id,
        reviewDueDate: action.review_due_date,
      });

      setSavingActionId(null);

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      patchAction(action.id, (current) => ({
        ...current,
        control_id: result?.controlId ?? current.control_id,
        control_refs: current.control_refs.map((ref) =>
          ref.control_template_id === current.control_template_id && result?.controlId
            ? {
                ...ref,
                existing_control_id: result.controlId,
                existing_control_status: ref.existing_control_status ?? 'planned',
              }
            : ref
        ),
      }));
      setControlResolutionByAction((current) => ({
        ...current,
        [action.id]: result?.controlResolution ?? null,
      }));
      setSavedActions((current) =>
        current.map((row) =>
          row.id === action.id
            ? {
                ...row,
                ...action,
                control_id: result?.controlId ?? row.control_id,
                control_refs: row.control_refs.map((ref) =>
                  ref.control_template_id === action.control_template_id && result?.controlId
                    ? {
                        ...ref,
                        existing_control_id: result.controlId,
                        existing_control_status: ref.existing_control_status ?? 'planned',
                      }
                    : ref
                ),
              }
            : row
        )
      );
    });
  }

  function handleSubmitPlan() {
    setGlobalError(null);

    startSubmittingPlan(async () => {
      let approvalMinutesRef: string | null = null;

      if (isExecutiveApproval) {
        const promptedRef = window.prompt(
          'Este plan requiere aprobación de alta dirección. Indica la referencia del acta o comité para continuar:',
          data.plan.approval_minutes_ref ?? ''
        );

        if (promptedRef === null) {
          return;
        }

        approvalMinutesRef = promptedRef.trim();

        if (!approvalMinutesRef) {
          setGlobalError('Debes indicar una referencia de acta o comité para enviar este plan a alta dirección.');
          return;
        }
      }

      const result = await submitTreatmentPlanForApproval({
        aiSystemId: data.system.id,
        evaluationId: data.evaluation.id,
        approvalMinutesRef,
      });

      if (result?.error) {
        setGlobalError(result.error);
        return;
      }

      if (result?.summaryPath) {
        router.push(result.summaryPath);
      }
    });
  }

  return (
    <div className="max-w-[1500px] mx-auto w-full animate-fadein pb-10">
      {data.plan.code === 'PREVIEW-DRAFT' && (
        <div className="mb-6 rounded-[12px] border border-cyan-border bg-cyan-dim px-5 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-ltcard border border-cyan-border flex items-center justify-center text-brand-cyan">
              <ShieldAlert size={20} />
            </div>
            <div>
              <div className="font-sora text-[15px] font-semibold text-ltt">Borrador de Previsualización</div>
              <p className="font-sora text-[13px] text-ltt2">
                Esta es una vista previa de cómo quedará tu plan. Finaliza la evaluación para poder editar y enviar el plan real.
              </p>
            </div>
          </div>
          <Link
            href={`/inventario/${data.system.id}/fmea/${data.evaluation.id}/evaluar`}
            className="px-4 py-2 rounded-[8px] border border-cyan-border text-brand-cyan font-sora text-[12.5px] font-medium hover:bg-white transition-colors"
          >
            Volver a evaluar
          </Link>
        </div>
      )}
      <div className="mb-5 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider mb-3">
            <Link
              href={`/inventario/${data.system.id}/fmea/${data.evaluation.id}/evaluar`}
              className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors"
            >
              <ArrowLeft size={14} className="text-lttm" />
              <span>Volver a evaluación</span>
            </Link>
            <span>/</span>
            <span className="text-ltt">Plan de tratamiento</span>
          </div>
          <h1 className="font-fraunces text-[32px] leading-none font-semibold text-ltt mb-2">
            {data.system.name}
          </h1>
          <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">
            {data.plan.code} · Evaluación FMEA v{data.evaluation.version} ·{' '}
            {data.system.internal_id ?? data.system.id.slice(0, 8)}
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {!readOnly && (
            <>
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={isSavingDraft || !hasPendingLocalChanges}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] border border-ltb bg-ltcard text-ltt font-sora text-[12.5px] font-medium hover:border-cyan-border hover:text-brand-cyan transition-colors disabled:opacity-60"
              >
                {isSavingDraft ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Guardar borrador
              </button>
              <button
                type="button"
                onClick={handleSubmitPlan}
                disabled={isSubmittingPlan || submitBlocked}
                title={submitTitle}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60"
              >
                {isSubmittingPlan ? <Loader2 className="w-4 h-4 animate-spin" /> : <ChevronRight className="w-4 h-4" />}
                {isExecutiveApproval ? 'Enviar a alta dirección' : 'Enviar a aprobación'}
              </button>
            </>
          )}
          <span className="font-sora text-[12px] text-lttm">{draftSyncLabel}</span>
        </div>
      </div>

      <div className="mb-5 rounded-[12px] border border-ltb bg-[#070c14] text-white overflow-hidden shadow-[0_2px_14px_rgba(0,0,0,0.08)]">
        <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_1fr_1fr_1fr_1fr_auto] divide-y xl:divide-y-0 xl:divide-x divide-[#18324a]">
          <div className="px-5 py-4 flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${projectedZoneMeta.dot} ${
                projectedZone === 'zona_i' || projectedZone === 'zona_ii' ? 'animate-pulse' : ''
              }`}
            />
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8]">
              Zona proyectada
            </div>
            <div className={`font-fraunces text-[22px] ${projectedZoneMeta.text}`}>{getZoneLabel(projectedZone)}</div>
          </div>

          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Aprobación</div>
            <div className="font-sora text-[14px] text-white">
              {APPROVAL_LEVEL_META[data.plan.approval_level]?.narrative ?? data.plan.approval_level}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Fecha límite</div>
            <div className="font-sora text-[14px] text-white">{data.plan.deadline}</div>
          </div>

          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Acciones definidas</div>
            <div className="font-sora text-[14px] text-white">
              {definedCount} / {actions.length}
            </div>
          </div>

          <div className="px-5 py-4">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-[#94b0c8] mb-1 flex items-center gap-1.5">
              <ListTodo className="w-3 h-3" />
              Tareas completadas
            </div>
            {data.tasks_total > 0 ? (
              <>
                <div className="font-sora text-[14px] text-white mb-1.5">
                  {data.tasks_done} / {data.tasks_total}
                </div>
                <div className="w-full h-[4px] bg-[#18324a] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#00adef] to-[#2a9d55] rounded-full transition-all"
                    style={{ width: `${Math.round((data.tasks_done / data.tasks_total) * 100)}%` }}
                  />
                </div>
              </>
            ) : (
              <div className="font-sora text-[13px] text-[#3d5a82]">Sin tareas aún</div>
            )}
          </div>

          <div className="px-5 py-4 flex items-center justify-end">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-[8px] border font-fraunces text-[14px] ${
                PLAN_STATUS_META[data.plan.status]?.pill ?? 'bg-ltcard2 border-ltb text-lttm'
              }`}
            >
              {PLAN_STATUS_META[data.plan.status]?.label ?? data.plan.status}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-[#18324a] border-t border-[#18324a]">
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Zona al crear</div>
            <div className="font-sora text-[13px] text-white">{getZoneLabel(data.plan.zone_at_creation)}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Suelo AI Act</div>
            <div className="font-sora text-[13px] text-white">{getZoneLabel(data.plan.ai_act_floor)}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Pendientes</div>
            <div className="font-sora text-[13px] text-white">{pendingCount}</div>
          </div>
          <div className="px-5 py-3">
            <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Cadencia</div>
            <div className="font-sora text-[13px] text-white">{data.plan.review_cadence ?? 'Pendiente'}</div>
          </div>
        </div>
        <div className="px-5 py-3 border-t border-[#18324a]">
          <div className="font-plex text-[10px] uppercase tracking-[1px] text-[#94b0c8] mb-1">Aprobador asignado</div>
          <div className="font-sora text-[13px] text-white">{data.approver_name ?? 'Pendiente de asignar'}</div>
        </div>
      </div>

      {data.plan.code !== 'PREVIEW-DRAFT' && (
        <PlanProgressPanel
          actions={actions}
          deadline={data.plan.deadline}
          tasksTotal={data.tasks_total}
          tasksDone={data.tasks_done}
          systemId={data.system.id}
        />
      )}

      {globalError && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-reb bg-red-dim px-4 py-3 text-re font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      {!readOnly && isExecutiveApproval && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-reb bg-red-dim px-4 py-3 text-re font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            Zona I requiere aprobación de alta dirección. Define todas las acciones del plan y envíalo con referencia de acta o comité para su trazabilidad formal.
          </span>
        </div>
      )}

      {!readOnly && submitBlocked && (
        <div className="mb-5 flex items-start gap-2 rounded-[10px] border border-orb bg-ordim px-4 py-3 text-or font-sora text-[13px]">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {pendingCount > 0
              ? `Quedan ${pendingCount} acciones sin definir antes de poder enviar el plan a aprobación.`
              : `Hay ${incompleteActionCount} acciones con datos incompletos o inconsistentes que debes revisar antes del envío.`}
          </span>
        </div>
      )}

      {data.plan.status === 'in_review' && <ApprovalReviewPanel data={data} />}

      <div className="mb-5 grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_320px] gap-6 items-start">
        <div className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">
              Riesgo residual asumido
            </div>
            <div className="font-sora text-[14px] text-ltt2">
              Documenta aquí el riesgo que seguirá vivo si todas las acciones del plan se ejecutan.
            </div>
          </div>
          <div className="p-5">
            <textarea
              value={planNotes}
              onChange={(event) => setPlanNotes(event.target.value)}
              disabled={readOnly}
              rows={4}
              placeholder="Resumen ejecutivo del riesgo residual, hipótesis de aceptación y límites de aplicación del plan."
              className="w-full rounded-[10px] border border-ltb bg-ltbg px-4 py-3 text-[13px] font-sora text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
            />
          </div>
        </div>

        <div className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="px-5 py-4 border-b border-ltb bg-ltcard2">
            <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Resumen</div>
            <div className="font-sora text-[14px] text-ltt2">El plan nace de la evaluación ya enviada a revisión.</div>
          </div>
          <div className="p-5 space-y-4">
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Acciones candidatas</div>
              <div className="font-fraunces text-[28px] text-ltt">{actions.length}</div>
            </div>
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Aceptaciones</div>
              <div className="font-fraunces text-[28px] text-ltt">
                {actions.filter((action) => action.option === 'aceptar').length}
              </div>
            </div>
            <div>
              <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-1">Nivel requerido</div>
              <div className="font-sora text-[14px] text-ltt">
                {APPROVAL_LEVEL_META[data.plan.approval_level]?.label ?? data.plan.approval_level}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-5">
        {actions.length === 0 && (
          <div className="rounded-[12px] border border-ltb bg-ltcard p-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
            <div className="w-14 h-14 rounded-full bg-grdim border border-grb flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 className="w-6 h-6 text-gr" />
            </div>
            <h2 className="font-fraunces text-3xl font-semibold text-ltt mb-3">No hay acciones de tratamiento pendientes</h2>
            <p className="font-sora text-[14px] text-ltt2 leading-relaxed">
              Esta evaluación no ha generado modos con severidad suficiente para crear acciones de tratamiento.
            </p>
          </div>
        )}

        {groupedActions.map((group) => (
          <div key={group.id} className="rounded-[12px] border border-ltb bg-ltcard shadow-[0_2px_12px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="px-5 py-4 border-b border-ltb bg-ltcard2 flex items-center justify-between gap-3">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-1">Bloque de tratamiento</div>
                <div className="font-sora text-[15px] text-ltt">{group.label}</div>
              </div>
              <span className="inline-flex items-center px-3 py-1 rounded-[7px] border border-ltb bg-ltcard text-lttm font-plex text-[10px] uppercase tracking-[1px]">
                {group.items.length} acciones
              </span>
            </div>

            <div className="p-5 space-y-4">
              {group.items.map((action) => {
                const severityMeta = getSeverityMeta(action.s_actual_at_creation);
                const isExpanded = expandedActionId === action.id;

                return (
                  <div
                    key={action.id}
                    className={`rounded-[12px] border ${
                      isExpanded ? 'border-cyan-border shadow-[0_0_0_2px_rgba(0,173,239,0.08)]' : 'border-ltb'
                    } overflow-hidden`}
                  >
                    <button
                      type="button"
                      onClick={() => setExpandedActionId((current) => (current === action.id ? null : action.id))}
                      className="w-full px-4 py-3.5 bg-ltcard hover:bg-ltbg transition-colors flex items-center gap-4 text-left"
                    >
                      <div className={`w-11 h-11 rounded-[10px] border flex items-center justify-center font-fraunces text-[20px] ${severityMeta.circle}`}>
                        {action.s_actual_at_creation}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="font-sora text-[14px] font-semibold text-ltt leading-snug">
                          {action.failure_mode_name}
                        </div>
                        <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
                          {action.failure_mode_code} · {DIMENSION_META[action.dimension_id] ?? action.dimension_name} · {action.bloque}
                        </div>
                      </div>

                      <span className={`inline-flex items-center px-3 py-1 rounded-[7px] border font-plex text-[10px] uppercase tracking-[1px] ${severityMeta.pill}`}>
                        {severityMeta.label}
                      </span>

                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-[7px] border font-plex text-[10px] uppercase tracking-[1px] ${
                          action.option
                            ? OPTION_META[action.option].active
                            : 'bg-ltcard2 border-ltb text-lttm'
                        }`}
                      >
                        {getOptionLabel(action.option)}
                      </span>

                      {action.task_id && action.option !== 'aceptar' && (
                        <TaskStatusChip
                          taskId={action.task_id}
                          status={(taskStatuses[action.task_id] ?? action.task_status ?? 'todo') as TaskStatus}
                          isUpdating={updatingTaskId === action.task_id}
                          onChange={handleTaskStatusChange}
                        />
                      )}

                      <ChevronRight
                        className={`w-4 h-4 text-lttm transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                      />
                    </button>

                    {isExpanded && (
                      <div className="border-t border-ltb bg-ltbg p-4 space-y-4">
                        {action.task_id && action.option !== 'aceptar' && (
                          <div className="rounded-[10px] border border-cyan-border bg-cyan-dim flex items-center justify-between gap-4 px-4 py-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <ListTodo className="w-4 h-4 text-brand-cyan shrink-0" />
                              <div className="min-w-0">
                                <span className="font-plex text-[10px] uppercase tracking-[1px] text-brand-cyan block mb-0.5">
                                  Tarea vinculada
                                </span>
                                <span className="font-sora text-[12px] text-ltt2">
                                  Estado sincronizado automáticamente con la acción de tratamiento
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <TaskStatusChip
                                taskId={action.task_id}
                                status={(taskStatuses[action.task_id] ?? action.task_status ?? 'todo') as TaskStatus}
                                isUpdating={updatingTaskId === action.task_id}
                                onChange={handleTaskStatusChange}
                              />
                              <Link
                                href="/tareas"
                                className="font-plex text-[10px] uppercase tracking-[1px] text-brand-cyan hover:underline whitespace-nowrap"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver en Tareas →
                              </Link>
                            </div>
                          </div>
                        )}

                        <div className="rounded-[10px] border border-ltb bg-ltcard px-4 py-3">
                          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                            Contexto del modo
                          </div>
                          <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
                            {action.failure_mode_description}
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard2 font-plex text-[10px] uppercase tracking-[1px] text-lttm">
                              {action.subcategoria}
                            </span>
                            <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard2 font-plex text-[10px] uppercase tracking-[1px] text-lttm">
                              {action.tipo}
                            </span>
                            {action.requires_second_review && (
                              <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-orb bg-ordim font-plex text-[10px] uppercase tracking-[1px] text-or">
                                Requiere 2ª revisión
                              </span>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                            Decisión de tratamiento
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(Object.keys(OPTION_META) as TreatmentOption[]).map((option) => {
                              const disabled = readOnly || (option === 'aceptar' && action.s_actual_at_creation === 9);
                              return (
                                <button
                                  key={option}
                                  type="button"
                                  disabled={disabled}
                                  onClick={() => handleSelectOption(action.id, option)}
                                  className={`inline-flex items-center px-3 py-2 rounded-[8px] border font-plex text-[10.5px] uppercase tracking-[1px] transition-colors ${
                                    action.option === option
                                      ? OPTION_META[option].active
                                      : 'bg-ltcard text-lttm border-ltb hover:border-cyan-border hover:text-ltt'
                                  } disabled:opacity-40 disabled:cursor-not-allowed`}
                                >
                                  {OPTION_META[option].label}
                                </button>
                              );
                            })}
                          </div>
                          {action.option && (
                            <p className="mt-2 font-sora text-[12.5px] text-ltt2">
                              {OPTION_META[action.option].description}
                            </p>
                          )}
                        </div>

                        {action.option === 'mitigar' && (
                          <div className="rounded-[10px] border border-ltb bg-ltcard p-4">
                            <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-3">
                              Controles sugeridos
                            </div>
                            <div className="space-y-2">
                              {action.control_refs.length === 0 && (
                                <div className="rounded-[8px] border border-orb bg-ordim px-4 py-3 font-sora text-[13px] text-or">
                                  Este modo no tiene controles sugeridos en el catálogo actual. Con el schema vigente no podemos crear un control manual libre desde esta pantalla: para mitigar aquí necesitamos un control mapeado o ampliar primero los mappings del catálogo.
                                </div>
                              )}

                              {action.control_refs.map((control) => (
                                <button
                                  key={control.control_template_id}
                                  type="button"
                                  disabled={readOnly}
                                  onClick={() =>
                                    patchAction(action.id, (current) => ({
                                      ...current,
                                      control_template_id: control.control_template_id,
                                    }))
                                  }
                                  className={`w-full rounded-[8px] border px-4 py-3 text-left transition-colors ${
                                    action.control_template_id === control.control_template_id
                                      ? 'border-cyan-border bg-cyan-dim'
                                      : 'border-ltb bg-ltbg hover:border-cyan-border hover:bg-ltcard'
                                  } disabled:opacity-70`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div>
                                      <div className="font-sora text-[13px] font-semibold text-ltt">
                                        {control.control_name}
                                      </div>
                                      <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mt-1">
                                        {control.control_code}
                                        {control.control_area ? ` · ${control.control_area}` : ''}
                                      </div>
                                      {control.control_description && (
                                        <p className="mt-2 font-sora text-[12px] text-ltt2 leading-relaxed">
                                          {control.control_description}
                                        </p>
                                      )}
                                    </div>
                                    {control.existing_control_status && (
                                      <span className="inline-flex items-center px-2.5 py-1 rounded-[6px] border border-ltb bg-ltcard font-plex text-[10px] uppercase tracking-[1px] text-lttm shrink-0">
                                        {control.existing_control_status}
                                      </span>
                                    )}
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-[6px] border font-plex text-[10px] uppercase tracking-[1px] shrink-0 ${
                                        control.existing_control_id
                                          ? 'border-grb bg-grdim text-gr'
                                          : 'border-cyan-border bg-cyan-dim text-brand-cyan'
                                      }`}
                                    >
                                      {control.existing_control_id ? 'Ya existe' : 'Se creará'}
                                    </span>
                                  </div>
                                  {action.control_template_id === control.control_template_id && (
                                    <p className="mt-2 font-sora text-[12px] text-ltt2">
                                      {control.existing_control_id
                                        ? 'Al confirmar esta mitigación se vinculará el control existente al tratamiento.'
                                        : 'Al confirmar esta mitigación se instanciará un nuevo control para este sistema.'}
                                    </p>
                                  )}
                                </button>
                              ))}
                            </div>

                            {controlResolutionByAction[action.id] && (
                              <div className="mt-3 rounded-[8px] border border-grb bg-grdim px-4 py-3 font-sora text-[12.5px] text-gr">
                                {controlResolutionByAction[action.id] === 'linked'
                                  ? 'La última decisión reutilizó un control ya existente del sistema.'
                                  : 'La última decisión creó un nuevo control de mitigación para este sistema.'}
                              </div>
                            )}

                            <div className="mt-4 rounded-[8px] border border-ltb bg-ltbg px-4 py-3">
                              <div className="flex items-center gap-4">
                                <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">
                                  S residual objetivo
                                </div>
                                <div className="font-fraunces text-[24px] text-gr">
                                  {action.s_residual_target ?? Math.max(action.s_actual_at_creation - 2, 1)}
                                </div>
                              </div>
                              <input
                                type="range"
                                min={1}
                                max={Math.max(action.s_actual_at_creation - 1, 1)}
                                step={1}
                                disabled={readOnly}
                                value={action.s_residual_target ?? Math.max(action.s_actual_at_creation - 2, 1)}
                                onChange={(event) =>
                                  patchAction(action.id, (current) => ({
                                    ...current,
                                    s_residual_target: Number(event.target.value),
                                  }))
                                }
                                className="mt-3 w-full accent-brand-cyan"
                              />
                            </div>
                          </div>
                        )}

                        {action.option && action.option !== 'mitigar' && (
                          <div
                            className={`rounded-[10px] border p-4 ${
                              action.option === 'aceptar'
                                ? 'border-orb bg-ordim'
                                : action.option === 'evitar'
                                  ? 'border-reb bg-red-dim'
                                  : 'border-ltb bg-ltcard'
                            }`}
                          >
                            <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                              Justificación y trazabilidad
                            </div>
                            <textarea
                              rows={4}
                              value={action.justification ?? ''}
                              disabled={readOnly}
                              onChange={(event) =>
                                patchAction(action.id, (current) => ({
                                  ...current,
                                  justification: event.target.value,
                                }))
                              }
                              placeholder={
                                action.option === 'aceptar'
                                  ? 'Describe por qué el riesgo se acepta formalmente, qué límites tiene y cómo se revisará.'
                                  : 'Documenta la decisión, el mecanismo operativo y la evidencia esperada para cerrar esta acción.'
                              }
                              className="mt-2 w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
                            />
                            {action.option === 'diferir' && (getDaysFromToday(action.due_date) ?? 0) > 90 && (
                              <p className="mt-2 font-sora text-[12px] text-or">
                                Aplazamiento superior a 90 días: exige una justificación reforzada de al menos 100 caracteres.
                              </p>
                            )}
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                              Responsable
                            </label>
                            <select
                              value={action.owner_id ?? ''}
                              disabled={readOnly}
                              onChange={(event) =>
                                patchAction(action.id, (current) => ({
                                  ...current,
                                  owner_id: event.target.value || null,
                                }))
                              }
                              className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
                            >
                              <option value="">Selecciona responsable</option>
                              {data.members.map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.full_name} · {member.role}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                              Fecha objetivo
                            </label>
                            <input
                              type="date"
                              value={action.due_date ?? ''}
                              max={data.plan.deadline}
                              disabled={readOnly}
                              onChange={(event) =>
                                patchAction(action.id, (current) => ({
                                  ...current,
                                  due_date: event.target.value || null,
                                }))
                              }
                              className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
                            />
                            {action.due_date && action.due_date > data.plan.deadline && (
                              <p className="mt-2 font-sora text-[12px] text-re">
                                La fecha objetivo no puede superar la fecha límite global del plan ({data.plan.deadline}).
                              </p>
                            )}
                          </div>
                        </div>

                        {action.option === 'aceptar' && (
                          <div>
                            <label className="block font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-2">
                              Fecha de revisión
                            </label>
                            <input
                              type="date"
                              value={action.review_due_date ?? ''}
                              disabled={readOnly}
                              onChange={(event) =>
                                patchAction(action.id, (current) => ({
                                  ...current,
                                  review_due_date: event.target.value || null,
                                }))
                              }
                              className="w-full rounded-[8px] border border-ltb bg-ltcard px-3 py-2 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border disabled:opacity-70"
                            />
                          </div>
                        )}

                        {!readOnly && (
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleSaveAction(action)}
                              disabled={savingActionId === action.id || isSavingAction}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] bg-gradient-to-br from-[#00adef] to-[#33c3f5] text-white font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:shadow-[0_4px_18px_rgba(0,173,239,0.28)] disabled:opacity-60"
                            >
                              {savingActionId === action.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                              Guardar decisión
                            </button>

                            <span className="font-sora text-[12px] text-lttm">
                              {action.option ? `Opción actual: ${OPTION_META[action.option].label}` : 'Acción pendiente de decisión'}
                            </span>
                          </div>
                        )}

                        {readOnly && (
                          <div className="rounded-[8px] border border-ltb bg-ltcard px-4 py-3 font-sora text-[12.5px] text-ltt2">
                            Este plan ya no está en borrador. La decisión queda visible en modo solo lectura.
                          </div>
                        )}

                        {(action.option || action.evidence_id) && (
                          <EvidenceSection
                            action={action}
                            aiSystemId={data.system.id}
                            evaluationId={data.evaluation.id}
                            readOnly={readOnly}
                          />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {readOnly && (
        <div className="mt-6 rounded-[12px] border border-ltb bg-ltcard px-5 py-4 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-ordim border border-orb flex items-center justify-center shrink-0">
            <ShieldAlert className="w-4 h-4 text-or" />
          </div>
          <div>
            <div className="font-sora text-[14px] font-semibold text-ltt mb-1">
              El plan ya salió del modo borrador
            </div>
            <div className="font-sora text-[13px] text-ltt2 leading-relaxed">
              A partir de aquí la siguiente fase será la ejecución, validación de evidencias y cierre de acciones. Esta primera versión deja ya montada la toma de decisión por modo de fallo.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
