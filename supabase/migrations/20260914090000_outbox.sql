-- ============================================================================
-- Outbox de eventos
-- ============================================================================
-- Fluxion tenia dos mecanismos de entrega y ningun productor de eventos:
--
--   · `channel_deliveries` — Slack y Teams. Funciona, con reintentos propios.
--   · `webhooks` — endpoints con firma. Se puede dar de alta, elegir eventos y
--     pulsar «Probar»... y nada mas. NO HAY UNA SOLA LINEA que dispare un
--     webhook ante un evento real. Se registra un endpoint, se marcan
--     `incident.created` y `approval.decided`, y no llega nada nunca.
--
-- Esto es la pieza que faltaba: un registro de eventos del dominio del que
-- cuelgan las entregas.
--
-- ── Por que outbox y no llamar a los endpoints directamente ────────────────
--
-- Porque el envio puede fallar y el hecho ya ha ocurrido. Si se llama al
-- webhook dentro de la accion, un endpoint caido o lento se lleva por delante
-- la operacion —o se traga el error y el evento se pierde sin rastro.
--
-- Con outbox el evento se PERSISTE primero y se entrega despues, con
-- reintentos. Es la unica forma de que «se aprobo un plan» y «se notifico que
-- se aprobo» no dependan la una de la otra.
-- ============================================================================


-- ── El hecho ────────────────────────────────────────────────────────────────
--
-- Inmutable. Un evento describe algo que YA paso: corregirlo seria reescribir
-- la historia. Si el hecho cambia, se emite otro evento.

CREATE TABLE IF NOT EXISTS fluxion.outbox_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- 'approval.decided', 'incident.created', 'plan.approved'…
  event_type       text NOT NULL,
  subject_type     text,
  subject_id       uuid,

  -- Lo que se entrega. Sin datos personales ni contenido: los receptores son
  -- sistemas de terceros y esto sale de la organizacion.
  payload          jsonb NOT NULL DEFAULT '{}'::jsonb,

  occurred_at      timestamptz NOT NULL DEFAULT now(),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_events_org
  ON fluxion.outbox_events (organization_id, occurred_at DESC);

CREATE OR REPLACE FUNCTION fluxion.outbox_events_inmutables()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Los eventos del outbox no se modifican ni se borran (%)', OLD.id;
END;
$$;

DROP TRIGGER IF EXISTS trg_outbox_events_inmutables ON fluxion.outbox_events;
CREATE TRIGGER trg_outbox_events_inmutables
  BEFORE UPDATE OR DELETE ON fluxion.outbox_events
  FOR EACH ROW EXECUTE FUNCTION fluxion.outbox_events_inmutables();


-- ── El intento de entrega ───────────────────────────────────────────────────
--
-- Una fila por destino. El mismo evento puede ir a tres webhooks y a un canal
-- de Slack, y cada uno falla o funciona por su cuenta.

CREATE TABLE IF NOT EXISTS fluxion.outbox_deliveries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES fluxion.outbox_events(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Sin clave ajena al destino: un webhook borrado no debe borrar el rastro de
  -- lo que se le entrego. El historial sobrevive al endpoint.
  target_kind      text NOT NULL CHECK (target_kind IN ('webhook', 'channel')),
  target_id        uuid NOT NULL,

  status           text NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending', 'sent', 'failed', 'abandoned')),
  attempts         smallint NOT NULL DEFAULT 0,

  -- Reintento con espera creciente. `abandoned` es un estado explicito y no un
  -- silencio: a los seis intentos se deja de insistir y queda dicho.
  next_attempt_at  timestamptz NOT NULL DEFAULT now(),
  last_attempt_at  timestamptz,
  http_status      integer,
  last_error       text,
  sent_at          timestamptz,

  created_at       timestamptz NOT NULL DEFAULT now(),

  UNIQUE (event_id, target_kind, target_id)
);

-- El indice que usa el despachador: lo pendiente cuya hora ya llego.
CREATE INDEX IF NOT EXISTS idx_outbox_deliveries_pendientes
  ON fluxion.outbox_deliveries (next_attempt_at)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_outbox_deliveries_evento
  ON fluxion.outbox_deliveries (event_id);


-- ── RLS ─────────────────────────────────────────────────────────────────────
--
-- Lectura para la organizacion; la escritura es del rol de servicio, que es
-- quien emite y quien despacha. Nadie edita a mano una entrega.

ALTER TABLE fluxion.outbox_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE fluxion.outbox_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS outbox_events_select ON fluxion.outbox_events;
CREATE POLICY outbox_events_select ON fluxion.outbox_events
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

DROP POLICY IF EXISTS outbox_deliveries_select ON fluxion.outbox_deliveries;
CREATE POLICY outbox_deliveries_select ON fluxion.outbox_deliveries
  FOR SELECT USING (organization_id = fluxion.auth_user_org_id());

GRANT SELECT ON fluxion.outbox_events     TO authenticated;
GRANT SELECT ON fluxion.outbox_deliveries TO authenticated;
GRANT ALL    ON fluxion.outbox_events     TO service_role;
GRANT ALL    ON fluxion.outbox_deliveries TO service_role;

COMMENT ON TABLE fluxion.outbox_events IS
  'Eventos del dominio. Se persisten antes de entregarse para que un endpoint '
  'caido no se lleve por delante la operacion que los produjo.';

COMMENT ON TABLE fluxion.outbox_deliveries IS
  'Un intento de entrega por destino. Sin clave ajena al destino: borrar un '
  'webhook no borra el rastro de lo que se le entrego.';
