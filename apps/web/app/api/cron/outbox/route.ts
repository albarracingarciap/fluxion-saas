import { NextResponse, type NextRequest } from 'next/server'

import { requireCronSecret } from '@/lib/cron/auth'
import { dispatchOutbox } from '@/lib/outbox/dispatch'

/**
 * GET /api/cron/outbox
 *
 * Entrega los eventos pendientes a los webhooks suscritos.
 *
 * Se ejecuta cada pocos minutos: la espera entre reintentos empieza en un
 * minuto, así que una cadencia mayor haría que el primer reintento tardara más
 * de lo que dice su propia política.
 *
 * Devuelve siempre 200 con el recuento, incluso si hubo entregas fallidas. Un
 * fallo de entrega es un dato del negocio, no un fallo del cron — y el runner
 * exige HTTP 200, así que devolver error aquí haría que un endpoint caído de un
 * cliente apareciera como una tarea programada rota.
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const corte = requireCronSecret(request, 'cron/outbox')
  if (corte) return corte

  const resultado = await dispatchOutbox()

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    ...resultado,
  })
}
