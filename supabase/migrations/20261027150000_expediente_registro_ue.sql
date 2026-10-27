-- ============================================================================
-- Expediente: registro en la base de datos de la UE (B16b, DP-06 y DP-11)
-- ============================================================================
--   La ficha para el registro UE deja de ser un informe aparte y pasa a ser una
--   plantilla del expediente (`eu_registry`) con los datos del Anexo VIII:
--     - sección A, proveedor de un sistema de alto riesgo (Art. 49.1);
--     - sección B, proveedor que aplica la excepción del Art. 6.3 (Art. 49.2);
--     - sección C, responsable del despliegue que es autoridad pública (Art. 49.3).
--   Cada documento muestra solo la sección que corresponde al sistema; la decide
--   la aplicación (`documentApplicability`).
--
--   Aprobación por defecto: el Responsable del SGAI, como el Anexo IV. Las
--   organizaciones que ya existen la reciben si ninguna política activa de
--   documentos cubre la plantilla.
--
--   Lectura del AI Act pendiente de revisión jurídica (DP-11). Idempotente.
-- ============================================================================

-- ── 1. Clave de plantilla y alcance ─────────────────────────────────────────

ALTER TABLE fluxion.document_templates
  DROP CONSTRAINT IF EXISTS document_templates_key_check;
ALTER TABLE fluxion.document_templates
  ADD CONSTRAINT document_templates_key_check
  CHECK (key IN ('annex_iv', 'model_card', 'fria', 'dpia', 'approval_minutes', 'aisia', 'eu_registry'));

ALTER TABLE fluxion.documents
  DROP CONSTRAINT IF EXISTS chk_documents_system_scope;
ALTER TABLE fluxion.documents
  ADD CONSTRAINT chk_documents_system_scope
  CHECK (template_key NOT IN ('annex_iv', 'aisia', 'eu_registry') OR ai_system_id IS NOT NULL);


-- ── 2. Plantilla ────────────────────────────────────────────────────────────

INSERT INTO fluxion.document_templates
  (organization_id, key, version, title, description, framework, validity_months, sections, is_active)
VALUES (
  NULL, 'eu_registry', 1,
  'Ficha para el registro UE (Anexo VIII)',
  'AI Act, Art. 49 y Anexo VIII. Datos de la organización y del sistema para su registro en la base de datos de la UE, en la sección que corresponde: proveedor de alto riesgo, excepción del Art. 6.3 o autoridad pública que despliega.',
  'ai_act', 12,
  $json$[
 {
  "ref": "VIII.A",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "Sección A · Proveedor de un sistema de alto riesgo",
  "guidance": "Datos que el proveedor registra antes de introducir en el mercado o poner en servicio un sistema de alto riesgo del Anexo III (AI Act, Art. 49.1)."
 },
 {
  "ref": "VIII.A.1",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Proveedor: nombre, dirección y datos de contacto",
  "guidance": "Sale de los datos de la organización (Organización › Datos legales). Añade el contacto para la autoridad."
 },
 {
  "ref": "VIII.A.2",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Persona que registra en nombre del proveedor",
  "guidance": "Nombre, dirección y contacto, si el registro lo presenta otra persona."
 },
 {
  "ref": "VIII.A.3",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Representante autorizado",
  "guidance": "Nombre, dirección y contacto, cuando proceda."
 },
 {
  "ref": "VIII.A.4",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Nombre comercial y referencia del sistema",
  "guidance": "Nombre comercial y cualquier referencia inequívoca que permita identificarlo y rastrearlo. Sale de la ficha."
 },
 {
  "ref": "VIII.A.5",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Finalidad prevista, componentes y funciones",
  "guidance": "Descripción de la finalidad prevista y de los componentes y funciones del sistema. Sale de la ficha; complétala si hace falta."
 },
 {
  "ref": "VIII.A.6",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Información que utiliza y lógica de funcionamiento",
  "guidance": "Descripción básica y concisa de los datos o entradas que utiliza el sistema y de su lógica de funcionamiento."
 },
 {
  "ref": "VIII.A.7",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Situación del sistema",
  "guidance": "En el mercado o en servicio; ya no se introduce en el mercado o no está en servicio; retirado. Sale del estado del sistema."
 },
 {
  "ref": "VIII.A.8",
  "kind": "field",
  "required": false,
  "source": "derived:system",
  "title": "Certificado del organismo notificado",
  "guidance": "Tipo, número y fecha de caducidad del certificado, y nombre o número de identificación del organismo notificado, cuando proceda."
 },
 {
  "ref": "VIII.A.9",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Copia escaneada del certificado",
  "guidance": "Cuando proceda. Adjúntala como evidencia del sistema e indica aquí su referencia."
 },
 {
  "ref": "VIII.A.10",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Estados miembros",
  "guidance": "Estados miembros en los que el sistema se ha introducido en el mercado, puesto en servicio o comercializado en la Unión."
 },
 {
  "ref": "VIII.A.11",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Copia de la declaración UE de conformidad",
  "guidance": "Declaración del Art. 47. Adjúntala como evidencia del sistema e indica aquí su referencia."
 },
 {
  "ref": "VIII.A.12",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Instrucciones de uso en formato electrónico",
  "guidance": "No se exige para los sistemas de alto riesgo de los ámbitos de garantía del cumplimiento del Derecho, migración, asilo y control fronterizo (Anexo III, puntos 1, 6 y 7)."
 },
 {
  "ref": "VIII.A.13",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Dirección URL con información adicional",
  "guidance": "Opcional."
 },
 {
  "ref": "VIII.B",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "Sección B · Proveedor que aplica la excepción del Art. 6.3",
  "guidance": "Datos que registra el proveedor que considera que su sistema del Anexo III no es de alto riesgo (AI Act, Art. 49.2)."
 },
 {
  "ref": "VIII.B.1",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Proveedor: nombre, dirección y datos de contacto",
  "guidance": "Sale de los datos de la organización."
 },
 {
  "ref": "VIII.B.2",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Persona que registra en nombre del proveedor",
  "guidance": "Nombre, dirección y contacto, si el registro lo presenta otra persona."
 },
 {
  "ref": "VIII.B.3",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Representante autorizado",
  "guidance": "Nombre, dirección y contacto, cuando proceda."
 },
 {
  "ref": "VIII.B.4",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Nombre comercial y referencia del sistema",
  "guidance": "Sale de la ficha."
 },
 {
  "ref": "VIII.B.5",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Finalidad prevista",
  "guidance": "Sale de la ficha."
 },
 {
  "ref": "VIII.B.6",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Condiciones del Art. 6.3 que se cumplen",
  "guidance": "Sale de los supuestos AI Act del sistema."
 },
 {
  "ref": "VIII.B.7",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Resumen de los motivos",
  "guidance": "Breve resumen de los motivos por los que el sistema no se considera de alto riesgo en aplicación del Art. 6.3."
 },
 {
  "ref": "VIII.B.8",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Situación del sistema",
  "guidance": "Sale del estado del sistema."
 },
 {
  "ref": "VIII.B.9",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Estados miembros",
  "guidance": "Estados miembros en los que el sistema se ha introducido en el mercado, puesto en servicio o comercializado."
 },
 {
  "ref": "VIII.C",
  "kind": "heading",
  "required": true,
  "source": "manual",
  "title": "Sección C · Responsable del despliegue que es autoridad pública",
  "guidance": "Datos que registra el responsable del despliegue que es autoridad pública, órgano u organismo de la Unión, o actúa en su nombre (AI Act, Art. 49.3)."
 },
 {
  "ref": "VIII.C.1",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "Responsable del despliegue: nombre, dirección y datos de contacto",
  "guidance": "Sale de los datos de la organización."
 },
 {
  "ref": "VIII.C.2",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Persona que registra en nombre del responsable del despliegue",
  "guidance": "Nombre, dirección y contacto, si el registro lo presenta otra persona."
 },
 {
  "ref": "VIII.C.3",
  "kind": "field",
  "required": true,
  "source": "derived:system",
  "title": "URL de la entrada del sistema en la base de datos de la UE",
  "guidance": "La entrada que registró el proveedor. Sale de la documentación del proveedor adjunta como «Número o ficha de registro»."
 },
 {
  "ref": "VIII.C.4",
  "kind": "field",
  "required": true,
  "source": "manual",
  "title": "Resumen de la evaluación de impacto en los derechos fundamentales",
  "guidance": "Resumen de las conclusiones de la FRIA (Art. 27)."
 },
 {
  "ref": "VIII.C.5",
  "kind": "field",
  "required": false,
  "source": "manual",
  "title": "Resumen de la evaluación de impacto relativa a la protección de datos",
  "guidance": "Resumen de la DPIA (RGPD, Art. 35), cuando proceda."
 }
]$json$::jsonb,
  true
)
ON CONFLICT DO NOTHING;


-- ── 3. Políticas de aprobación ──────────────────────────────────────────────

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
                  AND p.conditions -> 'template_key' ? 'eu_registry'))
    );

    INSERT INTO fluxion.approval_policies (organization_id, object_type, name, conditions, author_can_approve, is_active, is_default)
    VALUES (o.id, 'document', 'Expediente · Ficha para el registro UE', '{"template_key": ["eu_registry"]}'::jsonb, false, true, true)
    RETURNING id INTO v_policy;

    INSERT INTO fluxion.approval_policy_steps (policy_id, position, approver_type, approver_ref, quorum, allow_delegation, fallback_role)
    VALUES (v_policy, 1, 'role', 'sgai_manager', NULL, true, NULL);
  END LOOP;
END;
$$;
