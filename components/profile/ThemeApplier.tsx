'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/store/authStore'

export type ThemeChoice = 'light' | 'dark' | 'system'
export type DensityChoice = 'comfortable' | 'compact'

const THEME_KEY   = 'fluxion_theme'
const DENSITY_KEY = 'fluxion_density'

/**
 * Aplica `data-theme` y `data-density` al elemento <html> según las
 * preferencias del perfil del usuario. Sincroniza también con
 * localStorage para que el script bootstrap del root layout pueda
 * aplicar la preferencia antes del render de React (anti-FOUC).
 *
 * Para "system" escucha cambios en prefers-color-scheme.
 */
export function ThemeApplier() {
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    const prefs = (profile?.preferences ?? {}) as Record<string, unknown>
    const theme = (typeof prefs.theme === 'string' ? prefs.theme : 'light') as ThemeChoice
    const density = (
      typeof prefs.table_density === 'string' ? prefs.table_density : 'comfortable'
    ) as DensityChoice

    try {
      localStorage.setItem(THEME_KEY, theme)
      localStorage.setItem(DENSITY_KEY, density)
    } catch {
      /* localStorage no disponible (modo privado, etc.) — sin impacto funcional */
    }

    applyTheme(theme)
    applyDensity(density)

    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = (e: MediaQueryListEvent) => {
        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light')
      }
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [profile?.preferences])

  return null
}

// ─── Helpers exportados para uso desde la tab Apariencia ────────────────────
// La tab los llama directamente al cambiar la preferencia para previsualizar
// el cambio antes del Save.

export function applyTheme(theme: ThemeChoice) {
  const html = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    html.setAttribute('data-theme', prefersDark ? 'dark' : 'light')
  } else if (theme === 'dark') {
    html.setAttribute('data-theme', 'dark')
  } else {
    html.removeAttribute('data-theme')
  }
}

export function applyDensity(density: DensityChoice) {
  const html = document.documentElement
  if (density === 'compact') {
    html.setAttribute('data-density', 'compact')
  } else {
    html.removeAttribute('data-density')
  }
}
