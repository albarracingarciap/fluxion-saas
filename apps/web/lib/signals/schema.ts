/**
 * Validación del cuerpo de POST /api/ingest/v1/signals.
 *
 * Los mensajes de error se devuelven al módulo emisor, así que están escritos
 * para que quien integra entienda qué mandó mal sin tener que preguntar.
 */

import { z } from 'zod'

import { SIGNAL_SEVERITIES } from './types'

/** Tope por petición: un módulo con un fallo no debe poder enviar medio millón. */
export const MAX_SIGNALS_PER_REQUEST = 100

export const signalInputSchema = z.object({
  system_id: z
    .string()
    .uuid('system_id debe ser un UUID del sistema afectado.')
    .nullish(),

  source_module: z
    .string()
    .min(1, 'source_module es obligatorio: identifica al módulo emisor.')
    .max(64),

  source_ref: z.string().max(256).nullish(),

  signal_type: z
    .string()
    .min(1, 'signal_type es obligatorio, p.ej. "drift.data".')
    .max(64),

  severity: z.enum(SIGNAL_SEVERITIES, {
    message: `severity debe ser uno de: ${SIGNAL_SEVERITIES.join(', ')}.`,
  }),

  title: z
    .string()
    .min(1, 'title es obligatorio.')
    .max(300, 'title no puede superar 300 caracteres; usa summary para el detalle.'),

  summary: z.string().max(4000).nullish(),

  metric_name: z.string().max(64).nullish(),
  metric_value: z.number().finite().nullish(),
  threshold: z.number().finite().nullish(),

  payload: z.record(z.string(), z.unknown()).optional(),

  occurred_at: z
    .string()
    .datetime({ message: 'occurred_at debe ser una fecha ISO 8601 con zona horaria.' })
    .nullish(),

  dedupe_key: z
    .string()
    .max(256)
    .nullish()
    .describe('Convención: <modulo>:<recurso>:<periodo>'),
})

export type ValidatedSignal = z.infer<typeof signalInputSchema>

/**
 * Acepta un objeto o un array. Los módulos de drift y telemetría envían por
 * lotes; los conectores suelen enviar de una en una.
 */
export function parseBody(body: unknown): { items: unknown[] } | { error: string } {
  if (Array.isArray(body)) {
    if (body.length === 0) return { error: 'El array de señales está vacío.' }
    if (body.length > MAX_SIGNALS_PER_REQUEST) {
      return {
        error: `Máximo ${MAX_SIGNALS_PER_REQUEST} señales por petición; se recibieron ${body.length}.`,
      }
    }
    return { items: body }
  }

  if (body && typeof body === 'object') return { items: [body] }

  return { error: 'El cuerpo debe ser un objeto de señal o un array de señales.' }
}

/** Aplana los errores de zod a un mensaje legible de una línea. */
export function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((i) => {
      const path = i.path.join('.')
      return path ? `${path}: ${i.message}` : i.message
    })
    .join(' · ')
}
