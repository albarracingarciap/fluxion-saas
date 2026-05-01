'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2 } from 'lucide-react';

import type {
  TreatmentOption,
  TreatmentPlanData,
} from '@/lib/fmea/treatment-plan';
import type { TaskStatus } from '@/lib/tasks/types';
import {
  buildInitialActions,
  getComparableActionSignature,
  getDaysFromToday,
  getProjectedZone,
  type EditableTreatmentAction,
} from '@/lib/fmea/treatment-plan-utils';
import { PlanProgressPanel } from './plan-progress-panel';
import { ApprovalReviewPanel } from './approval-review-panel';
import { PlanStatsBar } from './plan-stats-bar';
import { ActionsGroupSection } from './actions-group-section';
import { PlanHeader } from './plan-header';
import { PlanWarningBanners } from './plan-warning-banners';
import { PlanResidualPanel } from './plan-residual-panel';
import { BulkActionBar } from './bulk-action-bar';

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
  const [selectedActionIds, setSelectedActionIds] = useState<Set<string>>(() => new Set());
  type BulkModal = 'assign' | 'duedate' | 'option' | null;
  const [bulkModal, setBulkModal] = useState<BulkModal>(null);

  const readOnly = data.read_only || data.plan.status !== 'draft';
  const isExecutiveApproval = data.plan.approval_level === 'level_3';
  const projectedZone = useMemo(
    () => getProjectedZone(actions, data.system.aiact_risk_level),
    [actions, data.system.aiact_risk_level]
  );
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

  function toggleActionSelection(actionId: string) {
    setSelectedActionIds((current) => {
      const next = new Set(current);
      if (next.has(actionId)) next.delete(actionId);
      else next.add(actionId);
      return next;
    });
  }

  function toggleGroupSelection(groupActionIds: string[]) {
    setSelectedActionIds((current) => {
      const next = new Set(current);
      const allSelected = groupActionIds.length > 0 && groupActionIds.every((id) => next.has(id));
      if (allSelected) {
        groupActionIds.forEach((id) => next.delete(id));
      } else {
        groupActionIds.forEach((id) => next.add(id));
      }
      return next;
    });
  }

  function clearSelection() {
    setSelectedActionIds(new Set());
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

      <PlanResidualPanel
        planNotes={planNotes}
        approvalLevel={data.plan.approval_level}
        actionsTotal={actions.length}
        acceptedCount={actions.filter((a) => a.option === 'aceptar').length}
        readOnly={readOnly}
        onNotesChange={setPlanNotes}
      />

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
            selectedActionIds={selectedActionIds}
            onToggleSelection={toggleActionSelection}
            onToggleGroupSelection={toggleGroupSelection}
          />
        ))}
      </div>

      <BulkActionBar
        selectedCount={selectedActionIds.size}
        onClearSelection={clearSelection}
        onAssign={() => setBulkModal('assign')}
        onSetDueDate={() => setBulkModal('duedate')}
        onChangeOption={() => setBulkModal('option')}
        onExportCsv={() => setBulkModal(null)}
      />

    </div>
  );
}
