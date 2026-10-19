-- ============================================================================
-- Plan de tratamiento: control de mitigación libre (B02)
-- ============================================================================
-- Hasta ahora un control solo podía nacer de una plantilla del catálogo
-- (`template_id NOT NULL`). Si el modo de fallo no tenía plantillas asociadas,
-- no había forma de elegir «Mitigar» en el plan de tratamiento (`R9`).
--
-- Un control libre no tiene plantilla: lleva su propio título y descripción.
-- La restricción garantiza que todo control tenga una de las dos cosas.
--
-- Idempotente: se puede volver a ejecutar sin efecto.
-- ============================================================================

ALTER TABLE fluxion.controls
  ALTER COLUMN template_id DROP NOT NULL;

ALTER TABLE fluxion.controls
  ADD COLUMN IF NOT EXISTS title       text,
  ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN fluxion.controls.template_id IS
  'Plantilla del catálogo (compliance.control_templates). Nulo en los controles libres.';
COMMENT ON COLUMN fluxion.controls.title IS
  'Título del control libre. Nulo cuando el control viene de una plantilla.';
COMMENT ON COLUMN fluxion.controls.description IS
  'Descripción del control libre.';

DO $$ BEGIN
  ALTER TABLE fluxion.controls
    ADD CONSTRAINT chk_controls_template_or_title
    CHECK (template_id IS NOT NULL OR nullif(btrim(title), '') IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
