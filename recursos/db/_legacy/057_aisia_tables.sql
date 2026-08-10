-- recursos/db/057_aisia_tables.sql
--
-- Fase 3+4 — Tablas AISIA (Evaluación de Impacto del Sistema IA)
--
-- Tres tablas en schema fluxion:
--   aisia_assessments   → cabecera de la evaluación (1 por sistema activo)
--   aisia_sections      → secciones S1–S6 con contenido JSONB
--   aisia_ai_generations→ historial de generaciones IA por sección
--
-- Satisface controles ISO 42001 A.5.2–A.5.5 cuando status = 'approved'
-- RLS usa fluxion.profiles (organization_members fue eliminada en migración 039)

-- ============================================================
-- 1. aisia_assessments
-- ============================================================
CREATE TABLE fluxion.aisia_assessments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ai_system_id    UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

    status          TEXT NOT NULL DEFAULT 'draft',

    version         SMALLINT NOT NULL DEFAULT 1,

    title           TEXT,

    -- Trazabilidad de actores (profiles.id, no auth.uid)
    created_by      UUID NOT NULL REFERENCES fluxion.profiles(id) ON DELETE RESTRICT,
    submitted_by    UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
    submitted_at    TIMESTAMPTZ,
    approved_by     UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
    approved_at     TIMESTAMPTZ,
    rejected_by     UUID REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
    rejected_at     TIMESTAMPTZ,
    rejection_reason TEXT,
    approval_minutes_ref TEXT,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT aisia_assessments_system_version_unique UNIQUE (ai_system_id, version),
    CONSTRAINT aisia_assessments_status_check
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected'))
);

COMMENT ON TABLE fluxion.aisia_assessments IS
    'Evaluación de Impacto del Sistema IA (AISIA). '
    'Satisface controles ISO 42001 A.5.2–A.5.5 cuando status = approved.';

-- ============================================================
-- 2. aisia_sections
-- ============================================================
CREATE TABLE fluxion.aisia_sections (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id   UUID NOT NULL REFERENCES fluxion.aisia_assessments(id) ON DELETE CASCADE,

    section_code    TEXT NOT NULL,
    data            JSONB NOT NULL DEFAULT '{}',
    status          TEXT NOT NULL DEFAULT 'pending',
    last_generated_at TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT aisia_sections_assessment_code_unique UNIQUE (assessment_id, section_code),
    CONSTRAINT aisia_sections_code_check
        CHECK (section_code IN ('S1', 'S2', 'S3', 'S4', 'S5', 'S6')),
    CONSTRAINT aisia_sections_status_check
        CHECK (status IN ('pending', 'in_progress', 'complete'))
);

COMMENT ON TABLE fluxion.aisia_sections IS
    'Secciones S1–S6 de una evaluación AISIA. Contenido en JSONB.';

-- ============================================================
-- 3. aisia_ai_generations
-- ============================================================
CREATE TABLE fluxion.aisia_ai_generations (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    assessment_id       UUID NOT NULL REFERENCES fluxion.aisia_assessments(id) ON DELETE CASCADE,
    section_code        TEXT NOT NULL,

    prompt_summary      TEXT,
    generated_content   JSONB NOT NULL DEFAULT '{}',
    model_used          TEXT,

    triggered_by        UUID NOT NULL REFERENCES fluxion.profiles(id) ON DELETE RESTRICT,
    triggered_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    accepted            BOOLEAN,
    accepted_at         TIMESTAMPTZ,

    CONSTRAINT aisia_ai_generations_code_check
        CHECK (section_code IN ('S1', 'S2', 'S3', 'S4', 'S5', 'S6'))
);

COMMENT ON TABLE fluxion.aisia_ai_generations IS
    'Historial de generaciones IA por sección AISIA. Inmutable.';

-- ============================================================
-- 4. Triggers updated_at
-- ============================================================
CREATE TRIGGER trg_aisia_assessments_updated_at
    BEFORE UPDATE ON fluxion.aisia_assessments
    FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

CREATE TRIGGER trg_aisia_sections_updated_at
    BEFORE UPDATE ON fluxion.aisia_sections
    FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

-- ============================================================
-- 5. Grants
-- ============================================================
GRANT ALL ON fluxion.aisia_assessments    TO authenticated, service_role;
GRANT ALL ON fluxion.aisia_sections       TO authenticated, service_role;
GRANT ALL ON fluxion.aisia_ai_generations TO authenticated, service_role;

-- ============================================================
-- 6. RLS  (usa fluxion.profiles, no organization_members)
-- ============================================================
ALTER TABLE fluxion.aisia_assessments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.aisia_sections       ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.aisia_ai_generations ENABLE ROW LEVEL SECURITY;

-- ── aisia_assessments ────────────────────────────────────────

CREATE POLICY "aisia_assessments_select"
    ON fluxion.aisia_assessments FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "aisia_assessments_insert"
    ON fluxion.aisia_assessments FOR INSERT
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "aisia_assessments_update"
    ON fluxion.aisia_assessments FOR UPDATE
    USING (
        organization_id IN (
            SELECT organization_id FROM fluxion.profiles
            WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "aisia_assessments_delete"
    ON fluxion.aisia_assessments FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.profiles
            WHERE user_id = auth.uid()
              AND organization_id = fluxion.aisia_assessments.organization_id
              AND role IN ('org_admin', 'sgai_manager', 'caio')
        )
    );

-- ── aisia_sections ───────────────────────────────────────────

CREATE POLICY "aisia_sections_select"
    ON fluxion.aisia_sections FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.aisia_assessments a
            WHERE a.id = assessment_id
              AND a.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
              )
        )
    );

CREATE POLICY "aisia_sections_insert"
    ON fluxion.aisia_sections FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM fluxion.aisia_assessments a
            WHERE a.id = assessment_id
              AND a.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
              )
        )
    );

CREATE POLICY "aisia_sections_update"
    ON fluxion.aisia_sections FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.aisia_assessments a
            WHERE a.id = assessment_id
              AND a.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
              )
        )
    );

-- ── aisia_ai_generations ─────────────────────────────────────

CREATE POLICY "aisia_ai_generations_select"
    ON fluxion.aisia_ai_generations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM fluxion.aisia_assessments a
            WHERE a.id = assessment_id
              AND a.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
              )
        )
    );

CREATE POLICY "aisia_ai_generations_insert"
    ON fluxion.aisia_ai_generations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM fluxion.aisia_assessments a
            WHERE a.id = assessment_id
              AND a.organization_id IN (
                  SELECT organization_id FROM fluxion.profiles
                  WHERE user_id = auth.uid()
              )
        )
    );
