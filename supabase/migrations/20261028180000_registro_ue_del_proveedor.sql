-- ============================================================================
-- Registro UE del proveedor: número y URL (documentación del proveedor)
-- ============================================================================
--   Cuando la organización no es la proveedora del sistema, en la pestaña
--   «Ficha para el registro UE» del expediente se puede indicar el número de
--   registro del sistema en la base de datos de la UE y la URL de su entrada,
--   juntos o por separado (petición del responsable, 2026-10-28). Antes solo
--   se podía adjuntar como evidencia un fichero o un enlace.
--
--   Lo usan el plan de despliegue (registro del proveedor, B27) y la ficha
--   para el registro UE de una autoridad pública (Anexo VIII, sección C).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.ai_systems
  ADD COLUMN IF NOT EXISTS provider_eu_registry_number text,
  ADD COLUMN IF NOT EXISTS provider_eu_registry_url text;

COMMENT ON COLUMN fluxion.ai_systems.provider_eu_registry_number IS
  'Número de registro del sistema en la base de datos de la UE, cuando lo registró el proveedor (Art. 49).';
COMMENT ON COLUMN fluxion.ai_systems.provider_eu_registry_url IS
  'URL de la entrada del sistema en la base de datos de la UE registrada por el proveedor (Art. 49).';
