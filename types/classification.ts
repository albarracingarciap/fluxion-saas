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
