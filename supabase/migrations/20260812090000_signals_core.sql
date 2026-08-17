-- ============================================================================
-- fluxion.signals — espina dorsal de la plataforma modular
-- ============================================================================
-- Toda observación que un módulo hace sobre un sistema de IA entra por aquí:
-- deriva de datos, degradación de calidad de un RAG, descubrimiento de un
-- modelo no inventariado, coste disparado, discordancia humana.
--
-- El objetivo del diseño es que los módulos no inventen cada uno su propio
-- ciclo de vida ni su propia interfaz. Un módulo publica una señal; el Core
-- decide qué hacer con ella (historial, notificación, tarea) según su gravedad.
--
-- Lo que NO es esta tabla: un almacén de telemetría. Las trazas, los lotes de
-- inferencia y los spans viven en el plano de datos (PostgreSQL 18.4). Aquí solo
-- llega la conclusión: "el PSI de esta característica superó el umbral".
-- ============================================================================

CREATE TABLE fluxion.signals (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Nullable a propósito: hay señales de ámbito organización que no cuelgan de
  -- ningún sistema (un escaneo de Shadow AI, una alerta de coste agregado).
  system_id        uuid        REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL,

  -- Procedencia
  source_module    text        NOT NULL,   -- 'connector-mlflow', 'drift-monitor', 'telemetry'…
  source_ref       text,                   -- identificador en el sistema de origen
  api_key_id       uuid        REFERENCES fluxion.api_keys(id) ON DELETE SET NULL,

  -- Qué se observó. `signal_type` es texto libre y no un enum: cada módulo nuevo
  -- traerá tipos nuevos, y no queremos una migración por cada uno.
  signal_type      text        NOT NULL,   -- 'drift.data', 'quality.faithfulness'…
  severity         text        NOT NULL
                     CHECK (severity IN ('info','low','medium','high','critical')),
  title            text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  summary          text,

  -- Métrica que disparó la señal. Nullable: no todas son numéricas.
  metric_name      text,
  metric_value     numeric,
  threshold        numeric,

  payload          jsonb       NOT NULL DEFAULT '{}',

  -- Cuándo ocurrió según el origen, frente a cuándo lo recibimos. Un auditor
  -- pregunta cuándo se produjo la deriva, no cuándo se enteró la plataforma.
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now(),

  -- Ciclo de vida
  status           text        NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','acknowledged','actioned','dismissed')),
  acknowledged_at  timestamptz,
  acknowledged_by  uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  dismissed_reason text,

  -- Tarea generada por la señal, si la gravedad lo exigió
  task_id          uuid        REFERENCES fluxion.tasks(id) ON DELETE SET NULL,

  -- Idempotencia. Un job de drift horario generaría 24 señales al día de la
  -- misma condición; con una clave estable el segundo envío no hace nada.
  -- Es opcional: en PostgreSQL varios NULL no colisionan en un índice único,
  -- así que una señal sin clave siempre se inserta.
  dedupe_key       text,

  CONSTRAINT uq_signals_dedupe UNIQUE (organization_id, dedupe_key)
);

COMMENT ON TABLE fluxion.signals IS
  'Observaciones publicadas por los módulos. Punto de entrada único: cada señal '
  'puede derivar en evento de historial, notificación o tarea según su gravedad.';

COMMENT ON COLUMN fluxion.signals.dedupe_key IS
  'Clave de idempotencia elegida por el módulo emisor. Convención: '
  '<modulo>:<recurso>:<periodo>, p.ej. drift:sys-abc:feature-edad:2026-08-12.';

COMMENT ON COLUMN fluxion.signals.occurred_at IS
  'Momento del hecho según el sistema de origen. created_at es la recepción.';

-- ── Índices ─────────────────────────────────────────────────────────────────

-- Listado principal: señales de una organización por fecha
CREATE INDEX idx_signals_org_created
  ON fluxion.signals (organization_id, created_at DESC);

-- Bandeja de pendientes: solo las que aún requieren atención
CREATE INDEX idx_signals_org_open
  ON fluxion.signals (organization_id, severity, created_at DESC)
  WHERE status IN ('new', 'acknowledged');

-- Cronología de un sistema concreto
CREATE INDEX idx_signals_system
  ON fluxion.signals (system_id, created_at DESC)
  WHERE system_id IS NOT NULL;

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.signals ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier miembro de la organización
CREATE POLICY signals_select ON fluxion.signals
  FOR SELECT
  USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Gestión (acusar recibo, descartar): roles con responsabilidad sobre riesgo
CREATE POLICY signals_update ON fluxion.signals
  FOR UPDATE
  USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY[
          'org_admin'::fluxion.org_role,
          'sgai_manager'::fluxion.org_role,
          'caio'::fluxion.org_role,
          'risk_analyst'::fluxion.org_role,
          'system_owner'::fluxion.org_role
        ])
    )
  );

-- No hay política de INSERT para `authenticated` a propósito: las señales solo
-- entran por /api/ingest/v1/signals, autenticado con clave API y escribiendo
-- con service_role. Un usuario del navegador no debe poder fabricar señales.

-- ── Grants ──────────────────────────────────────────────────────────────────

GRANT SELECT, UPDATE ON fluxion.signals TO authenticated;
GRANT ALL            ON fluxion.signals TO service_role;

-- ── tasks: admitir origen 'signal' ──────────────────────────────────────────
-- El CHECK actual no lo contempla, así que el despachador no podría crear la
-- tarea de una señal crítica.

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;

ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual', 'treatment_action', 'gap', 'evaluation',
    'fmea_item', 'gap_group', 'signal'
  ));
