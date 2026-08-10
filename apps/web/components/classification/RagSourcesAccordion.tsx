import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import type { RagSource } from '@/types/classification'

interface RagSourcesAccordionProps {
  sources: RagSource[]
}

export function RagSourcesAccordion({ sources }: RagSourcesAccordionProps) {
  const [open, setOpen] = useState(false)

  if (sources.length === 0) return null

  return (
    <div className="border border-ltb rounded-[8px] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2.5 bg-ltcard2 hover:bg-ltbg transition-colors font-plex text-[11px] text-ltt2"
      >
        <span>Ver {sources.length} fuente{sources.length !== 1 ? 's' : ''} regulatoria{sources.length !== 1 ? 's' : ''} utilizadas</span>
        <ChevronDown size={13} className={`text-lttm transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="divide-y divide-ltb">
          {sources.map((src) => (
            <div key={src.chunk_id} className="px-3 py-2.5 bg-ltcard">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-plex text-[10px] font-semibold text-brand-cyan uppercase tracking-[0.6px]">
                  {src.article}
                </span>
                <span className="font-plex text-[10px] text-lttm">
                  {Math.round(src.relevance_score * 100)}% relevancia
                </span>
              </div>
              <p className="font-sora text-[11.5px] text-ltt2 leading-relaxed mb-1.5">
                {src.text_excerpt}
              </p>
              <div className="h-1 rounded-full bg-ltb overflow-hidden">
                <div
                  className="h-full rounded-full bg-brand-cyan"
                  style={{ width: `${Math.round(src.relevance_score * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
