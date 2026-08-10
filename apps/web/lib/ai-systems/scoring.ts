const ART_HIGH = [
  'Art. 9 — Sistema de gestión de riesgos',
  'Art. 10 — Gobernanza de datos de entrenamiento',
  'Art. 11 — Documentación técnica completa',
  'Art. 12 — Registro automático de actividad (logs)',
  'Art. 13 — Transparencia e información a usuarios',
  'Art. 14 — Supervisión humana obligatoria',
  'Art. 15 — Precisión, robustez y ciberseguridad',
  'Art. 16 — Obligaciones del proveedor',
  'Art. 43 — Evaluación de conformidad',
  'Art. 71 — Registro en EU AI Office',
];

const ISO_CHECKS = [
  { key: 'aiOwner', label: 'Responsable IA designado', points: 12 },
  { key: 'hasTechDoc', label: 'Documentación técnica', points: 12 },
  { key: 'hasLogging', label: 'Logging de actividad', points: 10 },
  { key: 'humanOversight', label: 'Supervisión humana', points: 12 },
  { key: 'hasRiskAssessment', label: 'Evaluación de riesgos', points: 14 },
  { key: 'dpoInvolved', label: 'DPO involucrado', points: 8 },
  { key: 'reviewFrequency', label: 'Periodicidad de revisión', points: 10 },
  { key: 'incidentContact', label: 'Contacto de incidentes', points: 7 },
  { key: 'dpiaCompleted', label: 'DPIA completada', points: 8 },
  { key: 'hasAdversarialTest', label: 'Test de robustez', points: 7 },
];

export function classifyAIAct(f: Record<string, unknown>) {
  if (f.isAISystem === false) return null;
  if (f.prohibitedPractice) {
    return {
      level: 'prohibited',
      label: '⛔ Práctica Prohibida',
      basis: 'Art. 5 — Prohibición absoluta',
      reason: 'El sistema tiene características que corresponden a prácticas prohibidas. NO puede desplegarse en la UE.',
      obls: [
        '⛔ Despliegue prohibido en la UE',
        'Retirada o rediseño obligatorio',
        'Art. 5 — Sistemas de manipulación, scoring social, biometría remota en tiempo real',
      ],
    };
  }

  if (f.isGPAI) {
    return {
      level: 'gpai',
      label: 'Modelo GPAI',
      basis: 'Art. 51-53 — IA de uso general',
      reason: 'Modelo de propósito general. Obligaciones de transparencia, documentación y —si hay riesgo sistémico— Art. 55.',
      obls: [
        'Art. 53 — Documentación técnica',
        'Art. 53 — Política de copyright',
        'Art. 53 — Resumen de datos de entrenamiento',
        'Art. 55 — Riesgo sistémico (si aplica)',
      ],
    };
  }

  const hi = f.affectsPersons;
  const outputType = f.outputType;
  const domain = f.domain;

  if (f.biometric && hi) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §1 — Biometría',
      reason: 'Sistema que procesa datos biométricos de personas físicas para identificación remota o categorización.',
      obls: ART_HIGH,
    };
  }

  if (f.criticalInfra || f.domain === 'infra') {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §2 — Infraestructura crítica',
      reason: 'Sistema que gestiona componentes de infraestructura crítica (energía, agua, transporte...).',
      obls: ART_HIGH,
    };
  }

  if (domain === 'educacion' && hi && ['decision', 'clasificacion', 'prediccion'].includes(String(outputType))) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §3 — Educación y formación',
      reason: 'Sistema que determina el acceso a formación, evalúa a estudiantes o afecta su trayectoria educativa.',
      obls: ART_HIGH,
    };
  }

  if (domain === 'rrhh' && hi && ['decision', 'clasificacion', 'prediccion'].includes(String(outputType))) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §4 — Empleo y RRHH',
      reason: 'Sistema que interviene en selección, evaluación, promoción o despido de personas trabajadoras.',
      obls: ART_HIGH,
    };
  }

  if ((domain === 'credito' || domain === 'finanzas' || domain === 'seguros') && hi && ['decision', 'prediccion', 'clasificacion'].includes(String(outputType))) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §5 — Servicios financieros esenciales',
      reason: 'Sistema que evalúa solvencia, asigna crédito o determina condiciones de seguros para personas.',
      obls: ART_HIGH,
    };
  }

  if (domain === 'salud' && hi) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §5 / Anexo I — Salud',
      reason: 'Sistema en el ámbito sanitario que puede afectar diagnósticos, tratamientos o decisiones clínicas.',
      obls: [...ART_HIGH, 'MDR/IVDR (si aplica como producto sanitario)'],
    };
  }

  if ((domain === 'seguridad' || domain === 'justicia') && hi) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §6/8 — Seguridad / Justicia',
      reason: 'Sistema usado en seguridad pública, aplicación de la ley o administración de justicia.',
      obls: ART_HIGH,
    };
  }

  if (domain === 'migracion' && hi) {
    return {
      level: 'high',
      label: 'Alto Riesgo',
      basis: 'Anexo III §7 — Migración y fronteras',
      reason: 'Sistema que afecta decisiones sobre visados, asilo o control fronterizo.',
      obls: ART_HIGH,
    };
  }

  if (outputType === 'generacion') {
    return {
      level: 'limited',
      label: 'Riesgo Limitado',
      basis: 'Art. 50.2/50.4 — Contenido sintético',
      reason: 'Sistema que genera texto, imágenes u otro contenido sintético. Obligación de disclosure y marcado.',
      obls: [
        'Art. 50.2 — Marcar contenido como generado por IA',
        'Art. 50.4 — Deep fakes: consentimiento o disclosure claro',
      ],
    };
  }

  if (f.interactsPersons) {
    return {
      level: 'limited',
      label: 'Riesgo Limitado',
      basis: 'Art. 50.1 — Interacción con personas',
      reason: 'Sistema que interactúa directamente con personas (chatbot, asistente). Debe informar de su naturaleza IA.',
      obls: ['Art. 50.1 — Disclosure obligatorio: el usuario debe saber que interactúa con IA'],
    };
  }

  if (f.isAISystem === null || !outputType) return null;

  return {
    level: 'minimal',
    label: 'Riesgo Mínimo',
    basis: 'Sin categoría específica AI Act',
    reason: 'No se han identificado factores que activen categorías de riesgo del AI Act. Buenas prácticas voluntarias recomendadas.',
    obls: [],
  };
}

export function getStatusWeight(val: unknown) {
  if (val === true || val === 'si') return 1;
  if (val === 'parcial' || val === 'proceso') return 0.5;
  if (val === false || val === 'no') return 0;
  if (typeof val === 'string') return val.trim().length > 1 ? 1 : null;
  if (val === null || val === undefined || val === '') return null;
  return 0;
}

export function getStatusLabel(val: unknown) {
  if (val === true || val === 'si') return 'Sí';
  if (val === 'parcial') return 'Parcial';
  if (val === 'proceso') return 'En proceso';
  if (val === false || val === 'no') return 'No';
  return null;
}

export function getStatusCode(val: unknown) {
  if (val === true || val === 'si') return 'si';
  if (val === 'parcial') return 'parcial';
  if (val === 'proceso') return 'proceso';
  if (val === false || val === 'no') return 'no';
  return null;
}

/**
 * @deprecated desde 2026-04-28 — sustituido por el módulo AISIA (aisia_assessments).
 * Conservado solo para leer datos históricos en dashboards y dossier técnico.
 * NO llamar desde nuevas acciones de creación/edición de sistemas.
 */
export function calcISO(f: Record<string, unknown>) {
  const totalPossible = ISO_CHECKS.reduce((acc, check) => acc + check.points, 0);
  let total = 0;

  const checks = ISO_CHECKS.map((check) => {
    const value = f[check.key];
    const weight = getStatusWeight(value);
    const na = weight === null;
    total += (weight ?? 0) * check.points;

    return {
      k: check.key,
      lbl: check.label,
      pts: check.points,
      status: getStatusCode(value),
      statusLabel: getStatusLabel(value),
      weight,
      pointsEarned: Math.round(((weight ?? 0) * check.points) * 100) / 100,
      ok: weight === 1,
      partial: weight === 0.5,
      na,
    };
  });

  const score = totalPossible > 0 ? Math.round((total / totalPossible) * 100) : 0;
  return { score, checks };
}

/**
 * @deprecated desde 2026-04-28 — sustituido por aisia_sections.
 * Conservado solo para leer snapshots históricos.
 */
export function buildIsoChecksSnapshot(
  checks: Array<{
    k: string;
    lbl: string;
    status: string | null;
    statusLabel: string | null;
    weight: number | null;
    pts: number;
    pointsEarned: number;
    na: boolean;
  }>
) {
  return checks.map((check) => ({
    key: check.k,
    label: check.lbl,
    status: check.status,
    status_label: check.statusLabel,
    weight: check.weight,
    points: check.pts,
    points_earned: check.pointsEarned,
    not_applicable: check.na,
  }));
}
