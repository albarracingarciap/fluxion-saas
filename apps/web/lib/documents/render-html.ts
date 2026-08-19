import 'server-only'

import type { ComposedDocument } from './compose'

/**
 * HTML autocontenido del expediente, para el renderizador.
 *
 * Todo va embebido: sin hojas de estilo externas, sin tipografías remotas, sin
 * imágenes por URL. El renderizador no tiene salida a internet, así que
 * cualquier recurso externo saldría en blanco en el PDF y nadie se enteraría
 * hasta tener el fichero delante de un auditor.
 */

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** Preserva los saltos de línea del texto derivado y del redactado. */
function paragraphs(text: string): string {
  return esc(text)
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => `<p>${l}</p>`)
    .join('')
}

const CSS = `
  * { box-sizing: border-box; }
  body {
    font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    font-size: 10.5pt; line-height: 1.5; color: #1a1f27; margin: 0;
  }
  h1 { font-size: 20pt; margin: 0 0 4pt; font-weight: 600; }
  h2 {
    font-size: 13pt; margin: 20pt 0 6pt; font-weight: 600;
    border-bottom: 1px solid #d7dde5; padding-bottom: 4pt;
    /* Un epígrafe no debe quedarse solo al final de una página */
    break-after: avoid; page-break-after: avoid;
  }
  h3 { font-size: 11pt; margin: 12pt 0 3pt; font-weight: 600; break-after: avoid; }
  p { margin: 0 0 4pt; }
  .ref { font-family: "SFMono-Regular", Consolas, monospace; font-size: 8.5pt; color: #5b6b7f; }
  .meta { color: #5b6b7f; font-size: 9pt; }
  .cover { border-bottom: 2px solid #1a1f27; padding-bottom: 14pt; margin-bottom: 18pt; }
  .cover dl { display: grid; grid-template-columns: auto 1fr; gap: 2pt 12pt; margin: 12pt 0 0; }
  .cover dt { color: #5b6b7f; font-size: 9pt; }
  .cover dd { margin: 0; font-size: 9pt; }
  .cover dd.mono { font-family: "SFMono-Regular", Consolas, monospace; font-size: 7.5pt; word-break: break-all; }
  .verify { margin: 10pt 0 0; font-size: 7.5pt; color: #5b6b7f; line-height: 1.4; }
  .section { margin-bottom: 12pt; break-inside: avoid-page; page-break-inside: avoid; }
  .guidance { color: #5b6b7f; font-size: 8.5pt; font-style: italic; margin-bottom: 4pt; }
  .label {
    text-transform: uppercase; letter-spacing: 0.6px; font-size: 7.5pt;
    color: #5b6b7f; margin: 6pt 0 2pt;
  }
  .missing {
    border-left: 3px solid #c9312a; padding: 4pt 0 4pt 8pt;
    background: #fdf3f2; color: #8d2a24; font-size: 9.5pt;
  }
  .optional { color: #5b6b7f; font-size: 9.5pt; font-style: italic; }
  .warn {
    border: 1px solid #c9312a; background: #fdf3f2; color: #8d2a24;
    padding: 8pt 10pt; margin-bottom: 14pt; font-size: 9.5pt;
  }
  .warn ul { margin: 4pt 0 0; padding-left: 16pt; }
`

export type RenderContext = {
  organizationName: string
  generatedBy: string
  generatedAt: Date
  /** Referencia del render: lo que permite casar este papel con su fila. */
  renderId: string
  /** Hash de los datos con los que se compuso. El del fichero no cabe aquí. */
  contentChecksum: string
}

export function buildDocumentHtml(doc: ComposedDocument, ctx: RenderContext): string {
  const fecha = ctx.generatedAt.toLocaleString('es-ES')

  const aviso =
    doc.gaps.length > 0
      ? `<div class="warn">
           <strong>Expediente incompleto.</strong> Faltan ${doc.gaps.length} apartados
           obligatorios del Anexo IV en el momento de generar este documento:
           <ul>${doc.gaps.map((g) => `<li><span class="ref">${esc(g.ref)}</span> · ${esc(g.title)}</li>`).join('')}</ul>
         </div>`
      : ''

  const cuerpo = doc.sections
    .map((s) => {
      if (s.kind === 'heading') {
        return `<h2><span class="ref">${esc(s.ref)}</span> &nbsp; ${esc(s.title)}</h2>`
      }

      const partes: string[] = []
      if (s.derived) {
        partes.push(`<div class="label">Datos del registro</div>${paragraphs(s.derived)}`)
      }
      if (s.manual) {
        partes.push(
          `${s.derived ? '<div class="label">Descripción</div>' : ''}${paragraphs(s.manual)}`,
        )
      }
      if (!partes.length) {
        partes.push(
          s.required
            ? `<div class="missing">Apartado obligatorio sin cubrir.</div>`
            : `<div class="optional">No aplica a este sistema (el Reglamento lo condiciona a que proceda).</div>`,
        )
      }

      return `<div class="section">
        <h3><span class="ref">${esc(s.ref)}</span> &nbsp; ${esc(s.title)}</h3>
        <div class="guidance">${esc(s.guidance)}</div>
        ${partes.join('')}
      </div>`
    })
    .join('')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8"><title>${esc(doc.document.title)}</title>
<style>${CSS}</style></head>
<body>
  <div class="cover">
    <div class="meta">Reglamento (UE) 2024/1689 · Anexo IV · Artículo 11, apartado 1</div>
    <h1>${esc(doc.document.title)}</h1>
    <dl>
      <dt>Organización</dt><dd>${esc(ctx.organizationName)}</dd>
      <dt>Sistema de IA</dt><dd>${esc(doc.system?.name ?? '—')}</dd>
      <dt>Estado</dt><dd>${esc(doc.document.status)}</dd>
      <dt>Plantilla</dt><dd>Anexo IV, versión ${doc.document.template_version}</dd>
      <dt>Cobertura</dt><dd>${Math.round(doc.completeness * 100)} % de los apartados obligatorios</dd>
      <dt>Generado</dt><dd>${esc(fecha)} por ${esc(ctx.generatedBy)}</dd>
      <dt>Referencia</dt><dd class="mono">${esc(ctx.renderId)}</dd>
      <dt>Huella del contenido</dt><dd class="mono">${esc(ctx.contentChecksum)}</dd>
    </dl>
    <p class="verify">
      La huella corresponde a los datos con los que se compuso este documento, no
      al fichero: el hash del PDF no puede figurar dentro del propio PDF. Fluxion
      conserva ambos, junto al estado congelado del sistema en el momento de
      generarlo, bajo la referencia indicada.
    </p>
  </div>
  ${aviso}
  ${cuerpo}
</body></html>`
}

/** Pie con la paginación y la referencia del expediente. */
export function buildFooterHtml(doc: ComposedDocument, renderId: string): string {
  return `<div style="font-size:7pt;color:#5b6b7f;width:100%;padding:0 16mm;
    display:flex;justify-content:space-between;font-family:sans-serif;">
    <span>${esc(doc.document.title)} · Anexo IV · ${esc(renderId.slice(0, 8))}</span>
    <span>Página <span class="pageNumber"></span> de <span class="totalPages"></span></span>
  </div>`
}
