import { Palette } from 'lucide-react'
import { SectionHeader, ComingSoonNotice } from './shared'

export function AparienciaTab() {
  return (
    <div>
      <SectionHeader
        icon={<Palette size={16} className="text-ltt2" />}
        title="Apariencia"
        description="Tema visual y densidad de información en la interfaz."
      />

      <ComingSoonNotice>
        La elección entre tema claro y oscuro y la densidad compacta de tablas
        estarán disponibles en una próxima actualización.
      </ComingSoonNotice>
    </div>
  )
}
