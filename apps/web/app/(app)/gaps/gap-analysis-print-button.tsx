'use client'

import { Download, Printer } from 'lucide-react'

export function GapAnalysisPrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] text-white bg-gradient-to-r from-brand-cyan to-brand-blue font-sora text-[13px] font-medium shadow-[0_2px_14px_rgba(0,173,239,0.28)] hover:-translate-y-px transition-all print:hidden"
    >
      <Printer className="w-4 h-4" />
      <Download className="w-4 h-4" />
      Exportar / Imprimir
    </button>
  )
}
