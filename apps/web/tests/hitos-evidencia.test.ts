// HTML de los hitos (lib/milestones/milestone-html.ts, B19).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { esc, riskEvaluationHtml, soaHtml } from '../lib/milestones/milestone-html'

const cover = { title: 'Sistema X', subtitle: 'Evaluación de riesgos aprobada', organizationName: 'Acme', rows: [['Versión', 'v2']] as Array<[string, string]>, renderId: 'abc', contentChecksum: 'f00' }

test('escapa el contenido y no usa recursos externos', () => {
  assert.equal(esc('<b>&"'), '&lt;b&gt;&amp;&quot;')
  const html = riskEvaluationHtml({ cover, items: [{ dimension: 'Técnica', code: 'FM-1', name: '<script>', sDefault: 8, o: 3, d: 4, sActual: 8, status: 'Confirmado', justification: null }], actions: [] })
  assert.doesNotMatch(html, /<script>/)
  assert.doesNotMatch(html, /https?:\/\//)
  assert.match(html, /El plan no tiene acciones/)
})

test('la Declaración agrupa los controles y marca los no aplicables', () => {
  const html = soaHtml({ cover, controls: [
    { code: 'A.2.2', group: 'A.2 Políticas', title: 'Política de IA', applicable: true, status: 'Implantado', justification: 'J', owner: 'Ana' },
    { code: 'A.2.3', group: 'A.2 Políticas', title: 'Otra', applicable: false, status: 'No iniciado', justification: 'No aplica', owner: null },
  ] })
  assert.equal(html.split('<h2>A.2 Políticas</h2>').length, 2)
  assert.match(html, /<td>No<\/td><td>—<\/td>/)
})
