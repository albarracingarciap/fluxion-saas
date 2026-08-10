import Link from "next/link";
import { ArrowLeft, ArrowRight, Database, ShieldAlert, Network, Shield, FileCheck, Scale, Link2, Shuffle, Share2 } from "lucide-react";

type CatalogCard = {
  href:        string
  icon:        React.ReactNode
  iconBg:      string
  iconColor:   string
  title:       string
  description: string
}

function Card({ href, icon, iconBg, iconColor, title, description }: CatalogCard) {
  return (
    <Link
      href={href}
      className="block relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_rgba(0,74,173,0.03)] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_rgba(0,173,239,0.10)] transition-all group cursor-pointer"
    >
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-cyan to-brand-blue" />
      <div className="p-5 relative z-10 flex flex-col h-full">
        <div className="flex items-center justify-between mb-4">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <ArrowRight className="w-4 h-4 text-lttm group-hover:text-brand-cyan transition-colors group-hover:translate-x-1" />
        </div>
        <h3 className="font-sora font-bold text-[17px] text-ltt mb-1">{title}</h3>
        <p className="font-sora text-[12px] text-ltt2 flex-1">{description}</p>
        <div className="mt-4 pt-3 border-t border-ltb">
          <span className="font-plex text-[10px] uppercase tracking-[1px] text-brand-cyan">Gestionar registros</span>
        </div>
      </div>
    </Link>
  )
}

const CATALOGOS: CatalogCard[] = [
  {
    href: '/datos/modos-de-fallo',
    icon: <ShieldAlert className="w-5 h-5" />,
    iconBg: 'bg-cyan-dim border border-cyan-border',
    iconColor: 'text-brand-cyan',
    title: 'Modos de Fallo',
    description: 'Vectores de riesgo paramétricos con metodologías R.I.D.E., severidad por defecto y dimensiones.',
  },
  {
    href: '/datos/medidas',
    icon: <Shield className="w-5 h-5" />,
    iconBg: 'bg-grdim border border-grb',
    iconColor: 'text-gr',
    title: 'Medidas de Control',
    description: 'Plantillas de controles y medidas de mitigación con guía de implementación y referencias normativas.',
  },
  {
    href: '/datos/tipos-de-evidencia',
    icon: <FileCheck className="w-5 h-5" />,
    iconBg: 'bg-cyan-dim border border-cyan-border',
    iconColor: 'text-brand-cyan',
    title: 'Tipos de Evidencia',
    description: 'Categorías de evidencia disponibles para vincular a obligaciones normativas y sistemas de IA.',
  },
  {
    href: '/datos/obligaciones',
    icon: <Scale className="w-5 h-5" />,
    iconBg: 'bg-ordim border border-orb',
    iconColor: 'text-or',
    title: 'Obligaciones',
    description: 'Catálogo normativo de obligaciones por framework: AI Act, ISO 42001, RGPD, DORA y más.',
  },
]

const CORRESPONDENCIAS: CatalogCard[] = [
  {
    href: '/datos/mappings/obligacion-evidencia',
    icon: <Link2 className="w-5 h-5" />,
    iconBg: 'bg-ordim border border-orb',
    iconColor: 'text-or',
    title: 'Obligación ↔ Evidencia',
    description: 'Mapa global de qué tipos de evidencia son requeridos, recomendados u opcionales para cada obligación.',
  },
  {
    href: '/datos/mappings/modo-medida',
    icon: <Shuffle className="w-5 h-5" />,
    iconBg: 'bg-grdim border border-grb',
    iconColor: 'text-gr',
    title: 'Modo ↔ Medida',
    description: 'Correspondencias entre modos de fallo y medidas de control, con distinción de mitigación primaria.',
  },
  {
    href: '/datos/relaciones-causales',
    icon: <Network className="w-5 h-5" />,
    iconBg: 'bg-cyan-dim border border-cyan-border',
    iconColor: 'text-brand-cyan',
    title: 'Relaciones Causales',
    description: 'Aristas del grafo causal: relaciones causa-efecto, activadores y mecanismos de propagación.',
  },
  {
    href: '/datos/catalogo-causal',
    icon: <Share2 className="w-5 h-5" />,
    iconBg: 'bg-brand-blue/10 border border-brand-blue/20',
    iconColor: 'text-brand-blue',
    title: 'Grafo Causal',
    description: 'Visualización interactiva del grafo de dependencias entre modos de fallo y sus propagaciones.',
  },
]

export default function DatosPage() {
  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">

      <section className="bg-ltcard border border-ltb rounded-[14px] p-7 shadow-[0_4px_24px_rgba(0,74,173,0.04)] mb-8">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 font-sora text-[12px] text-lttm hover:text-brand-cyan transition-colors mb-4"
        >
          <ArrowLeft size={13} />
          Volver al dashboard
        </Link>
        <div className="flex items-center gap-2 mb-2">
          <Database size={13} className="text-lttm" />
          <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm">Datos · Base de Datos Interna</p>
        </div>
        <h1 className="font-sora font-bold text-[32px] leading-none text-ltt">Base de Datos Interna</h1>
        <p className="font-sora text-[14px] text-ltt2 mt-3 max-w-[760px]">
          Mantenimiento de catálogos y configuración maestra del sistema FMEA. Solo lectura para tenants comunes, edición como administrador.
        </p>
      </section>

      {/* Catálogos maestros */}
      <div className="mb-8">
        <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-4">Catálogos maestros</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CATALOGOS.map(card => <Card key={card.href} {...card} />)}
        </div>
      </div>

      {/* Correspondencias y grafos */}
      <div>
        <p className="font-plex text-[11px] uppercase tracking-[1px] text-lttm mb-4">Correspondencias y grafos</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {CORRESPONDENCIAS.map(card => <Card key={card.href} {...card} />)}
        </div>
      </div>

    </div>
  );
}
