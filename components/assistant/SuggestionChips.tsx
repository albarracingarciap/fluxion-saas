'use client'

const PAGE_SUGGESTIONS: Record<string, string[]> = {
  '/inventario': [
    '¿Qué sistemas tengo sin clasificar?',
    '¿Cuál es el estado general de mi inventario?',
    '¿Qué obligaciones implica tener un sistema de alto riesgo?',
  ],
  '/inventario/': [
    '¿Qué le falta a este sistema para cumplir el AI Act?',
    '¿Qué artículos del AI Act aplican a este sistema?',
    '¿Cuándo necesito segunda revisión en la evaluación FMEA?',
  ],
  '/gaps': [
    '¿Qué es más urgente resolver primero?',
    '¿Cuánto tiempo tengo para cerrar un gap normativo crítico?',
    '¿Cómo afecta un gap abierto a la certificación ISO 42001?',
  ],
  '/evaluaciones': [
    '¿Qué significa que un modo de fallo tenga S_default=9?',
    '¿Cómo afecta el Art. 10 AI Act a la evaluación de datos?',
    '¿Cuándo necesito segunda revisión en la FMEA?',
  ],
  '/dashboard': [
    '¿Qué tengo pendiente antes de la próxima auditoría?',
    '¿Cuántos gaps críticos tiene mi organización?',
    '¿Cuándo entra en vigor el AI Act para sistemas de alto riesgo?',
  ],
  default: [
    '¿Qué exige el AI Act para sistemas de alto riesgo?',
    '¿Cómo funciona la metodología R·I·D·E de Fluxion?',
    '¿Puedo certificarme en ISO 42001 con gaps abiertos?',
  ],
}

function getSuggestions(pathname: string): string[] {
  if (pathname.match(/\/inventario\/.+/)) return PAGE_SUGGESTIONS['/inventario/']
  for (const key of Object.keys(PAGE_SUGGESTIONS)) {
    if (key !== 'default' && pathname.startsWith(key)) return PAGE_SUGGESTIONS[key]
  }
  return PAGE_SUGGESTIONS.default
}

interface SuggestionChipsProps {
  pathname: string
  onSelect: (text: string) => void
}

export function SuggestionChips({ pathname, onSelect }: SuggestionChipsProps) {
  const suggestions = getSuggestions(pathname)

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <div className="flex flex-col items-center gap-1 pt-4">
        <p className="font-sora text-[12.5px] text-lttm text-center leading-relaxed">
          Pregúntame sobre el AI Act, ISO 42001, el estado<br />de tu SGAI o cómo usar Fluxion.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onSelect(s)}
            className="text-left px-3.5 py-2.5 rounded-[9px] border border-ltb bg-ltcard hover:border-brand-cyan hover:bg-[var(--cyan-dim)] transition-all duration-150 font-sora text-[12px] text-ltt2 hover:text-ltt"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
