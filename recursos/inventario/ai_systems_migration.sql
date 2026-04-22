-- ═══════════════════════════════════════════════════════════════
-- FLUXION — Tabla: fluxion.ai_systems
-- Modelo de datos completo para el inventario de sistemas IA
-- Cubre: AI Act · ISO 42001 · RGPD · DORA
-- ═══════════════════════════════════════════════════════════════

-- Asegurar que el schema existe
CREATE SCHEMA IF NOT EXISTS fluxion;

-- ─── TIPOS ENUM ──────────────────────────────────────────────

CREATE TYPE fluxion.ai_system_status AS ENUM (
  'produccion',
  'desarrollo',
  'piloto',
  'deprecado',
  'retirado'
);

CREATE TYPE fluxion.ai_system_domain AS ENUM (
  'finanzas',
  'seguros',
  'credito',
  'salud',
  'rrhh',
  'educacion',
  'seguridad',
  'justicia',
  'migracion',
  'infra',
  'marketing',
  'operaciones',
  'atencion',
  'cumplimiento',
  'otro'
);

CREATE TYPE fluxion.ai_output_type AS ENUM (
  'decision',
  'recomendacion',
  'clasificacion',
  'generacion',
  'prediccion',
  'deteccion',
  'optimizacion',
  'otro'
);

CREATE TYPE fluxion.ai_system_type AS ENUM (
  'ml',         -- Machine Learning tradicional
  'dl',         -- Deep Learning
  'llm',        -- LLM / Generativo
  'agentico',   -- Sistema agéntico
  'reglas',     -- Reglas de negocio
  'hibrido',    -- Híbrido
  'otro'
);

CREATE TYPE fluxion.ai_provider_origin AS ENUM (
  'interno',    -- Desarrollo propio
  'proveedor',  -- Proveedor externo
  'saas',       -- SaaS / API tercero
  'oss'         -- Open Source
);

-- Clasificación AI Act
CREATE TYPE fluxion.aiact_risk_level AS ENUM (
  'prohibited',   -- Práctica prohibida Art. 5
  'gpai',         -- Modelo de uso general Art. 51-53
  'high',         -- Alto riesgo Anexo III
  'limited',      -- Riesgo limitado Art. 50
  'minimal',      -- Riesgo mínimo
  'pending'       -- Pendiente de clasificar
);

CREATE TYPE fluxion.doc_status AS ENUM (
  'si',
  'parcial',
  'no',
  'proceso'
);

CREATE TYPE fluxion.oversight_type AS ENUM (
  'previo',       -- Revisión previa a la decisión
  'posterior',    -- Revisión posterior con reversión posible
  'muestral',     -- Revisión muestral periódica
  'umbral',       -- Intervención si supera umbral
  'auditoria'     -- Solo auditoría retrospectiva
);

CREATE TYPE fluxion.review_frequency AS ENUM (
  'mensual',
  'trimestral',
  'semestral',
  'anual',
  'adhoc'
);

CREATE TYPE fluxion.residual_risk AS ENUM (
  'bajo',
  'medio',
  'alto',
  'muy_alto',
  'no_determinado'
);

CREATE TYPE fluxion.cert_status AS ENUM (
  'declaracion_emitida',
  'en_evaluacion',
  'certificacion_ce',
  'pendiente',
  'no_aplica'
);

CREATE TYPE fluxion.data_volume AS ENUM (
  'menos_1gb',
  '1_100gb',
  '100gb_1tb',
  '1_10tb',
  'mas_10tb',
  'desconocido'
);

CREATE TYPE fluxion.data_retention AS ENUM (
  'menos_6m',
  '6_12m',
  '1_3a',
  '3_5a',
  'mas_5a',
  'sin_politica'
);

CREATE TYPE fluxion.usage_scale AS ENUM (
  'menos_100m',
  '100_1k_m',
  '1k_10k_m',
  '10k_100k_m',
  'mas_100k_m'
);

CREATE TYPE fluxion.mlops_integration AS ENUM (
  'mlflow',
  'azureml',
  'sagemaker',
  'vertex',
  'databricks',
  'ninguno',
  'otro'
);

-- ─── TABLA PRINCIPAL ─────────────────────────────────────────

CREATE TABLE fluxion.ai_systems (

  -- ── METADATOS DE REGISTRO ─────────────────────────────────
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id         UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  created_by              UUID NOT NULL REFERENCES fluxion.profiles(id),
  updated_by              UUID REFERENCES fluxion.profiles(id),
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── PASO 1: IDENTIFICACIÓN ────────────────────────────────
  -- Datos básicos de identificación del sistema
  name                    TEXT NOT NULL,
  version                 TEXT NOT NULL DEFAULT '1.0.0',
  internal_id             TEXT,                           -- Código de activo interno (ej. SYS-042)
  domain                  fluxion.ai_system_domain NOT NULL,
  status                  fluxion.ai_system_status NOT NULL,
  deployed_at             DATE,                           -- Fecha de primer despliegue en producción
  description             TEXT,                           -- Descripción para directivos / no técnicos
  technical_description   TEXT,                           -- Descripción técnica detallada
  tags                    TEXT[] NOT NULL DEFAULT '{}',   -- Etiquetas para búsqueda y agrupación

  -- ── PASO 2: PROPÓSITO Y FUNCIÓN ──────────────────────────
  -- Artículo 11 AI Act — Uso previsto debe documentarse formalmente
  intended_use            TEXT,                           -- Descripción del uso previsto (Art. 11)
  prohibited_uses         TEXT,                           -- Usos expresamente excluidos del alcance
  output_type             fluxion.ai_output_type,
  fully_automated         BOOLEAN,                        -- TRUE = sin intervención humana en decisiones
  interacts_persons       BOOLEAN NOT NULL DEFAULT FALSE, -- Interacción directa con personas en tiempo real
  target_users            TEXT[] NOT NULL DEFAULT '{}',   -- Colectivos objetivo del sistema
  usage_scale             fluxion.usage_scale,            -- Volumen de decisiones / mes
  geo_scope               TEXT[] NOT NULL DEFAULT '{}',   -- Geografías de despliegue

  -- ── PASO 3: IMPACTO Y CLASIFICACIÓN AI ACT ───────────────
  -- Clasificación según Reglamento (UE) 2024/1689
  is_ai_system            BOOLEAN,                        -- ¿Es un sistema de IA según Art. 3(1)?
  is_gpai                 BOOLEAN NOT NULL DEFAULT FALSE, -- ¿Es un modelo GPAI (Art. 3(63))?
  prohibited_practice     BOOLEAN NOT NULL DEFAULT FALSE, -- ¿Podría constituir práctica prohibida Art. 5?
  affects_persons         BOOLEAN,                        -- ¿Las salidas afectan directamente a personas?
  vulnerable_groups       BOOLEAN NOT NULL DEFAULT FALSE, -- Puede afectar a grupos vulnerables
  involves_minors         BOOLEAN NOT NULL DEFAULT FALSE, -- Puede procesar datos o afectar a menores
  uses_biometric_data     BOOLEAN NOT NULL DEFAULT FALSE, -- Procesa datos biométricos → Anexo III §1
  manages_critical_infra  BOOLEAN NOT NULL DEFAULT FALSE, -- Gestiona infra crítica → Anexo III §2

  -- Resultado de la clasificación (calculado por el agente, revisable)
  aiact_risk_level        fluxion.aiact_risk_level NOT NULL DEFAULT 'pending',
  aiact_risk_basis        TEXT,                           -- Artículo / Anexo III sección que lo fundamenta
  aiact_risk_reason       TEXT,                           -- Explicación narrativa de la clasificación
  aiact_obligations       TEXT[] NOT NULL DEFAULT '{}',   -- Lista de obligaciones aplicables
  aiact_classified_at     TIMESTAMPTZ,                    -- Cuándo se hizo la clasificación
  aiact_classified_by     UUID REFERENCES fluxion.profiles(id), -- Quién la aprobó

  -- ── PASO 4: DATOS E INPUTS ────────────────────────────────
  -- RGPD · AI Act Art. 10
  processes_personal_data BOOLEAN,                        -- ¿Trata datos personales (RGPD Art. 4)?
  data_categories         TEXT[] NOT NULL DEFAULT '{}',   -- Categorías de datos personales
  special_categories      TEXT[] NOT NULL DEFAULT '{}',   -- Categorías especiales Art. 9 RGPD
  legal_bases             TEXT[] NOT NULL DEFAULT '{}',   -- Bases legales Art. 6 RGPD
  data_sources            TEXT[] NOT NULL DEFAULT '{}',   -- Fuentes de los datos de entrada
  training_data_doc       fluxion.doc_status,             -- Documentación de datos de entrenamiento (Art. 10)
  data_volume             fluxion.data_volume,
  data_retention          fluxion.data_retention,
  dpia_completed          fluxion.doc_status,             -- Evaluación de Impacto de Protección de Datos

  -- ── PASO 5: TECNOLOGÍA Y ARQUITECTURA ────────────────────
  ai_system_type          fluxion.ai_system_type,         -- Tipo técnico del sistema
  base_model              TEXT,                           -- Algoritmo o modelo base (ej. XGBoost, GPT-4o)
  external_model          TEXT,                           -- Modelo fundacional externo si aplica
  external_provider       TEXT,                           -- Proveedor del modelo externo (DORA)
  frameworks              TEXT,                           -- Frameworks y librerías (ej. PyTorch, LangChain)
  provider_origin         fluxion.ai_provider_origin,     -- Origen del sistema
  has_fine_tuning         BOOLEAN NOT NULL DEFAULT FALSE, -- Se aplica fine-tuning sobre modelo base
  has_external_tools      BOOLEAN NOT NULL DEFAULT FALSE, -- Usa herramientas / APIs externas (agéntico)
  active_environments     TEXT[] NOT NULL DEFAULT '{}',   -- Entornos activos (producción, staging...)
  mlops_integration       fluxion.mlops_integration,      -- Integración con plataforma MLOps

  -- ── PASO 6: GOBIERNO Y RESPONSABILIDAD ───────────────────
  -- ISO 42001 · AI Act Art. 26
  ai_owner                TEXT,                           -- Responsable del sistema (AI Owner)
  responsible_team        TEXT,                           -- Equipo responsable
  tech_lead               TEXT,                           -- Responsable técnico
  executive_sponsor       TEXT,                           -- Sponsor ejecutivo
  dpo_involved            BOOLEAN NOT NULL DEFAULT FALSE, -- DPO ha revisado el sistema
  has_sla                 BOOLEAN NOT NULL DEFAULT FALSE, -- Existe SLA o acuerdo de nivel de servicio
  review_frequency        fluxion.review_frequency,       -- Periodicidad de revisión formal
  incident_contact        TEXT,                           -- Canal / email de escalado de incidentes
  critical_providers      TEXT,                           -- Proveedores TIC críticos DORA (texto libre)

  -- ── PASO 7: CONTROLES Y DOCUMENTACIÓN ────────────────────
  -- AI Act Art. 9, 11, 12, 13, 14, 15
  has_tech_doc            fluxion.doc_status,             -- Documentación técnica Anexo IV (Art. 11)
  has_logging             fluxion.doc_status,             -- Logging / registro de actividad (Art. 12)
  has_human_oversight     fluxion.doc_status,             -- Supervisión humana (Art. 14)
  oversight_type          fluxion.oversight_type,         -- Tipo de supervisión humana implementada
  has_complaint_mechanism BOOLEAN NOT NULL DEFAULT FALSE, -- Mecanismo de reclamación (Art. 13)
  has_risk_assessment     fluxion.doc_status,             -- Evaluación de riesgos completada (Art. 9)
  residual_risk           fluxion.residual_risk,          -- Nivel de riesgo residual tras controles
  mitigation_notes        TEXT,                           -- Medidas de mitigación implementadas
  has_adversarial_test    BOOLEAN NOT NULL DEFAULT FALSE, -- Pruebas de robustez / adversarial (Art. 15)
  cert_status             fluxion.cert_status,            -- Estado de certificación o conformidad
  next_audit_date         DATE,                           -- Próxima auditoría planificada

  -- ── SCORE DE MADUREZ ISO 42001 (calculado) ───────────────
  iso_42001_score         SMALLINT,                       -- 0-100, recalculado por el agente
  iso_42001_checks        JSONB NOT NULL DEFAULT '[]'::jsonb, -- Snapshot auditable de checks y pesos ISO
  iso_42001_updated_at    TIMESTAMPTZ,

  -- ── CONSTRAINTS ──────────────────────────────────────────
  CONSTRAINT name_not_empty         CHECK (char_length(trim(name)) > 0),
  CONSTRAINT version_format         CHECK (version ~ '^\d+\.\d+(\.\d+)?$'),
  CONSTRAINT iso_score_range        CHECK (iso_42001_score IS NULL OR iso_42001_score BETWEEN 0 AND 100),
  CONSTRAINT prohibited_is_high     CHECK (
    prohibited_practice = FALSE OR aiact_risk_level IN ('prohibited', 'pending')
  )
);

-- ─── ÍNDICES ─────────────────────────────────────────────────

-- Lookups frecuentes por organización (multi-tenant)
CREATE INDEX idx_ai_systems_org        ON fluxion.ai_systems(organization_id);
CREATE INDEX idx_ai_systems_org_status ON fluxion.ai_systems(organization_id, status);
CREATE INDEX idx_ai_systems_org_domain ON fluxion.ai_systems(organization_id, domain);

-- Clasificación AI Act (filtros de cumplimiento)
CREATE INDEX idx_ai_systems_risk_level ON fluxion.ai_systems(organization_id, aiact_risk_level);

-- Búsqueda por responsable
CREATE INDEX idx_ai_systems_owner      ON fluxion.ai_systems(organization_id, ai_owner);

-- Búsqueda full-text en nombre + descripción
CREATE INDEX idx_ai_systems_fts ON fluxion.ai_systems
  USING GIN (to_tsvector('spanish', coalesce(name,'') || ' ' || coalesce(description,'')));

-- Búsqueda por etiquetas
CREATE INDEX idx_ai_systems_tags ON fluxion.ai_systems USING GIN(tags);

-- Filtros de sistemas agénticos / datos biométricos / minors (queries de riesgo)
CREATE INDEX idx_ai_systems_agentic    ON fluxion.ai_systems(organization_id) WHERE ai_system_type = 'agentico';
CREATE INDEX idx_ai_systems_biometric  ON fluxion.ai_systems(organization_id) WHERE uses_biometric_data = TRUE;
CREATE INDEX idx_ai_systems_high_risk  ON fluxion.ai_systems(organization_id) WHERE aiact_risk_level = 'high';

-- ID interno por organización
CREATE UNIQUE INDEX idx_ai_systems_internal_id
  ON fluxion.ai_systems(organization_id, internal_id)
  WHERE internal_id IS NOT NULL;

-- ─── UPDATED_AT AUTOMÁTICO ───────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ai_systems_updated_at
  BEFORE UPDATE ON fluxion.ai_systems
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

-- ─── ROW LEVEL SECURITY ──────────────────────────────────────

ALTER TABLE fluxion.ai_systems ENABLE ROW LEVEL SECURITY;

-- SELECT: cualquier miembro de la organización puede leer
CREATE POLICY "org_members_select"
  ON fluxion.ai_systems FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid()
    )
  );

-- INSERT: cualquier miembro autenticado puede registrar sistemas
CREATE POLICY "org_members_insert"
  ON fluxion.ai_systems FOR INSERT
  WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid()
    )
  );

-- UPDATE: solo admin, dpo o technical pueden editar
CREATE POLICY "org_editors_update"
  ON fluxion.ai_systems FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_systems.organization_id
        AND role IN ('admin', 'dpo', 'technical', 'editor')
    )
  );

-- DELETE: solo admin puede eliminar (soft delete preferible)
CREATE POLICY "org_admin_delete"
  ON fluxion.ai_systems FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM fluxion.organization_members
      WHERE user_id = auth.uid()
        AND organization_id = fluxion.ai_systems.organization_id
        AND role = 'admin'
    )
  );

-- ─── COMENTARIOS DE COLUMNAS ─────────────────────────────────
-- Para que el schema sea autodocumentado y Supabase Studio lo muestre bien

COMMENT ON TABLE  fluxion.ai_systems IS 'Inventario centralizado de sistemas de IA. Cubre AI Act, ISO 42001, RGPD y DORA.';

COMMENT ON COLUMN fluxion.ai_systems.intended_use            IS 'AI Act Art. 11 — Uso previsto documentado, obligatorio para sistemas de alto riesgo.';
COMMENT ON COLUMN fluxion.ai_systems.aiact_risk_level        IS 'Clasificación de riesgo según Reglamento (UE) 2024/1689. Calculada por el agente y revisable por el DPO.';
COMMENT ON COLUMN fluxion.ai_systems.aiact_obligations       IS 'Lista de artículos y obligaciones aplicables según la clasificación AI Act.';
COMMENT ON COLUMN fluxion.ai_systems.processes_personal_data IS 'RGPD Art. 4 — Determina si aplica todo el régimen de protección de datos personales.';
COMMENT ON COLUMN fluxion.ai_systems.special_categories      IS 'RGPD Art. 9 — Categorías especiales de datos. Requieren base legal explícita y medidas reforzadas.';
COMMENT ON COLUMN fluxion.ai_systems.dpia_completed          IS 'RGPD Art. 35 — Estado de la DPIA: si, proceso o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_tech_doc            IS 'AI Act Art. 11 + Anexo IV — Documentación técnica completa. Obligatoria para sistemas de alto riesgo.';
COMMENT ON COLUMN fluxion.ai_systems.has_logging             IS 'AI Act Art. 12 — Estado del logging: si, parcial o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_human_oversight     IS 'AI Act Art. 14 — Estado de supervisión humana: si, parcial o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_risk_assessment     IS 'AI Act Art. 9 + ISO 42001 §6.1 — Estado de la evaluación de riesgos: si, proceso o no.';
COMMENT ON COLUMN fluxion.ai_systems.has_adversarial_test    IS 'AI Act Art. 15 — Precisión, robustez y ciberseguridad. Pruebas frente a manipulación o uso malicioso.';
COMMENT ON COLUMN fluxion.ai_systems.critical_providers      IS 'DORA Art. 28 — Proveedores TIC que prestan servicios críticos. Deben gestionarse y registrarse formalmente.';
COMMENT ON COLUMN fluxion.ai_systems.iso_42001_score         IS 'Score de madurez 0-100 calculado automáticamente por el agente según ISO 42001.';
COMMENT ON COLUMN fluxion.ai_systems.iso_42001_checks        IS 'Snapshot JSON de checks ISO 42001, pesos y puntos obtenidos en el momento de guardado.';
COMMENT ON COLUMN fluxion.ai_systems.is_gpai                 IS 'AI Act Art. 3(63) y Art. 51-53 — Modelo de IA de propósito general (GPT, Claude, Llama...).';
COMMENT ON COLUMN fluxion.ai_systems.prohibited_practice     IS 'AI Act Art. 5 — Si TRUE, el sistema no puede desplegarse en la UE. Activa alerta crítica.';
