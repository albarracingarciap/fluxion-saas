import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion';

type DashboardSystemRow = {
  id: string;
  name: string;
  internal_id: string | null;
  status: string;
  domain: string;
  aiact_risk_level: string;
  aiact_obligations: string[] | null;
  has_risk_assessment: string | null;
  training_data_doc: string | null;
  has_tech_doc: string | null;
  has_logging: string | null;
  has_human_oversight: string | null;
  has_adversarial_test: boolean | null;
  iso_42001_score: number | null;
  created_at: string;
  updated_at: string;
};

type DashboardObligationRow = {
  ai_system_id: string;
  obligation_code: string | null;
  title: string;
  status: string;
  priority: string;
};

type DashboardEvidenceRow = {
  ai_system_id: string;
  status: string;
};

type DashboardFailureModeRow = {
  ai_system_id: string;
  failure_mode_id: string;
  priority_status: 'pending_review' | 'prioritized' | 'monitoring' | 'dismissed';
  priority_score: number | null;
};

type DashboardFmeaRow = {
  system_id: string;
  state: string;
  created_at: string;
};

type DashboardPlanRow = {
  system_id: string;
  status: string;
  created_at: string;
};

type DashboardFailureModeCatalogRow = {
  id: string;
  code: string;
  name: string;
  subcategoria: string | null;
};

function mapStatus(value: string | null) {
  if (value === 'si') return 'resolved';
  if (value === 'parcial' || value === 'proceso') return 'in_progress';
  return 'pending';
}

function obligationStatusFromSystem(
  system: Pick<
    DashboardSystemRow,
    | 'has_risk_assessment'
    | 'training_data_doc'
    | 'has_tech_doc'
    | 'has_logging'
    | 'has_human_oversight'
    | 'has_adversarial_test'
  >,
  obligation: string
) {
  if (obligation.includes('Art. 9')) return mapStatus(system.has_risk_assessment);
  if (obligation.includes('Art. 10')) return mapStatus(system.training_data_doc);
  if (obligation.includes('Art. 11')) return mapStatus(system.has_tech_doc);
  if (obligation.includes('Art. 12')) return mapStatus(system.has_logging);
  if (obligation.includes('Art. 14')) return mapStatus(system.has_human_oversight);
  if (obligation.includes('Art. 15')) return system.has_adversarial_test ? 'resolved' : 'pending';
  return 'pending';
}

function obligationProgressFromStatus(status: string) {
  if (status === 'resolved') return 100;
  if (status === 'in_progress') return 55;
  return 0;
}

function getComplianceFromSystem(
  system: DashboardSystemRow,
  persistedObligations: DashboardObligationRow[]
) {
  const obligations = (system.aiact_obligations ?? []) as string[];
  if (obligations.length === 0) return 0;

  const persistedByCode = new Map(
    persistedObligations.map((row) => [row.obligation_code ?? row.title, row])
  );

  const progressItems = obligations.map((obligation) => {
    const ref = obligation.split(' — ')[0] ?? obligation;
    const persisted = persistedByCode.get(ref) ?? persistedByCode.get(obligation);
    const status = persisted?.status ?? obligationStatusFromSystem(system, obligation);
    return obligationProgressFromStatus(status);
  });

  return progressItems.length === 0
    ? 0
    : Math.round(progressItems.reduce((acc, value) => acc + value, 0) / progressItems.length);
}

function classifyPillar(title: string) {
  const normalized = title.toLowerCase();
  if (normalized.includes('document') || normalized.includes('art. 11') || normalized.includes('art. 12')) {
    return 'documentacion';
  }
  if (normalized.includes('supervisión') || normalized.includes('supervision') || normalized.includes('art. 14')) {
    return 'supervision';
  }
  if (normalized.includes('transpar') || normalized.includes('art. 13')) {
    return 'transparencia';
  }
  return 'gobernanza';
}

function getNextStep(
  systems: DashboardSystemRow[],
  failureModes: DashboardFailureModeRow[],
  fmeaRows: DashboardFmeaRow[],
  planRows: DashboardPlanRow[],
  evidenceRows: DashboardEvidenceRow[],
  systemCompliance: Map<string, number>
) {
  if (systems.length === 0) {
    return {
      title: 'Registrar primer sistema',
      description: 'Da de alta el primer sistema para empezar a generar métricas y gobierno operativo.',
      href: '/inventario/nuevo',
      cta: 'Crear primer sistema',
    };
  }

  const highSystems = systems.filter((system) => system.aiact_risk_level === 'high');
  const systemIdsWithModes = new Set(failureModes.map((row) => row.ai_system_id));
  const highWithoutModes = highSystems.find((system) => !systemIdsWithModes.has(system.id));
  if (highWithoutModes) {
    return {
      title: 'Activar modos de fallo',
      description: `Prioriza ${highWithoutModes.name}: ya está clasificado como alto riesgo y todavía no tiene modos activados.`,
      href: `/inventario/${highWithoutModes.id}`,
      cta: 'Abrir sistema crítico',
    };
  }

  const activeFmea = [...fmeaRows]
    .filter((row) => row.state === 'draft')
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
  if (activeFmea) {
    return {
      title: 'Continuar evaluación FMEA',
      description: 'Hay una evaluación FMEA en borrador pendiente de resolución.',
      href: `/inventario/${activeFmea.system_id}/fmea`,
      cta: 'Continuar evaluación',
    };
  }

  const draftPlan = [...planRows]
    .filter((row) => row.status === 'draft')
    .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
  if (draftPlan) {
    return {
      title: 'Completar plan de tratamiento',
      description: 'Existe un plan de tratamiento en borrador que requiere decisión y envío a aprobación.',
      href: `/inventario/${draftPlan.system_id}/fmea`,
      cta: 'Abrir plan',
    };
  }

  const pendingEvidenceCount = evidenceRows.filter((row) =>
    ['draft', 'pending_review'].includes(row.status)
  ).length;
  if (pendingEvidenceCount > 0) {
    return {
      title: 'Revisar evidencias pendientes',
      description: `Hay ${pendingEvidenceCount} evidencias pendientes de revisión o validación.`,
      href: '/inventario',
      cta: 'Ver inventario',
    };
  }

  const lowestComplianceSystem = [...systems]
    .sort((left, right) => (systemCompliance.get(left.id) ?? 0) - (systemCompliance.get(right.id) ?? 0))[0];

  if (lowestComplianceSystem) {
    return {
      title: 'Prioriza el sistema más rezagado',
      description: `${lowestComplianceSystem.name} concentra el menor nivel de cumplimiento actual y debería ser el siguiente foco.`,
      href: `/inventario/${lowestComplianceSystem.id}`,
      cta: 'Abrir sistema',
    };
  }

  return {
    title: 'Explorar inventario',
    description: 'El tablero está estable. Revisa el inventario para profundizar por sistema.',
    href: '/inventario',
    cta: 'Ver inventario',
  };
}

export async function buildDashboardData(organizationId: string) {
  const fluxion = createFluxionClient();
  const compliance = createComplianceClient();
  const adminFluxion = createAdminFluxionClient();

  const [
    systemsResult,
    obligationsResult,
    evidencesResult,
    failureModesResult,
    fmeaResult,
    planResult,
    soaControlsResult,
    soaMetadataResult,
  ] = await Promise.all([
    fluxion
      .from('ai_systems')
      .select(`
        id,
        name,
        internal_id,
        status,
        domain,
        aiact_risk_level,
        aiact_obligations,
        has_risk_assessment,
        training_data_doc,
        has_tech_doc,
        has_logging,
        has_human_oversight,
        has_adversarial_test,
        iso_42001_score,
        created_at,
        updated_at
      `)
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false }),
    fluxion
      .from('system_obligations')
      .select('ai_system_id, obligation_code, title, status, priority')
      .eq('organization_id', organizationId)
      .eq('source_framework', 'AI_ACT'),
    fluxion
      .from('system_evidences')
      .select('ai_system_id, status')
      .eq('organization_id', organizationId),
    fluxion
      .from('system_failure_modes')
      .select('ai_system_id, failure_mode_id, priority_status, priority_score')
      .eq('organization_id', organizationId),
    fluxion
      .from('fmea_evaluations')
      .select('system_id, state, created_at')
      .eq('organization_id', organizationId),
    fluxion
      .from('treatment_plans')
      .select('system_id, status, created_at')
      .eq('organization_id', organizationId),
    adminFluxion
      .from('organization_soa_controls')
      .select('is_applicable, status')
      .eq('organization_id', organizationId),
    adminFluxion
      .from('organization_soa_metadata')
      .select('lifecycle_status, version')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ]);

  if (systemsResult.error) {
    throw new Error(`No se pudieron cargar los sistemas: ${systemsResult.error.message}`);
  }

  const systems = (systemsResult.data ?? []) as DashboardSystemRow[];
  const obligations = (obligationsResult.data ?? []) as DashboardObligationRow[];
  const evidences = (evidencesResult.data ?? []) as DashboardEvidenceRow[];
  const failureModes = (failureModesResult.data ?? []) as DashboardFailureModeRow[];
  const fmeaRows = (fmeaResult.data ?? []) as DashboardFmeaRow[];
  const planRows = (planResult.data ?? []) as DashboardPlanRow[];

  // SoA KPIs
  const soaControls = (soaControlsResult.data ?? []) as { is_applicable: boolean; status: string }[];
  const soaMetadata = soaMetadataResult.data as { lifecycle_status: string; version: string } | null;
  const soaApplicable = soaControls.filter((c) => c.is_applicable);
  const soaImplemented = soaApplicable.filter((c) => c.status === 'implemented' || c.status === 'externalized');
  const soaKpis = soaControls.length > 0
    ? {
        totalControls: soaControls.length,
        applicableCount: soaApplicable.length,
        implementedCount: soaImplemented.length,
        completionPct: soaApplicable.length > 0
          ? Math.round((soaImplemented.length / soaApplicable.length) * 100)
          : 0,
        lifecycleStatus: soaMetadata?.lifecycle_status ?? 'draft',
        version: soaMetadata?.version ?? '1.0',
      }
    : null;

  const obligationsBySystem = new Map<string, DashboardObligationRow[]>();
  for (const row of obligations) {
    const current = obligationsBySystem.get(row.ai_system_id) ?? [];
    current.push(row);
    obligationsBySystem.set(row.ai_system_id, current);
  }

  const systemCompliance = new Map<string, number>();
  for (const system of systems) {
    systemCompliance.set(system.id, getComplianceFromSystem(system, obligationsBySystem.get(system.id) ?? []));
  }

  const systemsHealth = systems.map((system) => {
    const compliancePercent = systemCompliance.get(system.id) ?? 0;
    const evidenceRows = evidences.filter((row) => row.ai_system_id === system.id);
    const pendingEvidenceCount = evidenceRows.filter((row) => ['draft', 'pending_review'].includes(row.status)).length;
    const obligationRows = obligationsBySystem.get(system.id) ?? [];
    const gapCount = obligationRows.filter((row) => row.status !== 'resolved').length;
    const criticalGapCount = obligationRows.filter(
      (row) => row.status !== 'resolved' && ['critical', 'high'].includes(row.priority ?? '')
    ).length;
    const latestFmea = [...fmeaRows]
      .filter((row) => row.system_id === system.id)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];
    const latestPlan = [...planRows]
      .filter((row) => row.system_id === system.id)
      .sort((left, right) => right.created_at.localeCompare(left.created_at))[0];

    let workflowLabel = 'Sin evaluación';
    if (latestPlan?.status === 'draft') workflowLabel = 'Plan en borrador';
    else if (latestPlan?.status === 'in_review') workflowLabel = 'Plan en aprobación';
    else if (latestFmea?.state === 'draft') workflowLabel = 'FMEA en borrador';
    else if (latestFmea?.state === 'in_review') workflowLabel = 'FMEA en revisión';

    return {
      ...system,
      compliancePercent,
      gapCount,
      criticalGapCount,
      pendingEvidenceCount,
      workflowLabel,
    };
  });

  const complianceValues = Array.from(systemCompliance.values()).filter((value) => Number.isFinite(value));
  const complianceGlobal = complianceValues.length
    ? Math.round(complianceValues.reduce((acc, value) => acc + value, 0) / complianceValues.length)
    : 0;

  const isoScores = systems.map((system) => system.iso_42001_score).filter((value): value is number => value !== null);
  const isoAverage = isoScores.length
    ? Math.round(isoScores.reduce((acc, value) => acc + value, 0) / isoScores.length)
    : null;

  const pillarBuckets = {
    documentacion: [] as number[],
    supervision: [] as number[],
    transparencia: [] as number[],
    gobernanza: [] as number[],
  };

  for (const row of obligations) {
    const pillar = classifyPillar(row.title);
    pillarBuckets[pillar].push(obligationProgressFromStatus(row.status));
  }

  const pillarSummary = {
    documentacion: pillarBuckets.documentacion.length
      ? Math.round(pillarBuckets.documentacion.reduce((a, b) => a + b, 0) / pillarBuckets.documentacion.length)
      : 0,
    supervision: pillarBuckets.supervision.length
      ? Math.round(pillarBuckets.supervision.reduce((a, b) => a + b, 0) / pillarBuckets.supervision.length)
      : 0,
    transparencia: pillarBuckets.transparencia.length
      ? Math.round(pillarBuckets.transparencia.reduce((a, b) => a + b, 0) / pillarBuckets.transparencia.length)
      : 0,
    gobernanza: pillarBuckets.gobernanza.length
      ? Math.round(pillarBuckets.gobernanza.reduce((a, b) => a + b, 0) / pillarBuckets.gobernanza.length)
      : 0,
  };

  const failureModeIds = Array.from(new Set(failureModes.map((row) => row.failure_mode_id)));
  const { data: failureModeCatalog } =
    failureModeIds.length === 0
      ? { data: [] }
      : await compliance
          .from('failure_modes')
          .select('id, code, name, subcategoria')
          .in('id', failureModeIds);

  const failureModeMap = new Map(
    ((failureModeCatalog ?? []) as DashboardFailureModeCatalogRow[]).map((row) => [row.id, row])
  );

  const prioritizedModes = failureModes.filter((row) => row.priority_status === 'prioritized');

  const topRiskSubcategories = Object.entries(
    prioritizedModes.reduce<Record<string, { score: number; count: number }>>((acc, row) => {
      const catalog = failureModeMap.get(row.failure_mode_id);
      const key = catalog?.subcategoria ?? 'Sin subcategoría';
      const current = acc[key] ?? { score: 0, count: 0 };
      current.score += row.priority_score ?? 0;
      current.count += 1;
      acc[key] = current;
      return acc;
    }, {})
  )
    .map(([label, value]) => ({ label, score: value.score, count: value.count }))
    .sort((left, right) => right.score - left.score || right.count - left.count)
    .slice(0, 5);

  const topCriticalFailureModes = Object.entries(
    prioritizedModes.reduce<Record<string, { code: string; name: string; maxScore: number; systems: Set<string> }>>(
      (acc, row) => {
        const catalog = failureModeMap.get(row.failure_mode_id);
        if (!catalog) return acc;
        const current = acc[row.failure_mode_id] ?? {
          code: catalog.code,
          name: catalog.name,
          maxScore: row.priority_score ?? 0,
          systems: new Set<string>(),
        };
        current.maxScore = Math.max(current.maxScore, row.priority_score ?? 0);
        current.systems.add(row.ai_system_id);
        acc[row.failure_mode_id] = current;
        return acc;
      },
      {}
    )
  )
    .map(([, value]) => ({
      code: value.code,
      name: value.name,
      maxScore: value.maxScore,
      systemsAffected: value.systems.size,
    }))
    .sort((left, right) => right.maxScore - left.maxScore || right.systemsAffected - left.systemsAffected)
    .slice(0, 5);

  const recentSystems = [...systemsHealth]
    .sort((left, right) => right.created_at.localeCompare(left.created_at))
    .slice(0, 5);

  const nextStep = getNextStep(systems, failureModes, fmeaRows, planRows, evidences, systemCompliance);

  const kpis = {
    complianceGlobal,
    criticalGaps: systemsHealth.reduce((acc, system) => acc + system.criticalGapCount, 0),
    systemsTotal: systems.length,
    systemsProduction: systems.filter((system) => system.status === 'produccion').length,
    systemsHighRisk: systems.filter((system) => ['high', 'prohibited'].includes(system.aiact_risk_level)).length,
    evidencesValid: evidences.filter((row) => row.status === 'valid').length,
    evidencesPending: evidences.filter((row) => ['draft', 'pending_review'].includes(row.status)).length,
    isoAverage,
  };

  return {
    systems,
    systemsHealth: [...systemsHealth].sort((left, right) => {
      if (right.criticalGapCount !== left.criticalGapCount) return right.criticalGapCount - left.criticalGapCount;
      const leftRisk = ['high', 'prohibited'].includes(left.aiact_risk_level) ? 1 : 0;
      const rightRisk = ['high', 'prohibited'].includes(right.aiact_risk_level) ? 1 : 0;
      if (rightRisk !== leftRisk) return rightRisk - leftRisk;
      if (left.compliancePercent !== right.compliancePercent) return left.compliancePercent - right.compliancePercent;
      const leftProd = left.status === 'produccion' ? 1 : 0;
      const rightProd = right.status === 'produccion' ? 1 : 0;
      return rightProd - leftProd;
    }),
    recentSystems,
    nextStep,
    kpis,
    pillarSummary,
    topRiskSubcategories,
    topCriticalFailureModes,
    hasRiskAnalytics: prioritizedModes.length > 0,
    soaKpis,
  };
}
