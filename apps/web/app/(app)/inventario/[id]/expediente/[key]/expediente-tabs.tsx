import Link from 'next/link'

import type { TemplateOption } from '@/lib/documents/templates'

/**
 * Pestañas del expediente: solo las plantillas que aplican al sistema (DP-11),
 * más las que ya tienen documento aunque hayan dejado de aplicar.
 */
export function ExpedienteTabs({ templates, templateKey, aiSystemId }: {
  templates: TemplateOption[]
  templateKey: string
  aiSystemId: string
}) {
  if (templates.length <= 1) return null
  return (
    <div className="flex gap-1.5 flex-wrap border-b border-ltb pb-3">
      {templates.map((t) => (
        <Link
          key={t.key}
          href={`/inventario/${aiSystemId}/expediente/${t.key}`}
          title={t.reason || undefined}
          className={`px-3 py-1.5 rounded-[7px] font-sora text-[12.5px] border transition-colors ${
            t.key === templateKey
              ? 'border-brand-cyan text-brand-cyan bg-ltcard'
              : 'border-ltb text-lttm hover:text-ltt'
          }`}
        >
          {t.title.split('·')[0]!.trim()}
          {t.mode === 'proveedor' && <span className="ml-1.5 text-lttm">· del proveedor</span>}
          {t.mode === 'no_aplica' && <span className="ml-1.5 text-lttm">· no aplica</span>}
          {t.hasDocument && t.key !== templateKey && <span className="ml-1.5 text-gr">•</span>}
        </Link>
      ))}
    </div>
  )
}
