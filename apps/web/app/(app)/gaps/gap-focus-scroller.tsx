'use client'

import { useEffect } from 'react'

type Props = {
  focusId: string | null
}

export function GapFocusScroller({ focusId }: Props) {
  useEffect(() => {
    if (!focusId) return

    const el = document.querySelector(`[data-gap-id="${focusId}"]`)
    if (!el) return

    el.scrollIntoView({ behavior: 'smooth', block: 'center' })

    el.classList.add('gap-focus-highlight')
    const timer = setTimeout(() => {
      el.classList.remove('gap-focus-highlight')
    }, 2500)

    return () => clearTimeout(timer)
  }, [focusId])

  return null
}
