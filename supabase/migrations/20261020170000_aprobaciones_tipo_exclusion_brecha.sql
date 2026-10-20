-- ============================================================================
-- Flujos de aprobación: exclusión de brechas como objeto aprobable (B11d, 1/2)
-- ============================================================================
-- DP-07 (2026-10-20): excluir una brecha «Riesgo sin tratar» u «Obligación sin
-- cubrir» es aceptar un riesgo o un incumplimiento, y pasa por aprobación.
--
-- Va aparte porque un valor nuevo de un enum no se puede usar en la misma
-- transacción en la que se crea, y la siguiente migración (20261020170100) ya
-- lo usa.
--
-- Idempotente: ADD VALUE IF NOT EXISTS.
-- ============================================================================

ALTER TYPE fluxion.approval_object_type ADD VALUE IF NOT EXISTS 'gap_disposition';
