-- ─────────────────────────────────────────────────────────────────────────────
-- Huella del contenido, además de la del fichero
--
-- checksum_sha256 es el hash de los BYTES del PDF, así que no puede imprimirse
-- dentro del propio PDF: hacerlo cambiaría los bytes y con ellos el hash.
--
-- content_sha256 es el hash de los DATOS con los que se generó —el mismo
-- payload que se congela en el snapshot—, y ese sí se conoce antes de
-- renderizar. Va impreso en la portada.
--
-- Las dos mitades: el documento declara de qué datos salió, y Fluxion declara
-- qué fichero se entregó.
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE fluxion.document_renders
  ADD COLUMN IF NOT EXISTS content_sha256 text;

COMMENT ON COLUMN fluxion.document_renders.content_sha256 IS
  'Hash del payload compuesto, impreso en el documento. Verificable contra el snapshot.';

COMMENT ON COLUMN fluxion.document_renders.checksum_sha256 IS
  'Hash de los bytes del PDF entregado. No aparece dentro del documento por razones obvias.';
