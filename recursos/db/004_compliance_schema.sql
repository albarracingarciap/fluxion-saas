-- =========================================================================
-- FLUXION SAAS — MODULE COMPLIANCE (CATÁLOGO MAESTRO)
-- =========================================================================
-- Descripción: Catálogo normativo de plataforma. Solo lectura para tenants.
-- Mantenido y actualizado por Fluxion. No contiene datos de usuario.

CREATE SCHEMA IF NOT EXISTS compliance;

-- 1. MARCOS NORMATIVOS (Frameworks)
CREATE TABLE compliance.frameworks (
  id TEXT PRIMARY KEY,                       -- Ej: 'ai_act', 'iso_42001', 'gdpr'
  name TEXT NOT NULL,
  version TEXT,
  description TEXT,
  rag_namespace TEXT NOT NULL,               -- Vincula con rag.documents
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. REQUISITOS (Requirements)
CREATE TABLE compliance.requirements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id TEXT REFERENCES compliance.frameworks(id) ON DELETE CASCADE,
  article_ref TEXT NOT NULL,                 -- Ej: 'Art. 10(1)'
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  applies_to_role TEXT[] DEFAULT '{all}',    -- provider, deployer, all
  applies_to_risk_level TEXT[] DEFAULT '{all}', -- Ej: high, unacceptable...
  activation_conditions JSONB DEFAULT '{}',  -- Reglas complejas cruzadas con atributos del sistema
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. CONTROLES PLANTILLA (Control Templates)
-- Medidas agnósticas a la norma. Un mismo control puede cubrir varios requirements.
CREATE TABLE compliance.control_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,                 -- Ej: 'SGAI-01', 'TECH-04'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  area TEXT,                                 -- Governance, Technical, Data, Security
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. MAPEOS (Requirement <-> Control)
-- Cruce n:m para el modelo multi-norma.
CREATE TABLE compliance.requirement_control_mappings (
  requirement_id UUID REFERENCES compliance.requirements(id) ON DELETE CASCADE,
  control_template_id UUID REFERENCES compliance.control_templates(id) ON DELETE CASCADE,
  is_sufficient_alone BOOLEAN DEFAULT false, -- Si este control por sí solo cumple la norma
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (requirement_id, control_template_id)
);

-- -------------------------------------------------------------------------
-- CATALOGO FMEA (Gestión de Riesgos)
-- -------------------------------------------------------------------------

-- 5. DIMENSIONES DE RIESGO
CREATE TABLE compliance.risk_dimensions (
  id TEXT PRIMARY KEY,                       -- tecnica, seguridad, etica, gobernanza, roi, legal_b
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  display_order INTEGER NOT NULL
);

-- 6. MODOS DE FALLO (Failure Modes Catalog)
CREATE TABLE compliance.failure_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_id TEXT REFERENCES compliance.risk_dimensions(id),
  code TEXT UNIQUE NOT NULL,                 -- Ej: 'TEC-001'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  bloque TEXT NOT NULL,
  subcategoria TEXT NOT NULL,
  tipo TEXT NOT NULL,
  -- Metodología R.I.D.E. pre-evaluada (Inmutable)
  r_value INTEGER NOT NULL CHECK (r_value BETWEEN 0 AND 3),
  i_value INTEGER NOT NULL CHECK (i_value BETWEEN 0 AND 3),
  d_value INTEGER NOT NULL CHECK (d_value BETWEEN 0 AND 3),
  e_value INTEGER NOT NULL CHECK (e_value BETWEEN 0 AND 3),
  w_calculated NUMERIC(4,2) NOT NULL,
  s_default INTEGER NOT NULL CHECK (s_default BETWEEN 2 AND 9),
  
  -- Activador
  activation_conditions JSONB DEFAULT '{}',
  rag_chunk_ids TEXT[] DEFAULT '{}',         -- Vínculo a contexto RAG
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. RELACIONES CAUSALES (Semilla de Grafos)
CREATE TABLE compliance.failure_mode_causal_relations (
  source_fm_id UUID REFERENCES compliance.failure_modes(id) ON DELETE CASCADE,
  target_fm_id UUID REFERENCES compliance.failure_modes(id) ON DELETE CASCADE,
  relation_type TEXT,                        -- Ej: 'causa_directa', 'agravante', 'prerrequisito'
  explanation TEXT NOT NULL,
  activation_conditions JSONB DEFAULT '{}',
  confidence_level NUMERIC(3,2) DEFAULT 1.0,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (source_fm_id, target_fm_id)
);

-- SEGURIDAD: Schema enteramente de solo lectura para los tenants
ALTER TABLE compliance.frameworks ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.control_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.requirement_control_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.risk_dimensions ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.failure_modes ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance.failure_mode_causal_relations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "catálogo público para lectura autenticada" ON compliance.frameworks FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.requirements FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.control_templates FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.requirement_control_mappings FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.risk_dimensions FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.failure_modes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "catálogo público para lectura autenticada" ON compliance.failure_mode_causal_relations FOR SELECT USING (auth.role() = 'authenticated');
