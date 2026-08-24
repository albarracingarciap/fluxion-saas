'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrainCircuit, ShieldAlert, Cpu, Bot, CheckCircle2, ChevronRight, Fingerprint, Network } from 'lucide-react';
import { runClassificationEngine } from './actions';

// La pantalla pintaba «Alto Riesgo» en rojo pasara lo que pasara, con una
// «confianza del motor: 99.8 %» que nadie calculaba. Ahora el aspecto sale del
// nivel real.
const NIVEL: Record<string, { label: string; texto: string; borde: string }> = {
  prohibited:     { label: 'Práctica prohibida', texto: 'text-re',   borde: 'border-re' },
  high:           { label: 'Alto riesgo',        texto: 'text-re',   borde: 'border-re' },
  gpai:           { label: 'Propósito general',  texto: 'text-or',   borde: 'border-orb' },
  limited:        { label: 'Riesgo limitado',    texto: 'text-or',   borde: 'border-orb' },
  minimal:        { label: 'Riesgo mínimo',      texto: 'text-gr',   borde: 'border-grb' },
  pending:        { label: 'Sin determinar',     texto: 'text-lttm', borde: 'border-ltb' },
  not_ai_system:  { label: 'No es un sistema de IA', texto: 'text-lttm', borde: 'border-ltb' },
};

const ROL: Record<string, string> = {
  provider: 'Proveedor',
  deployer: 'Responsable del despliegue',
  importer: 'Importador',
  distributor: 'Distribuidor',
  authorised_representative: 'Representante autorizado',
};

type ClassificationEngineResult = {
  riskLevel: string;
  floorZone: string;
  baseRule: string;
  reason?: string;
  appliedArticles: string[];
  extraObligations: string[];
  ambiguityDetected: boolean;
  /** Por qué hace falta una revisión humana. Vacío si no hace falta. */
  avisos?: string[];
  rolesDeclarados?: string[];
};

export default function ClassificationPage() {
  const router = useRouter();
  const params = useParams();
  const systemId = params.id as string;

  const [isProcessing, setIsProcessing] = useState(true);
  const [activeLayer, setActiveLayer] = useState(1);
  const [result, setResult] = useState<ClassificationEngineResult | null>(null);
  // Antes no habia forma de fallar: la funcion devolvia siempre lo mismo. Ahora
  // consulta datos reales y puede no encontrar el sistema.
  const [error, setError] = useState<string | null>(null);

  // Simulador de cascada de las 3 capas del motor
  useEffect(() => {
    let unmounted = false;
    
    const runCascade = async () => {
      // Fake Capa 1 heuristic delay
      await new Promise(r => setTimeout(r, 800));
      if(!unmounted) setActiveLayer(2);
      
      // Capa 2: clasificación real con los datos del sistema.
      const data = await runClassificationEngine(systemId);

      if(!unmounted) {
        if(!data.result) {
          setError(data.error ?? 'No se pudo clasificar el sistema.');
          setIsProcessing(false);
          return;
        }
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
        {error ? (
          <div className="bg-ltcard border border-reb rounded-[16px] p-8 max-w-[600px] mx-auto w-full">
            <p className="font-sora text-[14px] text-re">{error}</p>
            <button
              onClick={() => router.push(`/inventario/${systemId}`)}
              className="mt-4 px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm hover:text-ltt"
            >
              Volver al sistema
            </button>
          </div>
        ) : isProcessing ? (
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
          <div className={`bg-ltcard border rounded-[16px] shadow-lg overflow-hidden animate-in fade-in zoom-in-95 duration-500 max-w-[800px] mx-auto w-full ${NIVEL[result?.riskLevel ?? 'pending'].borde}`}>
            <div className="p-8 md:p-10 border-b border-ltb grid grid-cols-1 md:grid-cols-[1fr_200px] gap-8">
              <div>
                <div className={`font-plex text-[11px] uppercase tracking-[1.5px] font-semibold mb-2 flex items-center gap-2 ${NIVEL[result?.riskLevel ?? 'pending'].texto}`}>
                  <Fingerprint className="w-4 h-4" /> Resolución del motor
                </div>
                <h2 className={`font-fraunces text-[36px] font-bold mb-3 leading-none ${NIVEL[result?.riskLevel ?? 'pending'].texto}`}>
                  {NIVEL[result?.riskLevel ?? 'pending'].label}
                </h2>

                <div className="text-[14px] font-sora text-ltt2 leading-relaxed mb-3 border-l-2 border-ltb pl-4">
                  <strong className="text-ltt font-semibold">{result?.baseRule}</strong>
                  {result?.reason && <span className="block mt-1">{result.reason}</span>}
                </div>

                <div className="flex gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-[6px] text-[11px] font-plex font-medium bg-ltbg border border-ltb text-lttm">
                    <ShieldAlert className="w-3 h-3" /> Suelo mínimo FMEA: {result?.floorZone}
                  </span>
                  {(result?.rolesDeclarados?.length ?? 0) > 0 && (
                    <span className="inline-flex px-3 py-1 rounded-[6px] text-[11px] font-plex font-medium bg-ltbg border border-ltb text-lttm">
                      {result?.rolesDeclarados?.map((r) => ROL[r] ?? r).join(' · ')}
                    </span>
                  )}
                </div>
              </div>

              <div className="bg-ltbg border border-ltb rounded-[12px] p-5 flex flex-col justify-center">
                <div className="font-plex text-[10px] uppercase tracking-[1px] text-lttm mb-3 text-center">
                  Obligaciones aplicables
                </div>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {result?.appliedArticles.length === 0 && (
                    <span className="font-sora text-[12px] text-lttm text-center">
                      Ninguna específica más allá del Art. 4.
                    </span>
                  )}
                  {result?.appliedArticles.map((art: string) => (
                    <span key={art} className="px-2 py-1 rounded-[4px] bg-ltcard border border-ltb text-[10.5px] font-plex font-semibold text-ltt shadow-sm">
                      {art}
                    </span>
                  ))}
                </div>
                {(result?.extraObligations?.length ?? 0) > 0 && (
                  <div className="mt-3 pt-3 border-t border-ltb">
                    <div className="font-plex text-[9.5px] uppercase tracking-[0.8px] text-lttm mb-1.5 text-center">
                      Condicionales
                    </div>
                    {result?.extraObligations.map((o) => (
                      <p key={o} className="font-sora text-[11px] text-lttm text-center leading-snug">{o}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-8 bg-ltcard flex flex-col items-center">
              {/* Avisos: por qué esto es una propuesta y no un veredicto. */}
              {(result?.avisos?.length ?? 0) > 0 && (
                <div className="bg-ordim border border-orb rounded-[10px] p-4 text-[13px] font-sora text-or flex items-start gap-3 w-full max-w-[600px] mb-5">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-2">
                    {result?.avisos?.map((a, i) => <p key={i}>{a}</p>)}
                  </div>
                </div>
              )}

              {result?.riskLevel === 'high' && (
                <div className="bg-ltbg border border-ltb rounded-[10px] p-4 text-[13px] font-sora text-ltt2 flex items-start gap-3 w-full max-w-[600px] mb-8">
                  <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-lttm" />
                  <p>
                    <strong className="text-ltt">El suelo mínimo condiciona el FMEA:</strong> un sistema
                    de alto riesgo no puede terminar en Zona IV por muy favorables que sean los
                    controles. El nivel regulatorio pone un mínimo que la evaluación técnica no rebaja.
                  </p>
                </div>
              )}

              <div className="flex justify-between items-center w-full max-w-[600px] pt-4 border-t border-ltb">
                <button
                  onClick={() => router.push(`/inventario/${systemId}`)}
                  className="px-5 py-2.5 rounded-[8px] font-sora font-medium text-[13px] text-lttm hover:text-ltt hover:bg-ltbg transition-all"
                >
                  Volver al sistema
                </button>
                <button
                  onClick={() => router.push(`/inventario/${systemId}/fmea`)}
                  className="px-6 py-2.5 rounded-[8px] font-sora font-semibold text-[13px] text-white bg-brand-cyan shadow-sm hover:shadow-md transition-all flex items-center gap-2"
                >
                  Continuar a la evaluación <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
