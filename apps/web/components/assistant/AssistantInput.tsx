'use client'

import { useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

interface AssistantInputProps {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  disabled: boolean
}

export function AssistantInput({ value, onChange, onSubmit, disabled }: AssistantInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }, [value])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSubmit()
    }
  }

  return (
    <div className="flex-shrink-0 border-t border-ltb bg-ltcard px-3 py-3">
      <div className="flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder="Escribe tu pregunta..."
          rows={1}
          className="flex-1 resize-none rounded-[8px] border border-ltb bg-ltcard2 px-3 py-2 font-sora text-[13px] text-ltt placeholder:text-lttm focus:outline-none focus:border-brand-cyan focus:ring-1 focus:ring-[var(--cyan-border)] disabled:opacity-50 transition-colors"
        />
        <button
          type="button"
          onClick={onSubmit}
          disabled={disabled || !value.trim()}
          className="flex-shrink-0 w-[36px] h-[36px] rounded-[8px] bg-brand-cyan flex items-center justify-center text-white hover:bg-[#00adef]/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {disabled
            ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            : <Send size={14} />
          }
        </button>
      </div>
      <p className="font-plex text-[11px] text-ltt2 mt-2 text-center">
        Enter para enviar · Shift+Enter para nueva línea
      </p>
    </div>
  )
}
