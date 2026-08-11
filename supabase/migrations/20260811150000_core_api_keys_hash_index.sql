-- ============================================================================
-- Índice único sobre api_keys.key_hash
-- ============================================================================
-- La validación de claves API busca por key_hash en CADA petición de ingesta.
-- La migración original (088) solo indexó (organization_id, created_at), así
-- que esa búsqueda era un escaneo secuencial de la tabla.
--
-- Único además de índice: dos claves distintas no pueden compartir hash, y si
-- alguna vez ocurriera sería un fallo grave del generador que conviene que
-- salte como error y no en silencio.
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_api_keys_hash
  ON fluxion.api_keys (key_hash);
