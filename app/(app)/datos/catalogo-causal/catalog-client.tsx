'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ArrowLeft, Maximize2, Network } from 'lucide-react';
import type { SystemCausalGraph } from '@/lib/causal-graph/system-graph';

const CatalogCanvas = dynamic(
  () => import('./catalog-canvas').then((m) => ({ default: m.CatalogCanvas })),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-full rounded-[12px] border border-ltb bg-ltbg animate-pulse flex items-center justify-center">
        <p className="font-sora text-[13px] text-lttm flex items-center gap-2">
          <Network size={16} className="animate-spin text-lttm" />
          Cargando grafo global...
        </p>
      </div>
    ),
  }
);

export function CatalogClient({ graph }: { graph: SystemCausalGraph }) {
  const [fullscreen, setFullscreen] = useState(false);

  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-[10030] flex flex-col bg-ltbg animate-fadein">
        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-3.5 border-b border-ltb bg-ltcard shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-[8px] bg-cyan-dim border border-cyan-border flex items-center justify-center">
              <Network size={14} className="text-brand-cyan" />
            </div>
            <div>
              <p className="font-sora text-[14px] font-semibold text-ltt leading-snug">Taxonomía Completa</p>
              <p className="font-plex text-[10.5px] uppercase tracking-[0.7px] text-brand-cyan">Catálogo Causal</p>
            </div>
          </div>
          <button
            onClick={() => setFullscreen(false)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-[8px] border border-ltb bg-ltcard text-lttm font-sora text-[12px] hover:border-cyan-border hover:text-brand-cyan hover:bg-cyan-dim transition-all shadow-sm"
          >
            Contraer Vista
          </button>
        </div>
        {/* Modal body */}
        <div className="flex-1 p-5 overflow-hidden">
          <CatalogCanvas graph={graph} fullscreen />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl w-full mx-auto animate-fadein pb-10">
      {/* Breadcrumb section */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 text-[12px] font-plex text-lttm uppercase tracking-wider">
          <Link href="/datos" className="flex items-center gap-1.5 hover:text-brand-cyan transition-colors">
            <ArrowLeft size={14} className="text-lttm" />
            <span>Base de Datos</span>
          </Link>
          <span className="text-lttm">/</span>
          <span className="text-ltt font-medium">Catálogo Causal</span>
        </div>

        <button
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-ltcard text-lttm border border-ltb rounded-[8px] font-sora text-[12.5px] font-medium transition-all hover:-translate-y-[1px] hover:text-brand-cyan hover:border-cyan-border hover:bg-cyan-dim shadow-sm"
        >
          <Maximize2 className="w-4 h-4" />
          Ir a Pantalla Completa
        </button>
      </div>

      <div className="mb-6">
        <h1 className="font-fraunces text-2xl font-semibold tracking-tight text-ltt mb-1.5">
          Catálogo: Grafo Causal Global
        </h1>
        <p className="text-[13px] text-ltt2 font-sora leading-relaxed max-w-3xl">
          Visualiza la estructura completa del repositorio causal. Este mapa maestro sirve de base para que el sistema identifique cómo los diferentes modos de fallo pueden propagar su severidad a través de dependencias estructurales.
        </p>
      </div>

      <div className="w-full bg-ltcard p-3 rounded-[16px] border border-ltb shadow-sm h-[750px]">
        <CatalogCanvas graph={graph} fullscreen={false} />
      </div>
    </div>
  );
}
