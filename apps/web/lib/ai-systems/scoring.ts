import { classifySystem, type AiActInputs, type FallbackFields, type ValueChainRole } from '@/lib/ai-act';

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
  'Art. 49 — Registro en la base de datos de la UE',
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

/**
 * Vista previa de la clasificación AI Act con la forma que esperan el asistente
 * de alta y la ventana de revisión. Desde B13a delega en el motor único
 * (`lib/ai-act`): con supuestos (`aiactInputs`) aplica las reglas; sin ellos,
 * la vía de respaldo. GPAI ya no es un nivel (D3). Las obligaciones son una
 * orientación: las definitivas salen del catálogo en el servidor.
 */
export function classifyAIAct(f: Record<string, unknown>) {
  const r = classifySystem({
    inputs: (f.aiactInputs as AiActInputs | null | undefined) ?? null,
    fields: f as FallbackFields,
    roles: (Array.isArray(f.valueChainRoles) ? f.valueChainRoles : []) as ValueChainRole[],
  });
  if (r.scope === 'not_ai_system') return null;
  if (r.scope === 'out_of_scope') {
    return { level: 'out_of_scope', label: r.display.label, basis: r.display.basis, reason: r.display.reason, obls: [] as string[] };
  }
  if (r.level === 'pending' && r.method === 'respaldo') return null;

  const obls: string[] = [];
  if (r.level === 'prohibited') {
    obls.push('⛔ Despliegue prohibido en la UE', 'Retirada o rediseño obligatorio', 'Art. 5 — Prácticas prohibidas');
  } else {
    if (r.level === 'high' && !(r.highRiskRoute?.annex === 'I' && r.highRiskRoute.section === 'B')) obls.push(...ART_HIGH);
    for (const t of r.transparency) obls.push(`Art. ${t.article} — Transparencia (${t.obligated === 'provider' ? 'proveedor' : 'responsable del despliegue'})`);
    if (r.gpai.modelProvider) {
      obls.push('Art. 53 — Obligaciones del proveedor de modelo GPAI');
      if (r.gpai.systemicRisk === 'yes') obls.push('Art. 55 — Riesgo sistémico');
    }
  }
  return { level: r.level ?? 'pending', label: r.display.label, basis: r.display.basis, reason: r.display.reason, obls, result: r };
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
 * @deprecated desde 2026-04-28 — sustituido por la AISIA (documento `aisia` del expediente desde B15).
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
 * @deprecated desde 2026-04-28 — sustituido por la AISIA del expediente (B15).
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
