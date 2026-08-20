-- ─────────────────────────────────────────────────────────────────────────────
-- A2 · Detección de Shadow AI
--
-- El inventario se rellena con lo que la organización SABE que tiene; las
-- obligaciones aplican a lo que tiene de verdad. La diferencia es el Shadow AI:
-- el script con `openai` en el requirements.txt que nunca pasó por gobierno.
--
-- Reutiliza la espina que ya existe: connector_connections para la conexión,
-- discovered_assets para el repositorio candidato —que ya contemplaba
-- source_module = 'shadow-ai' desde agosto— y signals para lo urgente.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Tipos de conector y de autenticación ─────────────────────────────────────

ALTER TABLE fluxion.connector_connections
  DROP CONSTRAINT IF EXISTS connector_connections_connector_type_check;

ALTER TABLE fluxion.connector_connections
  ADD CONSTRAINT connector_connections_connector_type_check
  CHECK (connector_type IN ('mlflow', 'github', 'gitlab'));

ALTER TABLE fluxion.connector_connections
  DROP CONSTRAINT IF EXISTS connector_connections_auth_type_check;

ALTER TABLE fluxion.connector_connections
  ADD CONSTRAINT connector_connections_auth_type_check
  CHECK (auth_type IN ('none', 'basic', 'token'));

COMMENT ON COLUMN fluxion.connector_connections.auth_type IS
  'none | basic | token. Para GitHub y GitLab, siempre token de SOLO LECTURA: el escáner no necesita más y una credencial que no puede escribir no puede ser usada para escribir.';

-- ── Hallazgos ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fluxion.shadow_ai_findings (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  discovered_asset_id uuid NOT NULL REFERENCES fluxion.discovered_assets(id) ON DELETE CASCADE,

  -- Qué se encontró
  finding_type text NOT NULL
                 CHECK (finding_type IN ('library', 'endpoint', 'credential', 'model_file')),
  category     text NOT NULL
                 CHECK (category IN ('llm', 'ml', 'vector_db', 'provider', 'secret', 'other')),

  -- El patrón que casó: 'langchain', 'api.openai.com'. NUNCA el valor
  -- encontrado si es una credencial.
  pattern      text NOT NULL,

  -- Dónde. Ruta y línea bastan para ir a mirarlo; el fragmento de código NO se
  -- almacena. Un almacén de trozos de código ajeno con claves dentro es
  -- exactamente el objetivo que busca un atacante.
  file_path    text NOT NULL,
  line_number  integer,

  severity     text NOT NULL DEFAULT 'info'
                 CHECK (severity IN ('info', 'low', 'medium', 'high', 'critical')),

  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at  timestamptz NOT NULL DEFAULT now(),

  -- Desapareció del repositorio. No se borra la fila: queda el rastro de que
  -- estuvo, que es justo lo que un auditor pregunta sobre una credencial
  -- expuesta. Pero deja de contar.
  resolved_at   timestamptz,

  metadata      jsonb NOT NULL DEFAULT '{}'::jsonb,

  CONSTRAINT uq_shadow_finding
    UNIQUE (discovered_asset_id, finding_type, pattern, file_path, line_number)
);

CREATE INDEX IF NOT EXISTS idx_shadow_findings_asset
  ON fluxion.shadow_ai_findings (discovered_asset_id, severity, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_shadow_findings_abiertos
  ON fluxion.shadow_ai_findings (organization_id, severity, last_seen_at DESC)
  WHERE resolved_at IS NULL;

COMMENT ON TABLE fluxion.shadow_ai_findings IS
  'Por qué el escáner cree que un repositorio contiene IA. Sin esta lista, el módulo solo puede afirmar; con ella, alguien puede confirmarlo o descartarlo en diez segundos.';

COMMENT ON COLUMN fluxion.shadow_ai_findings.pattern IS
  'El patrón que casó, no lo encontrado. En hallazgos de tipo credential el valor se descarta entero: ni completo, ni truncado, ni en hash.';

-- ── Resumen por repositorio ──────────────────────────────────────────────────

CREATE OR REPLACE VIEW fluxion.v_shadow_ai_summary
WITH (security_invoker = true) AS
SELECT d.id                AS discovered_asset_id,
       d.organization_id,
       d.name              AS repositorio,
       d.external_url,
       d.status,
       d.last_seen_at,
       count(f.*) FILTER (WHERE f.resolved_at IS NULL)                          AS hallazgos,
       count(f.*) FILTER (WHERE f.resolved_at IS NULL
                            AND f.finding_type = 'credential')                  AS credenciales,
       count(f.*) FILTER (WHERE f.resolved_at IS NULL
                            AND f.finding_type = 'library')                     AS librerias,
       -- max() sobre texto ordena alfabeticamente, y ahi 'medium' sale mayor que
       -- 'critical': el panel diria "medio" con una credencial expuesta dentro.
       -- Se ordena por rango explicito y se devuelve la etiqueta.
       (ARRAY['info','low','medium','high','critical'])[
         max(CASE f.severity
               WHEN 'critical' THEN 5 WHEN 'high' THEN 4
               WHEN 'medium'   THEN 3 WHEN 'low'  THEN 2
               ELSE 1 END)
         FILTER (WHERE f.resolved_at IS NULL)
       ]                                                                        AS severidad_max
  FROM fluxion.discovered_assets d
  LEFT JOIN fluxion.shadow_ai_findings f ON f.discovered_asset_id = d.id
 WHERE d.source_module = 'shadow-ai'
 GROUP BY d.id, d.organization_id, d.name, d.external_url, d.status, d.last_seen_at;

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.shadow_ai_findings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS shadow_ai_findings_select ON fluxion.shadow_ai_findings;
CREATE POLICY shadow_ai_findings_select ON fluxion.shadow_ai_findings
  FOR SELECT USING (
    organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
  );

-- La escritura entra por el endpoint de ingesta con service_role, autenticado
-- por clave de API. Ningún navegador escribe hallazgos.
GRANT SELECT ON fluxion.shadow_ai_findings   TO authenticated;
GRANT SELECT ON fluxion.v_shadow_ai_summary  TO authenticated;
GRANT ALL    ON fluxion.shadow_ai_findings   TO service_role;
