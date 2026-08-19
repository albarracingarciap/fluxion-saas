-- ─────────────────────────────────────────────────────────────────────────────
-- Endurecer v_evidence_storage_split
--
-- Una vista sobre tablas con RLS se ejecuta por omisión con los permisos de su
-- PROPIETARIO, no de quien consulta. Estas vistas las crea supabase_admin, así
-- que sin `security_invoker = true` la RLS de la tabla queda intacta y
-- perfectamente inútil: bastaría un GRANT a authenticated para que cualquier
-- usuario viera el reparto de evidencias de todas las organizaciones.
--
-- Hoy no está concedida a nadie, de modo que no hay exposición. Se corrige
-- ahora porque el fallo aparecería el día que alguien la conceda, sin ningún
-- error de por medio — el patrón que llevamos todo el mes persiguiendo.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER VIEW fluxion.v_evidence_storage_split SET (security_invoker = true);
