ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS code TEXT;

UPDATE fluxion.ai_systems
SET code = COALESCE(NULLIF(internal_id, ''), LEFT(id::text, 8))
WHERE code IS NULL;
