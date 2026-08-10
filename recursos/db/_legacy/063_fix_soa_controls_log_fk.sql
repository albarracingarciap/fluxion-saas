-- Migration 063: Re-assert FK on soa_controls_log.actor_user_id → fluxion.profiles
-- The FK exists in migration 037 but was not registered in the PostgREST schema cache.

ALTER TABLE fluxion.soa_controls_log
  DROP CONSTRAINT IF EXISTS soa_controls_log_actor_user_id_fkey;

ALTER TABLE fluxion.soa_controls_log
  ADD CONSTRAINT soa_controls_log_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
