-- ============================================================================
-- FLUXION — Revisiones de clasificación AI Act
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.ai_system_classification_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  previous_risk_level TEXT,
  new_risk_level TEXT,

  previous_basis TEXT,
  new_basis TEXT,

  previous_reason TEXT,
  new_reason TEXT,

  previous_obligations JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_obligations JSONB NOT NULL DEFAULT '[]'::jsonb,

  review_notes TEXT,
  changed_fields JSONB NOT NULL DEFAULT '{}'::jsonb,

  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_classification_reviews_system
  ON fluxion.ai_system_classification_reviews(ai_system_id, reviewed_at DESC);

CREATE INDEX IF NOT EXISTS idx_classification_reviews_org
  ON fluxion.ai_system_classification_reviews(organization_id, reviewed_at DESC);

ALTER TABLE fluxion.ai_system_classification_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "classification_reviews_select" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_select"
  ON fluxion.ai_system_classification_reviews FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "classification_reviews_insert" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_insert"
  ON fluxion.ai_system_classification_reviews FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_classification_reviews.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "classification_reviews_update" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_update"
  ON fluxion.ai_system_classification_reviews FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_classification_reviews.organization_id
        AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

DROP POLICY IF EXISTS "classification_reviews_delete" ON fluxion.ai_system_classification_reviews;
CREATE POLICY "classification_reviews_delete"
  ON fluxion.ai_system_classification_reviews FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_system_classification_reviews.organization_id
        AND role = 'admin'
    )
  );

COMMENT ON TABLE fluxion.ai_system_classification_reviews IS 'Histórico auditable de revisiones de clasificación AI Act sobre un sistema.';
COMMENT ON COLUMN fluxion.ai_system_classification_reviews.changed_fields IS 'Diff estructurado de campos modificados durante la revisión.';
