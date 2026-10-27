-- ============================================================================
-- Expediente: la AISIA como plantilla (B15a, F-09, DP-04 y DP-05)
-- ============================================================================
--   La evaluación de impacto del sistema de IA (AISIA, ISO/IEC 42001 §6.1.4)
--   pasa a ser una plantilla del expediente documental, con el ciclo, la
--   aprobación, el PDF y la evidencia del expediente:
--     - S1, S2 y S5.a se derivan de la ficha; S3 y S4, de la evaluación de
--       riesgos vigente y de su plan; el resto se redacta.
--     - Política de aprobación por defecto como la de la AISIA del asistente:
--       Comité de IA, con consulta al DPO y el Responsable del SGAI si no hay
--       comité.
--     - Cada organización recibe una copia de sus políticas activas de
--       `aisia_assessment` como política de documentos con plantilla `aisia`,
--       para que la AISIA del expediente se apruebe igual que la del asistente.
--
--   La plantilla se crea INACTIVA: no aparece en el expediente hasta B15b, que
--   migra las AISIA existentes y retira el asistente. Así no conviven dos AISIA.
--
-- Idempotente.
-- ============================================================================

-- ── 1. Clave de plantilla y alcance ─────────────────────────────────────────

ALTER TABLE fluxion.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_key_check;
ALTER TABLE fluxion.document_templates
  ADD CONSTRAINT document_templates_key_check
  CHECK (key IN ('annex_iv', 'model_card', 'fria', 'dpia', 'approval_minutes', 'aisia'));

-- La AISIA es de un sistema, como el Anexo IV.
ALTER TABLE fluxion.documents
  DROP CONSTRAINT IF EXISTS chk_documents_system_scope;
ALTER TABLE fluxion.documents
  ADD CONSTRAINT chk_documents_system_scope
  CHECK (template_key NOT IN ('annex_iv', 'aisia') OR ai_system_id IS NOT NULL);


-- ── 2. Plantilla (inactiva hasta B15b) ──────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections, is_active)
VALUES (
  NULL, 'aisia', 1,
  'Evaluación de impacto del sistema de IA (AISIA)',
  'ISO/IEC 42001, §6.1.4 y controles A.5.2 a A.5.5. Descripción, datos, riesgos y tratamiento salen de la ficha y de la evaluación de riesgos vigente; el impacto en las personas y en la sociedad se redacta.',
  'iso42001', 12,
  $json$[
 {"ref":"AISIA.S1","kind":"heading","required":true,"source":"manual","title":"S1 · Descripción del sistema","guidance":"Qué hace el sistema, para qué y en qué contexto se despliega. ISO/IEC 42001, §6.1.4."},
 {"ref":"AISIA.S1.a","kind":"field","required":true,"source":"derived:system","title":"Finalidad, usos y funcionamiento","guidance":"Sale de la ficha del sistema. Corrígela allí si no es exacta."},
 {"ref":"AISIA.S1.b","kind":"field","required":false,"source":"manual","title":"Contexto de despliegue y tecnología","guidance":"Dónde y cómo se usa el sistema, quién lo opera y con qué tecnología."},
 {"ref":"AISIA.S2","kind":"heading","required":true,"source":"manual","title":"S2 · Datos","guidance":"Qué datos usa el sistema y cómo se gobiernan."},
 {"ref":"AISIA.S2.a","kind":"field","required":true,"source":"derived:system","title":"Datos personales y categorías","guidance":"Sale de la ficha del sistema."},
 {"ref":"AISIA.S2.b","kind":"field","required":false,"source":"manual","title":"Fuentes y calidad de los datos","guidance":"De dónde proceden los datos, qué medidas de calidad se aplican y, si la hay, qué dice la DPIA."},
 {"ref":"AISIA.S3","kind":"heading","required":true,"source":"manual","title":"S3 · Riesgos","guidance":"Los riesgos del sistema, según su análisis de modos de fallo."},
 {"ref":"AISIA.S3.a","kind":"field","required":true,"source":"derived:fmea","title":"Modos de fallo evaluados","guidance":"Sale de la evaluación de riesgos vigente del sistema: zona y modos con severidad actual 7 o más."},
 {"ref":"AISIA.S3.b","kind":"field","required":false,"source":"manual","title":"Resumen y riesgos adicionales","guidance":"Lectura de los riesgos para este sistema y riesgos que el análisis no recoge."},
 {"ref":"AISIA.S4","kind":"heading","required":true,"source":"manual","title":"S4 · Tratamiento","guidance":"Cómo se tratan los riesgos y qué riesgo queda."},
 {"ref":"AISIA.S4.a","kind":"field","required":true,"source":"derived:fmea","title":"Plan de tratamiento","guidance":"Sale del plan de tratamiento de la evaluación vigente."},
 {"ref":"AISIA.S4.b","kind":"field","required":false,"source":"manual","title":"Riesgo residual y seguimiento","guidance":"Riesgo residual que se asume y cómo se vigila el sistema en funcionamiento."},
 {"ref":"AISIA.S5","kind":"heading","required":true,"source":"manual","title":"S5 · Impacto en las personas","guidance":"Impacto del sistema en las personas y en sus derechos."},
 {"ref":"AISIA.S5.a","kind":"field","required":true,"source":"derived:system","title":"Personas y colectivos afectados","guidance":"La ficha dice si afecta a personas, a colectivos vulnerables o a menores. Completa quiénes son."},
 {"ref":"AISIA.S5.b","kind":"field","required":true,"source":"manual","title":"Derechos afectados","guidance":"Qué derechos fundamentales pueden verse afectados y cómo."},
 {"ref":"AISIA.S5.c","kind":"field","required":true,"source":"manual","title":"Gravedad y probabilidad del impacto","guidance":"Gravedad (baja, media, alta o crítica), probabilidad (baja, media o alta) y descripción del impacto."},
 {"ref":"AISIA.S5.d","kind":"field","required":true,"source":"manual","title":"Salvaguardas","guidance":"Medidas que protegen a las personas afectadas."},
 {"ref":"AISIA.S6","kind":"heading","required":true,"source":"manual","title":"S6 · Impacto social","guidance":"Impacto del sistema en la sociedad y conclusión de la evaluación."},
 {"ref":"AISIA.S6.a","kind":"field","required":true,"source":"manual","title":"Impacto social y riesgo de sesgo","guidance":"Efectos en la sociedad y valoración del riesgo de sesgo."},
 {"ref":"AISIA.S6.b","kind":"field","required":false,"source":"manual","title":"Consideraciones ambientales","guidance":"Consumo de recursos y otros efectos ambientales relevantes."},
 {"ref":"AISIA.S6.c","kind":"field","required":false,"source":"manual","title":"Implicaciones sociales amplias y consulta a partes interesadas","guidance":"Efectos a largo plazo y a quién se ha consultado."},
 {"ref":"AISIA.S6.d","kind":"field","required":true,"source":"manual","title":"Conclusión","guidance":"Conclusión de la evaluación de impacto."}
]$json$::jsonb,
  false
)
ON CONFLICT DO NOTHING;


-- ── 3. Políticas por defecto ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.add_default_consultations(p_policy_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER
SET search_path = fluxion, public
AS $$
DECLARE
  v_pol  record;
  v_tipo text;
  v_ref  text;
  v_cond jsonb := '{}'::jsonb;
BEGIN
  SELECT id, object_type::text AS object_type, conditions INTO v_pol
    FROM fluxion.approval_policies WHERE id = p_policy_id AND is_default;
  IF v_pol.id IS NULL THEN RETURN; END IF;

  IF v_pol.object_type = 'aisia_assessment'
     OR (v_pol.object_type = 'document' AND v_pol.conditions -> 'template_key' ?| ARRAY['fria', 'dpia', 'aisia']) THEN
    v_tipo := 'role'; v_ref := 'dpo';
  ELSIF v_pol.object_type = 'treatment_plan' AND v_pol.conditions -> 'approval_level' ?| ARRAY['level_1', 'level_2'] THEN
    v_tipo := 'function'; v_ref := 'ciso';
    v_cond := '{"has_security_controls": ["true"]}'::jsonb;
  ELSE
    RETURN;
  END IF;

  -- Ya añadida, o la política se ha editado (más de un paso): no se toca.
  IF (SELECT count(*) FROM fluxion.approval_policy_steps WHERE policy_id = p_policy_id) <> 1 THEN
    RETURN;
  END IF;

  UPDATE fluxion.approval_policy_steps SET position = position + 1 WHERE policy_id = p_policy_id;
  INSERT INTO fluxion.approval_policy_steps
    (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, kind, condition)
  VALUES
    (p_policy_id, 1, v_tipo::fluxion.approval_approver_type, v_ref, NULL, true, 'consultation', v_cond);
END;
$$;

REVOKE ALL ON FUNCTION fluxion.add_default_consultations(uuid) FROM PUBLIC, anon, authenticated;


CREATE OR REPLACE FUNCTION fluxion.seed_default_approval_policies(p_organization_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER
SET search_path = fluxion, public
AS $$
DECLARE
  d        record;
  v_policy uuid;
  v_n      integer := 0;
BEGIN
  FOR d IN
    SELECT * FROM (VALUES
      ('treatment_plan',   'Plan de tratamiento · Nivel 1 (DP-01)', '{"approval_level": ["level_1"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('treatment_plan',   'Plan de tratamiento · Nivel 2 (DP-01)', '{"approval_level": ["level_2"]}'::jsonb, 'committee_type', 'risk_committee',  'sgai_manager'),
      ('treatment_plan',   'Plan de tratamiento · Nivel 3 (DP-01)', '{"approval_level": ["level_3"]}'::jsonb, 'committee_type', 'director_review', 'executive'),
      ('aisia_assessment', 'Evaluación AISIA (DP-01)',               '{}'::jsonb,                             'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · Anexo IV (DP-01)',          '{"template_key": ["annex_iv"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('document',         'Expediente · FRIA (DP-01)',              '{"template_key": ["fria"]}'::jsonb,     'committee_type', 'ai_committee',    'sgai_manager'),
      ('document',         'Expediente · DPIA (DP-01)',              '{"template_key": ["dpia"]}'::jsonb,     'function',       'data_controller', 'sgai_manager'),
      ('document',         'Expediente · Ficha del modelo',          '{"template_key": ["model_card"]}'::jsonb, 'role',         'sgai_manager',    NULL),
      ('document',         'Expediente · AISIA (DP-01)',             '{"template_key": ["aisia"]}'::jsonb,    'committee_type', 'ai_committee',    'sgai_manager'),
      ('soa',              'Declaración de Aplicabilidad (DP-01)',   '{}'::jsonb,                             'committee_type', 'director_review', 'executive'),
      ('evidence',         'Evidencias (DP-01)',                     '{}'::jsonb,                             'role',           'sgai_manager',    NULL),
      ('gap_disposition',  'Exclusión de gaps (DP-07)',           '{"gap_layer": ["fmea", "normativo"]}'::jsonb, 'role',   'sgai_manager',    NULL)
    ) AS t(object_type, name, conditions, approver_type, approver_ref, fallback_role)
  LOOP
    -- Solo tipos sin ninguna política activa: si la organización ya configuró
    -- el suyo, se respeta.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.approval_policies p
       WHERE p.organization_id = p_organization_id
         AND p.object_type::text = d.object_type
         AND p.is_active
         AND NOT p.is_default
    );
    -- Y sin repetir una ya sembrada.
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.approval_policies p
       WHERE p.organization_id = p_organization_id
         AND p.object_type::text = d.object_type
         AND p.is_active
         AND p.conditions = d.conditions
    );

    INSERT INTO fluxion.approval_policies (organization_id, object_type, name, conditions, author_can_approve, is_active, is_default)
    VALUES (p_organization_id, d.object_type::fluxion.approval_object_type, d.name, d.conditions, false, true, true)
    RETURNING id INTO v_policy;

    INSERT INTO fluxion.approval_policy_steps (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, fallback_role)
    VALUES (v_policy, 1, d.approver_type::fluxion.approval_approver_type, d.approver_ref, NULL, true, d.fallback_role::fluxion.org_role);

    -- B11d: pasos de consulta de DP-01 delante del de aprobación.
    PERFORM fluxion.add_default_consultations(v_policy);

    v_n := v_n + 1;
  END LOOP;

  RETURN v_n;
END;
$$;


-- ── 4. Copia de las políticas de AISIA de cada organización ─────────────────
--   Se copian las políticas activas de `aisia_assessment` (por defecto o
--   configuradas) con sus pasos, como políticas de documentos con
--   `template_key = aisia`. No se copia si la organización ya tiene una política
--   activa de documentos que cubra la plantilla `aisia`.

DO $$
DECLARE
  p        record;
  v_cond   jsonb;
  v_policy uuid;
BEGIN
  FOR p IN
    SELECT * FROM fluxion.approval_policies
     WHERE object_type = 'aisia_assessment' AND is_active
  LOOP
    v_cond := p.conditions || '{"template_key": ["aisia"]}'::jsonb;

    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.approval_policies d
       WHERE d.organization_id = p.organization_id
         AND d.object_type = 'document'
         AND d.is_active
         AND d.conditions -> 'template_key' ? 'aisia'
    );

    INSERT INTO fluxion.approval_policies
      (organization_id, object_type, name, conditions, author_can_approve, is_active, created_by, is_default, expires_after_days)
    VALUES
      (p.organization_id, 'document',
       CASE WHEN p.is_default THEN 'Expediente · AISIA (DP-01)' ELSE 'Expediente · AISIA · ' || p.name END,
       v_cond, p.author_can_approve, true, p.created_by, p.is_default, p.expires_after_days)
    RETURNING id INTO v_policy;

    INSERT INTO fluxion.approval_policy_steps
      (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, fallback_role, kind, condition)
    SELECT v_policy, s.position, s.approver_type, s.approver_ref, s.quorum, s.allow_delegation, s.fallback_role, s.kind, s.condition
      FROM fluxion.approval_policy_steps s
     WHERE s.policy_id = p.id;
  END LOOP;
END;
$$;
