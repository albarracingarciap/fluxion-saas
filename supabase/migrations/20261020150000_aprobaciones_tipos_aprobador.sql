-- ============================================================================
-- Flujos de aprobación: aprobador por tipo de comité y por función (B11b, 1/2)
-- ============================================================================
-- Las políticas por defecto de DP-01 tienen que poder decir «el Comité de
-- Riesgos de IA» o «el Responsable del tratamiento» sin conocer de antemano qué
-- comité ni qué persona tendrá cada organización. Dos tipos de aprobador nuevos:
--
--   · committee_type — un tipo de comité (approver_ref = 'risk_committee', …).
--     Al abrir la solicitud se resuelve al comité activo de ese tipo.
--   · function       — una función de gobierno (approver_ref = 'data_controller',
--     …). Al abrir la solicitud se resuelve a la persona designada (B23b).
--
-- Va en una migración aparte porque un valor nuevo de un enum no se puede usar
-- en la misma transacción en la que se crea, y la siguiente migración
-- (20261020150100) ya los usa.
--
-- Idempotente: ADD VALUE IF NOT EXISTS.
-- ============================================================================

ALTER TYPE fluxion.approval_approver_type ADD VALUE IF NOT EXISTS 'committee_type';
ALTER TYPE fluxion.approval_approver_type ADD VALUE IF NOT EXISTS 'function';
