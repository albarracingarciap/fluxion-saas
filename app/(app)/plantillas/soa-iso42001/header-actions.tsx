'use client'

import { useState } from 'react'
import { Settings2, History, FileDown } from 'lucide-react'
import { MetadataModal } from './metadata-modal'
import { HistoryModal } from './history-modal'
import type { SoAMetadata } from '@/lib/templates/data'

type Props = {
  metadata: SoAMetadata
  availableTags: string[]
}

export function HeaderActions({ metadata, availableTags }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)

  const handlePrint = () => {
    window.print()
  }

  return (
    <>
      <button
        onClick={handlePrint}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-cyan-dim border border-cyan-border text-brand-cyan font-sora text-[13px] font-medium hover:bg-brand-cyan hover:text-white transition-all group"
      >
        <FileDown size={16} className="text-brand-cyan group-hover:text-white transition-colors" />
        Exportar PDF
      </button>

      <button
        onClick={() => setIsHistoryOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-ltbg border border-ltb text-ltt font-sora text-[13px] font-medium hover:border-brand-cyan/40 hover:text-brand-cyan transition-all group"
      >
        <History size={16} className="text-lttm group-hover:text-brand-cyan transition-colors" />
        Ver Historial
      </button>

      <button
        onClick={() => setIsModalOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] bg-ltcard border border-ltb text-ltt font-sora text-[13px] font-medium hover:border-brand-cyan/40 hover:text-brand-cyan transition-all group"
      >
        <Settings2 size={16} className="text-lttm group-hover:text-brand-cyan transition-colors" />
        Configurar Cabecera
      </button>

      <MetadataModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialData={metadata}
        availableTags={availableTags}
      />

      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </>
  )
}
