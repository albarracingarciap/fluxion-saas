/**
 * Acta de una sesión de comité en HTML (B20b), para el PDF que se guarda como
 * evidencia al cerrar la sesión. Mismo estilo que los hitos de B19.
 *
 * Módulo puro.
 */

import { cover, esc, page, type MilestoneCover } from '@/lib/milestones/milestone-html'

import type { AgendaItem, Attendee, Decision } from './committee-sessions'

export type SessionMinutes = {
  cover: MilestoneCover
  agenda: Array<AgendaItem & { approval_label: string | null; approval_status: string | null }>
  attendees: Attendee[]
  decisions: Array<Decision & { owner_name: string | null }>
  minutesText: string
  quorum: { present: number; required: number; met: boolean }
}

const ROL: Record<string, string> = {
  president: 'Presidente', secretary: 'Secretario', member: 'Miembro', advisor: 'Asesor (voz sin voto)',
}

const parrafos = (t: string) =>
  t.split(/\n{2,}/).map((p) => `<p>${esc(p).replace(/\n/g, '<br/>')}</p>`).join('')

export function sessionMinutesHtml(m: SessionMinutes): string {
  const puntos = m.agenda.map((p, i) => {
    const solicitud = p.approval_label
      ? `<br/><span class="small">Solicitud de aprobación: ${esc(p.approval_label)}${p.approval_status ? ` · ${esc(p.approval_status)}` : ''}</span>`
      : ''
    const datos = p.data_summary ? `<br/><span class="small">${esc(p.data_summary).replace(/\n/g, '<br/>')}</span>` : ''
    return `<tr><td class="c">${i + 1}</td><td>${esc(p.title)}${solicitud}${datos}</td><td class="small">${esc(p.notes)}</td></tr>`
  }).join('')
  const miembros = m.attendees.filter((a) => a.member_id)
  const invitados = m.attendees.filter((a) => !a.member_id)
  const asistentes = miembros.map((a) =>
    `<tr><td>${esc(a.name)}</td><td>${esc(ROL[a.committee_role ?? ''] ?? a.committee_role ?? '—')}</td><td class="c">${a.voting ? 'Sí' : 'No'}</td><td class="c">${a.present ? 'Asiste' : 'Ausente'}</td></tr>`,
  ).join('')
  const nombrePunto = new Map(m.agenda.map((p, i) => [p.id, `${i + 1}`]))
  const acuerdos = m.decisions.length === 0 ? '<p class="meta">Sin acuerdos.</p>' : `
    <table><thead><tr><th class="c">Nº</th><th style="width:46%">Acuerdo</th><th class="c">Punto</th><th>Responsable</th><th>Fecha límite</th></tr></thead>
    <tbody>${m.decisions.map((d, i) => `<tr><td class="c">${i + 1}</td><td>${esc(d.text)}</td><td class="c">${esc(d.agenda_item_id ? nombrePunto.get(d.agenda_item_id) ?? '—' : '—')}</td><td>${esc(d.owner_name ?? '—')}</td><td>${esc(d.due_date ? new Date(d.due_date).toLocaleDateString('es-ES') : '—')}</td></tr>`).join('')}</tbody></table>`
  const quorum = `<p class="small">Quórum: ${m.quorum.present} de ${m.quorum.required} miembros con voto necesarios · ${m.quorum.met ? 'alcanzado' : '<b>no alcanzado</b>'}.</p>`
  return page(m.cover.title, `${cover(m.cover)}
    <h2>Orden del día</h2>
    ${m.agenda.length ? `<table><thead><tr><th class="c">Nº</th><th style="width:50%">Punto</th><th>Notas</th></tr></thead><tbody>${puntos}</tbody></table>` : '<p class="meta">Sin puntos.</p>'}
    <h2>Asistentes</h2>
    <table><thead><tr><th>Miembro</th><th>Cargo</th><th class="c">Voto</th><th class="c">Asistencia</th></tr></thead><tbody>${asistentes}</tbody></table>
    ${invitados.length ? `<p class="small">Invitados: ${invitados.map((a) => esc(a.name + (a.committee_role ? ` (${a.committee_role})` : ''))).join(', ')}.</p>` : ''}
    ${quorum}
    <h2>Acta</h2>
    ${parrafos(m.minutesText)}
    <h2>Acuerdos</h2>
    ${acuerdos}
    <p class="meta">Las decisiones sobre solicitudes de aprobación constan en Flujos de aprobación, con su propia acta.</p>`)
}
