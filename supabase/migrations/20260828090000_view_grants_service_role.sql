-- Permisos de lectura para service_role sobre las vistas.
--
-- Cuatro vistas se crearon concediendo SELECT solo a `authenticated`. El cliente
-- de servicio —crons y rutas de ingesta— no entra como `authenticated`, así que
-- al leerlas recibía 42501 «permission denied for view». Salió con
-- `telemetry.v_budget_status` en el cron de presupuestos, sobre la instancia
-- nueva.
--
-- No apareció antes porque el stack compartido arrastraba permisos concedidos a
-- mano en su día. Una base limpia es justamente lo que destapa esa clase de
-- deuda: lo que no está en una migración, no existe.
--
-- No basta con las DEFAULT PRIVILEGES de la línea base: están declaradas
-- `FOR ROLE postgres`, y las migraciones se aplican como `supabase_admin`.
-- Objeto creado por otro rol, privilegios por defecto que no se aplican.
--
-- Son vistas de solo lectura sobre tablas que service_role ya puede leer, y
-- todas llevan `security_invoker = true`, así que no amplían nada: solo evitan
-- que el permiso del propio objeto bloquee al rol equivocado.

GRANT SELECT ON fluxion.v_evidence_storage_split TO service_role;
GRANT SELECT ON fluxion.v_shadow_ai_summary      TO service_role;
GRANT SELECT ON telemetry.v_models_without_price TO service_role;
GRANT SELECT ON telemetry.v_budget_status        TO service_role;
