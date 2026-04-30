'use client'

import { Download } from 'lucide-react'
import type { ExcludedGapRecord } from '@/lib/gaps/data'
import { downloadExcludedGapsCsv } from '@/lib/gaps/csv'

type Props = {
  gaps: ExcludedGapRecord[]
  fileName?: string
}

export function ExportExcludedCsvButton({ gaps, fileName }: Props) {
  return (
    <button
      type="button"
      disabled={gaps.length === 0}
      onClick={() => downloadExcludedGapsCsv(gaps, fileName)}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-[9px] border border-ltb bg-white text-ltt font-sora text-[13px] font-medium hover:bg-ltbg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download size={14} />
      Exportar CSV
    </button>
  )
}
