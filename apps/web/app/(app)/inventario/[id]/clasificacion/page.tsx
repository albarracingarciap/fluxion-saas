'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrainCircuit, ShieldAlert, Cpu, Bot, CheckCircle2, ChevronRight, Fingerprint, Network } from 'lucide-react';
import { runClassificationEngine } from './actions';

type ClassificationEngineResult = {
  riskLevel: string;
  floorZone: string;
  baseRule: string;
  appliedArticles: string[];
  extraObligations: string[];
  ambiguityDetected: boolean;
};

export default function ClassificationPage() {
  const router = useRouter();
  const params = useParams();
  const systemId = params.id as string;

  const [isProcessing, setIsProcessing] = useState(true);
  const [activeLayer, setActiveLayer] = useState(1);
  const [result, setResult] = useState<ClassificationEngineResult | null>(null);

  // Simulador de cascada de las 3 capas del motor
  useEffect(() => {
    let unmounted = false;
    
    const runCascade = async () => {
      // Fake Capa 1 heuristic delay
      await new Promise(r => setTimeout(r, 800));
      if(!unmounted) setActiveLayer(2);
      
      // Llamada real (fake por ahora) a Capa 2 (FastAPI determinista)
      const data = await runClassificationEngine(systemId);
      
      if(!unmounted) {
        if(data.result.ambiguityDetected) {
          setActiveLayer(3); 
          // Fake Capa 3 RAG delay
          await new Promise(r => setTimeout(r, 1500));
        }
        setResult(data.result);
        setIsProcessing(false);
      }
    };
    
    runCascade();
    
    return () => { unmounted = true; };
  }, [systemId]);

  return (
    <div className="flex flex-col min-h-screen bg-ltbg text-ltt font-sora">
      
      {/* LOCAL TOPBAR & BREADCRUMB UI (Mimicking the visual stepper) */}
      <div className="h-[60px] bg-ltcard border-b border-ltb flex items-center px-6 shrink-0 shadow-sm sticky top-0 z-10 w-full overflow-x-auto">
        <div className="flex items-center gap-1.5 min-w-max">
           <span className="px-3 py-1.5 rounded-full text-[12px] font-medium font-plex border border-ltb bg-ltbg text-lttm flex items-center gap-1.5">
             <CheckCircle2 className="w-3.5 h-3.5" /> Registro
           </span>
           <span className="w-4 h-[1px] bg-ltb" />
           <span className="px-3 py-1.5 rounded-full text-[12px] font-medium font-plex border border-ltb bg-ltbg text-lttm flex items-center gap-1.5">
             <CheckCircle2 className="w-3.5 h-3.5" /> Alta inventario
           </span>
           <span className="w-4 h-[1px] bg-ltb" />
           <span className="px-3 py-1.5 rounded-full text-[12px] font-medium font-plex border border-brand-cyan bg-[#00adef10] text-brand-cyan flex items-center gap-1.5 shadow-[0_0_10px_#00adef15]">
             Clasificación
           </span>
           <span className="w-4 h-[1px] bg-ltb inline-block" />
           <span className="px-3 py-1.5 rounded-full text-[12px] font-medium font-plex border border-transparent text-lttm opacity-50">Compliance</span>
           <span className="w-4 h-[1px] bg-ltb inline-block opacity-50" />
           <span className="px-3 py-1.5 rounded-full text-[12px] font-medium font-plex border border-transparent text-lttm opacity-50">Filtrado FMEA</span>
           <span className="w-4 h-[1px] bg-ltb inline-block opacity-50" />
           <span className="px-3 py-1.5 rounded-full text-[12px] font-medium font-plex border border-transparent text-lttm opacity-50">Evaluación</span>
        </div>
      </div>

      <div className="flex-1 p-6 lg:p-8 max-w-[1000px] mx-auto w-full flex flex-col justify-center">
        
        {/* HEADER */}
        <div className="mb-8 text-center max-w-[600px] mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-ltcard border border-ltb rounded-full text-[10.5px] font-plex uppercase tracking-[1px] text-lttm mb-4">
            <Cpu className="w-3.5 h-3.5 text-brand-cyan" /> Fase 2 Automática
          </div>
          <h1 className="font-fraunces text-[32px] md:text-[40px] font-bold text-ltt tracking-[-0.5px] leading-tight mb-3">
            Clasificación AI Act
          </h1>
          <p className="text-[14px] text-lttm font-sora leading-relaxed">
            Motor automático determinando el nivel de riesgo del sistema en función de sus atributos. Este nivel establecerá el suelo mínimo para la evaluación FMEA.
          </p>
        </div>

        {/* PROCESSING ENGINE STATE */}
        {isProcessing ? (
          <div className="bg-ltcard border border-ltb rounded-[16px] p-8 md:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.06)] max-w-[600px] mx-auto w-full">
            <div className="relative flex justify-center mb-10">
              <div className="absolute inset-0 bg-brand-cyan opacity-20 blur-[40px] rounded-full animate-pulse" />
              <div className="w-20 h-20 bg-ltbg border border-ltb rounded-full flex items-center justify-center relative z-10 shadow-lg">
                <BrainCircuit className="w-10 h-10 text-brand-cyan animate-bounce" />
              </div>
            </div>
            
            <div className="space-y-4">
              <div className={`p-4 rounded-[10px] border flex items-center gap-4 transition-all duration-500 ${activeLayer >= 1 ? 'border-brand-cyan bg-[#00adef05]' : 'border-ltb bg-ltbg opacity-50'}`}>
                {activeLayer > 1 ? <CheckCircle2 className="w-5 h-5 text-gr shrink-0" /> : <div className="w-5 h-5 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin shrink-0" />}
                <div>
                  <div className="font-sora text-[13px] font-semibold text-ltt">Capa 1: Heurística Frontend</div>
                  <div className="font-plex text-[11px] text-lttm mt-0.5">Analizando sector y tipo de datos de entrada...</div>
                </div>
              </div>

              <div className={`p-4 rounded-[10px] border flex items-center gap-4 transition-all duration-500 ${activeLayer >= 2 ? 'border-brand-cyan bg-[#00adef05]' : 'border-ltb bg-ltbg opacity-50'}`}>
                {activeLayer > 2 ? <CheckCircle2 className="w-5 h-5 text-gr shrink-0" /> : (activeLayer === 2 ? <div className="w-5 h-5 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin shrink-0" /> : <Network className="w-5 h-5 text-lttm shrink-0" />)}
                <div>
                  <div className="font-sora text-[13px] font-semibold text-ltt">Capa 2: FastAPI Determinista</div>
                  <div className="font-plex text-[11px] text-lttm mt-0.5">Evaluando contra Anexo III del Reglamento (UE) 2024/1689...</div>
                </div>
              </div>

              <div className={`p-4 rounded-[10px] border flex items-center gap-4 transition-all duration-500 ${activeLayer >= 3 ? 'border-brand-cyan bg-[#00adef05]' : 'border-ltb bg-ltbg opacity-40'}`}>
                {activeLayer > 3 ? <CheckCircle2 className="w-5 h-5 text-gr shrink-0" /> : (activeLayer === 3 ? <div className="w-5 h-5 rounded-full border-2 border-brand-cyan border-t-transparent animate-spin shrink-0" /> : <Bot className="w-5 h-5 text-lttm shrink-0" />)}
                <div>
                  <div className="font-sora text-[13px] font-semibold text-ltt">Capa 3: Agente RAG {result?.ambiguityDetected === false && <span className="font-medium text-[10px] bg-ltb px-1.5 py-0.5 rounded ml-2">No requerida</span>}</div>
                  <div className="font-plex text-[11px] text-lttm mt-0.5">Vectorizando ambigüedades contra modelos locales...</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* RESULT STATE */
          <div className="bg-ltcard border border-re rounded-[16px] shadow-[0_4px_30px_#f8514915] overflow-hidden animate-in fade-in zoom-in-95 duration-500 max-w-[800px] mx-auto w-full">
            <div className="bg-gradient-to-br from-[#f8514908] to-ltcard p-8 md:p-10 border-b border-ltb grid grid-cols-1 md:grid-cols-[1fr_200px] gap-8">
              <div>
                <div className="font-plex text-[11px] uppercase tracking-[1.5px] text-re font-semibold mb-2 flex items-center gap-2">
                  <Fingerprint className="w-4 h-4" /> Resolución del Motor
                </div>
                <h2 className="font-fraunces text-[36px] font-bold text-re mb-3 leading-none">Alto Riesgo</h2>
                <div className="text-[14px] font-sora text-ltt2 leading-relaxed mb-5 border-l-2 border-re/30 pl-4">
                  El sistema ha sido clasificado bajo el régimen de &quot;Alto Riesgo&quot; de la inteligencia artificial debido a que cumple las condiciones del <strong className="text-ltt font-semibold">{result?.baseRule}</strong>.
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex px-3 py-1 rounded-[6px] text-[11px] font-plex font-medium bg-ltbg border border-ltb text-lttm">
                    Confianza del motor: 99.8%
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[11px] font-plex font-medium bg-red-dim border border-reb text-re">
                    <ShieldAlert className="w-3 h-3" /> Suelo Mínimo: {result?.floorZone}
                  </span>
                </div>
              </div>
              
              <div className="bg-ltbg border border-ltb rounded-[12px] p-5 flex flex-col justify-center">
                <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-3 text-center">Obligaciones Detectadas</div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {result?.appliedArticles.map((art: string) => (
                    <span key={art} className="px-2 py-1 rounded-[4px] bg-ltcard border border-ltb text-[10.5px] font-plex font-semibold text-ltt shadow-sm">
                      {art}
                    </span>
                  ))}
                  {result?.extraObligations.includes('dora_art_28') && (
                    <span className="px-2 py-1 rounded-[4px] bg-cyan-dim border border-cyan-border text-[10.5px] font-plex font-semibold text-brand-cyan shadow-sm w-full text-center mt-2">
                      + DORA (Sector Financiero)
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="p-8 bg-ltcard flex flex-col items-center">
              <div className="bg-ordim border border-orb rounded-[10px] p-4 text-[13px] font-sora text-or flex items-start gap-3 w-full max-w-[600px] mb-8">
                <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                <p>
                  <strong>El suelo mínimo de riesgo es crítico:</strong> Un sistema clasificado como &quot;Alto Riesgo AI Act&quot; nunca podrá operar en Zona IV (Riesgo Bajo) durante la evaluación FMEA, incluso si los controles mitigadores arrojan resultados favorables.
                </p>
              </div>

              <div className="flex justify-between items-center w-full max-w-[600px] pt-4 border-t border-ltb">
                <button 
                  onClick={() => router.push(`/inventario/${systemId}`)}
                  className="px-5 py-2.5 rounded-[8px] font-sora font-medium text-[13px] text-lttm hover:text-ltt hover:bg-ltbg transition-all"
                >
                  Volver al inventario
                </button>
                <button 
                  onClick={() => router.push(`/inventario/${systemId}`)} // En el futuro redirigirá idealmente a /compliance
                  className="px-6 py-2.5 rounded-[8px] font-sora font-semibold text-[13px] text-white bg-gradient-to-r from-re to-[#c33b3b] shadow-[0_2px_12px_#f8514930] hover:shadow-[0_4px_16px_#f8514940] transition-all flex items-center gap-2"
                >
                  Aceptar y continuar a Compliance <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
