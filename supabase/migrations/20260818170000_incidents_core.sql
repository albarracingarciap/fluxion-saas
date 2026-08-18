-- ============================================================================
-- fluxion.ai_incidents — incidentes de IA y reloj de notificación (Art. 73)
-- ============================================================================
-- Hasta ahora Fluxion podía registrar riesgos, modos de fallo y evaluaciones,
-- pero no un hecho: "el 14 de agosto el motor de scoring denegó crédito
-- sistemáticamente a un colectivo durante seis horas".
--
-- Y eso no es una funcionalidad que falte, es un incumplimiento: el artículo 73
-- del Reglamento (UE) 2024/1689 obliga a notificar los incidentes graves a la
-- autoridad de vigilancia del mercado en plazos concretos. Sin registro no hay
-- forma de demostrar que se notificó a tiempo, ni de saber que el plazo corre.
--
-- ── PLAZOS, verificados contra el texto oficial ─────────────────────────────
--
--   Art. 73.2  Régimen general ................................... 15 días
--   Art. 73.3  Infracción generalizada, o incidente grave
--              del Art. 3.49.b (infraestructuras críticas) ......... 2 días
--   Art. 73.4  Fallecimiento de una persona ...................... 10 días
--
-- TODOS se cuentan desde que se TIENE CONOCIMIENTO del incidente, no desde que
-- se establece el nexo causal. La distinción importa: anclarlo al nexo causal
-- permitiría retrasar la obligación retrasando el análisis.
--
-- El nexo causal sí marca la otra obligación, la de notificar "inmediatamente"
-- una vez establecido. El plazo en días es el tope, no el objetivo.
--
-- NOTA: el asistente RAG de la propia aplicación dio estos plazos mal
-- (intercambiaba 2 y 10 días y anclaba el cómputo al nexo causal). La causa es
-- que al corpus le falta el apartado 4 del artículo. Está anotado como deuda:
-- NO tomar los plazos del asistente para nada normativo hasta que se audite.
-- ============================================================================

-- ── Clasificación según Art. 3.49 ───────────────────────────────────────────

CREATE TYPE fluxion.incident_category AS ENUM (
  'death',                    -- 3.49.a · fallecimiento de una persona
  'health_harm',              -- 3.49.a · daño grave a la salud, sin fallecimiento
  'critical_infrastructure',  -- 3.49.b · alteración grave e irreversible de infraestructuras críticas
  'fundamental_rights',       -- 3.49.c · vulneración de obligaciones que protegen derechos fundamentales
  'property_environment',     -- 3.49.d · daños graves a la propiedad o al medio ambiente
  'other'                     -- no encaja en la definición de incidente grave
);

COMMENT ON TYPE fluxion.incident_category IS
  'Supuestos del artículo 3, punto 49 del AI Act. Determina el plazo de '
  'notificación junto con is_widespread_infringement.';

CREATE TYPE fluxion.incident_status AS ENUM (
  'open',           -- detectado, sin analizar
  'investigating',  -- en análisis de causa raíz
  'contained',      -- contenido, pendiente de cierre
  'closed'
);

-- Art. 73.5 permite una notificación inicial incompleta seguida de una completa.
CREATE TYPE fluxion.incident_notification_status AS ENUM (
  'not_required',   -- no es incidente grave: no hay obligación
  'pending',        -- obligación viva, sin notificar
  'initial_sent',   -- notificación inicial incompleta enviada (Art. 73.5)
  'complete_sent',  -- notificación completa enviada
  'not_applicable'  -- p. ej. el sistema no es de alto riesgo
);

-- Art. 26.5: el responsable del despliegue que detecta un incidente informa
-- primero al proveedor. Las obligaciones no son las mismas según el rol.
CREATE TYPE fluxion.incident_reporter_role AS ENUM ('provider', 'deployer');

-- ── Tabla ───────────────────────────────────────────────────────────────────

CREATE TABLE fluxion.ai_incidents (
  id                    uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id       uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  reference             text        NOT NULL,   -- INC-2026-001, legible para citarlo
  title                 text        NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  description           text,

  -- ── Clasificación ─────────────────────────────────────────────────────────
  category              fluxion.incident_category NOT NULL DEFAULT 'other',

  -- ¿Encaja en la definición de "incidente grave" del Art. 3.49? Es una
  -- decisión humana, no derivable de la categoría: puede haber daño a la salud
  -- que no alcance la gravedad exigida.
  is_serious            boolean     NOT NULL DEFAULT false,

  -- Art. 73.3 equipara la infracción generalizada al supuesto 3.49.b: 2 días.
  is_widespread_infringement boolean NOT NULL DEFAULT false,

  reporter_role         fluxion.incident_reporter_role NOT NULL DEFAULT 'provider',

  -- ── Cronología ────────────────────────────────────────────────────────────
  occurred_at           timestamptz,   -- cuándo ocurrió, si se sabe

  -- El ancla del reloj. Obligatorio: sin esto no hay plazo que calcular.
  became_aware_at       timestamptz NOT NULL DEFAULT now(),

  -- Dispara la obligación de notificar "inmediatamente" (Art. 73.2/73.4).
  causal_link_established_at timestamptz,

  -- ── Notificación ──────────────────────────────────────────────────────────
  -- Calculado por trigger a partir de became_aware_at y la clasificación.
  notification_deadline timestamptz,
  notification_status   fluxion.incident_notification_status NOT NULL DEFAULT 'pending',
  notified_at           timestamptz,
  authority             text,          -- autoridad de vigilancia destinataria
  notification_reference text,         -- acuse o número de expediente

  -- ── Gestión ───────────────────────────────────────────────────────────────
  status                fluxion.incident_status NOT NULL DEFAULT 'open',
  root_cause            text,
  impact_summary        text,
  affected_people_count integer CHECK (affected_people_count >= 0),

  -- Señal que lo originó, si escaló desde monitorización
  source_signal_id      uuid        REFERENCES fluxion.signals(id) ON DELETE SET NULL,

  reported_by           uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  owner_id              uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  closed_at             timestamptz,
  closed_by             uuid        REFERENCES fluxion.profiles(id) ON DELETE SET NULL,

  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT uq_incident_reference UNIQUE (organization_id, reference),

  -- Un incidente cerrado tiene que decir cuándo
  CONSTRAINT chk_closed_has_date
    CHECK (status <> 'closed' OR closed_at IS NOT NULL),

  -- Si se ha notificado, tiene que constar la fecha
  CONSTRAINT chk_notified_has_date
    CHECK (notification_status NOT IN ('initial_sent', 'complete_sent') OR notified_at IS NOT NULL)
);

COMMENT ON TABLE fluxion.ai_incidents IS
  'Incidentes de sistemas de IA. Incluye el reloj de notificación del artículo 73 '
  'del AI Act, calculado desde became_aware_at.';

COMMENT ON COLUMN fluxion.ai_incidents.became_aware_at IS
  'Momento en que la organización tuvo conocimiento del incidente. Es el ancla '
  'de TODOS los plazos del Art. 73 — no el nexo causal.';

COMMENT ON COLUMN fluxion.ai_incidents.notification_deadline IS
  'Calculado automáticamente. 2 días (Art. 73.3), 10 días (Art. 73.4) o 15 días '
  '(Art. 73.2) desde became_aware_at. NULL si no hay obligación.';

-- ── Sistemas afectados ──────────────────────────────────────────────────────
-- Tabla aparte y no un array: un incidente puede afectar a varios sistemas y
-- queremos integridad referencial para poder listar "incidentes de este sistema".

CREATE TABLE fluxion.ai_incident_systems (
  incident_id     uuid NOT NULL REFERENCES fluxion.ai_incidents(id) ON DELETE CASCADE,
  ai_system_id    uuid NOT NULL REFERENCES fluxion.ai_systems(id)   ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  added_at        timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (incident_id, ai_system_id)
);

CREATE INDEX idx_incident_systems_system
  ON fluxion.ai_incident_systems (ai_system_id);

-- ── Referencia legible ──────────────────────────────────────────────────────
-- INC-2026-001, correlativo por organización y año. Un incidente se cita en
-- correos, actas y comunicaciones a la autoridad: un UUID no sirve para eso.

CREATE OR REPLACE FUNCTION fluxion.next_incident_reference(p_org uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year text := to_char(now(), 'YYYY');
  v_next integer;
BEGIN
  SELECT COALESCE(MAX(substring(reference from '[0-9]+$')::integer), 0) + 1
  INTO v_next
  FROM fluxion.ai_incidents
  WHERE organization_id = p_org
    AND reference LIKE 'INC-' || v_year || '-%';

  RETURN 'INC-' || v_year || '-' || lpad(v_next::text, 3, '0');
END;
$$;

-- ── El reloj ────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION fluxion.incident_notification_days(
  p_category   fluxion.incident_category,
  p_widespread boolean
) RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    -- Art. 73.3 · infracción generalizada o incidente del Art. 3.49.b
    WHEN p_widespread OR p_category = 'critical_infrastructure' THEN 2
    -- Art. 73.4 · fallecimiento
    WHEN p_category = 'death' THEN 10
    -- Art. 73.2 · régimen general
    ELSE 15
  END;
$$;

COMMENT ON FUNCTION fluxion.incident_notification_days IS
  'Plazo en días del artículo 73 del AI Act. Verificado contra el texto oficial: '
  '2 días para infraestructuras críticas o infracción generalizada (73.3), '
  '10 para fallecimiento (73.4), 15 en el resto (73.2).';

CREATE OR REPLACE FUNCTION fluxion.set_incident_deadline()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- La referencia se genera aquí y no en la aplicación: es obligatoria y
  -- olvidarla sería un error en tiempo de ejecución. Dos altas simultáneas
  -- podrían chocar, pero la restricción única lo detecta y basta con reintentar.
  IF TG_OP = 'INSERT' AND NEW.reference IS NULL THEN
    NEW.reference := fluxion.next_incident_reference(NEW.organization_id);
  END IF;

  -- Sin incidente grave no hay obligación de notificar.
  IF NOT NEW.is_serious THEN
    NEW.notification_deadline := NULL;
    IF NEW.notification_status = 'pending' THEN
      NEW.notification_status := 'not_required';
    END IF;
    RETURN NEW;
  END IF;

  NEW.notification_deadline :=
    NEW.became_aware_at
    + make_interval(days => fluxion.incident_notification_days(
        NEW.category, NEW.is_widespread_infringement));

  -- Al pasar a grave, si estaba marcado como sin obligación, se reactiva.
  IF NEW.notification_status = 'not_required' THEN
    NEW.notification_status := 'pending';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_incident_deadline
  BEFORE INSERT OR UPDATE OF category, is_serious, is_widespread_infringement, became_aware_at
  ON fluxion.ai_incidents
  FOR EACH ROW EXECUTE FUNCTION fluxion.set_incident_deadline();

CREATE TRIGGER trg_incidents_updated_at
  BEFORE UPDATE ON fluxion.ai_incidents
  FOR EACH ROW EXECUTE FUNCTION fluxion.update_updated_at();

-- ── Índices ─────────────────────────────────────────────────────────────────

CREATE INDEX idx_incidents_org_created
  ON fluxion.ai_incidents (organization_id, created_at DESC);

-- Consulta del cron: obligaciones vivas ordenadas por urgencia
CREATE INDEX idx_incidents_deadline
  ON fluxion.ai_incidents (organization_id, notification_deadline)
  WHERE notification_status IN ('pending', 'initial_sent');

CREATE INDEX idx_incidents_open
  ON fluxion.ai_incidents (organization_id, status, created_at DESC)
  WHERE status <> 'closed';

-- ── RLS ─────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.ai_incidents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.ai_incident_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_incidents_select ON fluxion.ai_incidents
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Cualquier miembro puede DAR PARTE de un incidente: quien lo detecta suele ser
-- quien opera el sistema, no quien gobierna. Restringirlo desincentiva reportar,
-- que es lo último que quieres en gestión de incidentes.
CREATE POLICY ai_incidents_insert ON fluxion.ai_incidents
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

-- Clasificar y notificar sí es responsabilidad de gobierno.
CREATE POLICY ai_incidents_update ON fluxion.ai_incidents
  FOR UPDATE USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
        AND profiles.role = ANY (ARRAY[
          'org_admin'::fluxion.org_role,
          'sgai_manager'::fluxion.org_role,
          'caio'::fluxion.org_role,
          'dpo'::fluxion.org_role,
          'risk_analyst'::fluxion.org_role,
          'compliance_analyst'::fluxion.org_role
        ])
    )
  );

CREATE POLICY ai_incident_systems_select ON fluxion.ai_incident_systems
  FOR SELECT USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

CREATE POLICY ai_incident_systems_write ON fluxion.ai_incident_systems
  FOR ALL USING (
    organization_id IN (
      SELECT profiles.organization_id FROM fluxion.profiles
      WHERE profiles.user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE ON fluxion.ai_incidents        TO authenticated;
GRANT SELECT, INSERT, DELETE ON fluxion.ai_incident_systems TO authenticated;
GRANT ALL ON fluxion.ai_incidents        TO service_role;
GRANT ALL ON fluxion.ai_incident_systems TO service_role;

-- ── tasks: admitir origen 'incident' ────────────────────────────────────────
-- Las acciones correctivas de un incidente son tareas, no una entidad nueva.

ALTER TABLE fluxion.tasks DROP CONSTRAINT IF EXISTS tasks_source_type_check;

ALTER TABLE fluxion.tasks ADD CONSTRAINT tasks_source_type_check
  CHECK (source_type IN (
    'manual', 'treatment_action', 'gap', 'evaluation',
    'fmea_item', 'gap_group', 'signal', 'incident'
  ));
