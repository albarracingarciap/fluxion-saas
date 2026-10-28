/**
 * Informe de supervisión humana de un sistema en HTML (B30b, DP-13), para el
 * PDF que se registra como evidencia («Acta de supervisión humana»). Mismo
 * estilo que los hitos (B19) y las actas de comité (B20b).
 *
 * Módulo puro.
 */

import { cover, esc, page, type MilestoneCover } from '@/lib/milestones/milestone-html'

export type HitlReport = {
  cover: MilestoneCover
  totals: { decisions: number; agreements: number; discordant: number; notUsed: number; reviewers: number; medianMs: number | null; withoutReason: number }
  reviewers: Array<{ ref: string; role: string | null; decisions: number; agreements: number; medianMs: number | null; bias: boolean }>
  reasons: Array<{ label: string; times: number }>
  daily: Array<{ day: string; decisions: number; agreements: number }>
  thresholds: { minCases: number; agreement: number; medianMs: number }
}

const pct = (n: number, d: number) => (d ? `${Math.round((n / d) * 100)} %` : '—')
const dur = (ms: number | null) => (ms == null ? '—' : ms < 1000 ? `${ms} ms` : ms < 60000 ? `${(ms / 1000).toFixed(1)} s` : `${Math.round(ms / 60000)} min`)

export function hitlReportHtml(r: HitlReport): string {
  const t = r.totals
  const indicadores = `
    <table><tbody>
      <tr><td>Decisiones revisadas</td><td><b>${t.decisions}</b> (${t.reviewers} revisores)</td></tr>
      <tr><td>Concordancia con la IA</td><td><b>${pct(t.agreements, t.decisions)}</b> · ${t.discordant} discordancias, ${t.notUsed} veces sin usar el resultado</td></tr>
      <tr><td>Tiempo mediano de decisión</td><td><b>${dur(t.medianMs)}</b></td></tr>
      <tr><td>Discordancias sin motivo</td><td><b>${t.withoutReason}</b></td></tr>
    </tbody></table>`
  const sesgo = r.reviewers.filter((x) => x.bias)
  const avisoSesgo = sesgo.length
    ? `<p><b>Indicios de sesgo de automatización</b> (AI Act, Art. 14.4.b): ${sesgo.map((x) => esc(x.ref)).join(', ')}. Umbrales: al menos ${r.thresholds.minCases} decisiones, ${Math.round(r.thresholds.agreement * 100)} % de concordancia o más y mediana por debajo de ${r.thresholds.medianMs / 1000} s.</p>`
    : '<p class="small">Sin indicios de sesgo de automatización en el periodo.</p>'
  const revisores = r.reviewers.length === 0 ? '<p class="meta">Sin revisores en el periodo.</p>' : `
    <table><thead><tr><th>Revisor (seudónimo)</th><th>Rol</th><th class="c">Decisiones</th><th class="c">Concordancia</th><th class="c">Mediana</th><th class="c">Aviso</th></tr></thead>
    <tbody>${r.reviewers.map((x) => `<tr><td class="mono">${esc(x.ref)}</td><td>${esc(x.role ?? '—')}</td><td class="c">${x.decisions}</td><td class="c">${pct(x.agreements, x.decisions)}</td><td class="c">${dur(x.medianMs)}</td><td class="c">${x.bias ? 'Sesgo' : ''}</td></tr>`).join('')}</tbody></table>`
  const motivos = r.reasons.length === 0 ? '<p class="meta">Sin discordancias en el periodo.</p>' : `
    <table><thead><tr><th>Motivo</th><th class="c">Veces</th></tr></thead>
    <tbody>${r.reasons.map((x) => `<tr><td>${esc(x.label)}</td><td class="c">${x.times}</td></tr>`).join('')}</tbody></table>`
  const diario = r.daily.length === 0 ? '<p class="meta">Sin decisiones en el periodo.</p>' : `
    <table><thead><tr><th>Día</th><th class="c">Decisiones</th><th class="c">Concordancia</th></tr></thead>
    <tbody>${r.daily.map((x) => `<tr><td>${esc(new Date(`${x.day}T00:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' }))}</td><td class="c">${x.decisions}</td><td class="c">${pct(x.agreements, x.decisions)}</td></tr>`).join('')}</tbody></table>`
  return page(r.cover.title, `${cover(r.cover)}
    <h2>Indicadores</h2>${indicadores}${avisoSesgo}
    <h2>Por revisor</h2>${revisores}
    <h2>Motivos de discordancia</h2>${motivos}
    <h2>Evolución diaria</h2>${diario}
    <p class="meta">Datos registrados en Supervisión humana por la API de ingesta o por importación. Solo referencias seudonimizadas: el informe no contiene datos de los casos.</p>`)
}
