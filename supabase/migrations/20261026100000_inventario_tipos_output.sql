-- ============================================================================
-- Inventario: varios tipos de output por sistema (TODO 78, I11)
-- ============================================================================
--   El alta permite marcar varios tipos de output, pero solo se guardaba el
--   primero. `output_types` guarda todos, en el orden en que se marcaron.
--   `output_type` se mantiene como tipo principal (el primero de la lista) para
--   quien solo lee o escribe un tipo: la vista de diagnóstico del FMEA,
--   `calculate_failure_mode_priority`, el servicio de agentes y los conectores.
--
--   Trigger `trg_ai_systems_output_types`:
--     - si cambia la lista, el principal pasa a ser su primer elemento;
--     - si solo cambia el principal (escritores antiguos o la ventana «Revisar
--       clasificación»), sustituye al principal anterior en la lista y conserva
--       el resto.
--
-- Idempotente. Los sistemas existentes pasan a tener una lista de un elemento.
-- ============================================================================

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS output_types fluxion.ai_output_type[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN fluxion.ai_systems.output_types IS
  'Todos los tipos de output del sistema, en el orden en que se marcaron. output_type es el principal (el primero); lo mantiene trg_ai_systems_output_types.';
COMMENT ON COLUMN fluxion.ai_systems.output_type IS
  'Tipo de output principal: el primero de output_types (trg_ai_systems_output_types).';

UPDATE fluxion.ai_systems
   SET output_types = ARRAY[output_type]
 WHERE output_type IS NOT NULL
   AND cardinality(output_types) = 0;

CREATE OR REPLACE FUNCTION fluxion.trg_ai_systems_output_types() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path = fluxion, pg_temp
    AS $$
DECLARE
  v_lista fluxion.ai_output_type[];
BEGIN
  IF TG_OP = 'UPDATE'
     AND NEW.output_types IS NOT DISTINCT FROM OLD.output_types
     AND NEW.output_type IS DISTINCT FROM OLD.output_type THEN
    -- Solo cambia el principal: sustituye al anterior y conserva el resto.
    v_lista := array_remove(array_remove(OLD.output_types, OLD.output_type), NEW.output_type);
    NEW.output_types := CASE WHEN NEW.output_type IS NULL THEN v_lista
                             ELSE ARRAY[NEW.output_type] || v_lista END;
  ELSIF cardinality(coalesce(NEW.output_types, '{}')) = 0 THEN
    -- Lista vacía: si la ha vaciado quien escribe, no queda principal; si no
    -- (alta o escritor que solo conoce output_type), la lista es el principal.
    NEW.output_types := CASE
      WHEN TG_OP = 'UPDATE' AND cardinality(OLD.output_types) > 0 THEN '{}'
      WHEN NEW.output_type IS NOT NULL THEN ARRAY[NEW.output_type]
      ELSE '{}' END;
  END IF;

  -- Sin repetidos, en orden; el principal es el primero.
  SELECT coalesce(array_agg(t ORDER BY pos), '{}')
    INTO NEW.output_types
    FROM (
      SELECT t, min(pos) AS pos
        FROM unnest(NEW.output_types) WITH ORDINALITY AS u(t, pos)
       GROUP BY t
    ) x;
  NEW.output_type := NEW.output_types[1];
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ai_systems_output_types ON fluxion.ai_systems;
CREATE TRIGGER trg_ai_systems_output_types
  BEFORE INSERT OR UPDATE OF output_type, output_types ON fluxion.ai_systems
  FOR EACH ROW EXECUTE FUNCTION fluxion.trg_ai_systems_output_types();
