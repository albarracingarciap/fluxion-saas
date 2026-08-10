-- 085 · Reenvío de invitaciones
-- Añade seguimiento de reenvíos a la tabla invitations.

ALTER TABLE fluxion.invitations
  ADD COLUMN IF NOT EXISTS last_resent_at timestamptz,
  ADD COLUMN IF NOT EXISTS resend_count   integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN fluxion.invitations.last_resent_at IS 'Timestamp del último reenvío de la invitación';
COMMENT ON COLUMN fluxion.invitations.resend_count   IS 'Número de veces que se ha reenviado la invitación';
