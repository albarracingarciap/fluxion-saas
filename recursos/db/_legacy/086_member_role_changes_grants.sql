-- 086 · Grants faltantes en member_role_changes
-- La migración 084 habilitó RLS y creó políticas pero olvidó otorgar
-- permisos de tabla al rol authenticated, causando "permission denied".

GRANT SELECT, INSERT ON fluxion.member_role_changes TO authenticated;
GRANT SELECT, INSERT ON fluxion.member_role_changes TO service_role;
