-- =============================================================================
-- MIGRACIÓN 053: Sistema de clasificación versionado con diff y reconciliación
-- =============================================================================
-- Resuelve la inconsistencia estructural entre reclasificaciones y obligaciones
-- con trabajo acumulado. Introduce classification_events como entidad de primera
-- clase con historial versionado, diff calculado y reconciliación explícita.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- PASO 1: ENUMs
-- -----------------------------------------------------------------------------

CREATE TYPE fluxion.classification_method AS ENUM (
  'initial',        -- Primera clasificación al registrar el sistema
  'rules_engine',   -- Motor de reglas determinista
  'ai_agent',       -- Agente IA (Claude API)
  'manual_review'   -- Revisión manual con factores editados por el usuario
);

CREATE TYPE fluxion.classification_event_status AS ENUM (
  'pending_reconciliation', -- Calculada, esperando que el usuario resuelva el diff
  'reconciled',             -- Diff resuelto, es la clasificación activa
  'superseded'              -- Fue activa pero fue reemplazada por una más reciente
);

CREATE TYPE fluxion.diff_type AS ENUM (
  'added',      -- Obligación nueva en el conjunto resultante
  'removed',    -- Obligación que estaba y ya no está
  'unchanged'   -- Obligación presente en ambos conjuntos (no se toca)
);

CREATE TYPE fluxion.diff_resolution AS ENUM (
  'accepted',   -- Usuario confirma la nueva obligación añadida
  'excluded',   -- Usuario excluye la nueva obligación añadida (requiere nota)
  'preserved',  -- Usuario mantiene activa una obligación que iba a eliminarse
  'archived'    -- Usuario archiva una obligación eliminada (con nota de cierre)
);

-- -----------------------------------------------------------------------------
-- PASO 2: Tabla classification_events
-- -----------------------------------------------------------------------------

CREATE TABLE fluxion.classification_events (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ai_system_id            UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id         UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  version                 INTEGER NOT NULL,

  method                  fluxion.classification_method NOT NULL,

  risk_level              TEXT NOT NULL
                          CHECK (risk_level IN ('prohibited', 'high', 'limited', 'minimal')),
  risk_label              TEXT NOT NULL,
  basis                   TEXT,
  reason                  TEXT,
  obligations_set         TEXT[] NOT NULL,

  -- Snapshot de los factores que produjeron esta clasificación
  classification_factors  JSONB NOT NULL DEFAULT '{}',

  created_by              UUID REFERENCES fluxion.profiles(id),
  review_notes            TEXT,

  status  fluxion.classification_event_status NOT NULL DEFAULT 'pending_reconciliation',

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Solo puede haber UN evento pending_reconciliation por sistema a la vez
CREATE UNIQUE INDEX idx_one_pending_reconciliation
  ON fluxion.classification_events(ai_system_id)
  WHERE status = 'pending_reconciliation';

CREATE INDEX idx_classification_events_system_reconciled
  ON fluxion.classification_events(ai_system_id, status)
  WHERE status = 'reconciled';

CREATE INDEX idx_classification_events_org
  ON fluxion.classification_events(organization_id);

CREATE TRIGGER trg_classification_events_updated_at
  BEFORE UPDATE ON fluxion.classification_events
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();

-- -----------------------------------------------------------------------------
-- PASO 3: Tabla classification_diffs
-- -----------------------------------------------------------------------------

CREATE TABLE fluxion.classification_diffs (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  classification_event_id UUID NOT NULL
                          REFERENCES fluxion.classification_events(id) ON DELETE CASCADE,
  ai_system_id            UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  organization_id         UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  obligation_key          TEXT NOT NULL,
  obligation_label        TEXT NOT NULL,
  diff_type               fluxion.diff_type NOT NULL,

  previous_obligation_id  UUID REFERENCES fluxion.system_obligations(id),
  previous_status         TEXT,

  resolution              fluxion.diff_resolution,
  resolution_note         TEXT,
  resolved_by             UUID REFERENCES fluxion.profiles(id),
  resolved_at             TIMESTAMPTZ,

  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_classification_diffs_event
  ON fluxion.classification_diffs(classification_event_id);

CREATE INDEX idx_classification_diffs_pending
  ON fluxion.classification_diffs(ai_system_id, resolution)
  WHERE resolution IS NULL;

-- -----------------------------------------------------------------------------
-- PASO 4: Alteraciones en system_obligations
-- Estrategia: añadir columnas nuevas, no renombrar las existentes.
-- Las columnas antiguas (obligation_code, title, notes) se mantienen por
-- retrocompatibilidad con el código existente.
-- -----------------------------------------------------------------------------

-- Clave canónica de la obligación (ej: 'art_9', 'art_14')
ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS obligation_key TEXT;

-- Label de display (ej: 'Art. 9 — Sistema de gestión de riesgos')
ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS obligation_label TEXT;

-- Notas de trabajo (equivalente semántico al campo 'notes' existente)
ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS work_notes TEXT;

-- Justificación de exclusión (requerida cuando status = 'excluded')
ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS exclusion_justification TEXT;

-- Qué evento de clasificación originó esta obligación
-- NULL para obligaciones creadas antes de esta migración (retrocompatibilidad)
ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS classification_event_id UUID
  REFERENCES fluxion.classification_events(id);

-- Soft delete por reclasificación: NULL = activa | NOT NULL = archivada
ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

ALTER TABLE fluxion.system_obligations
  ADD COLUMN IF NOT EXISTS archive_note TEXT;

-- Añadir 'suggested' al CHECK constraint de status
ALTER TABLE fluxion.system_obligations
  DROP CONSTRAINT chk_system_obligations_status;

ALTER TABLE fluxion.system_obligations
  ADD CONSTRAINT chk_system_obligations_status CHECK (
    status = ANY (ARRAY[
      'suggested'::text,
      'pending'::text,
      'in_progress'::text,
      'resolved'::text,
      'blocked'::text,
      'excluded'::text
    ])
  );

-- Índice para filtrar solo obligaciones activas (las que usa la UI principal)
CREATE INDEX IF NOT EXISTS idx_system_obligations_active
  ON fluxion.system_obligations(ai_system_id)
  WHERE archived_at IS NULL;

-- -----------------------------------------------------------------------------
-- PASO 5: Alteraciones en ai_systems
-- -----------------------------------------------------------------------------

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS current_classification_event_id UUID
  REFERENCES fluxion.classification_events(id);

COMMENT ON COLUMN fluxion.ai_systems.aiact_obligations
  IS 'DEPRECATED: usar system_obligations WHERE archived_at IS NULL. Mantenido solo por retrocompatibilidad.';

-- -----------------------------------------------------------------------------
-- PASO 6: RLS para las nuevas tablas
-- -----------------------------------------------------------------------------

ALTER TABLE fluxion.classification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_classification_events"
  ON fluxion.classification_events
  FOR ALL
  USING (organization_id = (
    SELECT organization_id FROM fluxion.profiles
    WHERE id = auth.uid()
  ));

ALTER TABLE fluxion.classification_diffs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation_classification_diffs"
  ON fluxion.classification_diffs
  FOR ALL
  USING (organization_id = (
    SELECT organization_id FROM fluxion.profiles
    WHERE id = auth.uid()
  ));
