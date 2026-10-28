// Sesiones de comité (lib/governance/committee-sessions.ts y el acta, B20b).
import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  closeBlockers, mergeAttendees, normalizeAgenda, normalizeDecisions, sessionQuorum, sessionTypesFor,
  type Attendee,
} from '../lib/governance/committee-sessions'
import { sessionMinutesHtml } from '../lib/governance/committee-session-html'

const miembros = [
  { id: 'm1', name: 'Ana', committee_role: 'president' },
  { id: 'm2', name: 'Luis', committee_role: 'member' },
  { id: 'm3', name: 'Eva', committee_role: 'member' },
  { id: 'm4', name: 'DPO', committee_role: 'advisor' },
]

test('la revisión por la dirección solo en su comité', () => {
  assert.deepEqual(sessionTypesFor('ai_committee'), ['ordinary', 'extraordinary'])
  assert.equal(sessionTypesFor('director_review')[0], 'management_review')
})

test('los asistentes siguen a los miembros y conservan lo marcado e invitados', () => {
  const previos: Attendee[] = [
    { member_id: 'm1', name: 'Ana', committee_role: 'president', voting: true, present: true },
    { member_id: 'm9', name: 'Ex miembro', committee_role: 'member', voting: true, present: true },
    { member_id: 'm8', name: 'Ausente que se fue', committee_role: 'member', voting: true, present: false },
    { member_id: null, name: 'Auditora', committee_role: 'Externa', voting: false, present: true },
  ]
  const a = mergeAttendees(miembros, previos)
  assert.deepEqual(a.map((x) => x.name), ['Ana', 'Luis', 'Eva', 'DPO', 'Ex miembro', 'Auditora'])
  assert.equal(a[0]!.present, true)
  assert.equal(a[1]!.present, false)
  assert.equal(a[3]!.voting, false)
})

test('quórum: mayoría de los miembros con voto, sin asesores ni invitados', () => {
  const a = mergeAttendees(miembros, []).map((x) => ({ ...x, present: x.member_id === 'm1' || x.member_id === 'm4' }))
  assert.deepEqual(sessionQuorum(a, null), { present: 1, required: 2, met: false })
  const b = a.map((x) => (x.member_id === 'm2' ? { ...x, present: true } : x))
  assert.equal(sessionQuorum(b, null).met, true)
  assert.equal(sessionQuorum(b, 3).met, false)
  assert.equal(sessionQuorum([], null).met, false)
})

test('qué falta para cerrar la sesión', () => {
  const base = {
    status: 'in_progress' as const,
    agenda: normalizeAgenda([{ id: 'p1', title: 'Seguimiento de riesgos' }]),
    attendees: [{ member_id: 'm1', name: 'Ana', committee_role: 'president', voting: true, present: true }],
    decisions: [],
    minutesText: 'Se revisa el estado.',
  }
  assert.deepEqual(closeBlockers(base), [])
  assert.equal(closeBlockers({ ...base, agenda: [] }).length, 1)
  assert.equal(closeBlockers({ ...base, minutesText: '  ' }).length, 1)
  assert.equal(closeBlockers({ ...base, status: 'completed' }).length, 1)
  const sinResponsable = normalizeDecisions([{ text: 'Revisar', due_date: '2026-11-30' }])
  assert.match(closeBlockers({ ...base, decisions: sinResponsable }).join(' '), /responsable/)
})

test('normaliza el JSON guardado', () => {
  assert.deepEqual(normalizeAgenda([null, { title: 'X', approval_request_id: '' }]), [{ id: 'p1', title: 'X', notes: '', approval_request_id: null }])
  assert.deepEqual(normalizeDecisions('nada'), [])
})

test('el acta escapa el texto y marca el quórum', () => {
  const html = sessionMinutesHtml({
    cover: { title: 'Acta · Comité de IA', subtitle: 'Sesión nº 1 · Ordinaria', organizationName: 'Org', rows: [], renderId: 'r1', contentChecksum: 'c' },
    agenda: [{ id: 'p1', title: 'Plan <b>', notes: '', approval_request_id: 'x', approval_label: 'Plan PT-1', approval_status: 'Pendiente' }],
    attendees: [{ member_id: 'm1', name: 'Ana', committee_role: 'president', voting: true, present: true }],
    decisions: [{ id: 'a1', text: 'Aprobar', agenda_item_id: 'p1', owner_profile_id: null, due_date: null, task_id: null, owner_name: null }],
    minutesText: 'Línea 1\n\nLínea 2',
    quorum: { present: 1, required: 2, met: false },
  })
  assert.match(html, /Plan &lt;b&gt;/)
  assert.match(html, /no alcanzado/)
  assert.match(html, /Solicitud de aprobación: Plan PT-1/)
  assert.equal((html.match(/<p>Línea/g) ?? []).length, 2)
})
