-- recursos/db/056_archive_legacy_iso.sql
--
-- Fase 1 — Archivado de campos legacy ISO 42001 en fluxion.ai_systems
--
-- Los campos iso_42001_score, iso_42001_checks e iso_42001_updated_at
-- fueron calculados automáticamente a partir de 10 checks de gobernanza
-- (función calcISO en lib/ai-systems/scoring.ts).
--
-- A partir de esta migración el módulo AISIA (aisia_assessments) es la
-- fuente de verdad para el estado ISO 42001 por sistema. Estos campos
-- se conservan para backward-compat (dashboards, dossier técnico) pero
-- ya no se escriben desde la aplicación.
--
-- NO se eliminan las columnas. NO hay CASCADE. Solo documentación.

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_score IS
  '[DEPRECATED desde 2026-04-28] Score 0-100 calculado con 10 checks de gobernanza. '
  'Sustituido por aisia_assessments. Mantener para backward-compat.';

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_checks IS
  '[DEPRECATED desde 2026-04-28] Snapshot JSONB de los 10 checks individuales. '
  'Sustituido por aisia_sections. Mantener para backward-compat.';

COMMENT ON COLUMN fluxion.ai_systems.iso_42001_updated_at IS
  '[DEPRECATED desde 2026-04-28] Timestamp de la última recalculación automática. '
  'Sustituido por aisia_assessments.updated_at. Mantener para backward-compat.';
