-- ─────────────────────────────────────────────────────────────────────────────
-- Evidencias: la ubicación se exige al salir de borrador, no al crear
--
-- chk_system_evidences_location obligaba a que toda fila tuviera storage_path
-- o external_url. Pero el fichero se sube DESPUÉS de crear la evidencia —la
-- clave del objeto necesita su id—, así que en el INSERT no hay ninguna de las
-- dos cosas. La consecuencia fue que la pantalla marcó la URL como obligatoria
-- siempre: adjuntar un fichero no bastaba para poder guardar.
--
-- La regla real del negocio no es "toda fila apunta a algo", sino "nada sale de
-- borrador sin apuntar a algo". Una evidencia en borrador a la que todavía le
-- falta el documento es un estado legítimo del trabajo; una evidencia válida
-- sin documento no es evidencia de nada.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.system_evidences
  DROP CONSTRAINT IF EXISTS chk_system_evidences_location;

ALTER TABLE fluxion.system_evidences
  ADD CONSTRAINT chk_system_evidences_location
  CHECK (
    status = 'draft'
    OR storage_path IS NOT NULL
    OR external_url IS NOT NULL
  );

COMMENT ON CONSTRAINT chk_system_evidences_location ON fluxion.system_evidences IS
  'Una evidencia solo puede dejar el estado borrador si tiene fichero o URL. En borrador puede no tener ninguno: es el hueco entre crear la fila y subir el fichero.';
