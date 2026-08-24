-- ============================================================================
-- El rol en la cadena de valor
-- ============================================================================
-- El Reglamento reparte obligaciones por ROL, no por sector. Un banco, un
-- hospital y una aseguradora pueden ser proveedor, responsable del despliegue o
-- importador segun que hagan con cada sistema.
--
-- Ese dato no existia. Lo mas parecido era `ai_systems.provider_origin`
-- —interno, proveedor, saas, oss— pero eso dice DE DONDE VIENE el sistema, no
-- que papel juega la organizacion frente a la norma. Se parecen y no son lo
-- mismo: se puede usar un sistema `saas` y ser proveedor a efectos del
-- Reglamento si se le pone la propia marca.
--
-- Sin este dato, el inventario ampliado de obligaciones le enseñaria a un
-- responsable del despliegue las obligaciones del importador.
--
-- ⚠️ Art. 25: un responsable del despliegue PASA A SER proveedor si pone su
-- marca en el sistema, lo modifica sustancialmente o cambia su finalidad
-- prevista. Por eso el rol va por SISTEMA y no por organizacion, y por eso es un
-- dato revisable y no una suposicion.
-- ============================================================================


DO $$ BEGIN
  CREATE TYPE fluxion.value_chain_role AS ENUM (
    'provider',                  -- proveedor
    'deployer',                  -- responsable del despliegue
    'importer',                  -- importador
    'distributor',               -- distribuidor
    'authorised_representative'  -- representante autorizado
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── El rol de cada sistema ──────────────────────────────────────────────────
--
-- Array y no valor unico: desarrollar un sistema y usarlo internamente es ser
-- proveedor Y responsable del despliegue a la vez, y es el caso mas comun en
-- las organizaciones que construyen su propia IA.

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS value_chain_roles fluxion.value_chain_role[]
    NOT NULL DEFAULT '{}';

COMMENT ON COLUMN fluxion.ai_systems.value_chain_roles IS
  'Papel de la organizacion frente a este sistema concreto. Determina que '
  'obligaciones del Reglamento le aplican. Vacio = sin declarar.';


-- Semilla desde `provider_origin`, que es la mejor pista que hay hoy:
--   interno            -> se construye en casa: proveedor y desplegador
--   proveedor/saas/oss -> se usa algo de terceros: desplegador
--
-- Es una PROPUESTA, no una verdad. El Art. 25 puede convertir cualquiera de los
-- segundos en proveedor, y eso solo lo sabe quien conoce el sistema. Por eso la
-- interfaz tiene que pedir confirmacion en lugar de dar esto por bueno.

UPDATE fluxion.ai_systems
   SET value_chain_roles = CASE
         WHEN provider_origin = 'interno'
           THEN ARRAY['provider', 'deployer']::fluxion.value_chain_role[]
         ELSE ARRAY['deployer']::fluxion.value_chain_role[]
       END
 WHERE cardinality(value_chain_roles) = 0;


-- ── A quien obliga cada articulo ────────────────────────────────────────────

ALTER TABLE compliance.obligations
  ADD COLUMN IF NOT EXISTS applies_to_roles fluxion.value_chain_role[]
    NOT NULL DEFAULT '{}';

COMMENT ON COLUMN compliance.obligations.applies_to_roles IS
  'Roles a los que obliga este articulo. Vacio = aplica a cualquiera (las '
  'obligaciones de ISO 42001 son de la organizacion, no de un rol).';

UPDATE compliance.obligations o
   SET applies_to_roles = v.roles
  FROM (VALUES
    ('AI-ACT-ART9', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART10', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART11', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART12', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART13', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART14', ARRAY['provider', 'deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART15', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART16', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART27', ARRAY['deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART72', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART4', ARRAY['provider', 'deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART5', ARRAY['provider', 'deployer', 'importer', 'distributor', 'authorised_representative']::fluxion.value_chain_role[]),
    ('AI-ACT-ART6', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART8', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART17', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART18', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART19', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART20', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART21', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART22', ARRAY['authorised_representative']::fluxion.value_chain_role[]),
    ('AI-ACT-ART23', ARRAY['importer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART24', ARRAY['distributor']::fluxion.value_chain_role[]),
    ('AI-ACT-ART25', ARRAY['provider', 'importer', 'distributor', 'deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART26', ARRAY['deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART40', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART43', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART47', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART48', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART49', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART50', ARRAY['provider', 'deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART53', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART54', ARRAY['authorised_representative']::fluxion.value_chain_role[]),
    ('AI-ACT-ART55', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART73', ARRAY['provider']::fluxion.value_chain_role[]),
    ('AI-ACT-ART86', ARRAY['deployer']::fluxion.value_chain_role[]),
    ('AI-ACT-ART87', ARRAY['provider', 'deployer', 'importer', 'distributor', 'authorised_representative']::fluxion.value_chain_role[])
  ) AS v(code, roles)
 WHERE o.code = v.code;


-- ── Que obligaciones aplican a cada sistema ─────────────────────────────────
--
-- Cruce de dos condiciones: el ROL de la organizacion frente al sistema y el
-- ALCANCE del articulo segun su clasificacion.
--
-- ⚠️ El alcance `transparency` (Art. 50) es una aproximacion. Ese articulo
-- depende del TIPO de sistema —si conversa con personas, si genera contenido
-- sintetico, si reconoce emociones—, no de su nivel de riesgo, y ese dato no se
-- captura todavia. Se muestra para riesgo limitado y alto, que es donde casi
-- siempre aplica, pero puede sobrar o faltar. Queda marcado como condicional
-- para que nadie lo lea como un veredicto.

CREATE OR REPLACE VIEW compliance.v_system_obligations
WITH (security_invoker = true) AS
SELECT
  s.id            AS ai_system_id,
  s.organization_id,
  o.code,
  o.framework,
  o.article,
  o.title,
  o.scope,
  o.applies_to_roles,
  -- Por que aplica, para poder explicarlo sin abrir el codigo.
  CASE
    WHEN o.framework <> 'AI_ACT'                   THEN 'Sistema de gestion'
    WHEN cardinality(o.applies_to_roles) = 0       THEN 'Aplica a cualquier rol'
    ELSE 'Rol: ' || array_to_string(o.applies_to_roles::text[], ', ')
  END AS motivo,
  (o.scope = 'transparency') AS condicional
FROM fluxion.ai_systems s
JOIN compliance.obligations o
  ON (
       -- ISO 42001 obliga a la organizacion, no a un rol del Reglamento.
       o.framework <> 'AI_ACT'
       OR cardinality(o.applies_to_roles) = 0
       OR o.applies_to_roles && s.value_chain_roles
     )
 AND (
       o.scope IS NULL
       OR o.scope = 'all'
       OR (o.scope = 'high_risk'    AND s.aiact_risk_level = 'high')
       OR (o.scope = 'gpai'         AND (s.is_gpai OR s.aiact_risk_level = 'gpai'))
       OR (o.scope = 'transparency' AND s.aiact_risk_level IN ('limited', 'high', 'gpai'))
     );

COMMENT ON VIEW compliance.v_system_obligations IS
  'Obligaciones aplicables a cada sistema, cruzando el rol de la organizacion '
  'con el alcance del articulo. `condicional` marca las que dependen de datos '
  'que todavia no se capturan.';

GRANT SELECT ON compliance.v_system_obligations TO authenticated, service_role;
