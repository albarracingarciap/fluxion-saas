// Importación CSV e informe de supervisión humana (lib/hitl/csv.ts y report-html.ts, B30b).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import { normalizeOccurredAt, parseHitlCsv, splitCsv } from '../lib/hitl/csv'
import { hitlReportHtml } from '../lib/hitl/report-html'

test('separador, comillas y BOM', () => {
  assert.deepEqual(splitCsv('﻿a;b\n"x;1";"di ""y"""\n'), [['a', 'b'], ['x;1', 'di "y"']])
  assert.deepEqual(splitCsv('a,b\r\n1,2\r\n\r\n'), [['a', 'b'], ['1', '2']])
})

test('fechas sin zona se toman como UTC', () => {
  assert.equal(normalizeOccurredAt('2026-10-27'), '2026-10-27T00:00:00Z')
  assert.equal(normalizeOccurredAt('2026-10-27 09:15'), '2026-10-27T09:15:00Z')
  assert.equal(normalizeOccurredAt('2026-10-27T09:15:00+02:00'), '2026-10-27T09:15:00+02:00')
})

test('una columna no admitida rechaza el fichero', () => {
  const r = parseHitlCsv('case_ref,decision,occurred_at,paciente\nC1,accepted,2026-10-27,Juan', 's1')
  assert.ok('error' in r && /paciente/.test(r.error))
})

test('obligatorias y sistema por defecto', () => {
  assert.ok('error' in parseHitlCsv('case_ref,decision\nC1,accepted', 's1'))
  assert.ok('error' in parseHitlCsv('case_ref,decision,occurred_at\nC1,accepted,2026-10-27', null))
  const r = parseHitlCsv('case_ref;decision;occurred_at;ai_confidence;decided_in_ms\nC1;Accepted;2026-10-27;0,85;1200,4', 's1')
  assert.ok('rows' in r)
  if ('rows' in r) {
    assert.deepEqual(r.rows[0], {
      case_ref: 'C1', decision: 'accepted', occurred_at: '2026-10-27T00:00:00Z', ai_confidence: 0.85, decided_in_ms: 1200,
      system_id: 's1', dedupe_key: 'csv:s1:C1:2026-10-27T00:00:00Z',
    })
  }
})

test('el informe marca el sesgo y escapa los textos', () => {
  const html = hitlReportHtml({
    cover: { title: 'S <1>', subtitle: 'Informe', organizationName: 'Org', rows: [], renderId: 'r', contentChecksum: 'c' },
    totals: { decisions: 40, agreements: 40, discordant: 0, notUsed: 0, reviewers: 1, medianMs: 1500, withoutReason: 0 },
    reviewers: [{ ref: 'REV-1', role: null, decisions: 40, agreements: 40, medianMs: 1500, bias: true }],
    reasons: [],
    daily: [{ day: '2026-10-27', decisions: 40, agreements: 40 }],
    thresholds: { minCases: 20, agreement: 0.98, medianMs: 5000 },
  })
  assert.match(html, /S &lt;1&gt;/)
  assert.match(html, /Indicios de sesgo de automatización<\/b>.*REV-1/)
  assert.match(html, /100 %/)
})
