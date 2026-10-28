/**
 * HTML de los hitos (B19, GAP-33): evaluación de riesgos aprobada (FMEA y
 * plan) y Declaración de Aplicabilidad aprobada. Autocontenido, sin recursos
 * externos: el renderizador no sale a internet. Módulo puro.
 */

export function esc(s: string | number | null | undefined): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const CSS = `
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; font-size: 9.5pt; line-height: 1.45; color: #1a1f27; margin: 0; }
  h1 { font-size: 18pt; margin: 0 0 4pt; font-weight: 600; }
  h2 { font-size: 12pt; margin: 18pt 0 6pt; font-weight: 600; border-bottom: 1px solid #d7dde5; padding-bottom: 3pt; break-after: avoid; }
  .meta { color: #5b6b7f; font-size: 8.5pt; }
  .cover { border-bottom: 2px solid #1a1f27; padding-bottom: 12pt; margin-bottom: 14pt; }
  .cover dl { display: grid; grid-template-columns: auto 1fr; gap: 2pt 12pt; margin: 10pt 0 0; }
  .cover dt { color: #5b6b7f; font-size: 8.5pt; }
  .cover dd { margin: 0; font-size: 8.5pt; }
  .mono { font-family: "SFMono-Regular", Consolas, monospace; font-size: 7.5pt; word-break: break-all; }
  table { width: 100%; border-collapse: collapse; margin: 4pt 0 10pt; }
  th { text-align: left; font-size: 7.5pt; text-transform: uppercase; letter-spacing: .4px; color: #5b6b7f; border-bottom: 1px solid #d7dde5; padding: 4pt 5pt; }
  td { border-bottom: 1px solid #eef1f5; padding: 4pt 5pt; vertical-align: top; }
  tr { break-inside: avoid; }
  .c { text-align: center; }
  .small { font-size: 8pt; color: #3d4a5a; }
`

export type MilestoneCover = {
  title: string
  subtitle: string
  organizationName: string
  rows: Array<[string, string]>
  renderId: string
  contentChecksum: string
}

/** Portada común; también la usa el acta de las sesiones de comité (B20b). */
export function cover(c: MilestoneCover): string {
  return `<div class="cover">
    <p class="meta">${esc(c.subtitle)}</p>
    <h1>${esc(c.title)}</h1>
    <dl>
      <dt>Organización</dt><dd>${esc(c.organizationName)}</dd>
      ${c.rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
      <dt>Identificador</dt><dd class="mono">${esc(c.renderId)}</dd>
      <dt>Huella de los datos (SHA-256)</dt><dd class="mono">${esc(c.contentChecksum)}</dd>
    </dl>
  </div>`
}

export function page(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8" /><title>${esc(title)}</title><style>${CSS}</style></head><body>${body}</body></html>`
}

export function milestoneFooterHtml(label: string, renderId: string): string {
  return `<div style="font-size:7pt;color:#5b6b7f;width:100%;padding:0 12mm;display:flex;justify-content:space-between;font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif">
    <span>${esc(label)} · ${esc(renderId.slice(0, 8))}</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`
}

// ── Evaluación de riesgos (FMEA y plan) ─────────────────────────────────────

export type RiskEvaluationMilestone = {
  cover: MilestoneCover
  items: Array<{ dimension: string; code: string; name: string; sDefault: number | null; o: number | null; d: number | null; sActual: number | null; status: string; justification: string | null }>
  actions: Array<{ code: string; name: string; option: string; status: string; owner: string | null; dueDate: string | null; target: number | null }>
}

export function riskEvaluationHtml(m: RiskEvaluationMilestone): string {
  const porDimension = new Map<string, RiskEvaluationMilestone['items']>()
  for (const i of m.items) (porDimension.get(i.dimension) ?? porDimension.set(i.dimension, []).get(i.dimension)!).push(i)
  const evaluacion = Array.from(porDimension.entries()).map(([dim, items]) => `
    <h2>${esc(dim)}</h2>
    <table><thead><tr><th style="width:36%">Modo de fallo</th><th class="c">S ref.</th><th class="c">O</th><th class="c">D</th><th class="c">S actual</th><th>Estado</th><th style="width:28%">Justificación</th></tr></thead>
    <tbody>${items.map((i) => `<tr><td><span class="mono">${esc(i.code)}</span><br/>${esc(i.name)}</td><td class="c">${esc(i.sDefault ?? '—')}</td><td class="c">${esc(i.o ?? '—')}</td><td class="c">${esc(i.d ?? '—')}</td><td class="c"><b>${esc(i.sActual ?? '—')}</b></td><td>${esc(i.status)}</td><td class="small">${esc(i.justification ?? '')}</td></tr>`).join('')}</tbody></table>`).join('')
  const plan = m.actions.length === 0 ? '<p class="meta">El plan no tiene acciones.</p>' : `
    <table><thead><tr><th style="width:38%">Modo de fallo</th><th>Opción</th><th>Estado</th><th>Responsable</th><th>Fecha límite</th><th class="c">S objetivo</th></tr></thead>
    <tbody>${m.actions.map((a) => `<tr><td><span class="mono">${esc(a.code)}</span><br/>${esc(a.name)}</td><td>${esc(a.option)}</td><td>${esc(a.status)}</td><td>${esc(a.owner ?? '—')}</td><td>${esc(a.dueDate ?? '—')}</td><td class="c">${esc(a.target ?? '—')}</td></tr>`).join('')}</tbody></table>`
  return page(m.cover.title, `${cover(m.cover)}<h2>Evaluación de riesgos</h2>${evaluacion || '<p class="meta">Sin modos evaluados.</p>'}<h2>Plan de tratamiento</h2>${plan}`)
}

// ── Declaración de Aplicabilidad ────────────────────────────────────────────

export type SoaMilestone = {
  cover: MilestoneCover
  controls: Array<{ code: string; group: string; title: string; applicable: boolean; status: string; justification: string | null; owner: string | null }>
}

export function soaHtml(m: SoaMilestone): string {
  const grupos = new Map<string, SoaMilestone['controls']>()
  for (const c of m.controls) (grupos.get(c.group) ?? grupos.set(c.group, []).get(c.group)!).push(c)
  const cuerpo = Array.from(grupos.entries()).map(([g, cs]) => `
    <h2>${esc(g)}</h2>
    <table><thead><tr><th style="width:9%">Control</th><th style="width:30%">Título</th><th>Aplicable</th><th>Estado</th><th>Responsable</th><th style="width:30%">Justificación</th></tr></thead>
    <tbody>${cs.map((c) => `<tr><td class="mono">${esc(c.code)}</td><td>${esc(c.title)}</td><td>${c.applicable ? 'Sí' : 'No'}</td><td>${esc(c.applicable ? c.status : '—')}</td><td>${esc(c.owner ?? '—')}</td><td class="small">${esc(c.justification ?? '')}</td></tr>`).join('')}</tbody></table>`).join('')
  return page(m.cover.title, `${cover(m.cover)}${cuerpo}`)
}
