-- ============================================================================
-- AI Act: el Art. 26 por apartados y fecha de exigibilidad (B17a)
-- ============================================================================
--   Informe del flujo de trabajo (docs/producto/informe-flujo-trabajo-ia.md): el
--   catálogo trataba el Art. 26 como una sola obligación genérica y las
--   obligaciones concretas del responsable del despliegue no se veían. Se divide
--   como el Art. 50 en B13d:
--     - once obligaciones, una por apartado (26.1, 26.2 y 26.4 a 26.12), para el
--       responsable del despliegue de un sistema de alto riesgo;
--     - cuatro con supuesto propio (RN-O08): 26.7 trabajadores (Anexo III,
--       punto 4), 26.8 autoridad pública (Art. 49.3), 26.10 identificación
--       biométrica remota (Anexo III, punto 1.a) y 26.11 personas afectadas
--       (Anexo III, salvo el punto 2);
--     - la fila del Art. 26 queda retirada; se conservan las obligaciones ya
--       registradas con ella;
--     - las sugerencias guardadas de los sistemas (`ai_systems.aiact_obligations`)
--       cambian la etiqueta del Art. 26 por las de sus apartados que aplican.
--   Además, `compliance.obligations.applies_from`: fecha desde la que la
--   obligación es exigible. Vacía hasta la revisión jurídica (decisión 3 del
--   informe).
--
--   Lectura del AI Act pendiente de revisión jurídica. Idempotente.
-- ============================================================================

-- ── 1. Fecha de exigibilidad ────────────────────────────────────────────────

ALTER TABLE compliance.obligations
  ADD COLUMN IF NOT EXISTS applies_from date;

COMMENT ON COLUMN compliance.obligations.applies_from IS
  'Fecha desde la que la obligación es exigible (calendario de aplicación del Reglamento). Nula: sin fecha confirmada; pendiente de revisión jurídica (B17a).';


-- ── 2. El Art. 26 por apartados ─────────────────────────────────────────────

INSERT INTO compliance.obligations (code, framework, article, title, description, scope, applies_to_roles)
SELECT v.code, 'AI_ACT', v.article, v.title, v.description, 'high_risk', '{deployer}'::fluxion.value_chain_role[]
  FROM (VALUES
    ('AI-ACT-ART26-1', 'Art. 26.1',
     'Uso conforme a las instrucciones',
     'El responsable del despliegue adopta medidas técnicas y organizativas adecuadas para utilizar el sistema con arreglo a las instrucciones de uso que lo acompañan.'),
    ('AI-ACT-ART26-2', 'Art. 26.2',
     'Supervisión humana por personas competentes',
     'Encomienda la supervisión humana a personas físicas con la competencia, la formación y la autoridad necesarias, y les presta el apoyo necesario.'),
    ('AI-ACT-ART26-4', 'Art. 26.4',
     'Datos de entrada pertinentes y representativos',
     'En la medida en que ejerza control sobre los datos de entrada, se asegura de que son pertinentes y suficientemente representativos en vista de la finalidad prevista del sistema.'),
    ('AI-ACT-ART26-5', 'Art. 26.5',
     'Vigilancia del funcionamiento e información al proveedor',
     'Vigila el funcionamiento del sistema según las instrucciones de uso e informa al proveedor conforme al Art. 72. Si considera que el uso puede presentar un riesgo, informa sin demora al proveedor o al distribuidor y a la autoridad de vigilancia del mercado y suspende el uso. Si detecta un incidente grave, informa de inmediato primero al proveedor y después al importador o distribuidor y a la autoridad.'),
    ('AI-ACT-ART26-6', 'Art. 26.6',
     'Conservación de los registros generados automáticamente',
     'Conserva los archivos de registro que el sistema genere automáticamente, en la medida en que estén bajo su control, durante un periodo adecuado a la finalidad prevista y de al menos seis meses, salvo que el Derecho de la Unión o nacional disponga otra cosa.'),
    ('AI-ACT-ART26-7', 'Art. 26.7',
     'Información a los trabajadores y sus representantes',
     'Antes de poner en servicio o utilizar un sistema de alto riesgo en el lugar de trabajo, el responsable del despliegue que sea empleador informa a los representantes de los trabajadores y a los trabajadores afectados de que estarán expuestos a su utilización.'),
    ('AI-ACT-ART26-8', 'Art. 26.8',
     'Registro de la autoridad pública que despliega',
     'El responsable del despliegue que sea autoridad pública, o institución, órgano u organismo de la Unión, cumple las obligaciones de registro del Art. 49. Si el sistema que pretende utilizar no está registrado en la base de datos de la UE, no lo utiliza e informa al proveedor o al distribuidor.'),
    ('AI-ACT-ART26-9', 'Art. 26.9',
     'Información del proveedor en la evaluación de impacto de protección de datos',
     'Cuando proceda, utiliza la información facilitada conforme al Art. 13 para cumplir su obligación de realizar una evaluación de impacto relativa a la protección de datos (RGPD, Art. 35).'),
    ('AI-ACT-ART26-10', 'Art. 26.10',
     'Identificación biométrica remota en diferido',
     'El responsable del despliegue de un sistema de identificación biométrica remota en diferido en el marco de una investigación penal solicita autorización judicial o administrativa, documenta cada uso y presenta informes anuales a la autoridad de vigilancia del mercado y a la autoridad de protección de datos.'),
    ('AI-ACT-ART26-11', 'Art. 26.11',
     'Información a las personas afectadas por las decisiones',
     'El responsable del despliegue de un sistema de alto riesgo del Anexo III que tome o ayude a tomar decisiones relativas a personas físicas les informa de que están expuestas a su utilización.'),
    ('AI-ACT-ART26-12', 'Art. 26.12',
     'Cooperación con las autoridades competentes',
     'Coopera con las autoridades competentes en cualquier medida que adopten en relación con el sistema de alto riesgo para aplicar el Reglamento.')
  ) AS v(code, article, title, description)
 WHERE NOT EXISTS (SELECT 1 FROM compliance.obligations o WHERE o.code = v.code);

-- Los tipos de evidencia del Art. 26 valen para cada apartado.
INSERT INTO compliance.obligation_evidence_types (obligation_id, evidence_type_id, requirement_level, notes)
SELECT n.id, et.evidence_type_id, et.requirement_level, et.notes
  FROM compliance.obligations n
  JOIN compliance.obligations o ON o.code = 'AI-ACT-ART26'
  JOIN compliance.obligation_evidence_types et ON et.obligation_id = o.id
 WHERE n.code IN ('AI-ACT-ART26-1', 'AI-ACT-ART26-2', 'AI-ACT-ART26-4', 'AI-ACT-ART26-5', 'AI-ACT-ART26-6', 'AI-ACT-ART26-7', 'AI-ACT-ART26-8', 'AI-ACT-ART26-9', 'AI-ACT-ART26-10', 'AI-ACT-ART26-11', 'AI-ACT-ART26-12')
   AND NOT EXISTS (
     SELECT 1 FROM compliance.obligation_evidence_types x
      WHERE x.obligation_id = n.id AND x.evidence_type_id = et.evidence_type_id
   );


-- ── 3. Vista de obligaciones por sistema (RN-O08) ───────────────────────────
--
-- Misma lógica que `suggestObligations` (apps/web/lib/ai-act/obligations.ts).

DROP VIEW IF EXISTS compliance.v_system_obligations;

CREATE VIEW compliance.v_system_obligations
WITH (security_invoker = true) AS
WITH s AS (
  SELECT
    s.id,
    s.organization_id,
    s.value_chain_roles AS roles,
    s.aiact_result AS r,
    s.aiact_risk_level::text AS lvl,
    coalesce(s.aiact_scope, CASE WHEN s.aiact_risk_level IS NULL THEN 'pending' ELSE 'in_scope' END) AS ambito,
    coalesce((s.aiact_result -> 'gpai' ->> 'modelProvider')::boolean, s.is_gpai, false) AS proveedor_gpai,
    coalesce(s.aiact_result -> 'gpai' ->> 'systemicRisk', s.gpai_systemic_risk) AS riesgo_sistemico,
    (s.aiact_inputs ->> 'publicBody')::boolean AS organismo_publico,
    CASE WHEN s.aiact_result -> 'highRiskRoute' ->> 'annex' = 'III'
         THEN ARRAY(SELECT jsonb_array_elements_text(s.aiact_result -> 'highRiskRoute' -> 'points'))
         ELSE ARRAY[]::text[] END AS anexo_iii,
    (s.aiact_result -> 'highRiskRoute' ->> 'annex' = 'I'
       AND s.aiact_result -> 'highRiskRoute' ->> 'section' = 'B') AS anexo_i_b
  FROM fluxion.ai_systems s
)
SELECT
  s.id            AS ai_system_id,
  s.organization_id,
  o.code,
  o.framework,
  o.article,
  o.title,
  o.scope,
  o.applies_to_roles,
  -- Por qué aplica, para poder explicarlo sin abrir el código.
  CASE
    WHEN o.framework <> 'AI_ACT'                   THEN 'Sistema de gestión'
    WHEN cardinality(o.applies_to_roles) = 0       THEN 'Aplica a cualquier rol'
    ELSE 'Rol: ' || array_to_string(o.applies_to_roles::text[], ', ')
  END AS motivo,
  -- Sin resultado del motor (sistema sin reclasificar desde B13a), las
  -- obligaciones de transparencia y de la excepción del Art. 6.3 son una
  -- aproximación por nivel.
  (o.framework = 'AI_ACT' AND s.r IS NULL
     AND (o.scope = 'transparency' OR o.code IN ('AI-ACT-ART6-4', 'AI-ACT-ART27', 'AI-ACT-ART26-7', 'AI-ACT-ART26-8', 'AI-ACT-ART26-11'))) AS condicional
FROM s
JOIN compliance.obligations o ON o.retired_at IS NULL
WHERE
  -- ISO 42001 obliga a la organización, no a un rol del Reglamento.
  o.framework <> 'AI_ACT'
  OR (
    s.ambito = 'in_scope'
    -- El Art. 5 se sugiere con práctica prohibida aunque no haya rol declarado.
    AND (o.code = 'AI-ACT-ART5' OR cardinality(o.applies_to_roles) = 0 OR o.applies_to_roles && s.roles)
    AND CASE
      -- RN-O05: práctica prohibida → solo el Art. 5.
      WHEN s.lvl = 'prohibited' THEN o.code = 'AI-ACT-ART5'
      WHEN o.code = 'AI-ACT-ART5' THEN false
      -- RN-O07: excepción del Art. 6.3 válida y rol Proveedor.
      WHEN o.code = 'AI-ACT-ART6-4' THEN
        CASE WHEN s.r IS NULL THEN false
             ELSE s.r ->> 'art63' = 'valid' AND 'provider' = ANY (s.roles) END
      -- RN-O06: FRIA solo en los supuestos del Art. 27.1.
      WHEN o.code = 'AI-ACT-ART27' THEN
        s.lvl = 'high' AND 'deployer' = ANY (s.roles)
        AND CASE WHEN s.r IS NULL THEN true
                 ELSE EXISTS (SELECT 1 FROM unnest(s.anexo_iii) p WHERE p <> '2')
                      AND (s.organismo_publico IS TRUE OR s.anexo_iii && ARRAY['5b', '5c']) END
      -- RN-O08 (B17a): apartados del Art. 26 con supuesto propio.
      WHEN o.code = 'AI-ACT-ART26-7' THEN   -- trabajadores: empleo (Anexo III, punto 4)
        s.lvl = 'high' AND CASE WHEN s.r IS NULL THEN true ELSE s.anexo_iii && ARRAY['4a', '4b'] END
      WHEN o.code = 'AI-ACT-ART26-8' THEN   -- autoridad pública: registro (Art. 49.3)
        s.lvl = 'high' AND s.organismo_publico IS TRUE
        AND CASE WHEN s.r IS NULL THEN true ELSE EXISTS (SELECT 1 FROM unnest(s.anexo_iii) p WHERE p <> '2') END
      WHEN o.code = 'AI-ACT-ART26-10' THEN  -- identificación biométrica remota (Anexo III, punto 1.a)
        s.lvl = 'high' AND s.r IS NOT NULL AND s.anexo_iii && ARRAY['1a']
      WHEN o.code = 'AI-ACT-ART26-11' THEN  -- personas afectadas: Anexo III salvo el punto 2
        s.lvl = 'high' AND CASE WHEN s.r IS NULL THEN true ELSE EXISTS (SELECT 1 FROM unnest(s.anexo_iii) p WHERE p <> '2') END
      -- RN-O03: cada apartado del Art. 50 según su supuesto y su obligado.
      WHEN o.scope = 'transparency' THEN
        CASE WHEN s.r IS NULL THEN s.lvl IN ('limited', 'high')
             ELSE EXISTS (
               SELECT 1 FROM jsonb_array_elements(coalesce(s.r -> 'transparency', '[]'::jsonb)) t
                WHERE 'AI-ACT-ART' || replace(t ->> 'article', '.', '-') = o.code
                  AND (t ->> 'obligated') = ANY (s.roles::text[])
             ) END
      -- RN-O01
      WHEN o.scope = 'all' THEN true
      -- RN-O02. Anexo I Sección B: revisión manual (RN-H04).
      WHEN o.scope = 'high_risk' THEN s.lvl = 'high' AND NOT coalesce(s.anexo_i_b, false)
      -- RN-O04: Art. 55 solo con riesgo sistémico.
      WHEN o.scope = 'gpai' THEN
        s.proveedor_gpai AND (o.code <> 'AI-ACT-ART55' OR s.riesgo_sistemico = 'yes')
      -- Sin alcance reconocido: el motor no la sugiere.
      ELSE false
    END
  );

COMMENT ON VIEW compliance.v_system_obligations IS
  'Obligaciones aplicables a cada sistema según RN-O01 a RN-O08 (B13d, B17a), con la misma lógica que el motor '
  '(lib/ai-act/obligations.ts). `condicional` marca las que se aproximan por nivel porque el sistema aún '
  'no tiene resultado del motor.';

GRANT SELECT ON compliance.v_system_obligations TO authenticated, service_role;


-- ── 4. Sugerencias guardadas y retirada del Art. 26 ─────────────────────────

-- Antes de retirarla: los sistemas que tenían sugerido el Art. 26 pasan a tener
-- los apartados que les aplican, en orden.
UPDATE fluxion.ai_systems s
   SET aiact_obligations = array_remove(s.aiact_obligations, a.etiqueta)
       || coalesce((
            SELECT array_agg(v.article || ' — ' || v.title
                             ORDER BY (regexp_replace(v.code, '^AI-ACT-ART26-', ''))::int)
              FROM compliance.v_system_obligations v
             WHERE v.ai_system_id = s.id AND v.code LIKE 'AI-ACT-ART26-%'
          ), '{}')
  FROM (SELECT article || ' — ' || title AS etiqueta
          FROM compliance.obligations WHERE code = 'AI-ACT-ART26') a
 WHERE a.etiqueta = ANY (s.aiact_obligations);

UPDATE compliance.obligations
   SET retired_at = coalesce(retired_at, now()),
       title = 'Obligaciones de los responsables del despliegue (dividida en 26.1 a 26.12)'
 WHERE code = 'AI-ACT-ART26';
