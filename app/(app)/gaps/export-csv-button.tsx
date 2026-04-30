'use client'

import { Download } from 'lucide-react'
import type { UnifiedGapRecord } from '@/lib/gaps/data'
import { downloadGapsCsv } from '@/lib/gaps/csv'

type Props = {
  gaps: UnifiedGapRecord[]
  fileName?: string
}

export function ExportCsvButton({ gaps, fileName }: Props) {
  const disabled = gaps.length === 0

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => downloadGapsCsv(gaps, fileName)}
      title={disabled ? 'No hay gaps que exportar' : `Exportar ${gaps.length} gaps a CSV`}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] border border-ltb text-ltt font-sora text-[13px] font-medium bg-white hover:bg-ltbg transition-colors disabled:opacity-50 disabled:cursor-not-allowed print:hidden"
    >
      <Download size={15} />
      Exportar CSV
    </button>
  )
}
