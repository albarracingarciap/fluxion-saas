/**
 * Importación de decisiones humanas desde CSV (B30b, DP-13).
 *
 * Para quien no integra la API y para la supervisión por muestreo. Las mismas
 * columnas que el cuerpo de la API (`docs/ingesta.md`); una columna que no
 * está en la lista rechaza el fichero entero, porque es la forma más fácil de
 * colar contenido del caso («nombre», «diagnóstico»…). Las comprobaciones de
 * cada fila las hace después `insertHitlDecisions`, igual que en la API.
 *
 * Módulo puro.
 */

export const HITL_CSV_MAX_ROWS = 2000

export const HITL_CSV_COLUMNS = [
  'system_id', 'case_ref', 'ai_suggestion', 'ai_confidence', 'decision', 'human_outcome',
  'reason_code', 'reason_note', 'reviewer_ref', 'reviewer_role', 'decided_in_ms', 'occurred_at', 'dedupe_key',
] as const

/** Obligatorias. `system_id` puede faltar si se elige el sistema al importar. */
export const HITL_CSV_REQUIRED = ['case_ref', 'decision', 'occurred_at'] as const

const NUMERICAS = new Set(['ai_confidence', 'decided_in_ms'])

export const HITL_CSV_TEMPLATE =
  'case_ref,decision,ai_suggestion,human_outcome,reason_code,reviewer_ref,decided_in_ms,occurred_at\n' +
  'CASO-2026-00123,overridden,aprobar,denegar,datos_incompletos,REV-07,48000,2026-10-27T09:15:00Z\n'

/** Divide el texto en filas y celdas: comillas dobles, comillas escapadas y saltos de línea dentro de comillas. */
export function splitCsv(text: string): string[][] {
  const limpio = text.replace(/^﻿/, '')
  const primera = limpio.split(/\r?\n/, 1)[0] ?? ''
  // Excel en español exporta con punto y coma.
  const sep = (primera.match(/;/g) ?? []).length > (primera.match(/,/g) ?? []).length ? ';' : ','
  const filas: string[][] = []
  let fila: string[] = []
  let celda = ''
  let comillas = false
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i]!
    if (comillas) {
      if (c === '"' && limpio[i + 1] === '"') { celda += '"'; i++ }
      else if (c === '"') comillas = false
      else celda += c
    } else if (c === '"') comillas = true
    else if (c === sep) { fila.push(celda); celda = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++
      fila.push(celda); filas.push(fila); fila = []; celda = ''
    } else celda += c
  }
  if (celda !== '' || fila.length > 0) { fila.push(celda); filas.push(fila) }
  return filas.filter((f) => f.some((x) => x.trim() !== ''))
}

/** Fecha sin zona: se toma como UTC. Solo fecha: a las 00:00 UTC. */
export function normalizeOccurredAt(v: string): string {
  const t = v.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return `${t}T00:00:00Z`
  const m = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(:\d{2})?)$/.exec(t)
  if (m) return `${m[1]}T${m[3] ? m[2] : `${m[2]}:00`}Z`
  return t
}

export type HitlCsvParse =
  | { error: string }
  | { rows: Array<Record<string, unknown>> }

/**
 * Convierte el CSV en objetos con la forma del cuerpo de la API. `systemId`
 * se usa en las filas sin `system_id`. Cada fila lleva una `dedupe_key`
 * (la suya o una derivada) para que reimportar el mismo fichero no duplique.
 */
export function parseHitlCsv(text: string, systemId: string | null): HitlCsvParse {
  const filas = splitCsv(text)
  if (filas.length < 2) return { error: 'El fichero no tiene filas de datos.' }
  const cabecera = filas[0]!.map((h) => h.trim().toLowerCase())
  const desconocidas = cabecera.filter((h) => h && !(HITL_CSV_COLUMNS as readonly string[]).includes(h))
  if (desconocidas.length) {
    return { error: `Columnas no admitidas: ${desconocidas.join(', ')}. Solo se aceptan ${HITL_CSV_COLUMNS.join(', ')}; nunca el contenido del caso.` }
  }
  const faltan = HITL_CSV_REQUIRED.filter((c) => !cabecera.includes(c))
  if (!cabecera.includes('system_id') && !systemId) faltan.push('system_id' as never)
  if (faltan.length) return { error: `Faltan columnas obligatorias: ${faltan.join(', ')}.` }
  const datos = filas.slice(1)
  if (datos.length > HITL_CSV_MAX_ROWS) return { error: `Como máximo ${HITL_CSV_MAX_ROWS} filas por fichero; este tiene ${datos.length}.` }

  const rows = datos.map((celdas) => {
    const o: Record<string, unknown> = {}
    cabecera.forEach((h, i) => {
      const v = (celdas[i] ?? '').trim()
      if (!h || v === '') return
      if (NUMERICAS.has(h)) {
        const n = Number(v.replace(',', '.'))
        o[h] = h === 'decided_in_ms' ? Math.round(n) : n
      } else if (h === 'occurred_at') o[h] = normalizeOccurredAt(v)
      else if (h === 'decision') o[h] = v.toLowerCase()
      else o[h] = v
    })
    if (!o.system_id && systemId) o.system_id = systemId
    if (!o.dedupe_key) o.dedupe_key = `csv:${o.system_id ?? ''}:${o.case_ref ?? ''}:${o.occurred_at ?? ''}`
    return o
  })
  return { rows }
}
