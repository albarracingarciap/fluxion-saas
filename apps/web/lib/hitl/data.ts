import 'server-only'

import { createFluxionClient } from '@/lib/supabase/fluxion'

/**
 * Panel de supervisión humana.
 *
 * La agregación la hace PostgreSQL en una sola llamada. Traerse las decisiones
 * al servidor para contarlas funciona con datos de prueba y se cae con el primer
 * cliente que revise mil casos al día.
 */

export type HitlOverview = {
  days: number
  totales: {
    decisiones: number
    conformes: number
    discordantes: number
    no_usadas: number
    revisores: number
    sistemas: number
    mediana_ms: number | null
    sin_motivo: number
  }
  por_sistema: Array<{
    system_id: string
    system_name: string | null
    decisiones: number
    conformes: number
    mediana_ms: number | null
  }>
  por_revisor: Array<{
    reviewer_ref: string
    reviewer_role: string | null
    decisiones: number
    conformes: number
    mediana_ms: number | null
  }>
  por_motivo: Array<{ code: string; label: string; category: string; veces: number }>
  serie: Array<{ day: string; decisiones: number; conformes: number }>
}

/**
 * Umbrales del aviso de sesgo de automatización (art. 14.4.b).
 *
 * Ninguno de los dos vale por separado. Una concordancia altísima puede
 * significar que el modelo es bueno; una decisión rápida, que el caso era
 * fácil. Juntas, y sostenidas sobre suficientes casos, describen a alguien
 * pulsando "aceptar".
 *
 * MIN_CASOS existe para no acusar a nadie con cuatro decisiones: con muestras
 * pequeñas, el 100 % de concordancia es lo normal.
 */
export const SESGO = {
  MIN_CASOS: 20,
  CONCORDANCIA: 0.98,
  MEDIANA_MS: 5000,
}

export type AvisoSesgo = {
  ambito: 'revisor'
  ref: string
  rol: string | null
  decisiones: number
  concordancia: number
  medianaMs: number
}

export function detectarSesgo(o: HitlOverview): AvisoSesgo[] {
  return o.por_revisor
    .filter(
      (r) =>
        r.decisiones >= SESGO.MIN_CASOS &&
        r.conformes / r.decisiones >= SESGO.CONCORDANCIA &&
        r.mediana_ms != null &&
        r.mediana_ms < SESGO.MEDIANA_MS,
    )
    .map((r) => ({
      ambito: 'revisor' as const,
      ref: r.reviewer_ref,
      rol: r.reviewer_role,
      decisiones: r.decisiones,
      concordancia: r.conformes / r.decisiones,
      medianaMs: r.mediana_ms!,
    }))
}

export async function getHitlOverview(days = 90): Promise<HitlOverview> {
  const fluxion = createFluxionClient()
  const { data, error } = await fluxion.rpc('hitl_overview', { p_days: days })

  if (error) {
    console.error('getHitlOverview:', error)
  }

  const vacio: HitlOverview = {
    days,
    totales: {
      decisiones: 0, conformes: 0, discordantes: 0, no_usadas: 0,
      revisores: 0, sistemas: 0, mediana_ms: null, sin_motivo: 0,
    },
    por_sistema: [], por_revisor: [], por_motivo: [], serie: [],
  }

  if (!data) return vacio

  const o = data as HitlOverview
  return {
    ...vacio,
    ...o,
    totales: { ...vacio.totales, ...(o.totales ?? {}) },
  }
}
