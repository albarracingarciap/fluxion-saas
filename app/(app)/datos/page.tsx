import Link from "next/link";
import { Database, ShieldAlert, ArrowRight, Network } from "lucide-react";

export default function DatosPage() {
  return (
    <div className="max-w-[1280px] w-full mx-auto animate-fadein pb-10">
      
      <div className="mb-6">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5 flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-cyan" />
          Base de Datos Interna
        </h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed">
          Mantenimiento de catálogos y configuración maestra del sistema FMEA (Solo lectura para tenants comunes, edición como administrador).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[16px]">
        {/* Tarjeta de Modos de Fallo */}
        <Link href="/datos/modos-de-fallo" className="block relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all group cursor-pointer">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-cyan to-cyan-light" />
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-brand-cyan opacity-[0.04] rounded-full group-hover:opacity-[0.07] transition-opacity" />
          
          <div className="p-5 relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                <ShieldAlert className="w-5 h-5 text-brand-cyan" />
              </div>
              <ArrowRight className="w-4 h-4 text-lttm group-hover:text-brand-cyan transition-colors group-hover:translate-x-1" />
            </div>
            
            <h3 className="font-fraunces text-lg font-semibold text-ltt mb-1">Modos de Fallo</h3>
            <p className="font-sora text-[12px] text-ltt2 flex-1">
              Catálogo centralizado de riesgos paramétricos, metodologías R.I.D.E. y dimensiones.
            </p>
            
            <div className="mt-4 pt-3 border-t border-ltb flex items-center justify-between">
              <span className="font-plex text-[10px] uppercase tracking-wider text-brand-cyan font-medium">Gestionar registros</span>
            </div>
          </div>
        </Link>

        {/* Tarjeta de Relaciones Causales */}
        <Link href="/datos/relaciones-causales" className="block relative bg-ltcard border border-ltb rounded-[12px] shadow-[0_1px_4px_#004aad08,0_2px_12px_#004aad06] overflow-hidden hover:border-cyan-border hover:shadow-[0_4px_20px_#00adef18] transition-all group cursor-pointer">
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-brand-cyan to-cyan-light" />
          <div className="absolute top-[-20px] right-[-20px] w-24 h-24 bg-brand-cyan opacity-[0.04] rounded-full group-hover:opacity-[0.07] transition-opacity" />
          
          <div className="p-5 relative z-10 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-50 flex items-center justify-center">
                <Network className="w-5 h-5 text-brand-cyan" />
              </div>
              <ArrowRight className="w-4 h-4 text-lttm group-hover:text-brand-cyan transition-colors group-hover:translate-x-1" />
            </div>
            
            <h3 className="font-fraunces text-lg font-semibold text-ltt mb-1">Grafos Causales</h3>
            <p className="font-sora text-[12px] text-ltt2 flex-1">
              Catálogo de relaciones de dependencia. Nodos, eventos y vectores de propagación del riesgo.
            </p>
            
            <div className="mt-4 pt-3 border-t border-ltb flex items-center justify-between">
              <span className="font-plex text-[10px] uppercase tracking-wider text-brand-cyan font-medium">Gestionar registros</span>
            </div>
          </div>
        </Link>
      </div>

    </div>
  );
}
