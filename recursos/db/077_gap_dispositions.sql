-- ============================================================================
-- FLUXION — 077: gap_dispositions
-- Almacena decisiones explícitas "accepted" / "not_applicable" para gaps.
-- Una fila por (organization_id, gap_key). UPSERT en conflicto.
-- expires_at: si se indica, el gap vuelve a la cola activa en esa fecha.
-- ============================================================================

CREATE TABLE IF NOT EXISTS fluxion.gap_dispositions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  gap_key         TEXT        NOT NULL,
  gap_layer       TEXT        NOT NULL
    CHECK (gap_layer IN ('normativo', 'fmea', 'control', 'caducidad')),
  gap_source_id   UUID        NOT NULL,
  disposition     TEXT        NOT NULL
    CHECK (disposition IN ('accepted', 'not_applicable')),
  rationale       TEXT        NOT NULL
    CHECK (length(trim(rationale)) >= 10),
  decided_by      UUID        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  decided_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, gap_key)
);

CREATE INDEX IF NOT EXISTS idx_gap_dispositions_org
  ON fluxion.gap_dispositions (organization_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON fluxion.gap_dispositions TO authenticated;
GRANT SELECT                          ON fluxion.gap_dispositions TO anon;

ALTER TABLE fluxion.gap_dispositions ENABLE ROW LEVEL SECURITY;

-- Miembros de la organización pueden leer
CREATE POLICY "gap_dispositions_select" ON fluxion.gap_dispositions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid()
    )
  );

-- admin / editor / dpo / technical pueden crear
CREATE POLICY "gap_dispositions_insert" ON fluxion.gap_dispositions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
       WHERE user_id = auth.uid()
         AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

-- admin / editor / dpo / technical pueden actualizar
CREATE POLICY "gap_dispositions_update" ON fluxion.gap_dispositions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
       WHERE user_id = auth.uid()
         AND role IN ('admin', 'editor', 'dpo', 'technical')
    )
  );

-- Solo admin / editor pueden eliminar (revertir)
CREATE POLICY "gap_dispositions_delete" ON fluxion.gap_dispositions
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.profiles
       WHERE user_id = auth.uid()
         AND role IN ('admin', 'editor')
    )
  );
