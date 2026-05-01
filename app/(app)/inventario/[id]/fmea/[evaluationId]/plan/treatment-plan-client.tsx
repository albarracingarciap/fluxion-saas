'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

import { getZoneClasses } from '@/lib/fmea/domain';
import type {
  TreatmentOption,
  TreatmentPlanData,
} from '@/lib/fmea/treatment-plan';
import type { TaskStatus } from '@/lib/tasks/types';
import {
  buildInitialActions,
  getComparableActionSignature,
  getDaysFromToday,
  getProjectedSeverity,
  getProjectedZone,
  type EditableTreatmentAction,
} from '@/lib/fmea/treatment-plan-utils';
import { APPROVAL_LEVEL_META } from './treatment-plan-ui-constants';
import { PlanProgressPanel } from './plan-progress-panel';
import { ApprovalReviewPanel } from './approval-review-panel';
import { PlanStatsBar } from './plan-stats-bar';
import { ActionsGroupSection } from './actions-group-section';
import { PlanHeader } from './plan-header';
import { PlanWarningBanners } from './plan-warning-banners';

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
      <PlanHeader
        systemName={data.system.name}
        systemId={data.system.id}
        systemInternalId={data.system.internal_id}
        evaluationId={data.evaluation.id}
        evaluationVersion={data.evaluation.version}
        planCode={data.plan.code}
        readOnly={readOnly}
        isSavingDraft={isSavingDraft}
        isSubmittingPlan={isSubmittingPlan}
        hasPendingLocalChanges={hasPendingLocalChanges}
        submitBlocked={submitBlocked}
        submitTitle={submitTitle}
        isExecutiveApproval={isExecutiveApproval}
        draftSyncLabel={draftSyncLabel}
        onSaveDraft={handleSaveDraft}
        onSubmitPlan={handleSubmitPlan}
      />

      <PlanStatsBar
        plan={data.plan}
        projectedZone={projectedZone}
        definedCount={definedCount}
        actionsTotal={actions.length}
        pendingCount={pendingCount}
        tasksTotal={data.tasks_total}
        tasksDone={data.tasks_done}
        approverName={data.approver_name}
      />

      {data.plan.code !== 'PREVIEW-DRAFT' && (
        <PlanProgressPanel
          actions={actions}
          deadline={data.plan.deadline}
          tasksTotal={data.tasks_total}
          tasksDone={data.tasks_done}
          systemId={data.system.id}
        />
      )}

      <PlanWarningBanners
        globalError={globalError}
        readOnly={readOnly}
        isExecutiveApproval={isExecutiveApproval}
        submitBlocked={submitBlocked}
        pendingCount={pendingCount}
        incompleteActionCount={incompleteActionCount}
      />

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
          <ActionsGroupSection
            key={group.id}
            group={group}
            expandedActionId={expandedActionId}
            taskStatuses={taskStatuses}
            updatingTaskId={updatingTaskId}
            readOnly={readOnly}
            isSavingAction={isSavingAction}
            savingActionId={savingActionId}
            controlResolutionByAction={controlResolutionByAction}
            members={data.members}
            planDeadline={data.plan.deadline}
            aiSystemId={data.system.id}
            evaluationId={data.evaluation.id}
            onToggleAction={(actionId) => setExpandedActionId((c) => (c === actionId ? null : actionId))}
            onPatchAction={patchAction}
            onSelectOption={handleSelectOption}
            onSaveAction={handleSaveAction}
            onTaskStatusChange={handleTaskStatusChange}
          />
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
