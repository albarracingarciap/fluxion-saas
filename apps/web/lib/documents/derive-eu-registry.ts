/**
 * Registro en la base de datos de la UE como plantilla del expediente (B16b,
 * DP-06 y DP-11): los datos del Anexo VIII del AI Act.
 *
 *   - Sección A: proveedor de un sistema de alto riesgo (Art. 49.1).
 *   - Sección B: proveedor que aplica la excepción del Art. 6.3 (Art. 49.2).
 *   - Sección C: responsable del despliegue que es autoridad pública (Art. 49.3).
 *
 * El documento muestra solo la sección que corresponde al sistema
 * (`documentApplicability`). Lo que Fluxion sabe de la organización y del
 * sistema se deriva; el resto se redacta. Si no hay dato, hueco.
 *
 * Lectura del AI Act pendiente de revisión jurídica (DP-11). Módulo puro.
 */
import { formatOutputTypes } from '@/lib/ai-systems/output-types'

type Row = Record<string, unknown>

function line(label: string, value: unknown): string | null {
  if (value === null || value === undefined || value === '') return null
  if (Array.isArray(value)) {
    const items = value.filter(Boolean)
    return items.length ? `${label}: ${items.join(', ')}` : null
  }
  if (typeof value === 'boolean') return `${label}: ${value ? 'sí' : 'no'}`
  return `${label}: ${String(value)}`
}

function block(...parts: Array<string | null>): string | null {
  const clean = parts.filter((p): p is string => Boolean(p))
  return clean.length ? clean.join('\n') : null
}

/** Anexo VIII, A.7 y B.8: situación del sistema en el mercado. */
const ESTADO: Record<string, string> = {
  produccion: 'Introducido en el mercado o puesto en servicio',
  piloto: 'En pruebas: aún no introducido en el mercado ni puesto en servicio',
  desarrollo: 'En desarrollo: aún no introducido en el mercado ni puesto en servicio',
  deprecado: 'Ya no se introduce en el mercado ni se pone en servicio',
  retirado: 'Retirado',
}

const CERTIFICACION: Record<string, string> = {
  declaracion_emitida: 'Declaración UE de conformidad emitida',
  en_evaluacion: 'En evaluación de la conformidad',
  certificacion_ce: 'Certificación CE',
  pendiente: 'Pendiente',
  no_aplica: 'No aplica',
}

/** Condiciones del Art. 6.3 (`aiact_inputs.art63.conditions`). */
const CONDICIONES_6_3: Record<string, string> = {
  a: 'a) realiza una tarea de procedimiento limitada',
  b: 'b) mejora el resultado de una actividad humana previamente realizada',
  c: 'c) detecta patrones de toma de decisiones o desviaciones respecto a patrones previos, sin sustituir ni influir en la valoración humana sin una revisión humana adecuada',
  d: 'd) realiza una tarea preparatoria para una evaluación pertinente a efectos de los casos del Anexo III',
}

export type EuRegistryContext = {
  system: Row
  organization: Row | null
  /** Enlaces a la entrada del proveedor en la base de datos de la UE (documentación del proveedor). */
  providerRegistryUrls: string[]
}

function organizacion(o: Row | null): string | null {
  if (!o) return null
  return block(
    line('Nombre', o.legal_name || o.name),
    line('Identificación fiscal', o.tax_id),
    line('Domicilio', o.registered_address),
    line('País', o.country),
    line('Sitio web', o.website),
  )
}

function identificacion(s: Row): string | null {
  return block(
    line('Nombre comercial', `${s.name ?? ''}${s.version ? ` v${s.version}` : ''}`.trim() || null),
    line('Código', s.code),
    line('Identificador interno', s.internal_id),
  )
}

function finalidad(s: Row): string | null {
  return block(
    line('Finalidad prevista', s.intended_use),
    line('Descripción', s.description),
    line('Tipo de salida', formatOutputTypes(s.output_types, s.output_type) || null),
    line('Totalmente automatizado', s.fully_automated),
  )
}

export function deriveEuRegistry(ref: string, ctx: EuRegistryContext): string | null {
  const s = ctx.system
  switch (ref) {
    case 'VIII.A.1':
    case 'VIII.B.1':
    case 'VIII.C.1':
      return organizacion(ctx.organization)
    case 'VIII.A.4':
    case 'VIII.B.4':
      return identificacion(s)
    case 'VIII.A.5':
    case 'VIII.B.5':
      return finalidad(s)
    case 'VIII.A.6':
      return block(
        line('Descripción técnica', s.technical_description),
        line('Fuentes de datos', s.data_sources),
        line('Categorías de datos', s.data_categories),
        line('Modelo base', s.base_model),
      )
    case 'VIII.A.7':
    case 'VIII.B.8':
      return s.status ? line('Situación', ESTADO[String(s.status)] ?? String(s.status)) : null
    case 'VIII.A.8':
      return s.cert_status ? line('Estado de la certificación', CERTIFICACION[String(s.cert_status)] ?? String(s.cert_status)) : null
    case 'VIII.A.10':
    case 'VIII.B.9':
      return line('Ámbito geográfico', s.geo_scope)
    case 'VIII.B.6': {
      const art63 = (s.aiact_inputs as { art63?: { conditions?: string[] } } | null)?.art63
      const condiciones = (art63?.conditions ?? []).map((c) => CONDICIONES_6_3[c] ?? c)
      return condiciones.length ? `Condiciones del Art. 6.3 que se cumplen:\n${condiciones.map((c) => `- ${c}`).join('\n')}` : null
    }
    case 'VIII.B.7': {
      const art63 = (s.aiact_inputs as { art63?: { justification?: string | null } } | null)?.art63
      return line('Justificación registrada en la clasificación', art63?.justification?.trim() || null)
    }
    case 'VIII.C.3': {
      // Número y URL indicados en la documentación del proveedor (2026-10-28) y enlaces adjuntos.
      const numero = String(ctx.system.provider_eu_registry_number ?? '').trim()
      const urls = Array.from(new Set([String(ctx.system.provider_eu_registry_url ?? '').trim(), ...ctx.providerRegistryUrls].filter(Boolean)))
      if (!numero && urls.length === 0) return null
      return [
        numero && `Número de registro del proveedor en la base de datos de la UE: ${numero}`,
        urls.length > 0 && `Entrada del proveedor en la base de datos de la UE:\n${urls.join('\n')}`,
      ].filter(Boolean).join('\n')
    }
    default:
      return null
  }
}

/** Solo los apartados de la sección que corresponde al sistema. */
export function euRegistrySectionFilter(section: 'A' | 'B' | 'C') {
  const prefijo = `VIII.${section}`
  return (ref: string) => ref === prefijo || ref.startsWith(`${prefijo}.`)
}
