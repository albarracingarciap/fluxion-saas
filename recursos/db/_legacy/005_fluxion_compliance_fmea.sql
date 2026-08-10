-- =========================================================================
-- FLUXION SAAS — MODULE COMPLIANCE & FMEA (TABLAS DEL TENANT)
-- =========================================================================
-- Descripción: Instanciación de los datos del catálogo en la organización concreta.
-- Cada tabla respeta RLS utilizando fluxion.organization_members.

-- TIPOS ENUM EN FLUXION PARA COMPLIANCE
CREATE TYPE fluxion.control_status AS ENUM ('planned', 'partial', 'implemented', 'excluded');
CREATE TYPE fluxion.gap_status AS ENUM ('auto_detected', 'confirmed', 'in_progress', 'resolved', 'accepted_risk', 'not_applicable');
CREATE TYPE fluxion.evaluation_state AS ENUM ('draft', 'in_review', 'approved', 'superseded');
CREATE TYPE fluxion.treatment_action_type AS ENUM ('mitigate', 'accept', 'transfer', 'avoid', 'defer');
CREATE TYPE fluxion.reevaluation_trigger_type AS ENUM ('regulatorio', 'incidente', 'cambio_sistema', 'periodico');

-- -------------------------------------------------------------------------
-- TABLAS DE COMPLIANCE
-- -------------------------------------------------------------------------

-- 1. CONTROLES DE LA ORGANIZACIÓN
-- Instancia organizacional de un compliance.control_templates
CREATE TABLE fluxion.controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  system_id UUID REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE, -- NULL si es control genérico de org
  template_id UUID NOT NULL REFERENCES compliance.control_templates(id),
  status fluxion.control_status NOT NULL DEFAULT 'planned',
  compliance_score NUMERIC(5,2) DEFAULT 0.0, -- para cumplimiento parcial
  owner_id UUID REFERENCES fluxion.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(organization_id, system_id, template_id) -- Deduplicación cross-framework
);

-- 2. EVIDENCIAS
CREATE TABLE fluxion.evidences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  uploaded_by UUID REFERENCES fluxion.profiles(id),
  applies_to_systems UUID[] DEFAULT '{}',
  regulatory_refs TEXT[] DEFAULT '{}',
  valid_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. INTERSECCIÓN DE EVIDENCIA CON CONTROL
CREATE TABLE fluxion.evidence_controls (
  evidence_id UUID REFERENCES fluxion.evidences(id) ON DELETE CASCADE,
  control_id UUID REFERENCES fluxion.controls(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY(evidence_id, control_id)
);

-- 4. BRECHAS / GAPS NORMATIVAS
CREATE TABLE fluxion.gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  system_id UUID REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  requirement_id UUID NOT NULL REFERENCES compliance.requirements(id),
  status fluxion.gap_status NOT NULL DEFAULT 'auto_detected',
  justification TEXT,  -- requerido si status es 'accepted_risk'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------------------------
-- TABLAS DE FMEA (RIESGOS)
-- -------------------------------------------------------------------------

-- 5. CABECERA DE EVALUACIÓN FMEA
CREATE TABLE fluxion.fmea_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  system_id UUID NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  state fluxion.evaluation_state NOT NULL DEFAULT 'draft',
  evaluator_id UUID REFERENCES fluxion.profiles(id),
  approver_id UUID REFERENCES fluxion.profiles(id),
  approved_at TIMESTAMPTZ,
  next_review_at TIMESTAMPTZ,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 6. ITEMS INDIVIDUALES DE LA EVALUACIÓN (Modos de fallo)
CREATE TABLE fluxion.fmea_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID NOT NULL REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE,
  failure_mode_id UUID NOT NULL REFERENCES compliance.failure_modes(id),
  
  -- S default copiado del catálogo para auditoría de cambios
  s_default_frozen INTEGER NOT NULL,
  
  -- Valores ajustados por el responsable
  o_value INTEGER NOT NULL DEFAULT 1 CHECK (o_value BETWEEN 1 AND 5),
  d_real_value INTEGER NOT NULL DEFAULT 1 CHECK (d_real_value BETWEEN 1 AND 5),
  s_actual INTEGER NOT NULL,
  s_residual INTEGER, 
  
  narrative_justification TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 7. PLANES DE TRATAMIENTO
CREATE TABLE fluxion.treatment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID UNIQUE NOT NULL REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES fluxion.profiles(id),
  approved_at TIMESTAMPTZ,
  max_implementation_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 8. ACCIONES DEL PLAN
CREATE TABLE fluxion.treatment_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID NOT NULL REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE,
  fmea_item_id UUID NOT NULL REFERENCES fluxion.fmea_items(id) ON DELETE CASCADE,
  action_type fluxion.treatment_action_type NOT NULL,
  target_s_residual INTEGER NOT NULL,
  owner_id UUID REFERENCES fluxion.profiles(id),
  deadline DATE,
  is_completed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 9. TRIGGERS DE REEVALUACIÓN
CREATE TABLE fluxion.reevaluation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  system_id UUID REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  trigger_type fluxion.reevaluation_trigger_type NOT NULL,
  level_scope TEXT, -- N1, N2, N3
  state TEXT DEFAULT 'detectado',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 10. INSTANCIAS DE GRAFO CAUSAL
CREATE TABLE fluxion.causal_graph_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID UNIQUE NOT NULL REFERENCES fluxion.fmea_evaluations(id) ON DELETE CASCADE,
  graph_nodes JSONB NOT NULL DEFAULT '[]', -- Matriz persistida de los nodos pivote calculados por la app en Python
  created_at TIMESTAMPTZ DEFAULT now()
);

-- -------------------------------------------------------------------------
-- POLÍTICAS DE RLS GLOBALES
-- Garantizan que ningún usuario vea datos de otra organización.
-- La validación base es: organization_id IN (SELECT org_id FROM miembros WHERE user_id = auth.uid())
-- -------------------------------------------------------------------------

ALTER TABLE fluxion.controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.evidences ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.evidence_controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.gaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.fmea_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.fmea_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.treatment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.treatment_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.reevaluation_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.causal_graph_instances ENABLE ROW LEVEL SECURITY;

-- Por practicidad durante el MVP, aplicaremos políticas de lectura a toda la organización.
-- Las escrituras se aplicarán desde Backend usando Role Keys y Service Accounts, salvo que decidamos
-- usar políticas como la del 003_frontend_write_policies.sql.

CREATE POLICY "Miembros pueden ver los controles" ON fluxion.controls FOR SELECT USING (organization_id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Miembros pueden ver evidencias" ON fluxion.evidences FOR SELECT USING (organization_id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Miembros pueden ver gaps" ON fluxion.gaps FOR SELECT USING (organization_id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid()));
CREATE POLICY "Miembros pueden ver headers de riesgos" ON fluxion.fmea_evaluations FOR SELECT USING (organization_id IN (SELECT organization_id FROM fluxion.organization_members WHERE user_id = auth.uid()));
-- (Restantes aplican en cascada al ser foreign keys)
