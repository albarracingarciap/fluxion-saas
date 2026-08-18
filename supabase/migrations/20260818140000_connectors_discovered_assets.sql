-- ============================================================================
-- fluxion.discovered_assets — cola de conciliación de descubrimientos
-- ============================================================================
-- Los conectores encuentran cosas: modelos en MLflow, repositorios usando
-- librerías de IA, endpoints de inferencia. Nada de eso entra directamente al
-- inventario.
--
-- En una herramienta de cumplimiento, un inventario que se autopuebla no es
-- evidencia de nada: alguien tiene que declarar que ese modelo ES uno de sus
-- sistemas de IA, o que no lo es y por qué. Esta tabla es esa cola de decisión.
--
-- El descubrimiento tiene ciclo de vida (pendiente → vinculado / ignorado), a
-- diferencia de una señal, que es un evento inmutable. Por eso es tabla propia
-- y no un tipo de señal.
-- ============================================================================

CREATE TABLE fluxion.discovered_assets (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  connection_id    uuid        REFERENCES fluxion.connector_connections(id) ON DELETE SET NULL,

  source_module    text        NOT NULL,   -- 'connector-mlflow', 'shadow-ai'…
  asset_type       text        NOT NULL,   -- 'model', 'repository', 'endpoint'…

  -- Identificador en el sistema de origen. Es la clave de reconciliación: el
  -- conector reenvía todo en cada pasada y esto evita duplicar.
  external_id      text        NOT NULL,
  external_url     text,

  name             text        NOT NULL,
  description      text,
  metadata         jsonb       NOT NULL DEFAULT '{}',

  first_seen_at    timestamptz NOT NULL DEFAULT now(),
  last_seen_at     timestamptz NOT NULL DEFAULT now(),

  -- pending  → nadie ha decidido todavía
  -- linked   → es este sistema del inventario
  -- ignored  → no es un sistema de IA nuestro, o no procede
  status           text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'linked', 'ignored')),

  linked_system_id uuid        REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL,
  ignore_reason    text,
  resolved_by      uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  resolved_at      timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_discovered_asset UNIQUE (organization_id, source_module, external_id),

  -- Un descubrimiento vinculado tiene que decir a qué. Sin esto se podría
  -- marcar como resuelto sin resolver nada.
  CONSTRAINT chk_linked_has_system
    CHECK (status <> 'linked' OR linked_system_id IS NOT NULL)
);

COMMENT ON TABLE fluxion.discovered_assets IS
  'Activos encontrados por los conectores, pendientes de conciliar contra el '
  'inventario. Nada entra en ai_systems sin decisión humana explícita.';

COMMENT ON COLUMN fluxion.discovered_assets.external_id IS
  'Identificador estable en el origen (nombre del modelo registrado, ruta del '
  'repositorio…). Clave de reconciliación entre pasadas del conector.';

CREATE INDEX idx_discovered_pending
  ON fluxion.discovered_assets (organization_id, status, last_seen_at DESC);

CREATE INDEX idx_discovered_system
  ON fluxion.discovered_assets (linked_system_id)
  WHERE linked_system_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.discovered_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY discovered_assets_select ON fluxion.discovered_assets
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Conciliar es decidir qué entra en el inventario: mismos roles que pueden
-- crear sistemas.
CREATE POLICY discovered_assets_update ON fluxion.discovered_assets
  FOR UPDATE USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY[
          'org_admin'::fluxion.org_role,
          'sgai_manager'::fluxion.org_role,
          'caio'::fluxion.org_role,
          'risk_analyst'::fluxion.org_role,
          'compliance_analyst'::fluxion.org_role
        ])
    )
  );

-- Sin política de INSERT: los descubrimientos solo entran por
-- /api/ingest/v1/discoveries, con clave API y service_role.

GRANT SELECT, UPDATE ON fluxion.discovered_assets TO authenticated;
GRANT ALL            ON fluxion.discovered_assets TO service_role;
