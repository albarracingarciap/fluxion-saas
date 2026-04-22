'use client'

import { Bot, X } from 'lucide-react'

interface AssistantHeaderProps {
  onClose: () => void
  onNewConversation: () => void
}

export function AssistantHeader({ onClose, onNewConversation }: AssistantHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-dk8 border-b border-dkb">
      <div className="flex items-center gap-2.5">
        <div className="w-[28px] h-[28px] rounded-full bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center shadow-[0_2px_8px_rgba(0,173,239,0.25)]">
          <Bot size={14} className="text-white" />
        </div>
        <div>
          <div className="font-sora text-[13px] font-semibold text-dkt leading-tight">
            Asistente SGAI
          </div>
          <div className="font-plex text-[9.5px] text-dkt2 leading-tight">
            Fluxion · Gobernanza IA
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onNewConversation}
          title="Nueva conversación"
          className="px-2.5 py-1.5 rounded-[6px] font-plex text-[9.5px] text-dkt2 hover:bg-dk7 hover:text-dkt border border-transparent hover:border-dkb transition-colors"
        >
          + Nueva
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          className="w-[28px] h-[28px] flex items-center justify-center rounded-[6px] text-dktm hover:text-dkt hover:bg-dk7 transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
