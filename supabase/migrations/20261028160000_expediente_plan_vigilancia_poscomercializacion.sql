-- ============================================================================
-- Expediente: plan de vigilancia poscomercialización (B26, DP-11)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md,
--   3.7): el proveedor de un sistema de alto riesgo establece y documenta un
--   sistema de vigilancia poscomercialización proporcionado, basado en un plan
--   que recopila, documenta y analiza de forma activa y sistemática los datos
--   del funcionamiento del sistema durante toda su vida útil, también los que
--   facilitan los responsables del despliegue (AI Act, Art. 72). El plan forma
--   parte de la documentación técnica (Anexo IV, punto 9).
--
--   Nueva plantilla del expediente `post_market_plan`. Aplicabilidad (DP-11):
--   la redacta el proveedor de un sistema de alto riesgo. Aprobación por
--   defecto: el Responsable del SGAI, como el Anexo IV.
--
--   El Art. 72.3 prevé un modelo de plan de la Comisión por acto de ejecución;
--   cuando se publique, la plantilla se revisará con una versión nueva.
--
--   Lectura del AI Act pendiente de revisión jurídica (DP-11). Idempotente.
-- ============================================================================

-- ── 1. Clave de plantilla y alcance ─────────────────────────────────────────

ALTER TABLE fluxion.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_key_check;
ALTER TABLE fluxion.document_templates
  ADD CONSTRAINT document_templates_key_check
  CHECK (key IN ('annex_iv', 'model_card', 'fria', 'dpia', 'approval_minutes', 'aisia', 'eu_registry', 'post_market_plan'));

ALTER TABLE fluxion.documents
  DROP CONSTRAINT IF EXISTS chk_documents_system_scope;
ALTER TABLE fluxion.documents
  ADD CONSTRAINT chk_documents_system_scope
  CHECK (template_key NOT IN ('annex_iv', 'aisia', 'eu_registry', 'post_market_plan') OR ai_system_id IS NOT NULL);


-- ── 2. Plantilla ────────────────────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections, is_active)
SELECT
  NULL, 'post_market_plan', 1,
  'Plan de vigilancia poscomercialización',
  'AI Act, Art. 72 y Anexo IV, punto 9. Cómo el proveedor recopila, documenta y analiza los datos del funcionamiento del sistema de alto riesgo durante toda su vida útil, también los que facilitan los responsables del despliegue, y qué hace con los resultados.',
  'ai_act', 12,
  $json$[
 {
  "ref": "PM.1",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "1. Objeto y alcance",
  "guidance": "Para qué sistema y versión se establece el plan, y durante qué periodo de su vida útil (AI Act, Art. 72.1)."
 },
 {
  "ref": "PM.1.1",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Sistema, versión y finalidad prevista",
  "guidance": "Sistema, versión, finalidad prevista y mercados o responsables del despliegue a los que llega."
 },
 {
  "ref": "PM.1.2",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Proporcionalidad",
  "guidance": "Por qué el alcance del plan es proporcionado a la naturaleza de la tecnología y a los riesgos del sistema (Art. 72.1)."
 },
 {
  "ref": "PM.2",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "2. Datos que se recopilan",
  "guidance": "Datos pertinentes sobre el funcionamiento del sistema durante toda su vida útil (Art. 72.2)."
 },
 {
  "ref": "PM.2.1",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Funcionamiento y cumplimiento",
  "guidance": "Precisión, robustez, ciberseguridad y demás indicadores que permiten evaluar el cumplimiento continuo de los requisitos del capítulo III, sección 2."
 },
 {
  "ref": "PM.2.2",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Incidentes, reclamaciones y retroalimentación",
  "guidance": "Incidentes, incidentes graves, reclamaciones de usuarios y personas afectadas, y lo que comunican los responsables del despliegue."
 },
 {
  "ref": "PM.2.3",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Registros generados automáticamente",
  "guidance": "Qué registros del sistema (Art. 12) se usan y cómo se obtienen, cuando estén bajo el control del proveedor."
 },
 {
  "ref": "PM.3",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "3. Fuentes y canales",
  "guidance": "De dónde llegan los datos y por qué canal."
 },
 {
  "ref": "PM.3.1",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Responsables del despliegue y otras fuentes",
  "guidance": "Cómo facilitan datos los responsables del despliegue (Art. 72.2 y 26.5) y qué otras fuentes se usan."
 },
 {
  "ref": "PM.3.2",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Interacción con otros sistemas de IA",
  "guidance": "Cuando proceda, análisis de la interacción con otros sistemas de IA (Art. 72.2)."
 },
 {
  "ref": "PM.4",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "4. Análisis",
  "guidance": "Cómo se analizan los datos de forma activa y sistemática."
 },
 {
  "ref": "PM.4.1",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Métodos, indicadores y umbrales",
  "guidance": "Métodos de análisis, indicadores, umbrales de alerta (deriva, sesgo, degradación) y criterios para actuar."
 },
 {
  "ref": "PM.4.2",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Frecuencia y responsables",
  "guidance": "Cada cuánto se revisan los datos y quién lo hace."
 },
 {
  "ref": "PM.5",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "5. Acciones derivadas",
  "guidance": "Qué se hace con los resultados."
 },
 {
  "ref": "PM.5.1",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Gestión de riesgos y acciones correctoras",
  "guidance": "Cómo los resultados actualizan la gestión de riesgos (Art. 9) y cuándo dan lugar a acciones correctoras (Art. 20)."
 },
 {
  "ref": "PM.5.2",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Incidentes graves y comunicación",
  "guidance": "Cómo se notifican los incidentes graves (Art. 73) y cómo se informa a los responsables del despliegue y, en su caso, a la autoridad."
 },
 {
  "ref": "PM.6",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "6. Integración con otros sistemas de vigilancia",
  "guidance": "Solo si el sistema es un producto del Anexo I, sección A, con su propio sistema de vigilancia poscomercialización (Art. 72.4)."
 },
 {
  "ref": "PM.6.1",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Integración",
  "guidance": "Cómo se integran los elementos de este plan en el sistema y el plan ya existentes de la legislación sectorial."
 }
]$json$::jsonb,
  true
WHERE NOT EXISTS (
  SELECT 1 FROM fluxion.document_templates WHERE organization_id IS NULL AND key = 'post_market_plan' AND version = 1
);


-- ── 3. Políticas de aprobación ──────────────────────────────────────────────
--   Las organizaciones nuevas la reciben al sembrar sus políticas; las que ya
--   existen, aquí, si ninguna política activa de documentos cubre la plantilla.

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
      ('document',         'Expediente · Anexo IV (DP-01)',          '{"template_key": ["annex_iv"]}'::jsonb, 'role',           'sgai_manager',    NULL),
      ('document',         'Expediente · Ficha para el registro UE',               '{"template_key": ["eu_registry"]}'::jsonb, 'role',        'sgai_manager',    NULL),
      ('document',         'Expediente · Plan de vigilancia poscomercialización', '{"template_key": ["post_market_plan"]}'::jsonb, 'role', 'sgai_manager',    NULL),
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

DO $$
DECLARE
  o        record;
  v_policy uuid;
BEGIN
  FOR o IN SELECT id FROM fluxion.organizations LOOP
    -- Cubierta si alguna política activa de documentos no tiene condiciones o
    -- incluye la plantilla (`policyCovers` en la aplicación).
    CONTINUE WHEN EXISTS (
      SELECT 1 FROM fluxion.approval_policies p
       WHERE p.organization_id = o.id
         AND p.object_type = 'document'
         AND p.is_active
         AND (p.conditions = '{}'::jsonb
              OR (p.conditions ?& ARRAY['template_key']
                  AND (SELECT count(*) FROM jsonb_object_keys(p.conditions)) = 1
                  AND p.conditions -> 'template_key' ? 'post_market_plan'))
    );

    INSERT INTO fluxion.approval_policies (organization_id, object_type, name, conditions, author_can_approve, is_active, is_default)
    VALUES (o.id, 'document', 'Expediente · Plan de vigilancia poscomercialización', '{"template_key": ["post_market_plan"]}'::jsonb, false, true, true)
    RETURNING id INTO v_policy;

    INSERT INTO fluxion.approval_policy_steps (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, fallback_role)
    VALUES (v_policy, 1, 'role', 'sgai_manager', NULL, true, NULL);
  END LOOP;
END;
$$;
