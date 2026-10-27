-- ============================================================================
-- Evidencias: tipo del catálogo (B17e1, F-11, C6)
-- ============================================================================
--   El catálogo dice qué tipos de evidencia exige cada obligación
--   (`compliance.obligation_evidence_types`), pero las evidencias de los
--   sistemas solo tenían un tipo libre (`evidence_type`) que no casa con él, así
--   que nunca se podía saber si una obligación estaba cubierta (C6).
--
--   Decisión del responsable (2026-10-27): cada evidencia lleva el tipo del
--   catálogo, elegido al subirla, y los tipos libres actuales se traducen cuando
--   la correspondencia es inequívoca:
--     dpia → EVT-DOC-05 · technical_doc → EVT-DOC-02 · policy → EVT-DOC-01 ·
--     training_record → EVT-PRO-02 · test_result, test → EVT-TEC-02 ·
--     monitoring_log → EVT-TEC-04 · risk_assessment → EVT-TEC-01;
--     documentos del expediente generados (etiqueta de la plantilla): anexo-iv →
--     EVT-DOC-02, fria y dpia → EVT-DOC-05, registro-ue → EVT-REG-01;
--     documentación del proveedor (B16a): instrucciones → EVT-DOC-04,
--     declaracion → EVT-DOC-03, registro → EVT-REG-01, documentacion → EVT-DOC-02.
--   El resto (certification, contract, report…) queda sin tipo del catálogo
--   hasta que alguien lo elija. La aplicación aplica la misma traducción a las
--   evidencias nuevas cuando no se elige (`lib/evidences/catalog-type.ts`).
--
-- Idempotente.
-- ============================================================================

ALTER TABLE fluxion.system_evidences
  ADD COLUMN IF NOT EXISTS evidence_type_id uuid REFERENCES compliance.evidence_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_system_evidences_evidence_type
  ON fluxion.system_evidences (evidence_type_id);

COMMENT ON COLUMN fluxion.system_evidences.evidence_type_id IS
  'Tipo del catálogo (compliance.evidence_types): decide qué obligaciones cubre la evidencia (B17e1). evidence_type sigue siendo la etiqueta libre.';

UPDATE fluxion.system_evidences e
   SET evidence_type_id = t.id
  FROM compliance.evidence_types t
 WHERE e.evidence_type_id IS NULL
   AND t.code = CASE
     WHEN 'doc-proveedor-tipo-instrucciones' = ANY (e.tags) THEN 'EVT-DOC-04'
     WHEN 'doc-proveedor-tipo-declaracion'   = ANY (e.tags) THEN 'EVT-DOC-03'
     WHEN 'doc-proveedor-tipo-registro'      = ANY (e.tags) THEN 'EVT-REG-01'
     WHEN 'doc-proveedor-tipo-documentacion' = ANY (e.tags) THEN 'EVT-DOC-02'
     WHEN e.evidence_type = 'regulatory_document' AND 'anexo-iv'    = ANY (e.tags) THEN 'EVT-DOC-02'
     WHEN e.evidence_type = 'regulatory_document' AND 'fria'        = ANY (e.tags) THEN 'EVT-DOC-05'
     WHEN e.evidence_type = 'regulatory_document' AND 'dpia'        = ANY (e.tags) THEN 'EVT-DOC-05'
     WHEN e.evidence_type = 'regulatory_document' AND 'registro-ue' = ANY (e.tags) THEN 'EVT-REG-01'
     WHEN e.evidence_type = 'dpia'            THEN 'EVT-DOC-05'
     WHEN e.evidence_type = 'technical_doc'   THEN 'EVT-DOC-02'
     WHEN e.evidence_type = 'policy'          THEN 'EVT-DOC-01'
     WHEN e.evidence_type = 'training_record' THEN 'EVT-PRO-02'
     WHEN e.evidence_type IN ('test_result', 'test') THEN 'EVT-TEC-02'
     WHEN e.evidence_type = 'monitoring_log'  THEN 'EVT-TEC-04'
     WHEN e.evidence_type = 'risk_assessment' THEN 'EVT-TEC-01'
   END;
