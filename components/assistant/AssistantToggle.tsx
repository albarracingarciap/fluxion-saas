'use client'

import { Bot } from 'lucide-react'

interface AssistantToggleProps {
  onClick: () => void
}

export function AssistantToggle({ onClick }: AssistantToggleProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Abrir asistente de gobernanza"
      className="fixed bottom-6 right-6 z-[80] w-[48px] h-[48px] rounded-full bg-dk7 border border-dkb shadow-[0_4px_20px_rgba(0,0,0,0.35)] flex items-center justify-center hover:bg-dk6 hover:border-brand-cyan hover:shadow-[0_4px_20px_rgba(0,173,239,0.2)] transition-all duration-200 group"
    >
      <Bot size={20} className="text-brand-cyan group-hover:scale-110 transition-transform duration-200" />
    </button>
  )
}
