-- Migration 062: Fix actor_user_id FK in soa_lifecycle_log to point to fluxion.profiles
-- PostgREST can only auto-join within the same schema; auth.users is not resolvable.

ALTER TABLE fluxion.soa_lifecycle_log
  DROP CONSTRAINT IF EXISTS soa_lifecycle_log_actor_user_id_fkey;

ALTER TABLE fluxion.soa_lifecycle_log
  ADD CONSTRAINT soa_lifecycle_log_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES fluxion.profiles(id) ON DELETE SET NULL;

-- Reload PostgREST schema cache so the new FK is visible immediately
NOTIFY pgrst, 'reload schema';
