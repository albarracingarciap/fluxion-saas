// Tipo del catálogo de una evidencia (lib/evidences/catalog-type.ts, B17e1).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { inferCatalogTypeCode } from '../lib/evidences/catalog-type'

test('las etiquetas libres inequívocas se traducen; el resto queda sin tipo', () => {
  assert.equal(inferCatalogTypeCode('dpia'), 'EVT-DOC-05')
  assert.equal(inferCatalogTypeCode('technical_doc'), 'EVT-DOC-02')
  assert.equal(inferCatalogTypeCode('test'), 'EVT-TEC-02')
  assert.equal(inferCatalogTypeCode('certification'), null)
  assert.equal(inferCatalogTypeCode('contract'), null)
  assert.equal(inferCatalogTypeCode(null), null)
})

test('documentos generados y documentación del proveedor según su origen', () => {
  assert.equal(inferCatalogTypeCode('regulatory_document', ['anexo-iv', 'generado']), 'EVT-DOC-02')
  assert.equal(inferCatalogTypeCode('regulatory_document', ['registro-ue', 'generado']), 'EVT-REG-01')
  assert.equal(inferCatalogTypeCode('regulatory_document', ['aisia', 'generado']), null)
  // La documentación del proveedor manda sobre la etiqueta libre.
  assert.equal(inferCatalogTypeCode('technical_doc', ['documentacion-proveedor', 'doc-proveedor-tipo-instrucciones']), 'EVT-DOC-04')
  assert.equal(inferCatalogTypeCode('certification', ['doc-proveedor-tipo-declaracion']), 'EVT-DOC-03')
})
