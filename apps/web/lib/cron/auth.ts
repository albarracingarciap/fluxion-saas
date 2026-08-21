import { NextResponse, type NextRequest } from 'next/server'

/**
 * Autorización de los endpoints de cron.
 *
 * Devuelve una respuesta si hay que cortar, o `null` si la petición pasa.
 *
 * ANTES fallaba en abierto: la comprobación era
 *
 *   if (cronSecret && authHeader !== `Bearer ${cronSecret}`) → 401
 *
 * de modo que **sin `CRON_SECRET` definida no se comprobaba nada** y el
 * endpoint quedaba abierto a cualquiera. Una protección que se desactiva sola
 * cuando falta su configuración es peor que no tenerla, porque el panel dice
 * que está protegida.
 *
 * Ahora falla en cerrado: sin secreto, 503 y una línea en el log. El runner
 * (`infra/schedules/app-cron.sh`) exige HTTP 200, así que la falta de
 * configuración aparece en `/var/log/fluxion-cron.log` en la siguiente pasada
 * en lugar de pasar inadvertida.
 *
 * El valor tiene que ser el mismo en las variables de `fluxion-saas` y en
 * `/etc/fluxion/cron.env`.
 */
export function requireCronSecret(request: NextRequest, ruta: string): NextResponse | null {
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret) {
    console.error(`[${ruta}] CRON_SECRET sin definir: se rechaza la petición.`)
    return NextResponse.json(
      {
        error: 'cron_secret_missing',
        message: 'CRON_SECRET no está configurada en el servidor.',
      },
      { status: 503 }
    )
  }

  if (request.headers.get('authorization') !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  return null
}
