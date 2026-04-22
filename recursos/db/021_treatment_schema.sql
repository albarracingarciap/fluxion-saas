-- ═══════════════════════════════════════════════════════════════════
-- FLUXION — Schema: treatment_plans + treatment_actions
-- Módulo FMEA · Plan de tratamiento del riesgo
-- ═══════════════════════════════════════════════════════════════════
--
-- MODELO CONCEPTUAL:
--   fmea_evaluations (1) ──→ (1) treatment_plans
--   treatment_plans   (1) ──→ (N) treatment_actions
--   treatment_actions (N) ──→ (1) fmea_items          (modo de fallo evaluado)
--   treatment_actions (N) ──→ (0..1) fluxion.controls  (solo si opción = mitigar)
--
-- DISTINCIÓN CLAVE:
--   treatment_plans   → cabecera del proceso de aprobación
--   treatment_actions → decisión por modo de fallo (qué hacemos con este riesgo)
--   fluxion.controls  → medida de mitigación concreta (solo cuando opción = mitigar)
--   fluxion.evidences → lo que demuestra que el control está implementado
--
-- ═══════════════════════════════════════════════════════════════════


-- ── ENUMS ──────────────────────────────────────────────────────────

CREATE TYPE fluxion.treatment_option AS ENUM (
  'mitigar',      -- implementar control que reduce S_actual → S_residual objetivo
  'aceptar',      -- asumir el riesgo con justificación documentada (solo Zona III/IV)
  'transferir',   -- seguro, SLA con proveedor, contrato con tercero
  'evitar',       -- rediseño o retirada del sistema
  'diferir'       -- aplazamiento justificado con plazo máximo definido
);

CREATE TYPE fluxion.treatment_plan_status AS ENUM (
  'draft',        -- en construcción por el responsable del SGAI
  'in_review',    -- enviado, pendiente de aprobación
  'approved',     -- aprobado por el nivel de autoridad requerido
  'in_progress',  -- aprobado y con acciones en ejecución
  'closed',       -- todas las acciones completadas o aceptadas formalmente
  'superseded'    -- reemplazado por un nuevo plan (reevaluación)
);

CREATE TYPE fluxion.treatment_action_status AS ENUM (
  'pending',      -- acción definida, pendiente de inicio
  'in_progress',  -- owner trabajando en la implementación
  'evidence_pending', -- implementado, esperando carga de evidencia
  'completed',    -- evidencia cargada y verificada → S_actual actualizado
  'accepted',     -- riesgo aceptado formalmente (opción = aceptar)
  'cancelled'     -- cancelada con justificación (por cambio de contexto)
);

CREATE TYPE fluxion.approval_level AS ENUM (
  'level_1',  -- Responsable del SGAI (Zona IV / III)
  'level_2',  -- Responsable SGAI + CRO / Director de Riesgos (Zona II)
  'level_3'   -- Alta dirección con firma en acta de comité (Zona I)
);


-- ── TABLA: treatment_plans ─────────────────────────────────────────
-- Cabecera del plan de tratamiento. Una por evaluación FMEA aprobada.
-- Referencia las cuatro secciones del plan definidas en la metodología
-- (Cap. 23): diagnóstico de partida, acciones priorizadas, riesgo
-- residual asumido, y aprobación y seguimiento.

CREATE TABLE fluxion.treatment_plans (
  id                    uuid                            PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid                            NOT NULL REFERENCES fluxion.organizations(id),
  system_id             uuid                            NOT NULL REFERENCES fluxion.ai_systems(id),
  evaluation_id         uuid                            NOT NULL REFERENCES fluxion.fmea_evaluations(id),

  -- Identificación
  code                  text                            NOT NULL,
    -- Código legible: PTR-{YEAR}-{NNN}, ej. PTR-2026-001
  status                fluxion.treatment_plan_status   NOT NULL DEFAULT 'draft',

  -- Sección 1: diagnóstico de partida (snapshot al crear el plan)
  zone_at_creation      text                            NOT NULL,
    -- 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv'
    -- Zona real del sistema cuando se creó el plan (inmutable)
  zone_target           text,
    -- Zona proyectada si se completan todas las acciones
    -- Calculada sobre los S_residual definidos en treatment_actions
  ai_act_floor          text                            NOT NULL,
    -- Suelo normativo: 'zona_i' | 'zona_ii' | 'zona_iii' | 'zona_iv'
    -- Determina la zona mínima independientemente del FMEA
  s_max_at_creation     smallint                        NOT NULL,
    -- S_actual máximo del sistema al crear el plan (snapshot)
  modes_count_total     smallint                        NOT NULL DEFAULT 0,
    -- Total de modos de fallo activos en la evaluación
  modes_count_zone_i    smallint                        NOT NULL DEFAULT 0,
    -- Modos con S_actual = 9 (zona I individual)
  modes_count_zone_ii   smallint                        NOT NULL DEFAULT 0,
    -- Modos con S_actual = 8

  -- Sección 2: acciones priorizadas
  -- (Las acciones viven en treatment_actions, esta tabla es solo la cabecera)
  actions_total         smallint                        NOT NULL DEFAULT 0,
  actions_completed     smallint                        NOT NULL DEFAULT 0,
  pivot_node_ids        uuid[]                          NOT NULL DEFAULT '{}',
    -- IDs de fmea_items identificados como nodos pivote
    -- Ordenan la priorización de acciones (Cap. 23)

  -- Sección 3: riesgo residual asumido
  residual_risk_notes   text,
    -- Descripción narrativa del riesgo que queda asumido
    -- tras completar todas las acciones del plan
  accepted_risk_count   smallint                        NOT NULL DEFAULT 0,
    -- Número de modos tratados con opción 'aceptar'

  -- Sección 4: aprobación y seguimiento
  approval_level        fluxion.approval_level          NOT NULL,
    -- Determinado automáticamente por zone_at_creation:
    --   zona_i  → level_3 (alta dirección)
    --   zona_ii → level_2 (SGAI + CRO)
    --   zona_iii/iv → level_1 (responsable SGAI)
  approver_id           uuid                            REFERENCES fluxion.profiles(id),
    -- Usuario que aprobó el plan (level_1 o level_2)
    -- Para level_3: se usa approval_committee_notes + approval_minutes_ref
  approved_at           timestamptz,
  approval_minutes_ref  text,
    -- Referencia al acta del comité de alta dirección (solo level_3)
    -- Ej: "Acta Comité Riesgos 2026-05-15"
  approval_committee_notes text,

  -- Plazos
  deadline              date                            NOT NULL,
    -- Plazo máximo global del plan
    -- Zona II: ≤ 90 días desde zone_at_creation
    -- Zona I:  definido por el comité en el acta
  review_cadence        text,
    -- 'monthly' | 'quarterly' | 'biannual' | 'annual'
    -- Adaptativa según zona: I→monthly, II→quarterly, III→biannual, IV→annual

  -- Trazabilidad
  created_by            uuid                            NOT NULL REFERENCES fluxion.profiles(id),
  created_at            timestamptz                     NOT NULL DEFAULT now(),
  updated_at            timestamptz                     NOT NULL DEFAULT now(),

  -- Constraints
  UNIQUE (evaluation_id),
    -- Una evaluación tiene como máximo un plan activo
  CONSTRAINT chk_zone_values CHECK (
    zone_at_creation IN ('zona_i','zona_ii','zona_iii','zona_iv') AND
    ai_act_floor     IN ('zona_i','zona_ii','zona_iii','zona_iv')
  ),
  CONSTRAINT chk_s_max CHECK (s_max_at_creation BETWEEN 1 AND 9),
  CONSTRAINT chk_approval_coherence CHECK (
    -- level_3 siempre requiere acta; level_1/2 pueden no tenerla
    (approval_level = 'level_3' AND (status != 'approved' OR approval_minutes_ref IS NOT NULL))
    OR approval_level IN ('level_1','level_2')
  )
);

COMMENT ON TABLE fluxion.treatment_plans IS
  'Cabecera del plan de tratamiento FMEA. Una por evaluación aprobada. '
  'Implementa las cuatro secciones del Cap. 23 de la metodología Fluxion: '
  'diagnóstico de partida, acciones priorizadas, riesgo residual asumido, aprobación.';

COMMENT ON COLUMN fluxion.treatment_plans.zone_at_creation IS
  'Snapshot inmutable de la zona del sistema al crear el plan. '
  'No se actualiza aunque cambien los S_actual durante la ejecución del plan.';

COMMENT ON COLUMN fluxion.treatment_plans.zone_target IS
  'Zona proyectada si se completan todas las acciones con sus S_residual objetivo. '
  'Se recalcula cuando cambian los S_residual en treatment_actions. '
  'No puede ser inferior al ai_act_floor.';

COMMENT ON COLUMN fluxion.treatment_plans.approval_level IS
  'Determinado automáticamente por zone_at_creation. '
  'level_1: Zona III/IV → solo responsable SGAI. '
  'level_2: Zona II → SGAI + CRO. '
  'level_3: Zona I → alta dirección con firma en acta de comité.';


-- ── TABLA: treatment_actions ───────────────────────────────────────
-- Una acción por cada modo de fallo que requiere tratamiento.
-- El evaluador decide qué hacer con cada modo (las 5 opciones).
-- Solo la opción 'mitigar' genera un control en fluxion.controls.

CREATE TABLE fluxion.treatment_actions (
  id                    uuid                              PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid                              NOT NULL REFERENCES fluxion.organizations(id),
  plan_id               uuid                              NOT NULL REFERENCES fluxion.treatment_plans(id) ON DELETE CASCADE,
  fmea_item_id          uuid                              NOT NULL REFERENCES fluxion.fmea_items(id),
    -- El modo de fallo evaluado al que responde esta acción

  -- Decisión de tratamiento
  option                fluxion.treatment_option          NOT NULL,
  status                fluxion.treatment_action_status   NOT NULL DEFAULT 'pending',

  -- Severidad objetivo (solo relevante si option = 'mitigar')
  s_actual_at_creation  smallint                          NOT NULL,
    -- Snapshot del S_actual del modo cuando se creó la acción
  s_residual_target     smallint,
    -- Objetivo de S_actual tras implementar el control
    -- Requerido si option = 'mitigar'
    -- Debe ser < s_actual_at_creation
  s_residual_achieved   smallint,
    -- S_actual real tras verificar la evidencia
    -- Lo actualiza el sistema cuando la evidencia se verifica

  -- Vinculación al control (solo si option = 'mitigar')
  control_id            uuid                              REFERENCES fluxion.controls(id),
    -- NULL para opciones distintas de 'mitigar'
    -- El control es instancia de compliance.control_templates
    -- Puede ser un control ya existente o uno creado para esta acción

  -- Para opciones sin control ('aceptar', 'transferir', 'evitar', 'diferir')
  justification         text,
    -- 'aceptar': justificación formal de aceptación (obligatoria)
    -- 'transferir': descripción del mecanismo (contrato, seguro, SLA)
    -- 'evitar': plan de rediseño o retirada
    -- 'diferir': razón del aplazamiento y condiciones de revisión
    -- Mínimo 100 caracteres cuando option = 'aceptar'
  evidence_description  text,
    -- Descripción del tipo de evidencia requerida para cerrar esta acción
    -- Ej: "Informe de evaluación diferenciada firmado" (mitigar)
    --     "Contrato con SLA de bias monitoring" (transferir)
    --     "Acta de decisión de retirada del sistema" (evitar)

  -- Responsabilidad y plazos
  owner_id              uuid                              REFERENCES fluxion.profiles(id),
  due_date              date,
  completed_at          timestamptz,

  -- Vinculación a evidencia (cuando se completa)
  evidence_id           uuid                              REFERENCES fluxion.evidences(id),
    -- Evidencia que cierra esta acción
    -- Su verificación actualiza s_residual_achieved y activa
    -- la actualización de S_actual en fmea_items

  -- Para opción 'aceptar': aprobación del nivel correspondiente
  acceptance_approved_by uuid                            REFERENCES fluxion.profiles(id),
  acceptance_approved_at timestamptz,
  review_due_date       date,
    -- Fecha de revisión periódica obligatoria para riesgos aceptados

  created_at            timestamptz                       NOT NULL DEFAULT now(),
  updated_at            timestamptz                       NOT NULL DEFAULT now(),

  -- Constraints de negocio
  UNIQUE (plan_id, fmea_item_id),
    -- Un modo de fallo tiene como máximo una acción por plan

  CONSTRAINT chk_s_residual_valid CHECK (
    option != 'mitigar'
    OR (s_residual_target IS NOT NULL
        AND s_residual_target >= 1
        AND s_residual_target < s_actual_at_creation)
  ),
  CONSTRAINT chk_aceptar_not_zona_i CHECK (
    -- 'aceptar' no está disponible para modos con S_actual = 9
    NOT (option = 'aceptar' AND s_actual_at_creation = 9)
  ),
  CONSTRAINT chk_aceptar_requires_justification CHECK (
    option != 'aceptar'
    OR (justification IS NOT NULL AND length(justification) >= 100)
  ),
  CONSTRAINT chk_control_coherence CHECK (
    -- control_id solo puede existir cuando option = 'mitigar'
    (option = 'mitigar') OR (control_id IS NULL)
  ),
  CONSTRAINT chk_s_actual_range CHECK (
    s_actual_at_creation BETWEEN 1 AND 9
  )
);

COMMENT ON TABLE fluxion.treatment_actions IS
  'Decisión de tratamiento por modo de fallo. Una acción por modo en el plan. '
  'Solo option=mitigar genera un control en fluxion.controls. '
  'Las demás opciones se cierran con justificación + evidencia directa.';

COMMENT ON COLUMN fluxion.treatment_actions.s_residual_target IS
  'S_actual objetivo tras implementar el control. Solo para option=mitigar. '
  'Visible en el plan como proyección hasta que la evidencia se verifica. '
  'NUNCA actualiza fmea_items.s_actual directamente — solo lo hace la '
  'verificación de evidencia a través del módulo de evidencias.';

COMMENT ON COLUMN fluxion.treatment_actions.s_residual_achieved IS
  'S_actual real tras verificar la evidencia. Lo actualiza el sistema '
  'automáticamente cuando evidence_id tiene status=verified. '
  'Puede diferir de s_residual_target si el control fue parcialmente efectivo.';

COMMENT ON COLUMN fluxion.treatment_actions.control_id IS
  'FK a fluxion.controls. Puede ser un control ya existente (creado por el '
  'motor de obligaciones en compliance) o uno nuevo creado para esta acción. '
  'La misma evidencia puede cerrar tanto esta acción como el gap de compliance.';


-- ── ÍNDICES ────────────────────────────────────────────────────────

CREATE INDEX idx_tp_org
  ON fluxion.treatment_plans(organization_id);

CREATE INDEX idx_tp_system
  ON fluxion.treatment_plans(system_id);

CREATE INDEX idx_tp_evaluation
  ON fluxion.treatment_plans(evaluation_id);

CREATE INDEX idx_tp_status
  ON fluxion.treatment_plans(organization_id, status);

CREATE INDEX idx_tp_deadline_overdue
  ON fluxion.treatment_plans(organization_id, deadline)
  WHERE status IN ('draft','in_review','approved','in_progress');

-- Para el cuadro de mando: planes en Zona I con deadline próximo
CREATE INDEX idx_tp_zona_i_active
  ON fluxion.treatment_plans(organization_id, deadline)
  WHERE zone_at_creation = 'zona_i'
    AND status IN ('approved','in_progress');

CREATE INDEX idx_ta_plan
  ON fluxion.treatment_actions(plan_id);

CREATE INDEX idx_ta_fmea_item
  ON fluxion.treatment_actions(fmea_item_id);

CREATE INDEX idx_ta_owner
  ON fluxion.treatment_actions(owner_id)
  WHERE owner_id IS NOT NULL;

CREATE INDEX idx_ta_status
  ON fluxion.treatment_actions(plan_id, status);

-- Para el dashboard de tareas pendientes por usuario
CREATE INDEX idx_ta_pending_by_owner
  ON fluxion.treatment_actions(owner_id, due_date)
  WHERE status IN ('pending','in_progress','evidence_pending')
    AND owner_id IS NOT NULL;

-- Para detectar acciones de riesgo aceptado que requieren revisión
CREATE INDEX idx_ta_acceptance_review
  ON fluxion.treatment_actions(organization_id, review_due_date)
  WHERE option = 'aceptar'
    AND status = 'accepted'
    AND review_due_date IS NOT NULL;


-- ── ROW LEVEL SECURITY ─────────────────────────────────────────────

ALTER TABLE fluxion.treatment_plans    ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.treatment_actions  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_isolation" ON fluxion.treatment_plans
  FOR ALL TO authenticated
  USING (organization_id = fluxion.current_organization_id());

CREATE POLICY "org_isolation" ON fluxion.treatment_actions
  FOR ALL TO authenticated
  USING (organization_id = fluxion.current_organization_id());


-- ── TRIGGERS updated_at ────────────────────────────────────────────

CREATE TRIGGER trg_treatment_plans_updated_at
  BEFORE UPDATE ON fluxion.treatment_plans
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();

CREATE TRIGGER trg_treatment_actions_updated_at
  BEFORE UPDATE ON fluxion.treatment_actions
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_updated_at();


-- ── FUNCIÓN: calcular zone_target ──────────────────────────────────
-- Recalcula la zona proyectada del plan basándose en los S_residual
-- definidos en las acciones de mitigación.
-- Se llama al confirmar/modificar una treatment_action.

CREATE OR REPLACE FUNCTION fluxion.recalculate_plan_zone_target(p_plan_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ai_act_floor  text;
  v_zone_fmea     text := 'zona_iv';
  v_s_max         smallint := 0;
  v_rec           RECORD;
  v_ge8_count     int := 0;
  v_ge8_dims      int := 0;
  v_ge7_count     int := 0;
  v_ge7_dims      int := 0;
  v_ge6_count     int := 0;
  v_ge6_dims      int := 0;
BEGIN
  -- Obtener el suelo AI Act del plan
  SELECT ai_act_floor INTO v_ai_act_floor
  FROM fluxion.treatment_plans WHERE id = p_plan_id;

  -- Calcular S proyectado por ítem:
  --   si tiene acción de mitigar con s_residual_target → usar ese
  --   si no → usar s_actual_at_creation de la acción (sin cambio)
  FOR v_rec IN
    SELECT
      COALESCE(
        CASE WHEN ta.option = 'mitigar' THEN ta.s_residual_target END,
        ta.s_actual_at_creation
      ) AS s_proj,
      fi.dimension
    FROM fluxion.treatment_actions ta
    JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
    WHERE ta.plan_id = p_plan_id
  LOOP
    IF v_rec.s_proj > v_s_max THEN
      v_s_max := v_rec.s_proj;
    END IF;

    IF v_rec.s_proj >= 8 THEN v_ge8_count := v_ge8_count + 1; END IF;
    IF v_rec.s_proj >= 7 THEN v_ge7_count := v_ge7_count + 1; END IF;
    IF v_rec.s_proj >= 6 THEN v_ge6_count := v_ge6_count + 1; END IF;
  END LOOP;

  -- Dimensiones distintas por umbral
  SELECT COUNT(DISTINCT fi.dimension) INTO v_ge8_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option='mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 8;

  SELECT COUNT(DISTINCT fi.dimension) INTO v_ge7_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option='mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 7;

  SELECT COUNT(DISTINCT fi.dimension) INTO v_ge6_dims
  FROM fluxion.treatment_actions ta
  JOIN fluxion.fmea_items fi ON fi.id = ta.fmea_item_id
  WHERE ta.plan_id = p_plan_id
    AND COALESCE(CASE WHEN ta.option='mitigar' THEN ta.s_residual_target END, ta.s_actual_at_creation) >= 6;

  -- Eje 1: S máximo individual
  IF    v_s_max >= 9 THEN v_zone_fmea := 'zona_i';
  ELSIF v_s_max >= 8 THEN v_zone_fmea := 'zona_ii';
  ELSIF v_s_max >= 7 THEN v_zone_fmea := 'zona_iii';
  ELSE                    v_zone_fmea := 'zona_iv';
  END IF;

  -- Eje 2: perfil agregado (toma el más restrictivo)
  IF v_ge8_count >= 3 AND v_ge8_dims >= 2 AND v_zone_fmea = 'zona_iv' THEN
    v_zone_fmea := 'zona_i';
  ELSIF v_ge7_count >= 5 AND v_ge7_dims >= 3 AND v_zone_fmea IN ('zona_iv','zona_iii') THEN
    v_zone_fmea := 'zona_ii';
  ELSIF v_ge6_count >= 8 AND v_ge6_dims >= 2 AND v_zone_fmea = 'zona_iv' THEN
    v_zone_fmea := 'zona_iii';
  END IF;

  -- Aplicar suelo AI Act
  RETURN CASE
    WHEN v_ai_act_floor = 'zona_i'   THEN 'zona_i'
    WHEN v_ai_act_floor = 'zona_ii'  AND v_zone_fmea = 'zona_iv' THEN 'zona_ii'
    WHEN v_ai_act_floor = 'zona_ii'  AND v_zone_fmea = 'zona_iii' THEN 'zona_ii'
    WHEN v_ai_act_floor = 'zona_iii' AND v_zone_fmea = 'zona_iv' THEN 'zona_iii'
    ELSE v_zone_fmea
  END;
END;
$$;

COMMENT ON FUNCTION fluxion.recalculate_plan_zone_target IS
  'Calcula la zona proyectada del plan usando los S_residual objetivo '
  'de las acciones de mitigación. Aplica los mismos dos ejes (máximo '
  'individual + perfil agregado) más el suelo AI Act. '
  'Llamar después de confirmar/modificar cualquier treatment_action.';


-- ── TRIGGER: actualizar zone_target en el plan ─────────────────────

CREATE OR REPLACE FUNCTION fluxion.trigger_update_plan_zone_target()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE fluxion.treatment_plans
  SET
    zone_target       = fluxion.recalculate_plan_zone_target(NEW.plan_id),
    actions_completed = (
      SELECT COUNT(*) FROM fluxion.treatment_actions
      WHERE plan_id = NEW.plan_id
        AND status IN ('completed','accepted')
    ),
    updated_at = now()
  WHERE id = NEW.plan_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_action_updates_plan
  AFTER INSERT OR UPDATE ON fluxion.treatment_actions
  FOR EACH ROW EXECUTE FUNCTION fluxion.trigger_update_plan_zone_target();


-- ── TRIGGER: S_actual ← evidencia verificada ──────────────────────
-- Cuando una treatment_action pasa a 'completed' con evidence_id,
-- actualiza s_residual_achieved y actualiza S_actual en fmea_items.
-- La zona global se recalcula automáticamente desde fmea_evaluations.

CREATE OR REPLACE FUNCTION fluxion.trigger_evidence_closes_action()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo cuando el status pasa a 'completed' con evidencia
  IF NEW.status = 'completed'
     AND NEW.evidence_id IS NOT NULL
     AND OLD.status != 'completed'
  THEN
    -- Actualizar s_residual_achieved desde s_residual_target
    -- (el evaluador puede ajustarlo manualmente antes del cierre)
    IF NEW.s_residual_achieved IS NULL THEN
      NEW.s_residual_achieved := NEW.s_residual_target;
    END IF;

    -- Actualizar S_actual en fmea_items → la zona se recalculará
    IF NEW.option = 'mitigar' AND NEW.s_residual_achieved IS NOT NULL THEN
      UPDATE fluxion.fmea_items
      SET
        s_actual   = NEW.s_residual_achieved,
        updated_at = now()
      WHERE id = NEW.fmea_item_id;
    END IF;

    -- Marcar completed_at
    NEW.completed_at := now();
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_complete_action
  BEFORE UPDATE ON fluxion.treatment_actions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status != 'completed')
  EXECUTE FUNCTION fluxion.trigger_evidence_closes_action();


-- ── VISTA: plan_summary ────────────────────────────────────────────
-- Vista de resumen para el dashboard del responsable del SGAI.

CREATE OR REPLACE VIEW fluxion.plan_summary AS
SELECT
  tp.id,
  tp.organization_id,
  tp.system_id,
  sys.name                    AS system_name,
  sys.code                    AS system_code,
  tp.code                     AS plan_code,
  tp.status,
  tp.zone_at_creation,
  tp.zone_target,
  tp.ai_act_floor,
  tp.approval_level,
  tp.deadline,
  tp.deadline < CURRENT_DATE  AS is_overdue,
  tp.actions_total,
  tp.actions_completed,
  CASE
    WHEN tp.actions_total = 0 THEN 0
    ELSE ROUND(tp.actions_completed::numeric / tp.actions_total * 100)
  END                         AS completion_pct,
  tp.created_at,
  tp.updated_at
FROM fluxion.treatment_plans tp
JOIN fluxion.ai_systems sys ON sys.id = tp.system_id;

COMMENT ON VIEW fluxion.plan_summary IS
  'Vista de resumen de planes de tratamiento para el dashboard. '
  'Incluye porcentaje de avance y flag de vencimiento.';


-- ═══════════════════════════════════════════════════════════════════
-- NOTAS DE IMPLEMENTACIÓN
-- ═══════════════════════════════════════════════════════════════════
--
-- 1. CREACIÓN AUTOMÁTICA DEL PLAN
--    Al llamar a POST /api/fmea/evaluations/{id}/submit, el motor
--    crea automáticamente el treatment_plan con:
--    - zone_at_creation: zona calculada en ese momento
--    - approval_level: derivado de zone_at_creation
--    - deadline: now() + 90 días si Zona II; definido por comité si Zona I
--    - actions_total: count de fmea_items con s_actual >= 7
--    Y crea treatment_actions en status='pending' para cada uno de esos ítems.
--
-- 2. OPCIONES DISPONIBLES POR ZONA
--    La restricción chk_aceptar_not_zona_i garantiza que 'aceptar'
--    no puede usarse para modos con S_actual = 9.
--    El frontend debe deshabilitar el botón 'Aceptar' para esos ítems.
--
-- 3. CONTROL VINCULADO (opción mitigar)
--    Al seleccionar un control del catálogo en la UI:
--    a) Si ya existe fluxion.controls para (system_id, template_id):
--       → usar ese control_id
--    b) Si no existe:
--       → crear fluxion.controls con status='not_started'
--       → usar el nuevo control_id
--    Esto garantiza que el mismo control no se duplica aunque lo
--    activen tanto el motor de obligaciones como el plan de tratamiento.
--
-- 4. CIERRE DE CICLO (evidencia → S_actual)
--    Cuando el owner sube una evidencia y el validador la aprueba:
--    PATCH /api/fmea/actions/{id} → { status: 'completed', evidence_id: ... }
--    El trigger trg_complete_action actualiza fmea_items.s_actual
--    automáticamente. La zona global se recalcula en la siguiente
--    lectura de GET /api/systems/{id}/zone (función pura).
--
-- 5. ALERTAS (integración con n8n)
--    Eventos que deben disparar notificaciones:
--    - plan.deadline < now() + 14 days AND status != 'closed'
--    - treatment_action.due_date < now() AND status = 'pending'
--    - treatment_action.review_due_date < now() + 30 days (para 'aceptar')
--    - plan.zone_at_creation = 'zona_i' AND status = 'draft' > 24h
--
