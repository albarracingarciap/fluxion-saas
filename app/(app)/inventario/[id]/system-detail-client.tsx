'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import type { SystemCausalGraph } from '@/lib/causal-graph/system-graph';
import Link from 'next/link';
import type { TreatmentPlanData } from '@/lib/fmea/treatment-plan';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  Bot,
  CalendarClock,
  CheckCircle2,
  ExternalLink,
  Download,
  FileText,
  GitFork,
  History,
  Link2,
  Loader2,
  Plus,
  ShieldAlert,
  X,
} from 'lucide-react';
import { createSystemEvidence } from './evidencias/actions';
import { resolveSystemObligation } from './obligaciones/actions';
import { activateSystemFailureModes } from './modos-de-fallo/actions';
import { acceptSystemObligations, excludeSystemObligation } from './obligaciones/actions';
import { getPendingReconciliation } from '@/app/(app)/inventario/actions/classification';
import { classifyAIAct } from '@/lib/ai-systems/scoring';
import { ClassificationPanel } from '@/components/classification/ClassificationPanel';
import { ReconciliationPanel } from '@/components/classification/ReconciliationPanel';
import { ClassificationHistorySection } from '@/components/classification/ClassificationHistorySection';
import type { ClassificationEventEntry } from '@/components/classification/ClassificationHistorySection';
import type { RiskLevel } from '@/types/classification';
import { useAuthStore } from '@/lib/store/authStore';

export type SystemHistoryEntry = {
  id: string;
  event_type: string;
  event_title: string;
  event_summary: string | null;
  payload: Record<string, unknown>;
  actor_user_id: string | null;
  actor_name: string | null;
  created_at: string;
  synthetic: boolean;
};

export type SystemEvidenceEntry = {
  id: string;
  title: string;
  description: string | null;
  evidence_type: string;
  status: string;
  storage_path: string | null;
  external_url: string | null;
  version: string | null;
  owner_user_id: string | null;
  owner_name: string | null;
  reviewed_by: string | null;
  reviewer_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  reviewed_at: string | null;
  validation_notes: string | null;
  created_at: string;
  updated_at: string;
  linked_obligations_count: number;
};

export type SystemObligationEntry = {
  id: string;
  source_framework: string;
  obligation_code: string | null;
  obligation_key: string | null;
  obligation_label: string | null;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  owner_user_id: string | null;
  owner_name: string | null;
  due_date: string | null;
  notes: string | null;
  resolution_notes: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  resolved_by_name: string | null;
  created_at: string;
  updated_at: string;
  evidence_ids: string[];
};

export type SystemFailureModeEntry = {
  id: string;
  failure_mode_id: string;
  code: string;
  name: string;
  description: string | null;
  dimension_id: string;
  bloque: string | null;
  subcategoria: string | null;
  tipo: string | null;
  s_default: number | null;
  activation_source: string;
  activation_reason: string | null;
  activation_family_ids: string[];
  activation_family_labels: string[];
  priority_status: 'pending_review' | 'prioritized' | 'monitoring' | 'dismissed';
  priority_source: 'rules' | 'agent' | 'human';
  priority_notes: string | null;
  priority_score: number | null;
  priority_level: 'critical' | 'high' | 'medium' | 'low' | null;
  created_by: string | null;
  created_by_name: string | null;
  created_at: string;
  updated_at: string;
  causal_out_degree: number | null;
  causal_in_degree: number | null;
};

export type SystemDetailData = {
  id: string;
  name: string;
  version: string;
  internal_id: string | null;
  domain: string;
  status: string;
  deployed_at: string | null;
  description: string | null;
  technical_description: string | null;
  intended_use: string | null;
  prohibited_uses: string | null;
  usage_scale: string | null;
  output_type: string | null;
  fully_automated: boolean | null;
  interacts_persons: boolean;
  target_users: string[] | null;
  geo_scope: string[] | null;
  is_ai_system: boolean | null;
  is_gpai: boolean;
  prohibited_practice: boolean;
  affects_persons: boolean | null;
  vulnerable_groups: boolean;
  involves_minors: boolean;
  uses_biometric_data: boolean;
  manages_critical_infra: boolean;
  aiact_risk_level: string;
  aiact_risk_basis: string | null;
  aiact_risk_reason: string | null;
  aiact_obligations: string[] | null;
  aiact_classified_at: string | null;
  aiact_classified_by: string | null;
  processes_personal_data: boolean | null;
  data_categories: string[] | null;
  special_categories: string[] | null;
  legal_bases: string[] | null;
  legal_bases_art9: string[] | null;
  intl_data_transfers: boolean;
  training_data_doc: string | null;
  data_sources: string[] | null;
  data_volume: string | null;
  data_retention: string | null;
  dpia_completed: string | null;
  ai_system_type: string | null;
  base_model: string | null;
  external_model: string | null;
  external_provider: string | null;
  frameworks: string | null;
  provider_origin: string | null;
  oss_model_name: string | null;
  oss_license: string | null;
  has_explainability: string | null;
  has_fine_tuning: boolean;
  has_external_tools: boolean;
  active_environments: string[] | null;
  mlops_integration: string | null;
  ai_owner: string | null;
  responsible_team: string | null;
  tech_lead: string | null;
  executive_sponsor: string | null;
  dpo_involved: boolean;
  has_sla: boolean;
  review_frequency: string | null;
  last_review_date: string | null;
  incident_contact: string | null;
  critical_providers: string | null;
  has_tech_doc: string | null;
  has_logging: string | null;
  has_human_oversight: string | null;
  oversight_type: string | null;
  has_complaint_mechanism: boolean;
  has_risk_assessment: string | null;
  residual_risk: string | null;
  mitigation_notes: string | null;
  has_adversarial_test: boolean;
  cert_status: string | null;
  next_audit_date: string | null;
  iso_42001_score: number | null;
  iso_42001_updated_at: string | null;
  iso_42001_checks:
    | Array<{
        key: string | null;
        label: string | null;
        status: string | null;
        status_label: string | null;
        weight: number | null;
        points: number | null;
        points_earned: number | null;
        not_applicable: boolean;
      }>
    | null;
  created_at: string;
  created_by: string;
  updated_at: string;
  updated_by: string | null;
};

const TABS = [
  'Obligaciones AI Act',
  'Ficha técnica',
  'ISO 42001',
  'Historial',
  'Evidencias',
  'Modos de fallo',
  'Plan de tratamiento',
] as const;
type TabName = (typeof TABS)[number];
const TAB_QUERY_MAP = {
  obligaciones: 'Obligaciones AI Act',
  ficha: 'Ficha técnica',
  iso: 'ISO 42001',
  historial: 'Historial',
  evidencias: 'Evidencias',
  modos: 'Modos de fallo',
} as const;

function resolveInitialSystemTab(tabParam: string | null): TabName {
  if (!tabParam) return 'Obligaciones AI Act';
  return (TAB_QUERY_MAP[tabParam as keyof typeof TAB_QUERY_MAP] ?? 'Obligaciones AI Act') as TabName;
}

const DOMAIN_LABELS: Record<string, { label: string; emoji: string }> = {
  finanzas: { label: 'Finanzas y Banca', emoji: '🏦' },
  seguros: { label: 'Seguros', emoji: '🛡️' },
  credito: { label: 'Crédito y financiación', emoji: '📊' },
  salud: { label: 'Salud y Medicina', emoji: '🏥' },
  rrhh: { label: 'RRHH y Empleo', emoji: '👥' },
  educacion: { label: 'Educación', emoji: '🎓' },
  seguridad: { label: 'Seguridad Pública', emoji: '🔒' },
  justicia: { label: 'Justicia y Legal', emoji: '⚖️' },
  migracion: { label: 'Migración', emoji: '🛂' },
  infra: { label: 'Infraestructura Crítica', emoji: '⚡' },
  marketing: { label: 'Marketing', emoji: '📣' },
  operaciones: { label: 'Operaciones', emoji: '⚙️' },
  atencion: { label: 'Atención al Cliente', emoji: '💬' },
  cumplimiento: { label: 'Cumplimiento', emoji: '📋' },
  otro: { label: 'Otro', emoji: '◎' },
};

const RISK_CONFIG: Record<string, { label: string; pill: string; text: string }> = {
  prohibited: { label: 'Prohibido', pill: 'bg-red-dim border-reb', text: 'text-re' },
  high: { label: 'Alto Riesgo', pill: 'bg-red-dim border-reb', text: 'text-re' },
  limited: { label: 'Riesgo Limitado', pill: 'bg-ordim border-orb', text: 'text-or' },
  minimal: { label: 'Riesgo Mínimo', pill: 'bg-grdim border-grb', text: 'text-gr' },
  gpai: { label: 'GPAI', pill: 'bg-cyan-dim border-cyan-border', text: 'text-brand-cyan' },
  pending: { label: 'Pendiente', pill: 'bg-ltcard2 border-ltb', text: 'text-lttm' },
};

const STATUS_CONFIG: Record<string, { label: string; pill: string; text: string }> = {
  produccion: { label: 'Producción', pill: 'bg-grdim border-grb', text: 'text-gr' },
  desarrollo: { label: 'Desarrollo', pill: 'bg-cyan-dim border-cyan-border', text: 'text-brand-cyan' },
  piloto: { label: 'Piloto', pill: 'bg-ordim border-orb', text: 'text-or' },
  deprecado: { label: 'Deprecado', pill: 'bg-ltcard2 border-ltb', text: 'text-lttm' },
  retirado: { label: 'Retirado', pill: 'bg-red-dim border-reb', text: 'text-re' },
};

const OUTPUT_LABELS: Record<string, string> = {
  decision: 'Decisión',
  clasificacion: 'Clasificación',
  prediccion: 'Predicción',
  recomendacion: 'Recomendación',
  ranking: 'Ranking',
  deteccion: 'Detección',
  generacion: 'Generación',
  otro: 'Otro',
};

const AI_TYPE_LABELS: Record<string, string> = {
  clasico: 'ML clásico',
  generativo: 'IA generativa',
  nlp: 'NLP',
  cv: 'Visión por computador',
  reglas: 'Sistema híbrido / reglas',
  agentico: 'Sistema agéntico',
};

const PROVIDER_LABELS: Record<string, string> = {
  interno: 'Interno',
  proveedor: 'Proveedor externo',
  saas: 'SaaS',
  open_source: 'Open Source',
  mixto: 'Mixto',
};

const OVERSIGHT_LABELS: Record<string, string> = {
  previo: 'Revisión previa a la decisión',
  posterior: 'Revisión posterior con posibilidad de reversión',
  muestral: 'Revisión muestral periódica',
  umbral: 'Intervención solo si supera umbral de riesgo',
  auditoria: 'Solo auditoría retrospectiva',
};

const DOC_STATUS_LABELS: Record<string, string> = {
  si: 'Sí',
  parcial: 'Parcial',
  proceso: 'En proceso',
  no: 'No',
};

const CERT_STATUS_LABELS: Record<string, string> = {
  declaracion_emitida: 'Declaración de conformidad emitida',
  en_evaluacion: 'En proceso de evaluación',
  certificacion_ce: 'Certificación CE obtenida',
  pendiente: 'Pendiente de iniciar',
  no_aplica: 'No aplica',
};

const AI_TYPE_LABELS_EXT: Record<string, string> = {
  // wizard values
  ml: 'ML Tradicional', dl: 'Deep Learning', llm: 'LLM / Generativo',
  agentico: 'Sistema Agéntico', reglas: 'Reglas de Negocio', hibrido: 'Híbrido',
  // legacy values
  clasico: 'ML clásico', generativo: 'IA generativa', nlp: 'NLP',
  cv: 'Visión por computador', otro: 'Otro',
};

const MLOPS_LABELS: Record<string, string> = {
  mlflow: 'MLflow', azureml: 'Azure ML', sagemaker: 'SageMaker',
  vertex: 'Vertex AI', databricks: 'Databricks', ninguno: 'Sin integración MLOps', otro: 'Otro',
};

const DATA_VOLUME_LABELS: Record<string, string> = {
  menos_1gb: '< 1 GB', '1_100gb': '1 – 100 GB', '100gb_1tb': '100 GB – 1 TB',
  '1_10tb': '1 – 10 TB', mas_10tb: '> 10 TB', desconocido: 'Desconocido',
};

const DATA_RETENTION_LABELS: Record<string, string> = {
  menos_6m: '< 6 meses', '6_12m': '6 – 12 meses', '1_3a': '1 – 3 años',
  '3_5a': '3 – 5 años', mas_5a: '> 5 años', sin_politica: 'Sin política definida',
};

const USAGE_SCALE_LABELS: Record<string, string> = {
  menos_100m: '< 100 decisiones/mes', '100_1k_m': '100 – 1.000/mes',
  '1k_10k_m': '1.000 – 10.000/mes', '10k_100k_m': '10.000 – 100.000/mes',
  mas_100k_m: '> 100.000/mes',
};

const REVIEW_FREQ_LABELS: Record<string, string> = {
  mensual: 'Mensual', trimestral: 'Trimestral',
  semestral: 'Semestral', anual: 'Anual', adhoc: 'Ad-hoc',
};

const LEGAL_BASE_LABELS: Record<string, string> = {
  consentimiento: 'Consentimiento (Art. 6.1.a)', contrato: 'Contrato (Art. 6.1.b)',
  obligacion_legal: 'Obligación legal (Art. 6.1.c)', interes_vital: 'Interés vital (Art. 6.1.d)',
  interes_publico: 'Interés público (Art. 6.1.e)', interes_legitimo: 'Interés legítimo (Art. 6.1.f)',
};

const LEGAL_BASE_ART9_LABELS: Record<string, string> = {
  consentimiento_explicito: 'Consentimiento explícito (Art. 9.2.a)',
  obligacion_laboral: 'Obligaciones laborales (Art. 9.2.b)',
  interes_vital_9: 'Interés vital (Art. 9.2.c)',
  interes_publico_9: 'Interés público (Art. 9.2.g)',
  medicina_preventiva: 'Medicina preventiva (Art. 9.2.h)',
  salud_publica: 'Salud pública (Art. 9.2.i)',
  investigacion: 'Investigación (Art. 9.2.j)',
};

const PROVIDER_LABELS_EXT: Record<string, string> = {
  interno: 'Desarrollo interno', proveedor: 'Proveedor externo',
  saas: 'SaaS / API tercero', oss: 'Open Source',
  // legacy
  open_source: 'Open Source', mixto: 'Mixto',
};

const RESIDUAL_RISK_LABELS: Record<string, string> = {
  bajo: 'Bajo', medio: 'Medio', alto: 'Alto', muy_alto: 'Muy alto', no_determinado: 'No determinado',
};

function DocStatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="font-sora text-[13px] text-lttm">—</span>;
  const cfg: Record<string, { label: string; cls: string }> = {
    si:      { label: 'Sí',          cls: 'bg-grdim text-gr border-grb' },
    parcial: { label: 'Parcial',     cls: 'bg-ordim text-or border-orb' },
    proceso: { label: 'En proceso',  cls: 'bg-ordim text-or border-orb' },
    no:      { label: 'No',          cls: 'bg-red-dim text-re border-reb' },
  };
  const c = cfg[value] ?? { label: value, cls: 'bg-ltcard2 text-lttm border-ltb' };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10.5px] font-medium border ${c.cls}`}>{c.label}</span>;
}

function BoolBadge({ value, trueLabel = 'Sí', falseLabel = 'No' }: { value: boolean | null; trueLabel?: string; falseLabel?: string }) {
  if (value === null || value === undefined) return <span className="font-sora text-[13px] text-lttm">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10.5px] font-medium border ${value ? 'bg-grdim text-gr border-grb' : 'bg-red-dim text-re border-reb'}`}>
      {value ? trueLabel : falseLabel}
    </span>
  );
}

function FwTag({ fw }: { fw: string }) {
  const cls: Record<string, string> = {
    'AI ACT': 'bg-cyan-dim text-brand-cyan border-cyan-border',
    'RGPD':   'bg-[#6b3bbf11] text-[#6b3bbf] border-[#6b3bbf30]',
    'ISO':    'bg-[#3871c111] text-[#3871c1] border-[#3871c130]',
    'DORA':   'bg-[#0b8a6d12] text-[#0b8a6d] border-[#0b8a6d30]',
  };
  return <span className={`inline-flex items-center px-1.5 py-px rounded-[4px] font-plex text-[9px] font-semibold border tracking-[0.5px] ${cls[fw] ?? 'bg-ltcard2 text-lttm border-ltb'}`}>{fw}</span>;
}

function FichaField({
  label, children, fw = [], fullWidth = false, hint,
}: {
  label: string; children: React.ReactNode; fw?: string[]; fullWidth?: boolean; hint?: string;
}) {
  return (
    <div className={`px-5 py-4 border-b border-ltb ${fullWidth ? 'col-span-full' : ''}`}>
      <div className="flex items-center gap-2 mb-1.5">
        <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">{label}</span>
        {fw.map(f => <FwTag key={f} fw={f} />)}
      </div>
      <div className="font-sora text-[13px] text-ltt leading-relaxed">{children}</div>
      {hint && <div className="font-sora text-[11px] text-lttm mt-1 leading-relaxed">{hint}</div>}
    </div>
  );
}

function FichaBlock({
  title, icon, children, completeness,
}: {
  title: string; icon: string; children: React.ReactNode; completeness?: { filled: number; total: number };
}) {
  const pct = completeness ? Math.round((completeness.filled / completeness.total) * 100) : null;
  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
      <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-[16px] leading-none">{icon}</span>
          <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">{title}</span>
        </div>
        {pct !== null && (
          <div className="flex items-center gap-2">
            <div className="w-[80px] h-[4px] rounded-full bg-ltb overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pct >= 75 ? 'bg-gr' : pct >= 40 ? 'bg-or' : 'bg-re'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="font-plex text-[10px] text-lttm">{completeness?.filled}/{completeness?.total}</span>
          </div>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

const EVIDENCE_STATUS_META: Record<string, { label: string; pill: string }> = {
  draft: { label: 'Borrador', pill: 'bg-ltcard2 text-lttm border-ltb' },
  valid: { label: 'Válida', pill: 'bg-grdim text-gr border-grb' },
  expired: { label: 'Caducada', pill: 'bg-red-dim text-re border-reb' },
  pending_review: { label: 'Pendiente de revisión', pill: 'bg-ordim text-or border-orb' },
  rejected: { label: 'Rechazada', pill: 'bg-red-dim text-re border-reb' },
};

const EVIDENCE_TYPE_LABELS: Record<string, string> = {
  technical_doc: 'Documentación técnica',
  dpia: 'DPIA',
  policy: 'Política',
  contract: 'Contrato',
  test: 'Test',
  report: 'Informe',
  screenshot: 'Captura',
  record: 'Registro',
  other: 'Otro',
};

const EVIDENCE_TYPE_OPTIONS = [
  { value: 'technical_doc', label: 'Documentación técnica' },
  { value: 'dpia', label: 'DPIA' },
  { value: 'policy', label: 'Política' },
  { value: 'contract', label: 'Contrato' },
  { value: 'test', label: 'Test' },
  { value: 'report', label: 'Informe' },
  { value: 'screenshot', label: 'Captura' },
  { value: 'record', label: 'Registro' },
  { value: 'other', label: 'Otro' },
] as const;

const FAILURE_MODE_DIMENSIONS: Record<string, { label: string; order: number; accent: string; badge: string }> = {
  tecnica: { label: 'Técnicos', order: 1, accent: 'text-brand-blue', badge: 'bg-cyan-dim border-cyan-border text-brand-cyan' },
  legal_b: { label: 'Legales', order: 2, accent: 'text-re', badge: 'bg-red-dim border-reb text-re' },
  etica: { label: 'Éticos', order: 3, accent: 'text-[#8850ff]', badge: 'bg-[#f1ebff] border-[#d2c1ff] text-[#8850ff]' },
  seguridad: { label: 'Seguridad', order: 4, accent: 'text-or', badge: 'bg-ordim border-orb text-or' },
  gobernanza: { label: 'Gobernanza', order: 5, accent: 'text-ltt', badge: 'bg-ltcard2 border-ltb text-ltt' },
  roi: { label: 'ROI', order: 6, accent: 'text-gr', badge: 'bg-grdim border-grb text-gr' },
};

const FAILURE_MODE_SOURCE_LABELS: Record<string, string> = {
  rule: 'Motor de reglas',
  ai: 'Refinado IA',
  manual: 'Manual',
};

const FAILURE_MODE_PRIORITY_STATUS_META: Record<
  string,
  { label: string; pill: string; accent: string }
> = {
  pending_review: {
    label: 'Pendiente de priorizar',
    pill: 'bg-ltcard text-lttm border-ltb',
    accent: 'text-lttm',
  },
  prioritized: {
    label: 'Prioritario',
    pill: 'bg-red-dim text-re border-reb',
    accent: 'text-re',
  },
  monitoring: {
    label: 'En observación',
    pill: 'bg-ordim text-or border-orb',
    accent: 'text-or',
  },
  dismissed: {
    label: 'Descartado',
    pill: 'bg-ltcard2 text-lttm border-ltb',
    accent: 'text-lttm',
  },
};

const FAILURE_MODE_PRIORITY_LEVEL_META: Record<
  string,
  { label: string; pill: string }
> = {
  critical: { label: 'Critical', pill: 'bg-red-dim text-re border-reb' },
  high: { label: 'High', pill: 'bg-[#fff1e6] text-or border-orb' },
  medium: { label: 'Medium', pill: 'bg-cyan-dim text-brand-cyan border-cyan-border' },
  low: { label: 'Low', pill: 'bg-ltcard text-lttm border-ltb' },
};

const FAILURE_MODE_PAGE_SIZE = 20;

const OBLIGATION_STATUS_META: Record<string, { label: string; dot: string; color: string; fill: string; thin: string }> = {
  pending: { label: 'Pendiente', dot: 'bg-re', color: 'text-re', fill: 'bg-re', thin: 'bg-ltb' },
  in_progress: { label: 'En progreso', dot: 'bg-or', color: 'text-or', fill: 'bg-or', thin: 'bg-ltb' },
  resolved: { label: 'Resuelta', dot: 'bg-gr', color: 'text-gr', fill: 'bg-gr', thin: 'bg-ltb' },
  blocked: { label: 'Bloqueada', dot: 'bg-[#7c5cff]', color: 'text-[#7c5cff]', fill: 'bg-[#7c5cff]', thin: 'bg-ltb' },
  excluded: { label: 'Excluida', dot: 'bg-ltb', color: 'text-lttm', fill: 'bg-ltb', thin: 'bg-ltb' },
};

function formatDate(value: string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', opts ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function formatJoined(values: string[] | null | undefined) {
  if (!values || values.length === 0) return '—';
  return values.join(' · ');
}

function formatBool(value: boolean | null, trueLabel = 'Sí', falseLabel = 'No') {
  if (value === null) return '—';
  return value ? trueLabel : falseLabel;
}

function formatDocStatus(value: string | null) {
  return value ? DOC_STATUS_LABELS[value] ?? value : '—';
}

function isFilled(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string') return v.length > 0;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === 'number') return true;
  if (typeof v === 'boolean') return true; // false is still a valid answer
  return false;
}

function obligationStatusFromSystem(system: SystemDetailData, obligation: string) {
  if (obligation.includes('Art. 9')) return mapStatus(system.has_risk_assessment);
  if (obligation.includes('Art. 10')) return mapStatus(system.training_data_doc);
  if (obligation.includes('Art. 11')) return mapStatus(system.has_tech_doc);
  if (obligation.includes('Art. 12')) return mapStatus(system.has_logging);
  if (obligation.includes('Art. 14')) return mapStatus(system.has_human_oversight);
  if (obligation.includes('Art. 15')) return system.has_adversarial_test ? 'ok' : 'gap';
  return 'gap';
}

function mapStatus(value: string | null) {
  if (value === 'si') return 'ok';
  if (value === 'parcial' || value === 'proceso') return 'partial';
  return 'gap';
}

function getOblStatus(status: string) {
  return {
    ok: { color: 'text-gr', dot: 'bg-gr', label: 'Implementado', fill: 'bg-gr', thin: 'bg-ltb' },
    partial: { color: 'text-or', dot: 'bg-or', label: 'Parcial', fill: 'bg-or', thin: 'bg-ltb' },
    gap: { color: 'text-re', dot: 'bg-re', label: 'Sin implementar', fill: 'bg-re', thin: 'bg-ltb' },
  }[status] ?? { color: 'text-lttm', dot: 'bg-ltb', label: 'Desconocido', fill: 'bg-ltb', thin: 'bg-ltb' };
}

function getIsoCheckStyle(status: string | null) {
  if (status === 'si') return { pill: 'bg-grdim text-gr border-grb', bar: 'bg-gr', label: 'Implementado' };
  if (status === 'parcial' || status === 'proceso') return { pill: 'bg-ordim text-or border-orb', bar: 'bg-or', label: 'Parcial' };
  return { pill: 'bg-red-dim text-re border-reb', bar: 'bg-re', label: 'Pendiente' };
}

function getIsoGroupForCheck(key: string | null) {
  if (!key) return 'Seguimiento';
  if (['aiOwner', 'dpoInvolved', 'reviewFrequency', 'incidentContact'].includes(key)) return 'Gobierno';
  if (['hasRiskAssessment', 'humanOversight', 'dpiaCompleted', 'hasAdversarialTest'].includes(key)) return 'Riesgo y supervisión';
  return 'Documentación y trazabilidad';
}

function getEvidenceTypeLabel(value: string) {
  return EVIDENCE_TYPE_LABELS[value] ?? value;
}

function isInternalAppUrl(value: string | null | undefined) {
  if (!value) return false;

  if (value.startsWith('/')) return true;

  try {
    const url = new URL(value);
    return url.pathname.startsWith('/inventario/');
  } catch {
    return false;
  }
}

function heuristicObligationStatus(systemStatus: string) {
  if (systemStatus === 'ok') return 'resolved';
  if (systemStatus === 'partial') return 'in_progress';
  return 'pending';
}

function computeEvidenceBadge(status: string, evStatuses: string[]): { label: string; colorClass: string; dotClass: string } {
  if (status === 'excluded') return { label: 'Excluida',      colorClass: 'text-lttm', dotClass: 'bg-lttm' };
  if (status === 'resolved') return { label: 'Resuelta',      colorClass: 'text-gr',   dotClass: 'bg-gr'   };
  if (status === 'blocked')  return { label: 'Bloqueada',     colorClass: 'text-re',   dotClass: 'bg-re'   };
  if (evStatuses.length === 0) return { label: 'Sin evidencias', colorClass: 'text-re', dotClass: 'bg-re'  };
  if (evStatuses.some((s) => s === 'valid')) return { label: 'Documentada', colorClass: 'text-gr', dotClass: 'bg-gr' };
  return { label: 'En curso', colorClass: 'text-or', dotClass: 'bg-or' };
}

function getHistoryEventVisual(eventType: string) {
  if (eventType === 'system_created') return { tone: 'bg-cyan-dim text-brand-cyan border-cyan-border', label: 'Alta' };
  if (eventType === 'system_updated') return { tone: 'bg-ltcard2 text-ltt border-ltb', label: 'Edición' };
  if (eventType === 'classification_recalculated' || eventType === 'classification_reviewed') {
    return { tone: 'bg-red-dim text-re border-reb', label: 'AI Act' };
  }
  if (eventType === 'iso_recalculated') return { tone: 'bg-ordim text-or border-orb', label: 'ISO 42001' };
  if (eventType === 'failure_modes_activated') return { tone: 'bg-[#f1ebff] text-[#8850ff] border-[#d2c1ff]', label: 'FMEA' };
  if (eventType.startsWith('obligation_')) return { tone: 'bg-grdim text-gr border-grb', label: 'Obligación' };
  if (eventType.startsWith('evidence_')) return { tone: 'bg-cyan-dim text-brand-cyan border-cyan-border', label: 'Evidencia' };
  return { tone: 'bg-ltcard2 text-lttm border-ltb', label: 'Evento' };
}

function buildSyntheticHistory(system: SystemDetailData): SystemHistoryEntry[] {
  const events: SystemHistoryEntry[] = [
    {
      id: 'synthetic-created',
      event_type: 'system_created',
      event_title: 'Sistema registrado',
      event_summary: `Se registró ${system.name} en el inventario.`,
      payload: {},
      actor_user_id: system.created_by,
      actor_name: null,
      created_at: system.created_at,
      synthetic: true,
    },
  ];

  if (system.aiact_classified_at) {
    events.push({
      id: 'synthetic-classification',
      event_type: 'classification_recalculated',
      event_title: 'Clasificación AI Act calculada',
      event_summary: system.aiact_risk_level
        ? `La clasificación vigente quedó en ${RISK_CONFIG[system.aiact_risk_level]?.label ?? system.aiact_risk_level}.`
        : 'Se registró una clasificación AI Act.',
      payload: {
        risk_level: system.aiact_risk_level,
        obligations: system.aiact_obligations ?? [],
      },
      actor_user_id: system.aiact_classified_by,
      actor_name: null,
      created_at: system.aiact_classified_at,
      synthetic: true,
    });
  }

  if (system.iso_42001_updated_at) {
    events.push({
      id: 'synthetic-iso',
      event_type: 'iso_recalculated',
      event_title: 'Madurez ISO 42001 calculada',
      event_summary:
        system.iso_42001_score === null
          ? 'Se registró una actualización de madurez ISO.'
          : `El score ISO vigente quedó en ${system.iso_42001_score}%.`,
      payload: {
        score: system.iso_42001_score,
      },
      actor_user_id: system.updated_by ?? system.created_by,
      actor_name: null,
      created_at: system.iso_42001_updated_at,
      synthetic: true,
    });
  }

  if (system.updated_at !== system.created_at) {
    events.push({
      id: 'synthetic-updated',
      event_type: 'system_updated',
      event_title: 'Ficha del sistema actualizada',
      event_summary: 'Se detectó una actualización de la ficha técnica del sistema.',
      payload: {},
      actor_user_id: system.updated_by,
      actor_name: null,
      created_at: system.updated_at,
      synthetic: true,
    });
  }

  return events.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function SystemDetailClient({
  system,
  organizationId,
  history,
  classificationEvents,
  evidences,
  evidenceStatusMap,
  obligationRecords,
  failureModes,
  systemGraph,
  treatmentPlanData,
}: {
  system: SystemDetailData;
  organizationId: string;
  history: SystemHistoryEntry[];
  classificationEvents: ClassificationEventEntry[];
  evidences: SystemEvidenceEntry[];
  evidenceStatusMap: Record<string, string>;
  obligationRecords: SystemObligationEntry[];
  failureModes: SystemFailureModeEntry[];
  systemGraph: import('@/lib/causal-graph/system-graph').SystemCausalGraph;
  treatmentPlanData: TreatmentPlanData | null;
}) {
  const searchParams = useSearchParams();
  const { profile, user } = useAuthStore();
  const [localHistory, setLocalHistory] = useState<SystemHistoryEntry[]>(history);
  const [activeTab, setActiveTab] = useState(() => resolveInitialSystemTab(searchParams.get('tab')));
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [isCausalMapOpen, setIsCausalMapOpen] = useState(false);
  const [evidenceModalSource, setEvidenceModalSource] = useState<'general' | 'obligation'>('general');
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [evidenceForm, setEvidenceForm] = useState({
    title: '',
    evidenceType: 'technical_doc',
    externalUrl: '',
    description: '',
    status: 'draft',
    version: '',
    issuedAt: '',
    expiresAt: '',
  });
  const [isSubmittingEvidence, startEvidenceTransition] = useTransition();
  const [isObligationModalOpen, setIsObligationModalOpen] = useState(false);
  const [obligationError, setObligationError] = useState<string | null>(null);
  const [selectedObligationCode, setSelectedObligationCode] = useState<string | null>(null);
  const [obligationForm, setObligationForm] = useState({
    status: 'pending',
    priority: 'medium',
    dueDate: '',
    notes: '',
    resolutionNotes: '',
    evidenceIds: [] as string[],
  });
  const [isSubmittingObligation, startObligationTransition] = useTransition();
  const [isClassificationModalOpen, setIsClassificationModalOpen] = useState(false);
  const [classificationError, setClassificationError] = useState<string | null>(null);
  const [classificationForm, setClassificationForm] = useState({
    domain: system.domain,
    intendedUse: system.intended_use ?? '',
    outputType: system.output_type ?? '',
    interactsPersons: system.interacts_persons,
    isAISystem: system.is_ai_system,
    isGPAI: system.is_gpai,
    prohibitedPractice: system.prohibited_practice,
    affectsPersons: system.affects_persons,
    vulnerableGroups: system.vulnerable_groups,
    hasMinors: system.involves_minors,
    biometric: system.uses_biometric_data,
    criticalInfra: system.manages_critical_infra,
    reviewNotes: '',
  });
  const [isSubmittingClassification, startClassificationTransition] = useTransition();
  const [isExcludingObligation, setIsExcludingObligation] = useState(false);
  const [exclusionData, setExclusionData] = useState<{ code: string; title: string } | null>(null);
  const [exclusionJustification, setExclusionJustification] = useState('');
  const [isSubmittingExclusion, setIsSubmittingExclusion] = useState(false);
  const [isAcceptingAll, setIsAcceptingAll] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  // Tracks obligation codes currently being saved — suppresses Aceptar/Excluir while refresh is in flight
  const [pendingObligations, setPendingObligations] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!toastMessage) return;
    const t = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(t);
  }, [toastMessage]);

  // Clear a pending code once obligationRecords confirms it is persisted
  useEffect(() => {
    const persistedCodes = new Set(obligationRecords.map((r) => r.obligation_code).filter(Boolean));
    setPendingObligations((prev) => {
      const next = new Set(prev);
      Array.from(prev).forEach((code) => {
        if (persistedCodes.has(code)) next.delete(code);
      });
      return next.size === prev.size ? prev : next;
    });
  }, [obligationRecords]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    router.refresh();
  };

  const handleAcceptAll = async () => {
    setIsAcceptingAll(true);
    const syntheticOnes = obligations.filter((o) => o.isSynthetic).map((o) => ({ code: o.ref, title: o.name }));
    setPendingObligations((prev) => { const next = new Set(prev); syntheticOnes.forEach((o) => next.add(o.code)); return next; });
    const res = await acceptSystemObligations(system.id, syntheticOnes);
    setIsAcceptingAll(false);
    if (res.error) { alert(res.error); return; }
    showToast(`${syntheticOnes.length} obligaciones aceptadas y añadidas a tu plan de cumplimiento`);
  };

  const handleAcceptOne = async (code: string, title: string) => {
    setPendingObligations((prev) => new Set(prev).add(code));
    const res = await acceptSystemObligations(system.id, [{ code, title }]);
    if (res.error) { alert(res.error); return; }
    showToast('Obligación aceptada y añadida a tu plan de cumplimiento');
  };

  const handleExclude = (code: string, title: string) => {
    setExclusionData({ code, title });
    setIsExcludingObligation(true);
  };

  const confirmExclusion = async () => {
    if (!exclusionJustification.trim()) {
      alert('Por favor, indica una justificación para la exclusión.');
      return;
    }
    setIsSubmittingExclusion(true);
    const res = await excludeSystemObligation({
      aiSystemId: system.id,
      code: exclusionData!.code,
      title: exclusionData!.title,
      justification: exclusionJustification,
    });
    setIsSubmittingExclusion(false);
    if (res.error) { alert(res.error); return; }
    setPendingObligations((prev) => new Set(prev).add(exclusionData!.code));
    setIsExcludingObligation(false);
    setExclusionData(null);
    setExclusionJustification('');
    showToast('Obligación excluida y registrada en el historial de auditoría');
  };
  const [failureModeError, setFailureModeError] = useState<string | null>(null);
  const [isActivatingFailureModes, startFailureModeTransition] = useTransition();
  const [failureModeDimensionFilter, setFailureModeDimensionFilter] = useState('all');
  const [failureModePriorityFilter, setFailureModePriorityFilter] = useState('all');
  const [failureModeSortBy, setFailureModeSortBy] = useState<'score' | 'cascade'>('score');
  const [failureModePage, setFailureModePage] = useState(1);
  const router = useRouter();

  useEffect(() => {
    setActiveTab(resolveInitialSystemTab(searchParams.get('tab')));
  }, [searchParams]);

  useEffect(() => {
    setLocalHistory(history);
  }, [history]);

  const [isAgentPanelOpen, setIsAgentPanelOpen] = useState(false);
  const [pendingReconciliation, setPendingReconciliation] = useState<{ id: string; version: number; risk_level: string; risk_label: string } | null>(null);
  const [pendingEventId, setPendingEventId] = useState<string | null>(null);
  const [liveRiskLevel, setLiveRiskLevel] = useState<RiskLevel>(
    (system.aiact_risk_level as RiskLevel) ?? 'pending'
  );

  const domainMeta = DOMAIN_LABELS[system.domain] ?? DOMAIN_LABELS.otro;
  const riskMeta = RISK_CONFIG[liveRiskLevel] ?? RISK_CONFIG[system.aiact_risk_level] ?? RISK_CONFIG.pending;
  const statusMeta = STATUS_CONFIG[system.status] ?? STATUS_CONFIG.deprecado;

  const obligations = useMemo(() => {
    // Si hay registros en system_obligations (fuente de verdad post-reconciliación),
    // usarlos directamente. Fallback a aiact_obligations para sistemas legacy sin registros.
    if (obligationRecords.length > 0) {
      return obligationRecords.map((record) => {
        const name = record.obligation_label ?? record.title;
        const ref = record.obligation_key ?? record.obligation_code ?? name.split(' — ')[0] ?? name;
        const evIds = record.evidence_ids ?? [];
        const evStatuses = evIds.map((id) => evidenceStatusMap[id]).filter(Boolean) as string[];
        return {
          id: record.id,
          name,
          ref,
          systemStatus: record.status,
          status: record.status,
          statusLabel: OBLIGATION_STATUS_META[record.status]?.label ?? 'Pendiente',
          evidenceBadge: computeEvidenceBadge(record.status, evStatuses),
          priority: record.priority ?? 'medium',
          dueDate: record.due_date ?? null,
          notes: record.notes ?? null,
          resolutionNotes: record.resolution_notes ?? null,
          evidenceIds: evIds,
          ownerName: record.owner_name ?? null,
          resolvedByName: record.resolved_by_name ?? null,
          isSynthetic: false,
        };
      });
    }

    // Fallback legacy: systems without system_obligations rows
    const persistedByCode = new Map(
      obligationRecords
        .filter((record) => record.source_framework === 'AI_ACT')
        .map((record) => [record.obligation_code ?? record.title, record])
    );

    return (system.aiact_obligations ?? []).map((obligation) => {
      const ref = obligation.split(' — ')[0] ?? obligation;
      const persisted = persistedByCode.get(ref) ?? persistedByCode.get(obligation);
      const heuristicStatus = obligationStatusFromSystem(system, obligation);
      const systemStatus = persisted ? persisted.status : heuristicObligationStatus(heuristicStatus);
      const isSynthetic = !persisted;
      const evIds = persisted?.evidence_ids ?? [];
      const evStatuses = evIds.map((id) => evidenceStatusMap[id]).filter(Boolean) as string[];
      return {
        id: persisted?.id ?? null,
        name: obligation,
        ref,
        systemStatus: heuristicStatus,
        status: systemStatus,
        statusLabel: OBLIGATION_STATUS_META[systemStatus]?.label ?? 'Pendiente',
        evidenceBadge: computeEvidenceBadge(systemStatus, evStatuses),
        priority: persisted?.priority ?? 'medium',
        dueDate: persisted?.due_date ?? null,
        notes: persisted?.notes ?? null,
        resolutionNotes: persisted?.resolution_notes ?? null,
        evidenceIds: evIds,
        ownerName: persisted?.owner_name ?? null,
        resolvedByName: persisted?.resolved_by_name ?? null,
        isSynthetic,
      };
    });
  }, [obligationRecords, system, evidenceStatusMap]);

  const hasSynthetic = useMemo(() => obligations.some((o) => o.isSynthetic), [obligations]);

  const compliance = useMemo(() => {
    const active = obligations.filter((o) => o.status !== 'excluded');
    if (active.length === 0) return 0;
    return Math.round((active.filter((o) => o.status === 'resolved').length / active.length) * 100);
  }, [obligations]);

  const obligationSummary = useMemo(() => {
    const resolved  = obligations.filter((item) => item.status === 'resolved').length;
    const inProgress = obligations.filter((item) => item.status === 'in_progress').length;
    const pending   = obligations.filter((item) => item.status === 'pending' || item.status === 'blocked').length;
    const excluded  = obligations.filter((item) => item.status === 'excluded').length;
    const withEvidence    = obligations.filter((o) => o.status !== 'excluded' && o.evidenceIds.length > 0).length;
    const withoutEvidence = obligations.filter((o) => o.status !== 'excluded' && o.evidenceIds.length === 0).length;
    return { resolved, inProgress, pending, excluded, withEvidence, withoutEvidence };
  }, [obligations]);

  const isoChecks = useMemo(() => system.iso_42001_checks ?? [], [system.iso_42001_checks]);

  const isoSummary = useMemo(() => {
    const implemented = isoChecks.filter((check) => check.status === 'si').length;
    const partial = isoChecks.filter((check) => check.status === 'parcial' || check.status === 'proceso').length;
    const pending = isoChecks.filter((check) => !check.status || check.status === 'no').length;

    const groups = isoChecks.reduce<Record<string, typeof isoChecks>>((acc, check) => {
      const group = getIsoGroupForCheck(check.key);
      acc[group] = acc[group] ?? [];
      acc[group].push(check);
      return acc;
    }, {});

    return { implemented, partial, pending, groups };
  }, [isoChecks]);

  const historyTimeline = useMemo(() => {
    if (localHistory.length > 0) return localHistory;
    return buildSyntheticHistory(system);
  }, [localHistory, system]);

  const hasFailureModeActivationRun = useMemo(
    () => failureModes.length > 0 || history.some((event) => event.event_type === 'failure_modes_activated'),
    [failureModes.length, history]
  );

  const failureModeSummary = useMemo(() => {
    const grouped = failureModes.reduce<Record<string, SystemFailureModeEntry[]>>((acc, item) => {
      const key = item.dimension_id;
      acc[key] = acc[key] ?? [];
      acc[key].push(item);
      return acc;
    }, {});

    const orderedGroups = Object.entries(grouped)
      .sort((left, right) => {
        const leftOrder = FAILURE_MODE_DIMENSIONS[left[0]]?.order ?? 99;
        const rightOrder = FAILURE_MODE_DIMENSIONS[right[0]]?.order ?? 99;
        if (leftOrder !== rightOrder) return leftOrder - rightOrder;
        return left[0].localeCompare(right[0]);
      })
      .map(([dimensionId, items]) => ({
        dimensionId,
        label: FAILURE_MODE_DIMENSIONS[dimensionId]?.label ?? dimensionId,
        badge: FAILURE_MODE_DIMENSIONS[dimensionId]?.badge ?? 'bg-ltcard2 border-ltb text-ltt',
        accent: FAILURE_MODE_DIMENSIONS[dimensionId]?.accent ?? 'text-ltt',
        items: [...items].sort((left, right) => left.code.localeCompare(right.code)),
      }));

    return {
      total: failureModes.length,
      grouped: orderedGroups,
      dimensions: orderedGroups.length,
      prioritized: failureModes.filter((item) => item.priority_status === 'prioritized').length,
      monitoring: failureModes.filter((item) => item.priority_status === 'monitoring').length,
      dismissed: failureModes.filter((item) => item.priority_status === 'dismissed').length,
      pendingReview: failureModes.filter((item) => item.priority_status === 'pending_review').length,
    };
  }, [failureModes]);

  const prioritizedFailureModeSummary = useMemo(() => {
    const prioritizedModes = failureModes.filter((item) => item.priority_status === 'prioritized');

    const topDimensions = Object.entries(
      prioritizedModes.reduce<Record<string, number>>((acc, item) => {
        acc[item.dimension_id] = (acc[item.dimension_id] ?? 0) + 1;
        return acc;
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([dimensionId, count]) => ({
        label: FAILURE_MODE_DIMENSIONS[dimensionId]?.label ?? dimensionId,
        count,
      }));

    const topFamilies = Object.entries(
      prioritizedModes.reduce<Record<string, number>>((acc, item) => {
        for (const label of item.activation_family_labels) {
          acc[label] = (acc[label] ?? 0) + 1;
        }
        return acc;
      }, {})
    )
      .sort((left, right) => right[1] - left[1])
      .slice(0, 3)
      .map(([label, count]) => ({ label, count }));

    const severeOverrides = prioritizedModes.filter((item) => (item.s_default ?? 0) >= 8).length;
    const criticalByScore = prioritizedModes.filter(
      (item) => item.priority_level === 'critical' && (item.s_default ?? 0) < 8
    ).length;

    return {
      topDimensions,
      topFamilies,
      severeOverrides,
      criticalByScore,
    };
  }, [failureModes]);

  const causalSummary = useMemo(() => {
    let withCausalLinks = 0;
    let rootCauses = 0;
    let attractors = 0;

    for (const mode of failureModes) {
      const out = mode.causal_out_degree ?? 0;
      const inD = mode.causal_in_degree ?? 0;
      if (out > 0 || inD > 0) withCausalLinks++;
      if (out >= 2 && out > inD) rootCauses++;
      if (inD >= 2 && inD > out) attractors++;
    }

    return { withCausalLinks, rootCauses, attractors };
  }, [failureModes]);

  const visibleFailureModeDimensions = useMemo(
    () =>
      failureModeSummary.grouped.map((group) => ({
        id: group.dimensionId,
        label: group.label,
        count: group.items.length,
      })),
    [failureModeSummary.grouped]
  );

  const filteredFailureModes = useMemo(() => {
    return failureModes.filter((item) => {
      const dimensionMatch =
        failureModeDimensionFilter === 'all' || item.dimension_id === failureModeDimensionFilter;
      const priorityMatch =
        failureModePriorityFilter === 'all' || item.priority_status === failureModePriorityFilter;

      return dimensionMatch && priorityMatch;
    });
  }, [failureModeDimensionFilter, failureModePriorityFilter, failureModes]);

  const paginatedFailureModes = useMemo(() => {
    const sorted = [...filteredFailureModes].sort((left, right) => {
      if (failureModeSortBy === 'cascade') {
        const leftCascade = (left.causal_out_degree ?? 0) + (left.causal_in_degree ?? 0);
        const rightCascade = (right.causal_out_degree ?? 0) + (right.causal_in_degree ?? 0);
        if (rightCascade !== leftCascade) return rightCascade - leftCascade;
        // Secondary: prefer nodes with higher out-degree (root causes first)
        const leftOut = left.causal_out_degree ?? 0;
        const rightOut = right.causal_out_degree ?? 0;
        if (rightOut !== leftOut) return rightOut - leftOut;
      }
      if ((right.priority_score ?? -1) !== (left.priority_score ?? -1)) {
        return (right.priority_score ?? -1) - (left.priority_score ?? -1);
      }
      const leftOrder = FAILURE_MODE_DIMENSIONS[left.dimension_id]?.order ?? 99;
      const rightOrder = FAILURE_MODE_DIMENSIONS[right.dimension_id]?.order ?? 99;
      if (leftOrder !== rightOrder) return leftOrder - rightOrder;
      return left.code.localeCompare(right.code);
    });

    const totalPages = Math.max(1, Math.ceil(sorted.length / FAILURE_MODE_PAGE_SIZE));
    const currentPage = Math.min(failureModePage, totalPages);
    const start = (currentPage - 1) * FAILURE_MODE_PAGE_SIZE;
    const pageItems = sorted.slice(start, start + FAILURE_MODE_PAGE_SIZE);

    const grouped = pageItems.reduce<
      Array<{
        dimensionId: string;
        label: string;
        badge: string;
        accent: string;
        items: SystemFailureModeEntry[];
      }>
    >((acc, item) => {
      const existing = acc.find((group) => group.dimensionId === item.dimension_id);
      if (existing) {
        existing.items.push(item);
        return acc;
      }

      acc.push({
        dimensionId: item.dimension_id,
        label: FAILURE_MODE_DIMENSIONS[item.dimension_id]?.label ?? item.dimension_id,
        badge: FAILURE_MODE_DIMENSIONS[item.dimension_id]?.badge ?? 'bg-ltcard2 border-ltb text-ltt',
        accent: FAILURE_MODE_DIMENSIONS[item.dimension_id]?.accent ?? 'text-ltt',
        items: [item],
      });
      return acc;
    }, []);

    return {
      total: sorted.length,
      totalPages,
      currentPage,
      start: sorted.length === 0 ? 0 : start + 1,
      end: Math.min(start + FAILURE_MODE_PAGE_SIZE, sorted.length),
      grouped,
    };
  }, [failureModePage, failureModeSortBy, filteredFailureModes]);

  useEffect(() => {
    setFailureModePage(1);
  }, [failureModeDimensionFilter, failureModePriorityFilter, failureModeSortBy]);

  useEffect(() => {
    if (failureModePage > paginatedFailureModes.totalPages) {
      setFailureModePage(paginatedFailureModes.totalPages);
    }
  }, [failureModePage, paginatedFailureModes.totalPages]);

  useEffect(() => {
    getPendingReconciliation(system.id).then(({ data }) => {
      if (data) setPendingReconciliation(data as typeof pendingReconciliation);
    });
  }, [system.id]);

  const evidenceSummary = useMemo(() => {
    return {
      total: evidences.length,
      valid: evidences.filter((item) => item.status === 'valid').length,
      pending: evidences.filter((item) => item.status === 'pending_review' || item.status === 'draft').length,
      expired: evidences.filter((item) => item.status === 'expired').length,
    };
  }, [evidences]);

  const classificationPreview = useMemo(() => {
    return classifyAIAct({
      domain: classificationForm.domain,
      intendedUse: classificationForm.intendedUse,
      outputType: classificationForm.outputType,
      interactsPersons: classificationForm.interactsPersons,
      isAISystem: classificationForm.isAISystem,
      isGPAI: classificationForm.isGPAI,
      prohibitedPractice: classificationForm.prohibitedPractice,
      affectsPersons: classificationForm.affectsPersons,
      vulnerableGroups: classificationForm.vulnerableGroups,
      hasMinors: classificationForm.hasMinors,
      biometric: classificationForm.biometric,
      criticalInfra: classificationForm.criticalInfra,
    });
  }, [classificationForm]);

  const selectedObligation = useMemo(
    () => obligations.find((item) => item.ref === selectedObligationCode) ?? null,
    [obligations, selectedObligationCode]
  );

  const handleActivateFailureModes = () => {
    setFailureModeError(null);

    startFailureModeTransition(async () => {
      const result = await activateSystemFailureModes({
        aiSystemId: system.id,
      });

      if (result?.error) {
        setFailureModeError(result.error);
        return;
      }

      router.refresh();
    });
  };

  const openEvidenceModal = () => {
    setActiveTab('Evidencias');
    setEvidenceModalSource('general');
    setEvidenceError(null);
    setIsEvidenceModalOpen(true);
  };

  const openClassificationModal = () => {
    const domain = system.domain;
    setClassificationForm({
      domain,
      intendedUse: system.intended_use ?? '',
      outputType: system.output_type ?? '',
      interactsPersons: system.interacts_persons,
      isAISystem: system.is_ai_system ?? true,
      isGPAI: system.is_gpai,
      prohibitedPractice: system.prohibited_practice,
      affectsPersons: system.affects_persons,
      vulnerableGroups: system.vulnerable_groups,
      hasMinors: system.involves_minors,
      biometric: system.uses_biometric_data,
      criticalInfra: system.manages_critical_infra || domain === 'infra',
      reviewNotes: '',
    });
    setClassificationError(null);
    setIsClassificationModalOpen(true);
  };

  const closeClassificationModal = () => {
    setIsClassificationModalOpen(false);
    setClassificationError(null);
  };

  const openEvidenceModalFromObligation = () => {
    setEvidenceModalSource('obligation');
    setEvidenceError(null);
    setIsEvidenceModalOpen(true);
  };

  const resetEvidenceForm = () => {
    setEvidenceForm({
      title: '',
      evidenceType: 'technical_doc',
      externalUrl: '',
      description: '',
      status: 'draft',
      version: '',
      issuedAt: '',
      expiresAt: '',
    });
    setEvidenceError(null);
  };

  const closeEvidenceModal = () => {
    setIsEvidenceModalOpen(false);
    resetEvidenceForm();
  };

  const openObligationModal = (obligationCode: string) => {
    const obligation = obligations.find((item) => item.ref === obligationCode);
    if (!obligation) return;

    setSelectedObligationCode(obligationCode);
    setObligationForm({
      status: obligation.status,
      priority: obligation.priority,
      dueDate: obligation.dueDate ?? '',
      notes: obligation.notes ?? '',
      resolutionNotes: obligation.resolutionNotes ?? '',
      evidenceIds: obligation.evidenceIds,
    });
    setObligationError(null);
    setIsObligationModalOpen(true);
  };

  const closeObligationModal = () => {
    setIsObligationModalOpen(false);
    setSelectedObligationCode(null);
    setObligationError(null);
  };

  const handleEvidenceSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setEvidenceError(null);

    startEvidenceTransition(async () => {
      const result = await createSystemEvidence({
        aiSystemId: system.id,
        title: evidenceForm.title,
        description: evidenceForm.description,
        evidenceType: evidenceForm.evidenceType,
        externalUrl: evidenceForm.externalUrl,
        status: evidenceForm.status,
        version: evidenceForm.version,
        issuedAt: evidenceForm.issuedAt,
        expiresAt: evidenceForm.expiresAt,
      });

      if (result?.error) {
        setEvidenceError(result.error);
        return;
      }

      if (evidenceModalSource === 'obligation' && result?.id) {
        setObligationForm((current) => ({
          ...current,
          evidenceIds: current.evidenceIds.includes(result.id)
            ? current.evidenceIds
            : [...current.evidenceIds, result.id],
        }));
      }

      closeEvidenceModal();
      router.refresh();
    });
  };

  const handleObligationSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedObligation) return;

    setObligationError(null);

    startObligationTransition(async () => {
      const result = await resolveSystemObligation({
        aiSystemId: system.id,
        obligationCode: selectedObligation.ref,
        obligationTitle: selectedObligation.name,
        status: obligationForm.status,
        priority: obligationForm.priority,
        dueDate: obligationForm.dueDate,
        notes: obligationForm.notes,
        resolutionNotes: obligationForm.resolutionNotes,
        evidenceIds: obligationForm.evidenceIds,
      });

      if (result?.error) {
        setObligationError(result.error);
        return;
      }

      closeObligationModal();
      router.refresh();
    });
  };

  const handleClassificationSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setClassificationError(null);

    startClassificationTransition(async () => {
      const response = await fetch(`/api/v1/systems/${system.id}/reclassify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factors: {
            domain: classificationForm.domain,
            output_type: classificationForm.outputType,
            affects_persons: classificationForm.affectsPersons ?? false,
            has_biometric: classificationForm.biometric ?? false,
            is_gpai: classificationForm.isGPAI ?? false,
            manages_critical_infrastructure: classificationForm.criticalInfra ?? false,
            affects_vulnerable_groups: classificationForm.vulnerableGroups ?? false,
            involves_minors: classificationForm.hasMinors ?? false,
            intended_use: classificationForm.intendedUse || undefined,
          },
          review_notes: classificationForm.reviewNotes || undefined,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setClassificationError(err.detail ?? 'Error al reclasificar. Intenta de nuevo.');
        return;
      }

      const result = await response.json();
      const payload = result.data;

      closeClassificationModal();

      if (!payload.has_changes) {
        // Sin cambios — toast informativo, sin crear ningún evento
        alert('La clasificación no ha cambiado. El conjunto de obligaciones se mantiene.');
        return;
      }

      // Hay cambios → abrir panel de reconciliación
      setPendingReconciliation({
        id: payload.event_id,
        version: payload.version,
        risk_level: payload.risk_level,
        risk_label: payload.risk_label,
      });
      setPendingEventId(payload.event_id);
    });
  };

  const circleRadius = 52;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDasharray = `${circleCircumference * (compliance / 100)} ${circleCircumference}`;


  return (
    <div className="flex flex-col min-h-screen bg-ltbg text-ltt">
      <div className="h-14 bg-ltcard border-b border-ltb flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2 font-plex text-[12px] text-lttm">
          <Link href="/inventario" className="flex items-center gap-1 hover:text-brand-cyan transition-colors">
            <ArrowLeft className="w-3.5 h-3.5" />
            Inventario
          </Link>
          <span className="text-ltb">/</span>
          <span className="text-ltt font-medium">{system.name}</span>
        </div>
        <div className="flex items-center gap-2.5">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[12px] text-lttm hover:bg-ltbg hover:text-ltt border border-ltb transition-all">
            <Download className="w-3.5 h-3.5" /> Exportar PDF
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[12px] text-lttm hover:bg-ltbg hover:text-ltt border border-ltb transition-all">
            <Bot className="w-3.5 h-3.5" /> Abrir agente
          </button>
          <button
            onClick={openEvidenceModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[12px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all border-0"
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2.5} /> Nueva evidencia
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] bg-ltcard rounded-[12px] border border-ltb shadow-[0_4px_20px_rgba(0,0,0,0.05)] overflow-hidden min-h-full">
          <div className="flex flex-col min-w-0 bg-ltcard">
            <div className="pt-8 px-8 pb-0 border-b border-ltb bg-gradient-to-b from-ltcard to-ltbg">
              {/* Fila 1: icono + nombre + panel de KPIs */}
              <div className="flex items-start gap-5 mb-3">
                <div className="w-14 h-14 rounded-[12px] bg-ltcard2 border border-ltb flex items-center justify-center text-[28px] shrink-0 shadow-sm">
                  {domainMeta.emoji}
                </div>
                <div className="flex-1 min-w-0 mt-1">
                  <h1 className="font-fraunces text-[24px] font-semibold text-ltt tracking-[-0.5px] leading-tight">
                    {system.name}
                  </h1>
                  <div className="font-plex text-[11px] text-lttm mt-1">
                    v{system.version}{system.internal_id ? ` · ${system.internal_id}` : ''}
                  </div>
                </div>
                <div className="flex bg-ltcard2 border border-ltb rounded-[10px] overflow-hidden shrink-0 self-start shadow-sm">
                  <div className="px-4 py-2.5 border-r border-ltb min-w-[100px]">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Compliance</div>
                    <div className="font-fraunces text-[20px] font-semibold text-re leading-none mb-1">{compliance}%</div>
                    <div className="font-sora text-[11px] text-lttm">{obligationSummary.pending} pendientes críticas</div>
                  </div>
                  <div className="px-4 py-2.5 border-r border-ltb min-w-[100px]">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Obligaciones</div>
                    <div className="font-fraunces text-[20px] font-semibold text-ltt leading-none mb-1">{obligations.length}</div>
                    <div className="font-sora text-[11px] text-lttm">{obligationSummary.resolved} OK · {obligationSummary.inProgress} en curso · {obligationSummary.pending} pendientes</div>
                  </div>
                  <div className="px-4 py-2.5 border-r border-ltb min-w-[100px]">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Próx. hito</div>
                    <div className="font-fraunces text-[20px] font-semibold text-or leading-none mb-1">
                      {system.next_audit_date ? formatDate(system.next_audit_date, { day: '2-digit', month: 'short' }) : '—'}
                    </div>
                    <div className="font-sora text-[11px] text-lttm">{system.cert_status ? CERT_STATUS_LABELS[system.cert_status] ?? system.cert_status : 'Sin hito registrado'}</div>
                  </div>
                  <div className="px-4 py-2.5 min-w-[100px]">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Responsable</div>
                    <div className="font-sora text-[15px] font-semibold text-ltt leading-none mb-1 mt-[3px]">{system.ai_owner ?? '—'}</div>
                    <div className="font-sora text-[11px] text-lttm mt-[5px]">{system.responsible_team ?? 'Sin equipo asignado'}</div>
                  </div>
                </div>
              </div>

              {/* Fila 2: badges en horizontal a ancho completo */}
              <div className="flex items-center gap-2 flex-wrap mb-5">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium border ${riskMeta.pill} ${riskMeta.text}`}>
                  <span className={`w-[5px] h-[5px] rounded-full shrink-0 ${riskMeta.text.replace('text-', 'bg-')}`} />
                  {riskMeta.label}
                </span>
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium border ${statusMeta.pill} ${statusMeta.text}`}>
                  {statusMeta.label}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium bg-ltcard2 text-lttm border border-ltb">
                  {system.provider_origin ? PROVIDER_LABELS[system.provider_origin] ?? system.provider_origin : 'Origen no definido'}
                </span>
                <span className="inline-flex items-center px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium bg-cyan-dim text-brand-cyan border border-cyan-border">
                  {domainMeta.label}
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-plex text-[10.5px] font-medium bg-ordim text-or border border-orb">
                  <AlertTriangle className="w-3 h-3" /> {system.next_audit_date ? `Auditoría ${formatDate(system.next_audit_date)}` : 'Sin auditoría planificada'}
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-transparent">
                <div className="flex items-center gap-1">
                  {TABS.map((tab) => (
                    <button
                      key={tab}
                      onClick={() => {
                        setActiveTab(tab as TabName);
                        if (tab === 'Historial') {
                          router.refresh();
                        }
                      }}
                      className={`px-4 py-3 text-[13px] font-sora font-medium whitespace-nowrap transition-colors border-b-2 ${
                        activeTab === tab ? 'border-brand-cyan text-brand-cyan' : 'border-transparent text-lttm hover:text-ltt'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 flex flex-col gap-6">
              {activeTab === 'Obligaciones AI Act' && (
                <>
                  <div className="bg-gradient-to-br from-[#f851490a] to-ltbg border border-reb rounded-[12px] p-5">
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-re mb-1.5">Clasificación AI Act — Resultado general</div>
                        <div className={`font-fraunces text-[22px] font-semibold mb-1.5 ${riskMeta.text}`}>{riskMeta.label}</div>
                        {(() => {
                          const activeEvent = classificationEvents.find(
                            (e) => e.id === (system as Record<string, unknown>).current_classification_event_id
                          ) ?? classificationEvents.find((e) => e.status === 'reconciled');
                          const METHOD_LABELS: Record<string, string> = {
                            initial: 'Clasificación inicial',
                            manual_review: 'Revisión manual',
                            ai_agent: 'Agente IA',
                            rules_engine: 'Motor de reglas',
                          };
                          if (activeEvent) {
                            return (
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                                <span className="font-plex text-[11px] text-lttm">
                                  v{activeEvent.version} · {METHOD_LABELS[activeEvent.method] ?? activeEvent.method}
                                </span>
                                {activeEvent.created_by_name && (
                                  <span className="font-plex text-[11px] text-lttm">
                                    por {activeEvent.created_by_name}
                                  </span>
                                )}
                                <span className="font-plex text-[11px] text-lttm">
                                  {formatDate(activeEvent.created_at)}
                                </span>
                                {activeEvent.basis && (
                                  <span className="font-plex text-[11px] text-lttm">
                                    · {activeEvent.basis}
                                  </span>
                                )}
                              </div>
                            );
                          }
                          return (
                            <div className="font-plex text-[11.5px] text-lttm">
                              Fundamento: {system.aiact_risk_basis ?? 'Pendiente'} · Evaluado {formatDate(system.aiact_classified_at)}
                            </div>
                          );
                        })()}
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        {pendingReconciliation && (
                          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] bg-ordim border border-orb font-sora text-[11px] text-or">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            Reclasificación v{pendingReconciliation.version} pendiente de reconciliación
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setIsAgentPanelOpen(true)}
                            disabled={isAgentPanelOpen || !!pendingReconciliation}
                            title={pendingReconciliation ? 'Resuelve la reconciliación pendiente antes de clasificar de nuevo' : undefined}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[11.5px] text-brand-cyan hover:bg-cyan-dim hover:text-brand-cyan border border-cyan-border transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            <Bot className="w-3.5 h-3.5" />
                            Clasificar con IA
                          </button>
                          <button
                            onClick={openClassificationModal}
                            disabled={!!pendingReconciliation || isSubmittingClassification}
                            title={pendingReconciliation ? 'Resuelve la reconciliación pendiente antes de revisar la clasificación' : undefined}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[11.5px] text-lttm hover:bg-ltbg hover:text-ltt border border-ltb transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            ✏ Revisar clasificación
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="font-sora text-[13px] text-ltt2 leading-relaxed mb-4 border-l-2 border-re pl-3 ml-0.5">
                      {system.aiact_risk_reason ?? 'Aún no hay explicación narrativa disponible para esta clasificación.'}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {(system.aiact_obligations ?? []).map((obligation) => (
                        <span
                          key={obligation}
                          className="inline-flex items-center px-2 py-0.5 rounded-full font-plex text-[10.5px] font-medium bg-red-dim text-re border border-reb"
                        >
                          {obligation}
                        </span>
                      ))}
                    </div>

                    <ClassificationPanel
                      systemId={system.id}
                      organizationId={organizationId}
                      currentLevel={liveRiskLevel}
                      currentBasis={system.aiact_risk_basis ?? ''}
                      onConfirmed={(level, summary) => {
                        setLiveRiskLevel(level);
                        const actorName = profile
                          ? (profile.display_name || profile.full_name || '').trim() || user?.email?.split('@')[0] || null
                          : null;
                        const newEvent: SystemHistoryEntry = {
                          id: `agent-${Date.now()}`,
                          event_type: 'classification_recalculated',
                          event_title: 'Clasificación AI Act actualizada por agente IA',
                          event_summary: summary,
                          payload: { risk_level: level, source: 'agent1' },
                          actor_user_id: user?.id ?? null,
                          actor_name: actorName,
                          created_at: new Date().toISOString(),
                          synthetic: false,
                        };
                        setLocalHistory((prev) => {
                          const base = prev.length > 0 ? prev : buildSyntheticHistory(system);
                          return [newEvent, ...base];
                        });
                      }}
                      isOpen={isAgentPanelOpen}
                      onClose={() => setIsAgentPanelOpen(false)}
                    />

                    {pendingEventId && pendingReconciliation && (
                      <ReconciliationPanel
                        systemId={system.id}
                        eventId={pendingEventId}
                        version={pendingReconciliation.version}
                        riskLabel={pendingReconciliation.risk_label}
                        riskLevel={pendingReconciliation.risk_level}
                        onConfirmed={() => {
                          setPendingReconciliation(null);
                          setPendingEventId(null);
                          router.refresh();
                        }}
                        onCancelled={() => {
                          setPendingReconciliation(null);
                          setPendingEventId(null);
                        }}
                      />
                    )}
                  </div>

                  <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                    <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
                      <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">Obligaciones aplicables</span>
                      <div className="flex gap-3 items-center">
                        {hasSynthetic && (
                          <button
                            onClick={handleAcceptAll}
                            disabled={isAcceptingAll}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora font-medium text-[11.5px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_2px_8px_#00adef33] hover:-translate-y-px transition-all disabled:opacity-50"
                          >
                            {isAcceptingAll ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                            Aceptar sugerencias
                          </button>
                        )}
                        <div className="flex gap-1.5 items-center pl-3 border-l border-ltb">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-red-dim text-re border border-reb">{obligationSummary.pending} pendientes</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ordim text-or border border-orb">{obligationSummary.inProgress} en curso</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-grdim text-gr border border-grb">{obligationSummary.resolved} resueltas</span>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard2 text-lttm border border-ltb">{obligationSummary.excluded} excluidas</span>
                        </div>
                      </div>
                    </div>

                    <table className="w-full text-left border-collapse">
                      <thead className="bg-[#0f141a]">
                        <tr>
                          <th className="w-[50px] p-3 border-b border-ltb"></th>
                          <th className="font-plex text-[10px] uppercase text-lttm p-3 border-b border-ltb">Obligación</th>
                          <th className="font-plex text-[10px] uppercase text-lttm p-3 border-b border-ltb">Referencia</th>
                          <th className="font-plex text-[10px] uppercase text-lttm p-3 border-b border-ltb">Estado</th>
                          <th className="font-plex text-[10px] uppercase text-lttm p-3 border-b border-ltb">Evidencias</th>
                          <th className="w-[100px] font-plex text-[10px] uppercase text-lttm p-3 border-b border-ltb">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-ltb">
                        {obligations.map((obligation, index) => {
                          const status = OBLIGATION_STATUS_META[obligation.status] ?? OBLIGATION_STATUS_META.pending;
                          return (
                            <tr key={`${obligation.name}-${index}`} className={`hover:bg-ltbg transition-colors cursor-pointer group ${obligation.status === 'excluded' ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                              <td className="p-3 pl-4">
                                <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[14px] ${obligation.status === 'resolved' ? 'bg-grdim' : obligation.status === 'in_progress' ? 'bg-ordim' : obligation.status === 'blocked' ? 'bg-[#7c5cff1a]' : obligation.status === 'excluded' ? 'bg-ltbg' : 'bg-red-dim'}`}>
                                  {obligation.status === 'resolved' ? '🟢' : obligation.status === 'in_progress' ? '🟡' : obligation.status === 'blocked' ? '🟣' : obligation.status === 'excluded' ? '⚪' : '🔴'}
                                </div>
                              </td>
                              <td className="p-3">
                                <div className={`font-sora text-[13px] font-medium text-ltt ${obligation.status === 'excluded' ? 'line-through decoration-lttm' : ''}`}>{obligation.name}</div>
                              </td>
                              <td className="p-3">
                                <div className="font-plex text-[11.5px] text-lttm">{obligation.ref}</div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  <div className={`w-[6px] h-[6px] rounded-full shrink-0 ${status.dot}`} />
                                  <span className={`font-sora text-[12px] font-medium ${status.color}`}>{status.label}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-[6px] h-[6px] rounded-full shrink-0 ${obligation.evidenceBadge.dotClass}`} />
                                  <span className={`font-sora text-[11.5px] font-medium ${obligation.evidenceBadge.colorClass}`}>{obligation.evidenceBadge.label}</span>
                                </div>
                              </td>
                              <td className="p-3">
                                <div className="flex items-center gap-2">
                                  {pendingObligations.has(obligation.ref) ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin text-lttm" />
                                  ) : obligation.isSynthetic ? (
                                    <>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleAcceptOne(obligation.ref, obligation.name);
                                        }}
                                        className="px-2 py-1 rounded-[5px] font-sora text-[10px] font-semibold text-brand-cyan border border-cyan-border hover:bg-cyan-dim transition-all"
                                      >
                                        Aceptar
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleExclude(obligation.ref, obligation.name);
                                        }}
                                        className="px-2 py-1 rounded-[5px] font-sora text-[10px] font-semibold text-re border border-reb hover:bg-red-dim transition-all"
                                      >
                                        Excluir
                                      </button>
                                    </>
                                  ) : obligation.status === 'excluded' ? null : (
                                    <button
                                      onClick={() => openObligationModal(obligation.ref)}
                                      className="px-3 py-1.5 rounded-[6px] font-sora text-[11px] font-medium text-lttm border border-transparent group-hover:border-ltb group-hover:bg-ltcard2 transition-all"
                                    >
                                      {obligation.status === 'resolved' ? 'Ver' : 'Resolver →'}
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  {/* Historial de clasificaciones */}
                  {classificationEvents.length > 0 && (
                    <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                      <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb">
                        <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">
                          Historial de clasificaciones
                        </span>
                      </div>
                      <div className="p-4">
                        <ClassificationHistorySection
                          events={classificationEvents}
                          activeEventId={(system as Record<string, unknown>).current_classification_event_id as string | null}
                        />
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeTab === 'Ficha técnica' && (
                <div className="flex flex-col gap-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="font-fraunces text-[18px] font-semibold text-ltt mb-1">Ficha técnica</h2>
                      <p className="font-sora text-[12px] text-lttm">Información completa del sistema organizada por dominio de responsabilidad</p>
                    </div>
                    <Link
                      href={`/inventario/${system.id}/editar`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[7px] font-sora text-[11.5px] font-medium text-lttm hover:bg-ltbg border border-ltb transition-all"
                    >
                      ✏ Editar ficha
                    </Link>
                  </div>

                  {/* Bloque 1 — Resumen ejecutivo */}
                  <FichaBlock
                    title="Resumen ejecutivo"
                    icon="🎯"
                    completeness={{
                      filled: [system.description, system.intended_use, system.prohibited_uses, system.output_type, system.affects_persons, system.deployed_at, system.usage_scale, system.geo_scope].filter(isFilled).length,
                      total: 8,
                    }}
                  >
                    <FichaField label="Descripción" fullWidth>
                      {system.description ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Versión">
                      <span>{system.version}</span>
                      {system.internal_id && <span className="text-lttm font-plex text-[11px] ml-2">· ID: {system.internal_id}</span>}
                    </FichaField>
                    <FichaField label="Dominio">
                      {domainMeta.emoji} {domainMeta.label}
                    </FichaField>
                    <FichaField label="Uso previsto" fullWidth>
                      {system.intended_use ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Usos prohibidos" fullWidth>
                      {system.prohibited_uses ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Tipo de output">
                      {system.output_type ? OUTPUT_LABELS[system.output_type] ?? system.output_type : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="¿Afecta a personas?">
                      <BoolBadge value={system.affects_persons} />
                    </FichaField>
                    <FichaField label="Fecha de despliegue">
                      {formatDate(system.deployed_at)}
                    </FichaField>
                    <FichaField label="Escala de uso">
                      {system.usage_scale ? USAGE_SCALE_LABELS[system.usage_scale] ?? system.usage_scale : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Ámbito geográfico">
                      {formatJoined(system.geo_scope)}
                    </FichaField>
                    <FichaField label="Usuarios objetivo">
                      {formatJoined(system.target_users)}
                    </FichaField>
                    <FichaField label="Interacción directa con personas">
                      <BoolBadge value={system.interacts_persons} />
                    </FichaField>
                  </FichaBlock>

                  {/* Bloque 2 — Datos y privacidad */}
                  <FichaBlock
                    title="Datos y privacidad"
                    icon="🔒"
                    completeness={{
                      filled: [system.processes_personal_data, system.data_categories, system.legal_bases, system.dpia_completed, system.data_volume, system.data_retention].filter(isFilled).length,
                      total: 6,
                    }}
                  >
                    <FichaField label="Trata datos personales" fw={['RGPD']}>
                      <BoolBadge value={system.processes_personal_data} />
                    </FichaField>
                    <FichaField label="DPO involucrado" fw={['RGPD']}>
                      <BoolBadge value={system.dpo_involved} />
                    </FichaField>
                    <FichaField label="DPIA completada" fw={['RGPD']}>
                      <DocStatusBadge value={system.dpia_completed} />
                    </FichaField>
                    <FichaField label="Transferencias internacionales" fw={['RGPD']}>
                      <BoolBadge value={system.intl_data_transfers} trueLabel="Sí, hay transferencias" falseLabel="No" />
                    </FichaField>
                    <FichaField label="Categorías de datos" fullWidth fw={['RGPD']}>
                      {system.data_categories && system.data_categories.length > 0
                        ? system.data_categories.join(' · ')
                        : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Categorías especiales (Art. 9)" fullWidth fw={['RGPD']}>
                      {system.special_categories && system.special_categories.length > 0
                        ? system.special_categories.join(' · ')
                        : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Bases jurídicas (Art. 6)" fullWidth fw={['RGPD']}>
                      {system.legal_bases && system.legal_bases.length > 0
                        ? system.legal_bases.map((k) => LEGAL_BASE_LABELS[k] ?? k).join(' · ')
                        : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Bases jurídicas Art. 9" fullWidth fw={['RGPD']}>
                      {system.legal_bases_art9 && system.legal_bases_art9.length > 0
                        ? system.legal_bases_art9.map((k) => LEGAL_BASE_ART9_LABELS[k] ?? k).join(' · ')
                        : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Volumen de datos">
                      {system.data_volume ? DATA_VOLUME_LABELS[system.data_volume] ?? system.data_volume : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Retención de datos">
                      {system.data_retention ? DATA_RETENTION_LABELS[system.data_retention] ?? system.data_retention : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Fuentes de datos" fullWidth>
                      {formatJoined(system.data_sources)}
                    </FichaField>
                    <FichaField label="Documentación datos de entrenamiento" fullWidth>
                      <DocStatusBadge value={system.training_data_doc} />
                    </FichaField>
                  </FichaBlock>

                  {/* Bloque 3 — Tecnología */}
                  <FichaBlock
                    title="Tecnología"
                    icon="⚙️"
                    completeness={{
                      filled: [system.ai_system_type, system.provider_origin, system.base_model || system.external_model || system.oss_model_name, system.frameworks, system.active_environments, system.has_explainability].filter(isFilled).length,
                      total: 6,
                    }}
                  >
                    <FichaField label="Tipo de sistema IA">
                      {system.ai_system_type ? AI_TYPE_LABELS_EXT[system.ai_system_type] ?? system.ai_system_type : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Origen del proveedor">
                      {system.provider_origin ? PROVIDER_LABELS_EXT[system.provider_origin] ?? system.provider_origin : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Modelo base">
                      {system.base_model ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Modelo externo / Proveedor">
                      {system.external_model
                        ? `${system.external_model}${system.external_provider ? ` · ${system.external_provider}` : ''}`
                        : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Modelo OSS">
                      {system.oss_model_name
                        ? `${system.oss_model_name}${system.oss_license ? ` · ${system.oss_license}` : ''}`
                        : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Frameworks">
                      {system.frameworks ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Fine-tuning">
                      <BoolBadge value={system.has_fine_tuning} />
                    </FichaField>
                    <FichaField label="Herramientas externas (tool use)">
                      <BoolBadge value={system.has_external_tools} />
                    </FichaField>
                    <FichaField label="Explicabilidad">
                      <DocStatusBadge value={system.has_explainability} />
                    </FichaField>
                    <FichaField label="Integración MLOps">
                      {system.mlops_integration ? MLOPS_LABELS[system.mlops_integration] ?? system.mlops_integration : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Entornos activos" fullWidth>
                      {formatJoined(system.active_environments)}
                    </FichaField>
                    <FichaField label="Descripción técnica" fullWidth>
                      {system.technical_description ?? <span className="text-lttm">—</span>}
                    </FichaField>
                  </FichaBlock>

                  {/* Bloque 4 — Gobierno y controles */}
                  <FichaBlock
                    title="Gobierno y controles"
                    icon="🛡️"
                    completeness={{
                      filled: [system.ai_owner, system.responsible_team, system.tech_lead, system.review_frequency, system.last_review_date, system.has_tech_doc, system.has_logging, system.has_human_oversight, system.has_risk_assessment, system.cert_status].filter(isFilled).length,
                      total: 10,
                    }}
                  >
                    <FichaField label="Responsable IA (AI Owner)" fw={['ISO']}>
                      {system.ai_owner ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Equipo responsable">
                      {system.responsible_team ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Responsable técnico">
                      {system.tech_lead ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Sponsor ejecutivo">
                      {system.executive_sponsor ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="SLA definido">
                      <BoolBadge value={system.has_sla} />
                    </FichaField>
                    <FichaField label="Frecuencia de revisión" fw={['ISO']}>
                      {system.review_frequency ? REVIEW_FREQ_LABELS[system.review_frequency] ?? system.review_frequency : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Última revisión">
                      {formatDate(system.last_review_date)}
                    </FichaField>
                    <FichaField label="Próxima auditoría" fw={['AI ACT']}>
                      {formatDate(system.next_audit_date)}
                    </FichaField>
                    <FichaField label="Contacto de incidencias">
                      {system.incident_contact ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Proveedores críticos">
                      {system.critical_providers ?? <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Documentación técnica" fw={['AI ACT', 'ISO']}>
                      <DocStatusBadge value={system.has_tech_doc} />
                    </FichaField>
                    <FichaField label="Logging y trazabilidad" fw={['AI ACT', 'ISO']}>
                      <DocStatusBadge value={system.has_logging} />
                    </FichaField>
                    <FichaField label="Supervisión humana" fw={['AI ACT']}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <DocStatusBadge value={system.has_human_oversight} />
                        {system.oversight_type && (
                          <span className="font-sora text-[12px] text-lttm">{OVERSIGHT_LABELS[system.oversight_type] ?? system.oversight_type}</span>
                        )}
                      </div>
                    </FichaField>
                    <FichaField label="Mecanismo de reclamación" fw={['AI ACT']}>
                      <BoolBadge value={system.has_complaint_mechanism} />
                    </FichaField>
                    <FichaField label="Evaluación de riesgos" fw={['AI ACT', 'ISO']}>
                      <DocStatusBadge value={system.has_risk_assessment} />
                    </FichaField>
                    <FichaField label="Test adversarial" fw={['AI ACT']}>
                      <BoolBadge value={system.has_adversarial_test} />
                    </FichaField>
                    <FichaField label="Riesgo residual">
                      {system.residual_risk ? RESIDUAL_RISK_LABELS[system.residual_risk] ?? system.residual_risk : <span className="text-lttm">—</span>}
                    </FichaField>
                    <FichaField label="Estado de certificación" fw={['AI ACT']}>
                      {system.cert_status ? CERT_STATUS_LABELS[system.cert_status] ?? system.cert_status : <span className="text-lttm">—</span>}
                    </FichaField>
                    {system.mitigation_notes && (
                      <FichaField label="Notas de mitigación" fullWidth>
                        {system.mitigation_notes}
                      </FichaField>
                    )}
                  </FichaBlock>
                </div>
              )}

              {activeTab === 'ISO 42001' && (
                <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                  <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">Evaluación ISO 42001</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                      Madurez org. {system.iso_42001_score ?? 0}%
                    </span>
                  </div>
                  <div className="p-5 border-b border-ltb bg-gradient-to-br from-[#004aad08] to-ltbg">
                    <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-5">
                      <div>
                        <div className="font-fraunces text-[22px] font-semibold text-ltt mb-2">Snapshot real de madurez ISO</div>
                        <div className="text-[13px] text-ltt2 leading-relaxed">
                          Esta vista ya usa los checks guardados del sistema y deja preparada la estructura para evolucionar después a una evaluación formal por cláusulas ISO 42001.
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                          <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Implementado</div>
                          <div className="font-fraunces text-[24px] font-semibold text-gr leading-none">{isoSummary.implemented}</div>
                        </div>
                        <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                          <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Parcial</div>
                          <div className="font-fraunces text-[24px] font-semibold text-or leading-none">{isoSummary.partial}</div>
                        </div>
                        <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                          <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Pendiente</div>
                          <div className="font-fraunces text-[24px] font-semibold text-re leading-none">{isoSummary.pending}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="divide-y divide-ltb">
                    {Object.entries(isoSummary.groups).map(([groupName, checks]) => (
                      <div key={groupName} className="p-5">
                        <div className="flex items-center justify-between gap-3 mb-4">
                          <div>
                            <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">Bloque preparatorio</div>
                            <div className="font-sora text-[15px] font-semibold text-ltt">{groupName}</div>
                          </div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard2 text-lttm border border-ltb">
                            {checks.length} checks
                          </span>
                        </div>
                        <div className="space-y-3">
                          {checks.map((check, index) => {
                            const style = getIsoCheckStyle(check.status);
                            const segments = Math.max(1, Math.round(((check.weight ?? 0) * 4)));
                            return (
                              <div key={`${check.key ?? 'check'}-${index}`} className="border border-ltb rounded-[10px] bg-ltbg p-4">
                                <div className="flex items-start gap-3 mb-3">
                                  <div className={`w-8 h-8 rounded-[8px] flex items-center justify-center text-[13px] border ${style.pill}`}>
                                    {check.status === 'si' ? '✓' : check.status === 'parcial' || check.status === 'proceso' ? '~' : '!'}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                      <span className="font-sora text-[13px] font-semibold text-ltt">{check.label ?? check.key ?? 'Check ISO'}</span>
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${style.pill}`}>
                                        {check.status_label ?? style.label}
                                      </span>
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                                        {check.points_earned ?? 0}/{check.points ?? 0} pts
                                      </span>
                                    </div>
                                    <div className="text-[12.5px] text-lttm leading-relaxed">
                                      Check guardado en el snapshot actual. Este bloque podrá mapearse más adelante a cláusulas y subcláusulas ISO con notas, prioridades y evidencias.
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-1.5 w-full max-w-[220px]">
                                  {Array.from({ length: 4 }).map((_, level) => (
                                    <div
                                      key={level}
                                      className={`h-1.5 rounded-[2px] flex-1 ${level < segments ? style.bar : 'bg-ltb'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'Historial' && (
                <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                  <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">Historial del sistema</span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                      <History className="w-3 h-3" />
                      {historyTimeline.length} eventos
                    </span>
                  </div>
                  <div className="p-5">
                    <div className="space-y-4">
                      {historyTimeline.map((event, index) => {
                        const visual = getHistoryEventVisual(event.event_type);
                        return (
                          <div key={event.id} className="relative pl-8">
                            {index !== historyTimeline.length - 1 && (
                              <div className="absolute left-[11px] top-7 bottom-[-18px] w-px bg-ltb" />
                            )}
                            <div className={`absolute left-0 top-1 w-[22px] h-[22px] rounded-full border flex items-center justify-center ${visual.tone}`}>
                              <span className="font-plex text-[9px] uppercase">{visual.label.slice(0, 2)}</span>
                            </div>
                            <div className="border border-ltb rounded-[10px] bg-ltbg p-4">
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div>
                                  <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                    <span className="font-sora text-[13px] font-semibold text-ltt">{event.event_title}</span>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${visual.tone}`}>
                                      {visual.label}
                                    </span>
                                    {event.synthetic && (
                                      <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border border-ltb bg-ltcard text-lttm">
                                        Snapshot heredado
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
                                    {event.event_summary ?? 'Sin resumen adicional para este evento.'}
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <div className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-lttm">
                                    {formatDate(event.created_at, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                  <div className="font-sora text-[11.5px] text-lttm mt-1">
                                    {event.actor_name ?? 'Usuario de la organización'}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'Evidencias' && (
                <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                  <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between gap-3">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">Repositorio de evidencias</span>
                    <div className="flex items-center gap-2.5">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                        {evidenceSummary.total} registradas
                      </span>
                      <button
                        onClick={openEvidenceModal}
                        className="px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
                      >
                        + Añadir evidencia
                      </button>
                    </div>
                  </div>

                  <div className="p-5 border-b border-ltb bg-gradient-to-br from-[#004aad08] to-ltbg">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                        <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Total</div>
                        <div className="font-fraunces text-[24px] font-semibold text-ltt leading-none">{evidenceSummary.total}</div>
                      </div>
                      <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                        <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Válidas</div>
                        <div className="font-fraunces text-[24px] font-semibold text-gr leading-none">{evidenceSummary.valid}</div>
                      </div>
                      <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                        <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Pendientes</div>
                        <div className="font-fraunces text-[24px] font-semibold text-or leading-none">{evidenceSummary.pending}</div>
                      </div>
                      <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                        <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Caducadas</div>
                        <div className="font-fraunces text-[24px] font-semibold text-re leading-none">{evidenceSummary.expired}</div>
                      </div>
                    </div>
                  </div>

                  {evidences.length === 0 ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-12 h-12 rounded-full bg-ltbg border border-ltb flex items-center justify-center mb-4">
                        <Link2 className="w-6 h-6 text-lttm" />
                      </div>
                      <div className="text-ltt font-sora font-semibold text-[15px] mb-2">Todavía no hay evidencias registradas</div>
                      <div className="text-[13px] text-lttm max-w-[420px] mb-5">
                        Empieza vinculando documentación técnica, DPIAs, políticas, contratos o informes mediante una URL. Más adelante podremos ampliar esta pestaña con subida de archivos a Storage.
                      </div>
                      <button
                        onClick={openEvidenceModal}
                        className="px-4 py-2 rounded-[8px] font-sora text-[12.5px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
                      >
                        Registrar primera evidencia
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-ltb">
                      {evidences.map((evidence) => {
                        const statusMeta = EVIDENCE_STATUS_META[evidence.status] ?? EVIDENCE_STATUS_META.draft;
                        return (
                          <div key={evidence.id} className="p-5 hover:bg-ltbg transition-colors">
                            <div className="flex items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                  <span className="font-sora text-[14px] font-semibold text-ltt">{evidence.title}</span>
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${statusMeta.pill}`}>
                                    {statusMeta.label}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard2 text-lttm border border-ltb">
                                    {getEvidenceTypeLabel(evidence.evidence_type)}
                                  </span>
                                  {evidence.version && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                                      v{evidence.version}
                                    </span>
                                  )}
                                </div>
                                <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed mb-3">
                                  {evidence.description ?? 'Sin descripción adicional.'}
                                </div>
                                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11.5px] text-lttm font-sora">
                                  <span className="inline-flex items-center gap-1.5">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-lttm" />
                                    Responsable: {evidence.owner_name ?? 'Usuario'}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <CalendarClock className="w-3.5 h-3.5 text-lttm" />
                                    Emitida: {formatDate(evidence.issued_at)}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-lttm" />
                                    Caduca: {formatDate(evidence.expires_at)}
                                  </span>
                                  <span className="inline-flex items-center gap-1.5">
                                    <History className="w-3.5 h-3.5 text-lttm" />
                                    {evidence.linked_obligations_count} obligaciones vinculadas
                                  </span>
                                </div>
                              </div>
                              <div className="shrink-0 flex flex-col items-end gap-2">
                                {evidence.external_url &&
                                  (isInternalAppUrl(evidence.external_url) ? (
                                    <Link
                                      href={evidence.external_url}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium text-lttm hover:bg-ltcard2 border border-ltb transition-all"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Abrir enlace
                                    </Link>
                                  ) : (
                                    <a
                                      href={evidence.external_url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium text-lttm hover:bg-ltcard2 border border-ltb transition-all"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                      Abrir enlace
                                    </a>
                                  ))}
                                <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">
                                  Registrada {formatDate(evidence.created_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'Modos de fallo' && (
                <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                  <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between gap-3">
                    <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">Modos de fallo activados</span>
                    <div className="flex items-center gap-2.5">
                      <button
                        onClick={() => setIsCausalMapOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-ltb bg-ltcard font-sora text-[11.5px] text-lttm hover:border-cyan-border hover:text-brand-cyan hover:bg-cyan-dim transition-all shrink-0"
                      >
                        <GitFork size={12} />
                        Grafo causal
                      </button>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                        {failureModeSummary.total} activos
                      </span>
                      {hasFailureModeActivationRun && (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium border border-ltb bg-ltcard2 text-lttm opacity-75 cursor-not-allowed"
                        >
                          Activación completada
                        </button>
                      )}
                      {hasFailureModeActivationRun && (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium border border-cyan-border bg-cyan-dim text-brand-cyan opacity-70 cursor-not-allowed"
                        >
                          <Bot className="w-3.5 h-3.5" />
                          Refinar mediante IA
                        </button>
                      )}
                    </div>
                  </div>

                  {!hasFailureModeActivationRun ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center">
                      <div className="w-14 h-14 rounded-full bg-ltbg border border-ltb flex items-center justify-center mb-4">
                        <ShieldAlert className="w-7 h-7 text-lttm" />
                      </div>
                      <div className="text-ltt font-sora font-semibold text-[15px] mb-2">Todavía no se han activado modos de fallo</div>
                      <div className="text-[13px] text-lttm max-w-[560px] mb-3 leading-relaxed">
                        Esta pestaña genera el subconjunto de modos de fallo relevantes para este sistema a partir de su ficha técnica, su contexto operativo y el motor de reglas sobre el catálogo FMEA.
                      </div>
                      <div className="text-[12px] text-lttm max-w-[560px] mb-5 leading-relaxed">
                        La activación por reglas se ejecuta una sola vez por sistema. Después, el siguiente paso disponible será <span className="font-medium text-ltt">refinar mediante IA</span>, opción que dejaremos preparada para una fase posterior.
                      </div>
                      {failureModeError && (
                        <div className="max-w-[560px] mb-4 text-[12px] font-sora text-re bg-red-dim border border-reb rounded-lg px-3 py-2.5">
                          {failureModeError}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={handleActivateFailureModes}
                        disabled={isActivatingFailureModes}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-[8px] font-sora text-[12.5px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {isActivatingFailureModes && <Loader2 className="w-4 h-4 animate-spin" />}
                        Activar modos de fallo
                      </button>
                    </div>
                  ) : (
                    <>
                      <div className="p-5 border-b border-ltb bg-gradient-to-br from-[#004aad08] to-ltbg">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                          <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Total activo</div>
                          <div className="font-fraunces text-[24px] font-semibold text-ltt leading-none">{failureModeSummary.total}</div>
                        </div>
                        <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                          <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Prioritarios</div>
                          <div className="font-fraunces text-[24px] font-semibold text-re leading-none">{failureModeSummary.prioritized}</div>
                        </div>
                        <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                          <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Siguiente paso</div>
                          <div className="font-sora text-[13px] font-medium text-ltt leading-snug">Refinar mediante IA cuando habilitemos el agente</div>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 py-4 border-b border-ltb bg-ltbg">
                        <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-2">Resumen de priorización</div>
                        <div className="font-sora text-[13px] text-ltt2 leading-relaxed mb-3">
                          Se han priorizado <span className="font-semibold text-ltt">{failureModeSummary.prioritized}</span> modos sobre{' '}
                          <span className="font-semibold text-ltt">{failureModeSummary.total}</span> activados. La cola actual se concentra en modos con
                          severidad estructural alta y en riesgos que alcanzan nivel crítico por score dentro del contexto operativo de este sistema.
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                          <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Razones dominantes</div>
                            <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
                              <span className="font-medium text-ltt">{failureModeSummary.prioritized}</span> modos priorizados:
                              {' '}
                              <span className="font-medium text-ltt">{prioritizedFailureModeSummary.severeOverrides}</span> por{' '}
                              <span className="font-medium text-ltt">severidad estructural alta (S ≥ 8)</span> y{' '}
                              <span className="font-medium text-ltt">{prioritizedFailureModeSummary.criticalByScore}</span> por{' '}
                              <span className="font-medium text-ltt">score crítico</span> en el contexto de este sistema.
                            </div>
                            <div className="mt-2 font-sora text-[12px] text-lttm leading-relaxed">
                              <span className="font-medium text-ltt">{failureModeSummary.monitoring}</span> modos quedan en{' '}
                              <span className="font-medium text-ltt">monitorización</span>: siguen siendo relevantes, pero sin acción inmediata requerida en este ciclo.
                            </div>
                          </div>
                          <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Dimensiones dominantes</div>
                            <div className="flex flex-wrap gap-2">
                              {prioritizedFailureModeSummary.topDimensions.map((item) => (
                                <span
                                  key={item.label}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] border border-ltb bg-ltcard2 font-plex text-[10px] text-lttm"
                                >
                                  {item.label}
                                  <span className="text-ltt">{item.count}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Familias dominantes</div>
                            <div className="flex flex-wrap gap-2">
                              {prioritizedFailureModeSummary.topFamilies.map((item) => (
                                <span
                                  key={item.label}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-[6px] border border-ltb bg-ltcard2 font-plex text-[10px] text-lttm"
                                >
                                  {item.label}
                                  <span className="text-ltt">{item.count}</span>
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                        {causalSummary.withCausalLinks > 0 && (
                          <div className="bg-ltcard border border-ltb rounded-[10px] p-3">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Propagación causal</div>
                            <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
                              <span className="font-medium text-ltt">{causalSummary.withCausalLinks}</span> modos con efecto cascada
                            </div>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {causalSummary.rootCauses > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-orb bg-ordim font-plex text-[10px] text-or">
                                  → {causalSummary.rootCauses} causas raíz
                                </span>
                              )}
                              {causalSummary.attractors > 0 && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-[6px] border border-cyan-border bg-cyan-dim font-plex text-[10px] text-brand-cyan">
                                  ← {causalSummary.attractors} atractores
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {failureModeSummary.total === 0 ? (
                        <div className="p-10 text-center">
                          <div className="font-sora text-[14px] font-semibold text-ltt mb-2">No se activaron modos con las reglas actuales</div>
                          <div className="text-[12.5px] text-lttm max-w-[520px] mx-auto leading-relaxed">
                            La primera activación ya quedó ejecutada para este sistema. Cuando esté disponible el refinado IA podremos revisar si conviene ampliar este conjunto.
                          </div>
                        </div>
                      ) : (
                        <div className="divide-y divide-ltb">
                          <div className="p-5 bg-ltbg">
                            <div className="flex flex-col gap-3">
                              <div className="flex flex-wrap items-end gap-3">
                                <div>
                                  <label className="block text-[10px] font-plex uppercase tracking-[0.8px] text-lttm mb-1.5">
                                    Filtrar por dimensión
                                  </label>
                                  <select
                                    value={failureModeDimensionFilter}
                                    onChange={(event) => setFailureModeDimensionFilter(event.target.value)}
                                    className="min-w-[180px] bg-ltcard border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                                  >
                                    <option value="all">Todas las dimensiones</option>
                                    {visibleFailureModeDimensions.map((dimension) => (
                                      <option key={dimension.id} value={dimension.id}>
                                        {dimension.label} ({dimension.count})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-plex uppercase tracking-[0.8px] text-lttm mb-1.5">
                                    Cola de revisión
                                  </label>
                                  <select
                                    value={failureModePriorityFilter}
                                    onChange={(event) => setFailureModePriorityFilter(event.target.value)}
                                    className="min-w-[180px] bg-ltcard border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                                  >
                                    <option value="all">Todos los estados</option>
                                    <option value="prioritized">Prioritarios ({failureModeSummary.prioritized})</option>
                                    <option value="monitoring">En observación ({failureModeSummary.monitoring})</option>
                                    <option value="pending_review">Pendientes de priorizar ({failureModeSummary.pendingReview})</option>
                                    <option value="dismissed">Descartados ({failureModeSummary.dismissed})</option>
                                  </select>
                                </div>
                                <div>
                                  <label className="block text-[10px] font-plex uppercase tracking-[0.8px] text-lttm mb-1.5">
                                    Ordenar por
                                  </label>
                                  <select
                                    value={failureModeSortBy}
                                    onChange={(event) => setFailureModeSortBy(event.target.value as 'score' | 'cascade')}
                                    className="min-w-[180px] bg-ltcard border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                                  >
                                    <option value="score">Score de priorización</option>
                                    <option value="cascade">Efecto cascada</option>
                                  </select>
                                </div>
                              </div>

                              <div className="flex items-center justify-between gap-3">
                                <div className="font-sora text-[12px] text-lttm">
                                  Mostrando {paginatedFailureModes.start}-{paginatedFailureModes.end} de {paginatedFailureModes.total}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => setFailureModePage((current) => Math.max(1, current - 1))}
                                    disabled={paginatedFailureModes.currentPage === 1}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium border border-ltb bg-ltcard text-lttm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ltcard2 transition-colors"
                                  >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    Anterior
                                  </button>
                                  <span className="inline-flex items-center px-2.5 py-1.5 rounded-[6px] font-plex text-[10px] border border-ltb bg-ltcard2 text-lttm">
                                    Página {paginatedFailureModes.currentPage} / {paginatedFailureModes.totalPages}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setFailureModePage((current) =>
                                        Math.min(paginatedFailureModes.totalPages, current + 1)
                                      )
                                    }
                                    disabled={paginatedFailureModes.currentPage === paginatedFailureModes.totalPages}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium border border-ltb bg-ltcard text-lttm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-ltcard2 transition-colors"
                                  >
                                    Siguiente
                                    <ArrowRight className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>

                          </div>

                          {paginatedFailureModes.total === 0 ? (
                            <div className="p-10 text-center">
                              <div className="font-sora text-[14px] font-semibold text-ltt mb-2">No hay modos para ese filtro</div>
                              <div className="text-[12.5px] text-lttm max-w-[520px] mx-auto leading-relaxed">
                                Prueba a cambiar la dimensión o la cola para revisar el resto de modos activados en este sistema.
                              </div>
                            </div>
                          ) : paginatedFailureModes.grouped.map((group) => (
                            <div key={group.dimensionId} className="p-5">
                              <div className="flex items-center justify-between gap-3 mb-4">
                                <div>
                                  <div className="font-plex text-[10px] uppercase tracking-[0.9px] text-lttm mb-1">Dimensión</div>
                                  <div className={`font-sora text-[15px] font-semibold ${group.accent}`}>{group.label}</div>
                                </div>
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${group.badge}`}>
                                  {group.items.length} modos
                                </span>
                              </div>

                              <div className="space-y-3">
                                {group.items.map((mode) => (
                                  <div key={mode.id} className="border border-ltb rounded-[10px] bg-ltbg p-4">
                                    <div className="flex items-start justify-between gap-4 mb-2.5">
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap mb-1.5">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border border-ltb bg-ltcard text-lttm">
                                            {mode.code}
                                          </span>
                                          <span className="font-sora text-[13px] font-semibold text-ltt">{mode.name}</span>
                                          <span
                                            className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${
                                              FAILURE_MODE_PRIORITY_STATUS_META[mode.priority_status]?.pill ?? 'bg-ltcard text-lttm border-ltb'
                                            }`}
                                          >
                                            {FAILURE_MODE_PRIORITY_STATUS_META[mode.priority_status]?.label ?? mode.priority_status}
                                          </span>
                                          {mode.priority_level && (
                                            <span
                                              className={`inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border ${
                                                FAILURE_MODE_PRIORITY_LEVEL_META[mode.priority_level]?.pill ?? 'bg-ltcard text-lttm border-ltb'
                                              }`}
                                            >
                                              {FAILURE_MODE_PRIORITY_LEVEL_META[mode.priority_level]?.label ?? mode.priority_level}
                                            </span>
                                          )}
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border border-cyan-border bg-cyan-dim text-brand-cyan">
                                            {FAILURE_MODE_SOURCE_LABELS[mode.activation_source] ?? mode.activation_source}
                                          </span>
                                          {mode.priority_source && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border border-ltb bg-ltcard2 text-lttm">
                                              Prioridad: {mode.priority_source === 'rules' ? 'reglas' : mode.priority_source}
                                            </span>
                                          )}
                                        </div>
                                        <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed mb-2">
                                          {mode.description ?? 'Sin descripción adicional en el catálogo.'}
                                        </div>
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                          {mode.bloque && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard2 text-lttm border border-ltb">
                                              {mode.bloque}
                                            </span>
                                          )}
                                          {mode.subcategoria && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                                              {mode.subcategoria}
                                            </span>
                                          )}
                                          {mode.tipo && (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                                              {mode.tipo}
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[12px] text-lttm leading-relaxed">
                                          {mode.activation_reason ?? 'Activado por el motor de reglas.'}
                                        </div>
                                        {mode.priority_notes && (
                                          <div className="mt-2 text-[11.5px] text-lttm leading-relaxed">
                                            {mode.priority_notes}
                                          </div>
                                        )}
                                      </div>
                                      <div className="shrink-0 text-right">
                                        <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-1">
                                          Score
                                        </div>
                                        <div className="font-fraunces text-[22px] font-semibold text-ltt leading-none">
                                          {mode.priority_score ?? '—'}
                                        </div>
                                        <div className="font-sora text-[11.5px] text-lttm mt-1">
                                          {formatDate(mode.created_at)}
                                        </div>
                                        {((mode.causal_out_degree ?? 0) > 0 || (mode.causal_in_degree ?? 0) > 0) && (
                                          <div className="flex flex-col items-end gap-1 mt-2">
                                            {(mode.causal_out_degree ?? 0) > 0 && (
                                              <span
                                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] font-plex text-[10px] border ${
                                                  (mode.causal_out_degree ?? 0) >= 3
                                                    ? 'bg-red-dim border-reb text-re'
                                                    : 'bg-ordim border-orb text-or'
                                                }`}
                                                title={`Este modo puede propagar fallos a ${mode.causal_out_degree} otros modos activos`}
                                              >
                                                → {mode.causal_out_degree} propaga
                                              </span>
                                            )}
                                            {(mode.causal_in_degree ?? 0) > 0 && (
                                              <span
                                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[5px] font-plex text-[10px] border border-cyan-border bg-cyan-dim text-brand-cyan"
                                                title={`${mode.causal_in_degree} otros modos activos pueden causar o agravar este fallo`}
                                              >
                                                ← {mode.causal_in_degree} recibe
                                              </span>
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {mode.activation_family_labels.length > 0 && (
                                      <div className="flex flex-wrap gap-2">
                                        {mode.activation_family_labels.map((label) => (
                                          <span
                                            key={`${mode.id}-${label}`}
                                            className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] border border-ltb bg-ltcard text-lttm"
                                          >
                                            {label}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {activeTab === 'Plan de tratamiento' && (
                <div className="space-y-6">
                  {treatmentPlanData ? (
                    <>
                      <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden">
                        <div className="bg-ltcard2 px-5 py-3.5 border-b border-ltb flex items-center justify-between gap-3">
                          <span className="font-plex text-[11.5px] font-semibold text-ltt2 uppercase tracking-[0.8px]">Estrategia de tratamiento</span>
                          <div className="flex items-center gap-2.5">
                            <span className={`inline-flex items-center px-3 py-1 rounded-[7px] border font-plex text-[10px] uppercase tracking-[1px] ${
                              treatmentPlanData.plan.status === 'draft' ? 'bg-cyan-dim border-cyan-border text-brand-cyan' : 'bg-grdim border-grb text-gr'
                            }`}>
                              {treatmentPlanData.plan.code === 'PREVIEW-DRAFT' ? 'Borrador de Previsualización' : treatmentPlanData.plan.status}
                            </span>
                            <Link
                              href={`/inventario/${system.id}/fmea/${treatmentPlanData.evaluation.id}/plan`}
                              className="px-3 py-1.5 rounded-[6px] font-sora text-[11.5px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
                            >
                              Gestionar plan
                            </Link>
                          </div>
                        </div>

                        <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-ltbg border border-ltb rounded-[10px] p-4">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Zona proyectada</div>
                            <div className="font-fraunces text-[22px] font-semibold text-ltt leading-none mb-2">
                              {treatmentPlanData.plan.zone_at_creation} → {treatmentPlanData.plan.residual_risk ?? 'TBD'}
                            </div>
                            <div className="font-sora text-[11px] text-lttm">Tras aplicar todas las medidas del plan</div>
                          </div>
                          <div className="bg-ltbg border border-ltb rounded-[10px] p-4">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Acciones candidatas</div>
                            <div className="font-fraunces text-[22px] font-semibold text-ltt leading-none mb-2">
                              {treatmentPlanData.actions.length}
                            </div>
                            <div className="font-sora text-[11px] text-lttm">Acciones identificadas en FMEA</div>
                          </div>
                          <div className="bg-ltbg border border-ltb rounded-[10px] p-4">
                            <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1">Aprobación requerida</div>
                            <div className="font-fraunces text-[18px] font-semibold text-ltt leading-none mb-2">
                              {treatmentPlanData.plan.approval_level}
                            </div>
                            <div className="font-sora text-[11px] text-lttm">Basado en riesgo y nivel AI Act</div>
                          </div>
                        </div>

                        <div className="px-5 py-4 border-t border-ltb bg-ltcard2">
                          <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">Riesgo residual asumido</div>
                          <div className="font-sora text-[13px] text-ltt2 leading-relaxed italic">
                            {treatmentPlanData.plan.residual_risk_notes ?? 'No hay notas sobre el riesgo residual todavía.'}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Desglose de acciones identificadas</div>
                        <div className="grid grid-cols-1 gap-3">
                          {treatmentPlanData.actions.map((action) => (
                            <div key={action.id} className="bg-ltcard border border-ltb rounded-[12px] p-4 flex items-center gap-4 hover:border-cyan-border transition-all">
                              <div className={`w-10 h-10 rounded-[8px] border flex items-center justify-center font-fraunces text-[18px] shrink-0 ${
                                action.s_actual_at_creation >= 9 ? 'bg-red-dim border-reb text-re' : 
                                action.s_actual_at_creation >= 8 ? 'bg-ordim border-orb text-or' : 'bg-cyan-dim border-cyan-border text-brand-cyan'
                              }`}>
                                {action.s_actual_at_creation}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="font-sora text-[13.5px] font-semibold text-ltt truncate">{action.failure_mode_name}</div>
                                <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mt-0.5">
                                  {action.failure_mode_code} · {action.dimension_name}
                                </div>
                              </div>
                              <div className="shrink-0 flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded-[5px] font-plex text-[10px] uppercase border ${
                                  action.option ? 'bg-grdim border-grb text-gr' : 'bg-ltcard2 border-ltb text-lttm'
                                }`}>
                                  {action.option ?? 'Pendiente'}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="bg-ltcard border border-ltb rounded-[12px] p-12 text-center">
                      <div className="w-14 h-14 rounded-full bg-ltbg border border-ltb flex items-center justify-center mx-auto mb-5">
                        <CalendarClock className="w-6 h-6 text-lttm" />
                      </div>
                      <h3 className="font-fraunces text-[20px] font-semibold text-ltt mb-2">No hay un plan activo</h3>
                      <p className="text-[14px] text-ltt2 max-w-[420px] mx-auto mb-6">
                        Para generar un plan de tratamiento, primero debes realizar una evaluación FMEA. Si ya has empezado una, el plan aparecerá aquí automáticamente como borrador.
                      </p>
                      <Link
                        href={`/inventario/${system.id}/fmea`}
                        className="px-5 py-2 rounded-[8px] font-sora text-[13px] font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue shadow-[0_1px_8px_#00adef25] hover:shadow-[0_2px_14px_#00adef40] transition-all"
                      >
                        Ir a FMEA
                      </Link>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="border-l border-ltb bg-ltbg p-6 lg:px-7 flex flex-col gap-6 w-full">
            <div className="bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06]">
              <div className="flex flex-col items-center p-6 border-b border-ltb">
                <div className="relative w-[130px] h-[130px] mb-4">
                  <svg width="130" height="130" viewBox="0 0 130 130" className="-rotate-90">
                    <circle cx="65" cy="65" r={circleRadius} fill="none" className="stroke-[#2d333b]" strokeWidth="10" />
                    <circle
                      cx="65"
                      cy="65"
                      r={circleRadius}
                      fill="none"
                      className="stroke-re transition-all duration-1000 ease-out"
                      strokeWidth="10"
                      strokeDasharray={strokeDasharray}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="font-fraunces text-[36px] font-bold text-re leading-none mb-1">{compliance}%</span>
                    <span className="font-plex text-[10px] uppercase tracking-[1px] text-lttm">AI Act</span>
                  </div>
                </div>
                <div className="flex gap-3 flex-wrap justify-center">
                  <div className="flex items-center gap-1.5 font-plex text-[11px] text-lttm"><span className="w-2 h-2 rounded-full bg-gr" />{obligationSummary.resolved} resueltas</div>
                  <div className="flex items-center gap-1.5 font-plex text-[11px] text-lttm"><span className="w-2 h-2 rounded-full bg-or" />{obligationSummary.inProgress} en curso</div>
                  <div className="flex items-center gap-1.5 font-plex text-[11px] text-lttm"><span className="w-2 h-2 rounded-full bg-re" />{obligationSummary.pending} pendientes</div>
                  <div className="flex items-center gap-1.5 font-plex text-[11px] text-lttm"><span className="w-2 h-2 rounded-full bg-lttm" />{obligationSummary.excluded} excluidas</div>
                </div>
              </div>

              <div className="p-4">
                <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-3">Cobertura de evidencias</div>
                <div className="flex flex-col gap-2.5">
                  <div className="flex items-center gap-3">
                    <div className="font-plex text-[11px] text-lttm flex-1">Con evidencias</div>
                    <div className="w-[80px] h-[5px] bg-ltb rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gr transition-all" style={{ width: `${obligationSummary.withEvidence + obligationSummary.withoutEvidence > 0 ? Math.round((obligationSummary.withEvidence / (obligationSummary.withEvidence + obligationSummary.withoutEvidence)) * 100) : 0}%` }} />
                    </div>
                    <div className="font-plex text-[10.5px] text-ltt2 w-6 text-right">{obligationSummary.withEvidence}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="font-plex text-[11px] text-lttm flex-1">Sin evidencias</div>
                    <div className="w-[80px] h-[5px] bg-ltb rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-re transition-all" style={{ width: `${obligationSummary.withEvidence + obligationSummary.withoutEvidence > 0 ? Math.round((obligationSummary.withoutEvidence / (obligationSummary.withEvidence + obligationSummary.withoutEvidence)) * 100) : 0}%` }} />
                    </div>
                    <div className="font-plex text-[10.5px] text-ltt2 w-6 text-right">{obligationSummary.withoutEvidence}</div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm mb-3">Acciones rápidas</div>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: <FileText className="w-4 h-4 text-lttm" />, label: 'Generar doc.', sub: 'Borrador Anexo IV', href: `/inventario/${system.id}/technical-dossier` },
                  { icon: <ShieldAlert className="w-4 h-4 text-re" />, label: 'Eval. riesgos', sub: 'Art. 9 · FMEA', href: `/inventario/${system.id}/fmea` },
                  { icon: <ArrowUpRight className="w-4 h-4 text-brand-blue" />, label: 'Registro EU', sub: 'Art. 71 · Form.', href: `/inventario/${system.id}/eu-registry` },
                  { icon: <Download className="w-4 h-4 text-lttm" />, label: 'Gap report', sub: 'Exportar en PDF', href: `/inventario/${system.id}/gap-report` },
                ].map((action, index) => {
                  const cardClasses = 'bg-ltcard border border-ltb rounded-[8px] p-3 text-left hover:bg-ltcard2 hover:border-cyan-border transition-all cursor-pointer group block';

                  if (action.href) {
                    return (
                      <Link
                        key={index}
                        href={action.href}
                        className={cardClasses}
                      >
                        <div className="mb-2 text-lttm group-hover:text-brand-cyan transition-colors">{action.icon}</div>
                        <div className="font-sora text-[12px] font-semibold text-ltt mb-1 leading-tight">{action.label}</div>
                        <div className="font-plex text-[10px] text-lttm leading-tight">{action.sub}</div>
                      </Link>
                    );
                  }

                  return (
                    <div key={index} className={cardClasses}>
                      <div className="mb-2 text-lttm group-hover:text-brand-cyan transition-colors">{action.icon}</div>
                      <div className="font-sora text-[12px] font-semibold text-ltt mb-1 leading-tight">{action.label}</div>
                      <div className="font-plex text-[10px] text-lttm leading-tight">{action.sub}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm mb-3 mt-1">Dependencias externas</div>
              <div className="bg-ltcard border border-ltb rounded-[10px] overflow-hidden">
                {[
                  { icon: domainMeta.emoji, name: system.external_provider ?? 'Sin proveedor externo', meta: system.external_model ?? 'Modelo externo no definido', badge: 'bg-ltcard2 text-lttm border-ltb', label: system.external_provider ? 'Activo' : 'Interno' },
                  { icon: '🧠', name: system.base_model ?? 'Modelo base no definido', meta: system.frameworks ?? 'Framework no indicado', badge: 'bg-cyan-dim text-brand-cyan border-cyan-border', label: 'Modelo' },
                  { icon: '☁️', name: system.mlops_integration ?? 'Sin integración MLOps', meta: formatJoined(system.active_environments), badge: 'bg-ordim text-or border-orb', label: 'Stack' },
                ].map((provider, index) => (
                  <div key={index} className="flex items-center gap-3 p-3.5 border-b border-ltb last:border-0 hover:bg-ltbg transition-colors cursor-pointer">
                    <div className="w-8 h-8 rounded-[8px] bg-ltbg border border-ltb flex items-center justify-center shrink-0 text-[14px]">
                      {provider.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-sora text-[13px] font-semibold text-ltt mb-[2px] truncate">{provider.name}</div>
                      <div className="font-plex text-[10.5px] text-lttm truncate">{provider.meta}</div>
                    </div>
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-[4px] font-plex text-[9.5px] uppercase border ${provider.badge}`}>{provider.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>



      {isCausalMapOpen && (
        <div className="fixed inset-0 z-[10030] flex flex-col bg-ltbg animate-fadein">
          {/* Modal header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-ltb bg-ltcard shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-ordim border border-orb flex items-center justify-center">
                <GitFork size={11} className="text-or" />
              </div>
              <div>
                <p className="font-sora text-[13px] font-semibold text-ltt">{system.name}</p>
                <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Grafo de contagio causal</p>
              </div>
            </div>
            <button
              onClick={() => setIsCausalMapOpen(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] border border-ltb bg-ltcard text-lttm font-sora text-[11.5px] hover:text-ltt transition-colors"
            >
              <X size={13} /> Cerrar
            </button>
          </div>
          {/* Modal body */}
          <div className="flex-1 p-5 overflow-hidden">
            <CausalMapSection graph={systemGraph} fullscreen />
          </div>
        </div>
      )}

      {isEvidenceModalOpen && (
        <div className="fixed inset-0 z-[10010] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-2xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <div>
                <h2 className="font-fraunces text-lg font-semibold text-ltt">Nueva evidencia</h2>
                <p className="font-sora text-[12px] text-lttm mt-1">
                  Alta básica por URL para empezar a documentar el sistema sin cambiar el diseño actual.
                </p>
              </div>
              <button onClick={closeEvidenceModal} className="text-lttm hover:text-ltt transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="evidence-form" onSubmit={handleEvidenceSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {evidenceError && (
                  <div className="md:col-span-2 text-[12px] font-sora text-re bg-red-dim border border-reb rounded-lg px-3 py-2.5">
                    {evidenceError}
                  </div>
                )}

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Título</label>
                  <input
                    type="text"
                    required
                    value={evidenceForm.title}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, title: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="Ej. DPIA aprobada, procedimiento de logging, informe de validación..."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Tipo</label>
                  <select
                    value={evidenceForm.evidenceType}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, evidenceType: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    {EVIDENCE_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Estado</label>
                  <select
                    value={evidenceForm.status}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    <option value="draft">Borrador</option>
                    <option value="pending_review">Pendiente de revisión</option>
                    <option value="valid">Válida</option>
                    <option value="expired">Caducada</option>
                    <option value="rejected">Rechazada</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">URL externa</label>
                  <input
                    type="url"
                    required
                    value={evidenceForm.externalUrl}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, externalUrl: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="https://..."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Descripción</label>
                  <textarea
                    rows={3}
                    value={evidenceForm.description}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, description: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                    placeholder="Contexto, alcance, validez o nota para auditoría."
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Versión</label>
                  <input
                    type="text"
                    value={evidenceForm.version}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, version: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                    placeholder="1.0"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Fecha de emisión</label>
                  <input
                    type="date"
                    value={evidenceForm.issuedAt}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, issuedAt: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Caducidad</label>
                  <input
                    type="date"
                    value={evidenceForm.expiresAt}
                    onChange={(event) => setEvidenceForm((current) => ({ ...current, expiresAt: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeEvidenceModal}
                className="px-4 py-2 rounded-lg border border-ltb text-[13px] font-sora text-lttm hover:bg-ltcard transition-colors"
              >
                Cancelar
              </button>
              <button
                form="evidence-form"
                type="submit"
                disabled={isSubmittingEvidence}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingEvidence && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar evidencia
              </button>
            </div>
          </div>
        </div>
      )}

      {isObligationModalOpen && selectedObligation && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-3xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <div>
                <h2 className="font-fraunces text-lg font-semibold text-ltt">Resolver obligación</h2>
                <p className="font-sora text-[12px] text-lttm mt-1">
                  {selectedObligation.name}
                </p>
              </div>
              <button onClick={closeObligationModal} className="text-lttm hover:text-ltt transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="obligation-form" onSubmit={handleObligationSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-x-5 gap-y-4">
                {obligationError && (
                  <div className="md:col-span-2 text-[12px] font-sora text-re bg-red-dim border border-reb rounded-lg px-3 py-2.5">
                    {obligationError}
                  </div>
                )}

                <div className="md:col-span-2 rounded-[10px] border border-ltb bg-ltbg p-4">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">{selectedObligation.ref}</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-[5px] font-plex text-[10px] bg-ltcard text-lttm border border-ltb">
                      Estado técnico actual: {getOblStatus(selectedObligation.systemStatus).label}
                    </span>
                  </div>
                  <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed">
                    Usa este panel para convertir la obligación en una unidad de trabajo real: actualiza estado, prioridad, fecha objetivo y enlaza evidencias existentes del sistema.
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Estado operativo</label>
                  <select
                    value={obligationForm.status}
                    onChange={(event) => setObligationForm((current) => ({ ...current, status: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    <option value="pending">Pendiente</option>
                    <option value="in_progress">En progreso</option>
                    <option value="resolved">Resuelta</option>
                    <option value="blocked">Bloqueada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Prioridad</label>
                  <select
                    value={obligationForm.priority}
                    onChange={(event) => setObligationForm((current) => ({ ...current, priority: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                    <option value="critical">Crítica</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Fecha objetivo</label>
                  <input
                    type="date"
                    value={obligationForm.dueDate}
                    onChange={(event) => setObligationForm((current) => ({ ...current, dueDate: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="block text-[11px] font-plex uppercase text-ltt2">Evidencias vinculadas</label>
                    <button
                      type="button"
                      onClick={openEvidenceModalFromObligation}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] font-sora text-[11px] font-medium text-brand-cyan border border-cyan-border bg-cyan-dim hover:bg-cyan-dim2 transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                      Nueva evidencia
                    </button>
                  </div>
                  <div className="border border-ltb rounded-lg bg-ltbg p-3 space-y-2 max-h-[180px] overflow-y-auto">
                    {evidences.length === 0 ? (
                      <div className="text-[12px] font-sora text-lttm">
                        No hay evidencias registradas todavía para este sistema.
                      </div>
                    ) : (
                      evidences.map((evidence) => (
                        <label key={evidence.id} className="flex items-start gap-2 text-[12px] font-sora text-ltt cursor-pointer">
                          <input
                            type="checkbox"
                            checked={obligationForm.evidenceIds.includes(evidence.id)}
                            onChange={(event) =>
                              setObligationForm((current) => ({
                                ...current,
                                evidenceIds: event.target.checked
                                  ? [...current.evidenceIds, evidence.id]
                                  : current.evidenceIds.filter((item) => item !== evidence.id),
                              }))
                            }
                            className="mt-0.5"
                          />
                          <span>
                            <span className="font-medium">{evidence.title}</span>
                            <span className="text-lttm"> · {getEvidenceTypeLabel(evidence.evidence_type)}</span>
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Notas de trabajo</label>
                  <textarea
                    rows={3}
                    value={obligationForm.notes}
                    onChange={(event) => setObligationForm((current) => ({ ...current, notes: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                    placeholder="Estado del trabajo, bloqueos o plan de acción."
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Notas de resolución</label>
                  <textarea
                    rows={3}
                    value={obligationForm.resolutionNotes}
                    onChange={(event) => setObligationForm((current) => ({ ...current, resolutionNotes: event.target.value }))}
                    className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                    placeholder="Qué se ha implementado o qué queda pendiente para darla por cerrada."
                  />
                </div>
              </form>
            </div>

            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeObligationModal}
                className="px-4 py-2 rounded-lg border border-ltb text-[13px] font-sora text-lttm hover:bg-ltcard transition-colors"
              >
                Cancelar
              </button>
              <button
                form="obligation-form"
                type="submit"
                disabled={isSubmittingObligation}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingObligation && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar obligación
              </button>
            </div>
          </div>
        </div>
      )}

      {isClassificationModalOpen && (
        <div className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-ltcard w-full max-w-5xl rounded-xl shadow-2xl border border-ltb flex flex-col overflow-hidden max-h-[92vh]">
            <div className="px-6 py-4 border-b border-ltb bg-ltcard2 flex justify-between items-center">
              <div>
                <h2 className="font-fraunces text-lg font-semibold text-ltt">Revisar clasificación</h2>
                <p className="font-sora text-[12px] text-lttm mt-1">
                  Ajusta los factores que impactan AI Act y confirma la nueva clasificación con trazabilidad.
                </p>
              </div>
              <button onClick={closeClassificationModal} className="text-lttm hover:text-ltt transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <form id="classification-form" onSubmit={handleClassificationSubmit} className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.9fr] gap-6">
                <div className="space-y-4">
                  {classificationError && (
                    <div className="text-[12px] font-sora text-re bg-red-dim border border-reb rounded-lg px-3 py-2.5">
                      {classificationError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Dominio</label>
                      <select
                        value={classificationForm.domain}
                        onChange={(event) => {
                          const d = event.target.value;
                          setClassificationForm((current) => ({
                            ...current,
                            domain: d,
                            criticalInfra: d === 'infra' ? true : current.criticalInfra,
                          }));
                        }}
                        className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                      >
                        {Object.entries(DOMAIN_LABELS).map(([value, meta]) => (
                          <option key={value} value={value}>
                            {meta.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Tipo de output</label>
                      <select
                        value={classificationForm.outputType}
                        onChange={(event) => setClassificationForm((current) => ({ ...current, outputType: event.target.value }))}
                        className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan"
                      >
                        <option value="">Sin definir</option>
                        {Object.entries(OUTPUT_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Uso previsto</label>
                    <textarea
                      rows={2}
                      value={classificationForm.intendedUse}
                      onChange={(event) => setClassificationForm((current) => ({ ...current, intendedUse: event.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                    />
                  </div>

                  {/* affectsPersons es la condición que desbloquea casi todos los dominios de alto riesgo */}
                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">
                      ¿Afecta directamente a personas físicas?
                      <span className="ml-1.5 text-or normal-case tracking-normal font-sora font-normal">requerido para alto riesgo por dominio</span>
                    </label>
                    <div className="flex gap-2">
                      {[
                        { value: 'true', label: 'Sí' },
                        { value: 'false', label: 'No' },
                        { value: 'null', label: 'Sin definir' },
                      ].map(({ value, label }) => {
                        const current = classificationForm.affectsPersons === null ? 'null' : classificationForm.affectsPersons ? 'true' : 'false';
                        const active = current === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setClassificationForm((c) => ({ ...c, affectsPersons: value === 'null' ? null : value === 'true' }))}
                            className={`flex-1 py-2 rounded-lg font-sora text-[12.5px] font-medium border transition-all ${
                              active
                                ? value === 'true' ? 'bg-grdim border-grb text-gr' : value === 'false' ? 'bg-red-dim border-reb text-re' : 'bg-ltcard2 border-ltb text-lttm'
                                : 'bg-ltbg border-ltb text-lttm hover:bg-ltcard'
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="text-[11px] font-plex uppercase text-ltt2 mb-2">Factores de clasificación</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {([
                        ['isAISystem', 'Es un sistema de IA', false],
                        ['isGPAI', 'Es modelo GPAI (uso general)', false],
                        ['prohibitedPractice', 'Puede ser práctica prohibida (Art. 5)', false],
                        ['biometric', 'Procesa datos biométricos', false],
                        ['criticalInfra', 'Gestiona infraestructura crítica', false],
                        ['interactsPersons', 'Interactúa directamente con personas', false],
                        ['vulnerableGroups', 'Afecta a grupos vulnerables', true],
                        ['hasMinors', 'Involucra menores de edad', true],
                      ] as [string, string, boolean][]).map(([key, label, infoOnly]) => (
                        <label
                          key={key}
                          className={`flex items-start gap-2.5 rounded-[10px] border px-3 py-2.5 text-[12.5px] font-sora cursor-pointer transition-all ${
                            Boolean(classificationForm[key as keyof typeof classificationForm])
                              ? 'border-cyan-border bg-cyan-dim text-ltt'
                              : 'border-ltb bg-ltbg text-ltt hover:bg-ltcard'
                          }`}
                        >
                          <input
                            type="checkbox"
                            className="mt-0.5 shrink-0"
                            checked={Boolean(classificationForm[key as keyof typeof classificationForm])}
                            onChange={(event) =>
                              setClassificationForm((current) => ({
                                ...current,
                                [key]: event.target.checked,
                              }))
                            }
                          />
                          <span className="leading-tight">
                            {label}
                            {infoOnly && <span className="block text-[10px] text-lttm font-normal mt-0.5">Solo informativo — no cambia el nivel AI Act</span>}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-plex uppercase text-ltt2 mb-1.5">Notas de revisión</label>
                    <textarea
                      rows={2}
                      value={classificationForm.reviewNotes}
                      onChange={(event) => setClassificationForm((current) => ({ ...current, reviewNotes: event.target.value }))}
                      className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] font-sora outline-none focus:border-brand-cyan resize-none"
                      placeholder="Motivo de la revisión o contexto del cambio."
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[12px] border border-ltb bg-ltbg p-4">
                    <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">Clasificación actual</div>
                    <div className={`font-fraunces text-[22px] font-semibold mb-2 ${riskMeta.text}`}>{riskMeta.label}</div>
                    <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed mb-2">
                      {system.aiact_risk_reason ?? 'Sin narrativa disponible.'}
                    </div>
                    <div className="font-plex text-[11px] text-lttm">
                      {system.aiact_risk_basis ?? 'Sin fundamento registrado'}
                    </div>
                  </div>

                  {(() => {
                    const preview = classificationPreview;
                    const previewMeta = preview ? (RISK_CONFIG[preview.level] ?? RISK_CONFIG.pending) : null;
                    const changed = preview?.level !== liveRiskLevel;
                    return (
                      <div className={`rounded-[12px] border p-4 ${previewMeta ? previewMeta.pill : 'bg-ltcard2 border-ltb'}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm">Preview recalculada</div>
                          {changed && preview && (
                            <span className="font-plex text-[10px] text-or bg-ordim border border-orb rounded-full px-2 py-0.5">Cambio de nivel</span>
                          )}
                        </div>
                        <div className={`font-fraunces text-[22px] font-semibold mb-2 ${previewMeta?.text ?? 'text-lttm'}`}>
                          {preview?.label ?? 'Pendiente'}
                        </div>
                        <div className="font-sora text-[12.5px] text-ltt2 leading-relaxed mb-2">
                          {preview?.reason ?? 'Faltan datos suficientes para determinar la clasificación. Revisa "¿Es un sistema de IA?" y "Tipo de output".'}
                        </div>
                        <div className="font-plex text-[11px] text-lttm">
                          {preview?.basis ?? '—'}
                        </div>
                      </div>
                    );
                  })()}

                  <div className="rounded-[12px] border border-ltb bg-ltcard2 p-4">
                    <div className="font-plex text-[10px] uppercase tracking-[0.8px] text-lttm mb-2">Obligaciones resultantes</div>
                    {(classificationPreview?.obls ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {(classificationPreview?.obls ?? []).map((obligation) => (
                          <span
                            key={obligation}
                            className="inline-flex items-center px-2 py-0.5 rounded-full font-plex text-[10.5px] font-medium bg-ltcard text-ltt border border-ltb"
                          >
                            {obligation}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="font-sora text-[12px] text-lttm">No se activarían obligaciones adicionales.</span>
                    )}
                  </div>
                </div>
              </form>
            </div>

            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex justify-end gap-3 flex-shrink-0">
              <button
                type="button"
                onClick={closeClassificationModal}
                className="px-4 py-2 rounded-lg border border-ltb text-[13px] font-sora text-lttm hover:bg-ltcard transition-colors"
              >
                Cancelar
              </button>
              <button
                form="classification-form"
                type="submit"
                disabled={isSubmittingClassification}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-gradient-to-r from-brand-cyan to-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isSubmittingClassification && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar revisión
              </button>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 px-5 py-3.5 bg-[#0d1520] border border-[#00adef35] rounded-[12px] shadow-[0_8px_32px_rgba(0,74,173,0.25)] animate-fadein">
          <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#1a8f38' }} />
          <span className="font-sora text-[13px]" style={{ color: '#e8f0fe' }}>{toastMessage}</span>
        </div>
      )}

      {isExcludingObligation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fadein">
          <div className="bg-white border border-ltb rounded-[16px] shadow-[0_24px_64px_rgba(0,74,173,0.12)] w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-ltb bg-ltcard2 flex items-center justify-between">
              <h3 className="font-fraunces text-[18px] text-ltt">Excluir obligación</h3>
              <button onClick={() => setIsExcludingObligation(false)} className="text-lttm hover:text-ltt">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-red-dim border border-reb">
                <p className="font-sora text-[13px] font-medium text-re">{exclusionData?.title}</p>
                <p className="font-sora text-[12px] text-re/80 mt-1">Estás a punto de excluir esta obligación de cumplimiento. Esto quedará registrado en la auditoría.</p>
              </div>
              <div className="space-y-2">
                <label className="font-plex text-[10.5px] uppercase tracking-[0.8px] text-lttm">Justificación de la exclusión</label>
                <textarea
                  value={exclusionJustification}
                  onChange={(e) => setExclusionJustification(e.target.value)}
                  placeholder="Explica por qué esta obligación no es de aplicación para este sistema..."
                  className="w-full h-32 rounded-lg border border-ltb bg-white p-3 font-sora text-[13px] text-ltt outline-none focus:border-cyan-border resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 bg-ltbg border-t border-ltb flex items-center justify-end gap-3">
              <button
                onClick={() => setIsExcludingObligation(false)}
                className="px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-ltt2 hover:bg-ltcard transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExclusion}
                disabled={isSubmittingExclusion || !exclusionJustification.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-sora font-medium text-white bg-re disabled:opacity-50"
              >
                {isSubmittingExclusion && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirmar exclusión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// F2 — Mapa causal tab section
// ---------------------------------------------------------------------------

// Dynamically imported to avoid SSR issues with React Flow

const CausalMapCanvas = dynamic(
  () => import('./causal-map-canvas').then((m) => ({ default: m.CausalMapCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-[12px] border border-ltb bg-ltbg animate-pulse" style={{ height: 660 }} />
    ),
  }
);

function CausalMapSection({ graph, fullscreen }: { graph: SystemCausalGraph; fullscreen?: boolean }) {
  return (
    <div className={`space-y-3 ${fullscreen ? 'h-full flex flex-col' : ''}`}>
      <div className={`flex items-center justify-between ${fullscreen ? 'hidden' : ''}`}>
        <div>
          <p className="font-plex text-[10.5px] uppercase tracking-[0.9px] text-lttm">
            Mapa de contagio causal
          </p>
          <p className="font-sora text-[12px] text-ltt2 mt-0.5">
            Nodos activos (naranja/rojo) indican modos de fallo activados en este sistema. Haz click en un nodo para ver el detalle.
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 font-plex text-[9.5px] px-2 py-1 rounded-full border border-cyan-border bg-cyan-dim text-brand-cyan">
            <span className="w-2 h-2 rounded-full bg-brand-cyan" /> Activo (S≤6)
          </span>
          <span className="inline-flex items-center gap-1 font-plex text-[9.5px] px-2 py-1 rounded-full border border-orb bg-ordim text-or">
            <span className="w-2 h-2 rounded-full bg-or" /> S≥7
          </span>
          <span className="inline-flex items-center gap-1 font-plex text-[9.5px] px-2 py-1 rounded-full border border-reb bg-red-dim text-re">
            <span className="w-2 h-2 rounded-full bg-re" /> S≥9
          </span>
        </div>
      </div>

      <div className={fullscreen ? 'flex-1' : ''}>
        <CausalMapCanvas graph={graph} fullscreen={fullscreen} />
      </div>
    </div>
  );
}

