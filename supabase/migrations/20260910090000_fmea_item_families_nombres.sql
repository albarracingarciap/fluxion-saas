-- ============================================================================
-- La vista de familias trae el codigo y el nombre del modo
-- ============================================================================
-- La tarjeta de familia mostraba «Modo desconocido» siete veces. La accion
-- pedia los nombres con `.from('failure_modes')` usando el cliente de la
-- aplicacion, que esta fijado al esquema `fluxion` — y el catalogo vive en
-- `compliance`. Buscaba una tabla que no existe.
--
-- Se resuelve en la vista, que ya cruza los dos esquemas del lado del servidor,
-- en lugar de anadir un segundo cliente en la aplicacion solo para esto. Ademas
-- evita una consulta extra por cada carga del panel.

CREATE OR REPLACE VIEW fluxion.v_fmea_item_families
WITH (security_invoker = true) AS
SELECT
  i.id            AS item_id,
  i.evaluation_id,
  i.failure_mode_id,
  i.status,
  i.estimate_source,
  fm.code         AS failure_mode_code,
  fm.name         AS failure_mode_name,
  f               AS family_label
FROM fluxion.fmea_items i
JOIN fluxion.fmea_evaluations e ON e.id = i.evaluation_id
JOIN fluxion.system_failure_modes sfm
     ON sfm.ai_system_id = e.system_id
    AND sfm.failure_mode_id = i.failure_mode_id
JOIN compliance.failure_modes fm ON fm.id = i.failure_mode_id
CROSS JOIN LATERAL unnest(sfm.activation_family_labels) AS f;

COMMENT ON VIEW fluxion.v_fmea_item_families IS
  'Que familias cubren cada item de una evaluacion, con el codigo y el nombre '
  'del modo. Un item puede estar en varias familias.';

GRANT SELECT ON fluxion.v_fmea_item_families TO authenticated, service_role;
