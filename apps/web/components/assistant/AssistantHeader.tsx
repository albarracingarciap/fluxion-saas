'use client'

import { Bot, X } from 'lucide-react'

interface AssistantHeaderProps {
  onClose: () => void
  onNewConversation: () => void
}

export function AssistantHeader({ onClose, onNewConversation }: AssistantHeaderProps) {
  return (
    <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 bg-dk8 border-b border-dkb">
      <div className="flex items-center gap-3">
        <div className="w-[32px] h-[32px] rounded-full bg-gradient-to-tr from-brand-cyan to-brand-blue flex items-center justify-center shadow-[0_2px_8px_rgba(0,173,239,0.25)]">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <div className="font-sora text-[14px] font-semibold text-dkt leading-tight">
            Asistente SGAI
          </div>
          <div className="font-plex text-[11px] text-dkt2 leading-tight mt-0.5">
            Fluxion · Gobernanza IA
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onNewConversation}
          title="Nueva conversación"
          className="px-3 py-1.5 rounded-[6px] font-sora text-[12px] font-medium text-dkt border border-dkb hover:bg-dk7 hover:border-dkt2 transition-colors"
        >
          + Nueva
        </button>
        <button
          type="button"
          onClick={onClose}
          title="Cerrar"
          className="w-[30px] h-[30px] flex items-center justify-center rounded-[6px] text-dkt2 hover:text-dkt hover:bg-dk7 border border-transparent hover:border-dkb transition-colors"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  )
}
