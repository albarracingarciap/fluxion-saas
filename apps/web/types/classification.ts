// ─── Tipos legacy (ClassificationPanel existente) ───────────────────────────

export type RiskLevel = 'prohibited' | 'high' | 'limited' | 'minimal' | 'pending'

export interface RagSource {
  chunk_id: string
  article: string
  text_excerpt: string
  relevance_score: number
}

export interface ClassificationProposal {
  proposal_id: string
  system_id: string
  risk_level: RiskLevel
  confidence: number
  reasoning: string
  rag_sources: RagSource[]
  applicable_articles: string[]
  obligations: string[]
  requires_human_review: boolean
  classification_basis: string
}

export type PanelState =
  | 'idle'
  | 'connecting'
  | 'thinking'
  | 'streaming'
  | 'proposal'
  | 'confirming'
  | 'confirmed'
  | 'error'

// ─── Tipos nuevos: sistema de clasificación versionado ───────────────────────

export type ClassificationMethod = 'initial' | 'rules_engine' | 'ai_agent' | 'manual_review'
export type ClassificationEventStatus = 'pending_reconciliation' | 'reconciled' | 'superseded'
export type DiffType = 'added' | 'removed' | 'unchanged'
export type DiffResolution = 'accepted' | 'excluded' | 'preserved' | 'archived'
export type ObligationStatus = 'suggested' | 'pending' | 'in_progress' | 'resolved' | 'blocked' | 'excluded'

export interface ClassificationFactors {
  domain: string
  output_type: string
  affects_persons: boolean
  has_biometric: boolean
  is_gpai: boolean
  manages_critical_infrastructure: boolean
  affects_vulnerable_groups: boolean
  involves_minors: boolean
  intended_use?: string
}

export interface DiffItem {
  id: string
  obligation_key: string
  obligation_label: string
  diff_type: DiffType
  previous_obligation_id: string | null
  previous_status: ObligationStatus | null
  resolution: DiffResolution | null
  resolution_note: string | null
  resolved_at: string | null
}

export interface ClassificationEvent {
  id: string
  ai_system_id: string
  version: number
  method: ClassificationMethod
  risk_level: RiskLevel
  risk_label: string
  basis: string | null
  reason: string | null
  obligations_set: string[]
  classification_factors: ClassificationFactors
  review_notes: string | null
  status: ClassificationEventStatus
  created_by: string | null
  created_at: string
  diffs?: DiffItem[]
}

export interface SystemObligation {
  id: string
  source_framework: string
  obligation_code: string | null
  obligation_key: string | null
  obligation_label: string | null
  title: string
  description: string | null
  status: ObligationStatus
  priority: string
  due_date: string | null
  notes: string | null
  work_notes: string | null
  resolution_notes: string | null
  exclusion_justification: string | null
  archived_at: string | null
  classification_event_id: string | null
  resolved_at: string | null
  resolved_by: string | null
  created_at: string
  updated_at: string
}

// Payloads para llamadas al backend desde el cliente
export interface ReclassifyRequest {
  factors: ClassificationFactors
  review_notes?: string
}

export interface ReconcileDecision {
  diff_id: string
  resolution: DiffResolution
  resolution_note?: string
}

export interface ReconcileRequest {
  event_id: string
  decisions: ReconcileDecision[]
}

export type ReclassifyResponse =
  | { has_changes: false }
  | { has_changes: true; event_id: string; version: number; risk_level: RiskLevel; risk_label: string }
