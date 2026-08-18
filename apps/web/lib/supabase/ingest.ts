import { createClient } from '@supabase/supabase-js'

/**
 * Cliente de servicio SIN caché, para autenticación e ingesta.
 *
 * Next.js 14 parchea `fetch` y cachea las respuestas GET. El cliente de Supabase
 * usa fetch por debajo, así que sin esto una consulta se sirve de caché — y eso,
 * en una comprobación de autorización, significó que una clave API revocada
 * siguiera autenticando durante la ventana de caché. Comprobado en producción.
 *
 * Todo lo que decida permisos o lea estado que cambia desde fuera debe usar
 * este cliente y no `createAdminFluxionClient`.
 */
export function createNoCacheAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      db: { schema: 'fluxion' },
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: {
        fetch: (input: RequestInfo | URL, init?: RequestInit) =>
          fetch(input, { ...init, cache: 'no-store' }),
      },
    }
  )
}
