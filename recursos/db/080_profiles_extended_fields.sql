-- ============================================================================
-- FLUXION — 080: extensión profesional del perfil de usuario
-- ============================================================================
-- Esta migración cumple dos objetivos:
--
--  1) Formaliza columnas usadas por la UI desde hace tiempo pero que no
--     estaban declaradas explícitamente en el schema (`first_name`,
--     `last_name`, `preferences`). Hasta ahora la UI escribía valores que
--     se descartaban silenciosamente o requerían columnas creadas a mano.
--
--  2) Añade campos nuevos de contacto y organización para soportar la
--     evolución del perfil hacia un módulo profesional:
--       - phone, secondary_email  → contacto regulatorio y notificaciones
--       - manager_id              → estructura jerárquica dentro de la org
--       - bio, pronouns           → identidad mostrada en hovers de owner
-- ============================================================================


-- ─── 1) Columnas legacy huérfanas + nuevas ──────────────────────────────────

ALTER TABLE fluxion.profiles
  -- Identidad usada por la UI pero no formalizada en migraciones previas
  ADD COLUMN IF NOT EXISTS first_name      text,
  ADD COLUMN IF NOT EXISTS last_name       text,
  ADD COLUMN IF NOT EXISTS preferences     jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Campos nuevos del paso 4
  ADD COLUMN IF NOT EXISTS phone           text,
  ADD COLUMN IF NOT EXISTS secondary_email text,
  ADD COLUMN IF NOT EXISTS manager_id      uuid REFERENCES fluxion.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS bio             text,
  ADD COLUMN IF NOT EXISTS pronouns        text;


-- ─── 2) Índices ─────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_profiles_manager_id
  ON fluxion.profiles(manager_id)
  WHERE manager_id IS NOT NULL;


-- ─── 3) Comentarios ─────────────────────────────────────────────────────────

COMMENT ON COLUMN fluxion.profiles.first_name      IS
  'Nombre. Combinado con last_name forma el nombre legal completo. Mantener sincronizado con full_name.';

COMMENT ON COLUMN fluxion.profiles.last_name       IS
  'Apellidos. Mantener sincronizado con full_name.';

COMMENT ON COLUMN fluxion.profiles.preferences     IS
  'Preferencias del usuario como jsonb (timezone, locale, date_format, week_starts_on, theme, notification_prefs, etc.).';

COMMENT ON COLUMN fluxion.profiles.phone           IS
  'Teléfono corporativo o móvil de contacto. Útil para owners ante incidentes regulatorios.';

COMMENT ON COLUMN fluxion.profiles.secondary_email IS
  'Email alternativo opcional para recibir notificaciones fuera de la cuenta principal.';

COMMENT ON COLUMN fluxion.profiles.manager_id      IS
  'Manager directo dentro de la organización. FK a fluxion.profiles(id), ON DELETE SET NULL.';

COMMENT ON COLUMN fluxion.profiles.bio             IS
  'Biografía corta (recomendado <= 280 caracteres). Visible en hovers de owner y firmas en exports.';

COMMENT ON COLUMN fluxion.profiles.pronouns        IS
  'Pronombres preferidos del usuario (ej. "ella", "él", "elle"). Opcional.';


-- ─── 4) Backfill de first_name / last_name desde full_name (best-effort) ────
-- Solo se aplica a perfiles existentes que aún no tienen first_name poblado.
-- Asume el patrón "Nombre Apellido(s)"; preserva todo en first_name si falla.

UPDATE fluxion.profiles
SET
  first_name = COALESCE(first_name, split_part(full_name, ' ', 1)),
  last_name  = COALESCE(
                 last_name,
                 NULLIF(TRIM(SUBSTRING(full_name FROM POSITION(' ' IN full_name) + 1)), '')
               )
WHERE full_name IS NOT NULL
  AND first_name IS NULL;
