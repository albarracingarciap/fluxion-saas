export type FailureModeDimension =
  | 'tecnica'
  | 'legal_b'
  | 'etica'
  | 'seguridad'
  | 'gobernanza'
  | 'roi';

export type FailureModeCatalogRow = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  dimension_id: FailureModeDimension | string;
  bloque?: string | null;
  subcategoria?: string | null;
  tipo?: string | null;
  s_default?: number | null;
  w_calculated?: number | null;
};

export type FailureModePriorityStatus = 'pending_review' | 'prioritized' | 'monitoring' | 'dismissed';
export type FailureModePriorityLevel = 'critical' | 'high' | 'medium' | 'low';
const PRIORITIZED_SOFT_QUOTA_MAX = 80;

export type FailureModeActivationContext = {
  domain?: string | null;
  status?: string | null;
  aiactRiskLevel?: string | null;
  intendedUse?: string | null;
  outputType?: string | null;
  aiSystemType?: string | null;
  providerOrigin?: string | null;
  externalProvider?: string | null;
  externalModel?: string | null;
  activeEnvironments?: string[] | null;
  dataSources?: string[] | null;
  specialCategories?: string[] | null;

  isAISystem?: boolean | null;
  isGPAI?: boolean;
  fullyAutomated?: boolean | null;
  interactsPersons?: boolean;
  affectsPersons?: boolean | null;
  vulnerableGroups?: boolean;
  hasMinors?: boolean;
  biometric?: boolean;
  criticalInfra?: boolean;
  processesPersonalData?: boolean | null;
  hasExternalTools?: boolean;

  hasTechDoc?: string | null;
  hasLogging?: string | null;
  hasHumanOversight?: string | null;
  hasRiskAssessment?: string | null;
  trainingDataDoc?: string | null;
  dpiaCompleted?: string | null;
  reviewFrequency?: string | null;
  dpoInvolved?: boolean;
};

type ActivationSignals = {
  isGenerative: boolean;
  isAgentic: boolean;
  usesThirdPartyModel: boolean;
  impactsPeople: boolean;
  highImpactDomain: boolean;
  isPublicSectorDomain: boolean;
  isHealthDomain: boolean;
  isFinanceDomain: boolean;
  processesSensitiveData: boolean;
  needsHumanOversight: boolean;
  isProductionLike: boolean;
  weakDocumentation: boolean;
  weakLogging: boolean;
  weakRiskManagement: boolean;
  hasKnowledgeOrRetrievalSurface: boolean;
  isCriticalInfrastructure: boolean;
  hasVulnerableSubjects: boolean;
  hasSecurityExposure: boolean;
  roiSensitive: boolean;
};

type CatalogSelector = {
  dimensionIds?: FailureModeDimension[];
  blocks?: string[];
  subcategories?: string[];
  codePrefixes?: string[];
  textAny?: string[];
  textAll?: string[];
  excludeTextAny?: string[];
};

export type ActivationFamily = {
  id: string;
  label: string;
  description: string;
  dimensions: FailureModeDimension[];
  applies: (signals: ActivationSignals, context: FailureModeActivationContext) => boolean;
  selectors: CatalogSelector[];
};

export type ActivatedFailureMode = FailureModeCatalogRow & {
  activation_family_ids: string[];
  activation_family_labels: string[];
  activation_reason: string;
  priority_status: FailureModePriorityStatus;
  priority_source: 'rules';
  priority_score: number;
  priority_level: FailureModePriorityLevel;
  priority_notes: string | null;
};

type FailureModePriorityComputation = {
  priority_score: number;
  priority_level: FailureModePriorityLevel;
  priority_source: 'rules';
  hard_override: boolean;
  has_sensitive_signal: boolean;
  is_critical_candidate: boolean;
  is_high_candidate: boolean;
};

export type ActivationResult = {
  activeFamilies: Array<{
    id: string;
    label: string;
    description: string;
    dimensions: FailureModeDimension[];
  }>;
  activatedModes: ActivatedFailureMode[];
  groupedByDimension: Record<string, ActivatedFailureMode[]>;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function isWeakStatus(value: string | null | undefined) {
  return value === null || value === undefined || value === '' || value === 'no' || value === 'parcial' || value === 'proceso';
}

export function deriveActivationSignals(context: FailureModeActivationContext): ActivationSignals {
  const domain = context.domain ?? null;
  const outputType = context.outputType ?? null;
  const aiSystemType = context.aiSystemType ?? null;
  const providerOrigin = context.providerOrigin ?? null;
  const environments = context.activeEnvironments ?? [];

  const isGenerative =
    context.isGPAI === true ||
    aiSystemType === 'generativo' ||
    outputType === 'generacion' ||
    Boolean(context.externalModel);

  const isAgentic =
    aiSystemType === 'agentico' ||
    context.hasExternalTools === true;

  const usesThirdPartyModel =
    Boolean(context.externalProvider) ||
    Boolean(context.externalModel) ||
    ['proveedor', 'saas', 'mixto'].includes(providerOrigin ?? '');

  const impactsPeople =
    context.affectsPersons === true ||
    context.interactsPersons === true;

  const isFinanceDomain = ['finanzas', 'credito', 'seguros'].includes(domain ?? '');
  const isHealthDomain = domain === 'salud';
  const isPublicSectorDomain = ['seguridad', 'justicia', 'migracion'].includes(domain ?? '');
  const highImpactDomain = isFinanceDomain || isHealthDomain || isPublicSectorDomain || domain === 'rrhh' || domain === 'educacion';

  const processesSensitiveData =
    context.biometric === true ||
    (context.specialCategories?.length ?? 0) > 0 ||
    context.processesPersonalData === true;

  const needsHumanOversight =
    impactsPeople ||
    isAgentic ||
    highImpactDomain ||
    context.fullyAutomated === true;

  const isProductionLike =
    ['produccion', 'piloto'].includes(context.status ?? '') ||
    environments.some((value) => ['produccion', 'production', 'staging'].includes(normalizeText(value)));

  const weakDocumentation =
    isWeakStatus(context.hasTechDoc) ||
    isWeakStatus(context.trainingDataDoc);

  const weakLogging = isWeakStatus(context.hasLogging);
  const weakRiskManagement = isWeakStatus(context.hasRiskAssessment) || isWeakStatus(context.dpiaCompleted);

  const hasKnowledgeOrRetrievalSurface =
    isGenerative &&
    ((context.dataSources?.length ?? 0) > 0 || context.hasExternalTools === true);

  const hasVulnerableSubjects =
    context.vulnerableGroups === true ||
    context.hasMinors === true;

  const hasSecurityExposure =
    isProductionLike ||
    usesThirdPartyModel ||
    isGenerative ||
    isAgentic;

  const roiSensitive =
    isProductionLike ||
    usesThirdPartyModel ||
    isGenerative ||
    isAgentic ||
    highImpactDomain;

  return {
    isGenerative,
    isAgentic,
    usesThirdPartyModel,
    impactsPeople,
    highImpactDomain,
    isPublicSectorDomain,
    isHealthDomain,
    isFinanceDomain,
    processesSensitiveData,
    needsHumanOversight,
    isProductionLike,
    weakDocumentation,
    weakLogging,
    weakRiskManagement,
    hasKnowledgeOrRetrievalSurface,
    isCriticalInfrastructure: context.criticalInfra === true,
    hasVulnerableSubjects,
    hasSecurityExposure,
    roiSensitive,
  };
}

export const FAILURE_MODE_ACTIVATION_FAMILIES: ActivationFamily[] = [
  {
    id: 'generative_core',
    label: 'IA generativa y contenido sintetico',
    description: 'Activa riesgos tecnicos, eticos y legales propios de generacion de contenido, alucinaciones, prompts y propiedad intelectual.',
    dimensions: ['tecnica', 'seguridad', 'etica', 'legal_b'],
    applies: (signals) => signals.isGenerative,
    selectors: [
      { blocks: ['IA Generativa'] },
      { dimensionIds: ['etica'], subcategories: ['Veracidad e identidad del contenido generado', 'Integridad creativa y derechos de autoría'] },
      { dimensionIds: ['legal_b'], blocks: ['Propiedad intelectual'], textAny: ['copyright', 'autor', 'contenido generado'] },
    ],
  },
  {
    id: 'rag_retrieval_quality',
    label: 'RAG, recuperacion y conocimiento externo',
    description: 'Cubre calidad de embeddings, recuperacion de contexto, obsolescencia documental y surface de prompt injection indirecta.',
    dimensions: ['tecnica', 'seguridad', 'roi'],
    applies: (signals) => signals.hasKnowledgeOrRetrievalSurface,
    selectors: [
      { blocks: ['IA Generativa'], textAny: ['rag', 'embeddings', 'recuperacion', 'knowledge', 'base de conocimiento', 'prompt injection indirecta'] },
      { dimensionIds: ['seguridad'], textAny: ['rag', 'pipeline de recuperacion', 'fuentes de datos no verificables'] },
      { dimensionIds: ['roi'], textAny: ['alucinaciones en produccion'] },
    ],
  },
  {
    id: 'agentic_autonomy',
    label: 'Autonomia agéntica y uso de herramientas',
    description: 'Activa modos ligados a ejecucion autonoma, control de acciones, sandbox, permisos, supervisión y responsabilidad agéntica.',
    dimensions: ['tecnica', 'seguridad', 'gobernanza', 'etica', 'legal_b'],
    applies: (signals) => signals.isAgentic,
    selectors: [
      { blocks: ['Sistemas agénticos'] },
      { blocks: ['Supervisión humana'], textAny: ['agénticas', 'autonomía', 'agente'] },
      { dimensionIds: ['etica'], subcategories: ['Mandato y autorización en sistemas agénticos'] },
      { dimensionIds: ['legal_b'], blocks: ['Responsabilidad agéntica'] },
    ],
  },
  {
    id: 'third_party_dependency',
    label: 'Modelos externos, terceros y cadena de suministro',
    description: 'Activa riesgos de proveedor, versionado externo, due diligence, contratos, lock-in y dependencia operativa.',
    dimensions: ['gobernanza', 'tecnica', 'seguridad', 'legal_b', 'roi'],
    applies: (signals) => signals.usesThirdPartyModel,
    selectors: [
      { blocks: ['Gestión de proveedores', 'Gobernanza de modelos fundacionales externos'] },
      { dimensionIds: ['legal_b'], blocks: ['Contratación — representación y garantías', 'Due diligence — controles de proceso'] },
      { dimensionIds: ['tecnica'], textAny: ['vendor lock-in', 'dependencia exclusiva', 'proveedor'] },
      { dimensionIds: ['seguridad'], textAny: ['dependencias del sistema', 'cadena de suministro de modelos', 'bibliotecas de terceros'] },
      { dimensionIds: ['roi'], textAny: ['dependencia de un único proveedor', 'costes operativos'] },
    ],
  },
  {
    id: 'people_impact',
    label: 'Decision o impacto sobre personas',
    description: 'Activa transparencia, explicabilidad, responsabilidad y revision humana cuando las salidas afectan a personas.',
    dimensions: ['etica', 'gobernanza', 'legal_b'],
    applies: (signals) => signals.impactsPeople,
    selectors: [
      { dimensionIds: ['etica'], subcategories: ['Transparencia y explicabilidad — perspectiva del derecho a explicación', 'Transparencia de procesos', 'Responsabilidad y rendición de cuentas'] },
      { dimensionIds: ['gobernanza'], blocks: ['Supervisión humana', 'Rendición de cuentas', 'Trazabilidad'] },
      { dimensionIds: ['legal_b'], blocks: ['Responsabilidad por productos y decisiones'] },
    ],
  },
  {
    id: 'bias_fairness',
    label: 'Sesgo, proxy-bias y discriminacion',
    description: 'Especialmente relevante en dominios de impacto personal: activa equidad, no discriminacion y litigio potencial.',
    dimensions: ['etica', 'legal_b', 'tecnica'],
    applies: (signals) => signals.impactsPeople && signals.highImpactDomain,
    selectors: [
      { dimensionIds: ['etica'], subcategories: ['Equidad y no discriminación'] },
      { dimensionIds: ['legal_b'], blocks: ['Discriminación — riesgo de litigio activo'] },
      { dimensionIds: ['tecnica'], textAny: ['sesgo de confirmacion', 'segmentos de usuarios'] },
    ],
  },
  {
    id: 'human_oversight',
    label: 'Supervision humana insuficiente',
    description: 'Activa controles de supervision, escalado, autorizacion y costes asociados a operacion con humano en el loop.',
    dimensions: ['gobernanza', 'etica', 'roi'],
    applies: (signals, context) => signals.needsHumanOversight || isWeakStatus(context.hasHumanOversight),
    selectors: [
      { blocks: ['Supervisión humana'] },
      { dimensionIds: ['etica'], subcategories: ['Responsabilidad y rendición de cuentas', 'Autonomía y respeto a derechos humanos'] },
      { dimensionIds: ['roi'], textAny: ['supervisión humana requerida'] },
    ],
  },
  {
    id: 'data_governance_privacy',
    label: 'Datos, privacidad y procedencia',
    description: 'Activa calidad de datos, trazabilidad, privacidad y procedencia cuando el sistema trata datos personales o sensibles.',
    dimensions: ['tecnica', 'gobernanza', 'etica', 'legal_b', 'seguridad'],
    applies: (signals) => signals.processesSensitiveData,
    selectors: [
      { dimensionIds: ['tecnica'], subcategories: ['Calidad de datos', 'Datos y rendimiento'] },
      { dimensionIds: ['gobernanza'], blocks: ['Trazabilidad'], textAny: ['datos', 'linaje', 'procedencia'] },
      { dimensionIds: ['etica'], subcategories: ['Privacidad y protección de datos — perspectiva ética'] },
      { dimensionIds: ['legal_b'], textAny: ['datos', 'privacidad', 'reidentificación'] },
      { dimensionIds: ['seguridad'], textAny: ['privacidad', 'cifrado', 'información sensible'] },
    ],
  },
  {
    id: 'biometric_sensitive',
    label: 'Biometria y categorias especiales',
    description: 'Aumenta cobertura de reidentificacion, tratamiento sensible, vigilancia y controles reforzados.',
    dimensions: ['legal_b', 'etica', 'seguridad', 'tecnica'],
    applies: (signals, context) => signals.processesSensitiveData && context.biometric === true,
    selectors: [
      { dimensionIds: ['etica'], textAny: ['vigilancia', 'reidentificación'] },
      { dimensionIds: ['seguridad'], textAny: ['privacidad diferencial', 'información sensible', 'cifrado'] },
      { dimensionIds: ['legal_b'], textAny: ['datos', 'privacidad', 'biometr'] },
      { dimensionIds: ['tecnica'], textAny: ['datos', 'segmentos de usuarios'] },
    ],
  },
  {
    id: 'vulnerable_subjects',
    label: 'Menores y colectivos vulnerables',
    description: 'Refuerza modos eticos y de gobernanza cuando el sistema puede afectar a menores o grupos vulnerables.',
    dimensions: ['etica', 'gobernanza', 'legal_b'],
    applies: (signals) => signals.hasVulnerableSubjects,
    selectors: [
      { dimensionIds: ['etica'], textAny: ['vulnerable', 'minorías', 'derechos humanos', 'manipulación'] },
      { dimensionIds: ['gobernanza'], blocks: ['Supervisión humana', 'Gobernanza y supervisión ética'] },
      { dimensionIds: ['legal_b'], textAny: ['litigio', 'jurisdicción'] },
    ],
  },
  {
    id: 'production_security',
    label: 'Exposicion de seguridad en produccion',
    description: 'Activa superficie de amenazas, hardening y controles organizativos cuando el sistema ya opera o esta cerca de operar.',
    dimensions: ['seguridad', 'tecnica'],
    applies: (signals) => signals.hasSecurityExposure,
    selectors: [
      { dimensionIds: ['seguridad'], blocks: ['Controles organizativos de seguridad', 'Amenazas sobre el sistema desplegado'] },
      { dimensionIds: ['tecnica'], blocks: ['Latencia y dependencias', 'Robustez, complejidad y escalabilidad'] },
    ],
  },
  {
    id: 'monitoring_lifecycle',
    label: 'Monitorizacion, drift y ciclo de vida',
    description: 'Activa modos de drift, versionado, actualizaciones, dashboards y revalidacion continua.',
    dimensions: ['tecnica', 'gobernanza', 'seguridad'],
    applies: (signals) => signals.isProductionLike,
    selectors: [
      { blocks: ['Proceso: monitorización, actualizaciones y documentación', 'Gestión del ciclo de vida', 'Monitorización y auditoría'] },
      { dimensionIds: ['tecnica'], textAny: ['drift', 'monitorización', 'revalidación', 'dashboards', 'control de versiones'] },
      { dimensionIds: ['seguridad'], textAny: ['respuesta a incidentes', 'monitorización de seguridad', 'gestión de actualizaciones'] },
    ],
  },
  {
    id: 'documentation_traceability',
    label: 'Documentacion, logging y trazabilidad',
    description: 'Activa auditabilidad, linaje, logs y versionado cuando la documentacion o el logging son debiles.',
    dimensions: ['gobernanza', 'tecnica', 'seguridad'],
    applies: (signals) => signals.weakDocumentation || signals.weakLogging,
    selectors: [
      { dimensionIds: ['gobernanza'], blocks: ['Trazabilidad', 'Políticas y estándares', 'Comunicación regulatoria y corporativa'] },
      { dimensionIds: ['tecnica'], textAny: ['documentación', 'logging', 'versiones', 'diagnóstico'] },
      { dimensionIds: ['seguridad'], textAny: ['logging', 'trazabilidad', 'cadena de suministro de modelos'] },
    ],
  },
  {
    id: 'risk_management_compliance',
    label: 'Gestion de riesgos y compliance',
    description: 'Activa cobertura transversal cuando faltan evaluacion de riesgos, DPIA o controles de compliance.',
    dimensions: ['gobernanza', 'legal_b', 'roi', 'etica'],
    applies: (signals) => signals.weakRiskManagement,
    selectors: [
      { dimensionIds: ['gobernanza'], blocks: ['Gestión de riesgos embebida', 'Políticas y estándares', 'Estructura de gobernanza'] },
      { dimensionIds: ['etica'], subcategories: ['Evaluación de impacto ético — ISO 42001 A.5', 'Gobernanza y supervisión ética'] },
      { dimensionIds: ['legal_b'], blocks: ['Gestión de incidentes legales', 'Responsabilidad por productos y decisiones'] },
      { dimensionIds: ['roi'], textAny: ['costes no previstos', 'business case', 'estimación de costes'] },
    ],
  },
  {
    id: 'critical_infrastructure',
    label: 'Infraestructura critica y resiliencia',
    description: 'Aumenta peso en seguridad, disponibilidad y costes de resiliencia cuando el sistema toca infraestructura critica.',
    dimensions: ['seguridad', 'tecnica', 'roi', 'gobernanza'],
    applies: (signals) => signals.isCriticalInfrastructure,
    selectors: [
      { dimensionIds: ['seguridad'], textAny: ['denegación de servicio', 'multitenant', 'aislamiento', 'rollback seguros'] },
      { dimensionIds: ['tecnica'], textAny: ['infraestructura existente', 'latencia', 'escalabilidad'] },
      { dimensionIds: ['roi'], textAny: ['hardware especializado', 'infraestructura'] },
      { dimensionIds: ['gobernanza'], blocks: ['Gestión del ciclo de vida', 'Gestión de riesgos embebida'] },
    ],
  },
  {
    id: 'public_sector_rights',
    label: 'Sector publico, justicia y derechos',
    description: 'Refuerza derechos fundamentales, explicabilidad, no maleficencia y litigio cuando el dominio es seguridad, justicia o migracion.',
    dimensions: ['etica', 'legal_b', 'gobernanza', 'seguridad'],
    applies: (signals) => signals.isPublicSectorDomain,
    selectors: [
      { dimensionIds: ['etica'], subcategories: ['Autonomía y respeto a derechos humanos', 'No maleficencia', 'Transparencia y explicabilidad — perspectiva del derecho a explicación'] },
      { dimensionIds: ['gobernanza'], blocks: ['Rendición de cuentas', 'Trazabilidad'] },
      { dimensionIds: ['legal_b'], blocks: ['Jurisdicción', 'Gestión de incidentes legales', 'Responsabilidad por productos y decisiones'] },
      { dimensionIds: ['seguridad'], blocks: ['Amenazas sobre el sistema desplegado'] },
    ],
  },
  {
    id: 'health_safety',
    label: 'Salud, seguridad clinica y validacion',
    description: 'Para sistemas del dominio salud, amplifica necesidades de validacion, monitorizacion y accountability.',
    dimensions: ['tecnica', 'gobernanza', 'etica', 'legal_b', 'roi'],
    applies: (signals) => signals.isHealthDomain,
    selectors: [
      { dimensionIds: ['tecnica'], blocks: ['Proceso: desarrollo, evaluación y despliegue', 'Proceso: monitorización, actualizaciones y documentación'] },
      { dimensionIds: ['gobernanza'], blocks: ['Supervisión humana', 'Rendición de cuentas', 'Gestión del ciclo de vida'] },
      { dimensionIds: ['etica'], subcategories: ['No maleficencia', 'Beneficencia y bien común'] },
      { dimensionIds: ['legal_b'], blocks: ['Responsabilidad por productos y decisiones', 'Gestión de incidentes legales'] },
      { dimensionIds: ['roi'], textAny: ['costes operativos', 'tiempo al valor'] },
    ],
  },
  {
    id: 'finance_high_impact',
    label: 'Servicios financieros y decisiones de alto impacto',
    description: 'En finanzas, credito y seguros dispara sesgo, accountability, explicabilidad, due diligence y costes regulatorios.',
    dimensions: ['etica', 'legal_b', 'gobernanza', 'roi'],
    applies: (signals) => signals.isFinanceDomain && signals.impactsPeople,
    selectors: [
      { dimensionIds: ['etica'], subcategories: ['Equidad y no discriminación', 'Transparencia y explicabilidad — perspectiva del derecho a explicación', 'Responsabilidad y rendición de cuentas'] },
      { dimensionIds: ['legal_b'], blocks: ['Discriminación — riesgo de litigio activo', 'Responsabilidad por productos y decisiones', 'Due diligence — controles de proceso'] },
      { dimensionIds: ['gobernanza'], blocks: ['Supervisión humana', 'Gestión de riesgos embebida', 'Trazabilidad'] },
      { dimensionIds: ['roi'], blocks: ['Estimación de costes', 'Cuantificación de beneficios'] },
    ],
  },
  {
    id: 'roi_value_realization',
    label: 'ROI, adopcion y captura de valor',
    description: 'Activa modos de beneficio esperado, costes operativos, adopcion y escalabilidad cuando el sistema requiere demostrar retorno.',
    dimensions: ['roi'],
    applies: (signals) => signals.roiSensitive,
    selectors: [
      { dimensionIds: ['roi'], blocks: ['Eficacia del modelo', 'Costes operativos', 'Estimación de costes', 'Adaptabilidad al mercado', 'Alineación estratégica', 'Cuantificación de beneficios', 'Adopción de usuarios', 'Capacidades organizacionales', 'Decisiones de inversión', 'Escalabilidad del negocio', 'Tiempo al valor'] },
    ],
  },
];

function matchesSelector(row: FailureModeCatalogRow, selector: CatalogSelector) {
  const text = normalizeText(
    [row.code, row.name, row.description, row.bloque, row.subcategoria, row.tipo]
      .filter(Boolean)
      .join(' | ')
  );

  if (selector.dimensionIds && !selector.dimensionIds.includes(row.dimension_id as FailureModeDimension)) {
    return false;
  }

  if (selector.blocks && !selector.blocks.includes(row.bloque ?? '')) {
    return false;
  }

  if (selector.subcategories && !selector.subcategories.includes(row.subcategoria ?? '')) {
    return false;
  }

  if (selector.codePrefixes && !selector.codePrefixes.some((prefix) => row.code.startsWith(prefix))) {
    return false;
  }

  if (selector.textAny && !selector.textAny.some((term) => text.includes(normalizeText(term)))) {
    return false;
  }

  if (selector.textAll && !selector.textAll.every((term) => text.includes(normalizeText(term)))) {
    return false;
  }

  if (selector.excludeTextAny && selector.excludeTextAny.some((term) => text.includes(normalizeText(term)))) {
    return false;
  }

  return true;
}

function buildActivationReason(
  row: FailureModeCatalogRow,
  families: ActivationFamily[]
) {
  const labels = families.map((family) => family.label);
  return `${row.code} se activa por las familias: ${labels.join(', ')}.`;
}

function isSensitiveDomain(value: string) {
  return [
    'salud',
    'medicina',
    'salud y medicina',
    'finanzas',
    'banca',
    'banca y finanzas',
    'seguros',
    'credito',
  ].includes(value);
}

function isPublicSectorDomain(value: string) {
  return [
    'sector_publico',
    'sector publico',
    'sector público',
    'gobierno',
    'gobierno y sector publico',
    'gobierno y sector público',
    'seguridad',
    'justicia',
    'migracion',
  ].includes(value);
}

function getSeverityScore(sDefault: number) {
  if (sDefault >= 9) return 40;
  if (sDefault === 8) return 32;
  if (sDefault === 7) return 24;
  if (sDefault === 6) return 16;
  if (sDefault === 5) return 10;
  if (sDefault === 4) return 6;
  return 2;
}

function getDimensionScore(dimensionId: string) {
  switch (dimensionId) {
    case 'seguridad':
      return 15;
    case 'legal_b':
      return 14;
    case 'etica':
      return 13;
    case 'tecnica':
      return 12;
    case 'gobernanza':
      return 10;
    case 'roi':
      return 4;
    default:
      return 8;
  }
}

function getPriorityLevel(score: number): FailureModePriorityLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 30) return 'medium';
  return 'low';
}

function buildPriorityNotes(row: FailureModeCatalogRow, level: FailureModePriorityLevel, status: FailureModePriorityStatus) {
  return `${row.code} queda en ${status === 'prioritized' ? 'revisión prioritaria' : 'observación'} (${level}) por score inicial de reglas.`;
}

function computeFailureModePriority(
  row: FailureModeCatalogRow,
  context: FailureModeActivationContext
): FailureModePriorityComputation {
  const sDefault = Math.max(2, Math.min(9, row.s_default ?? 2));
  const weight = Math.max(1, Math.min(2, row.w_calculated ?? 1));
  const dimensionId = normalizeText(row.dimension_id);
  const domain = normalizeText(context.domain);
  const aiactRiskLevel = normalizeText(context.aiactRiskLevel);
  const outputType = normalizeText(context.outputType);
  const aiSystemType = normalizeText(context.aiSystemType);

  const severityScore = getSeverityScore(sDefault);
  const dimensionScore = getDimensionScore(dimensionId);

  let signalSum = 0;

  if (aiactRiskLevel === 'prohibited') signalSum += 15;
  else if (aiactRiskLevel === 'high') signalSum += 12;
  else if (aiactRiskLevel === 'limited') signalSum += 6;

  if (context.affectsPersons === true) signalSum += 5;
  if (context.hasMinors === true) signalSum += 6;
  if (context.vulnerableGroups === true) signalSum += 5;
  if (context.biometric === true) signalSum += 6;
  if (isSensitiveDomain(domain)) signalSum += 6;
  else if (isPublicSectorDomain(domain)) signalSum += 5;
  if (context.criticalInfra === true) signalSum += 6;

  const generativeSignal = context.isGPAI === true || outputType === 'generacion';
  if (generativeSignal) signalSum += 4;

  if (aiSystemType === 'agentico' || context.hasExternalTools === true) signalSum += 4;

  const systemSignalScore = Math.min(25, signalSum);
  const baseScore = severityScore + dimensionScore + systemSignalScore;
  const weightedScore = Math.round(Math.min(100, baseScore * (0.75 + weight / 4)));

  const hasSensitiveSignal =
    context.affectsPersons === true ||
    context.hasMinors === true ||
    context.vulnerableGroups === true ||
    context.biometric === true ||
    ['high', 'prohibited'].includes(aiactRiskLevel);
  const hasStrongHumanSignal =
    context.affectsPersons === true ||
    context.hasMinors === true ||
    context.vulnerableGroups === true ||
    context.biometric === true;

  const hardOverride =
    sDefault >= 8 ||
    (context.biometric === true && context.affectsPersons === true) ||
    (context.hasMinors === true && ['etica', 'legal_b', 'seguridad'].includes(dimensionId));

  const level = getPriorityLevel(weightedScore);

  return {
    priority_score: weightedScore,
    priority_level: level,
    priority_source: 'rules' as const,
    hard_override: hardOverride,
    has_sensitive_signal: hasSensitiveSignal,
    is_critical_candidate: level === 'critical',
    is_high_candidate:
      sDefault >= 7 &&
      level === 'high' &&
      (
        ['seguridad', 'tecnica'].includes(dimensionId) ||
        (
          ['legal_b', 'etica'].includes(dimensionId) &&
          hasStrongHumanSignal
        )
      ) &&
      !(dimensionId === 'gobernanza') &&
      !(dimensionId === 'roi'),
  };
}

export function activateFailureModesForSystem(
  context: FailureModeActivationContext,
  catalog: FailureModeCatalogRow[]
): ActivationResult {
  const signals = deriveActivationSignals(context);
  const activeFamilies = FAILURE_MODE_ACTIVATION_FAMILIES.filter((family) => family.applies(signals, context));

  const activatedMap = new Map<string, ActivatedFailureMode & FailureModePriorityComputation>();
  const familyById = new Map(activeFamilies.map((family) => [family.id, family]));

  for (const row of catalog) {
    const matchedFamilyIds = activeFamilies
      .filter((family) => family.selectors.some((selector) => matchesSelector(row, selector)))
      .map((family) => family.id);

    if (matchedFamilyIds.length === 0) continue;

    const matchedFamilies = matchedFamilyIds
      .map((familyId) => familyById.get(familyId))
      .filter((family): family is ActivationFamily => Boolean(family));

    activatedMap.set(row.id, {
      ...row,
      activation_family_ids: matchedFamilies.map((family) => family.id),
      activation_family_labels: matchedFamilies.map((family) => family.label),
      activation_reason: buildActivationReason(row, matchedFamilies),
      ...computeFailureModePriority(row, context),
      priority_status: 'monitoring',
      priority_notes: null,
    });
  }

  const activatedEntries = Array.from(activatedMap.values());
  const quota = Math.min(PRIORITIZED_SOFT_QUOTA_MAX, Math.ceil(activatedEntries.length * 0.25));

  const alwaysPrioritizedIds = new Set(
    activatedEntries
      .filter((mode) => mode.hard_override || mode.is_critical_candidate)
      .map((mode) => mode.id)
  );

  const prioritizedIds = new Set(alwaysPrioritizedIds);

  const rankedHighCandidates = activatedEntries
    .filter((mode) => !alwaysPrioritizedIds.has(mode.id) && mode.is_high_candidate)
    .sort((left, right) => {
      if (right.priority_score !== left.priority_score) return right.priority_score - left.priority_score;
      return left.code.localeCompare(right.code);
    });

  const remainingSlots = Math.max(0, quota - prioritizedIds.size);
  for (const mode of rankedHighCandidates.slice(0, remainingSlots)) {
    prioritizedIds.add(mode.id);
  }

  const activatedModes = activatedEntries
    .map((mode) => {
      const priorityStatus: FailureModePriorityStatus = prioritizedIds.has(mode.id) ? 'prioritized' : 'monitoring';
      return {
        ...mode,
        priority_status: priorityStatus,
        priority_notes: buildPriorityNotes(mode, mode.priority_level, priorityStatus),
      };
    })
    .sort((left, right) => {
    if (left.priority_status !== right.priority_status) {
      return left.priority_status === 'prioritized' ? -1 : 1;
    }
    if ((right.priority_score ?? 0) !== (left.priority_score ?? 0)) {
      return (right.priority_score ?? 0) - (left.priority_score ?? 0);
    }
    if (left.dimension_id !== right.dimension_id) {
      return String(left.dimension_id).localeCompare(String(right.dimension_id));
    }
    return left.code.localeCompare(right.code);
  });

  const groupedByDimension = activatedModes.reduce<Record<string, ActivatedFailureMode[]>>((acc, mode) => {
    const key = mode.dimension_id;
    acc[key] = acc[key] ?? [];
    acc[key].push(mode);
    return acc;
  }, {});

  return {
    activeFamilies: activeFamilies.map((family) => ({
      id: family.id,
      label: family.label,
      description: family.description,
      dimensions: family.dimensions,
    })),
    activatedModes,
    groupedByDimension,
  };
}
