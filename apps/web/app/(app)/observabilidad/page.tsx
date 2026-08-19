import Link from 'next/link'
import {
  Activity, AlertTriangle, Clock, Coins, Gauge, Info, Zap,
} from 'lucide-react'

import { getTelemetrySummary } from '@/lib/telemetry/data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Observabilidad · Fluxion' }

const RANGOS = [7, 30, 90]

function dinero(v: number): string {
  return v.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' $'
}

function miles(v: number): string {
  return v.toLocaleString('es-ES')
}

function ms(v: number | null): string {
  if (v == null) return '—'
  return v >= 1000 ? `${(v / 1000).toFixed(1)} s` : `${v} ms`
}

function Kpi({ icon, label, value, hint, tone = 'normal' }: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: 'normal' | 'warn'
}) {
  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className={`font-sora font-bold text-[24px] mt-1.5 ${tone === 'warn' ? 'text-or' : 'text-ltt'}`}>
        {value}
      </p>
      {hint && <p className="font-sora text-[11.5px] text-lttm mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

export default async function ObservabilidadPage({
  searchParams,
}: {
  searchParams: { dias?: string }
}) {
  const dias = RANGOS.includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 30
  const s = await getTelemetrySummary(dias)

  const maxDia = Math.max(...s.byDay.map((d) => d.calls), 1)
  const cobertura = s.calls > 0 ? s.callsCosted / s.calls : 1
  const tasaError = s.calls > 0 ? s.errors / s.calls : 0

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <Activity size={12} /> Supervisión · Telemetría de modelos
          </p>
          <h1 className="font-fraunces text-[26px] text-ltt mt-1">Observabilidad y coste</h1>
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
            Lo que gastan y lo que tardan las llamadas a modelos de la organización.
            Solo metadatos: aquí no se guarda el contenido de ninguna conversación.
          </p>
        </div>

        <div className="flex gap-1.5 shrink-0">
          {RANGOS.map((r) => (
            <Link
              key={r}
              href={`/observabilidad?dias=${r}`}
              className={`px-3 py-1.5 rounded-[7px] font-sora text-[12.5px] border transition-colors ${
                r === dias
                  ? 'border-brand-cyan text-brand-cyan bg-ltcard'
                  : 'border-ltb text-lttm hover:text-ltt'
              }`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      {s.calls === 0 ? (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13.5px] text-ltt">Todavía no hay telemetría.</p>
          <p className="font-sora text-[12.5px] text-lttm mt-2 max-w-lg mx-auto">
            Apunta el exportador de OpenTelemetry de tus servicios a Fluxion con una
            clave de API que tenga el permiso <strong>Enviar telemetría</strong>. No
            hace falta instalar ningún SDK propietario.
          </p>
        </div>
      ) : (
        <>
          {/* Coste incompleto: se avisa antes de enseñar la cifra */}
          {cobertura < 1 && (
            <div className="border border-orb bg-[var(--or-dim,#fff8ef)] rounded-[12px] p-4">
              <p className="font-sora text-[13px] text-or font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} />
                El coste está incompleto
              </p>
              <p className="font-sora text-[12.5px] text-ltt mt-1.5">
                Solo <strong>{miles(s.callsCosted)}</strong> de {miles(s.calls)} llamadas
                ({Math.round(cobertura * 100)} %) tienen tarifa registrada.
                {s.costProjected != null && (
                  <> Extrapolando, el gasto real rondaría los <strong>{dinero(s.costProjected)}</strong>.</>
                )}
              </p>
              {s.missingPrices.length > 0 && (
                <p className="font-sora text-[12px] text-lttm mt-2">
                  Sin tarifa:{' '}
                  {s.missingPrices.map((m) => `${m.provider}/${m.model} (${miles(m.calls)})`).join(' · ')}
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi
              icon={<Coins size={12} />} label="Coste del periodo"
              value={dinero(s.costTotal)}
              hint={cobertura < 1 ? `medido sobre el ${Math.round(cobertura * 100)} % de las llamadas` : undefined}
              tone={cobertura < 1 ? 'warn' : 'normal'}
            />
            <Kpi
              icon={<Zap size={12} />} label="Llamadas"
              value={miles(s.calls)}
              hint={`${miles(s.inputTokens)} tokens de entrada · ${miles(s.outputTokens)} de salida`}
            />
            <Kpi
              icon={<Clock size={12} />} label="Primer token"
              value={ms(s.ttftP50)}
              hint={`p95 ${ms(s.ttftP95)} · es la espera que nota el usuario`}
            />
            <Kpi
              icon={<Gauge size={12} />} label="Llamada completa"
              value={ms(s.durationP50)}
              hint={`p95 ${ms(s.durationP95)}`}
            />
          </div>

          {tasaError > 0 && (
            <p className="font-sora text-[12.5px] text-re flex items-center gap-1.5">
              <AlertTriangle size={13} />
              {miles(s.errors)} llamadas con error ({(tasaError * 100).toFixed(1)} %)
            </p>
          )}

          {/* Actividad diaria */}
          <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">
              Llamadas por día
            </p>
            <div className="flex items-end gap-1 h-[120px]">
              {s.byDay.map((d) => (
                <div key={d.day} className="flex-1 flex flex-col justify-end group relative">
                  <div
                    className={`w-full rounded-t-[3px] ${d.errors > 0 ? 'bg-or' : 'bg-brand-cyan'}`}
                    style={{ height: `${Math.max((d.calls / maxDia) * 100, 2)}%` }}
                  />
                  <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block
                                   font-plex text-[10px] text-ltt bg-ltbg border border-ltb rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                    {new Date(d.day).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · {d.calls}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Por modelo */}
            <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">Por modelo</p>
              <div className="flex flex-col gap-2.5">
                {s.byModel.map((m) => (
                  <div key={`${m.provider}/${m.model}`} className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <span className="font-sora text-[13px] text-ltt">{m.model}</span>
                      <span className="font-plex text-[10.5px] text-lttm ml-1.5">{m.provider}</span>
                      {m.costed < m.calls && (
                        <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-or ml-1.5">
                          sin tarifa
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-sora font-bold text-[13px] text-ltt">{dinero(m.cost)}</span>
                      <span className="font-plex text-[10.5px] text-lttm ml-2">{miles(m.calls)} llam.</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por sistema */}
            <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">Por sistema de IA</p>
              <div className="flex flex-col gap-2.5">
                {s.bySystem.map((sys) => (
                  <div key={sys.id} className="flex items-baseline justify-between gap-3">
                    {sys.name === 'Sin adscribir' ? (
                      <span className="font-sora text-[13px] text-or flex items-center gap-1.5">
                        <Info size={12} /> Sin adscribir
                      </span>
                    ) : (
                      <Link href={`/inventario/${sys.id}`} className="font-sora text-[13px] text-ltt hover:text-brand-cyan truncate">
                        {sys.name}
                      </Link>
                    )}
                    <div className="shrink-0 text-right">
                      <span className="font-sora font-bold text-[13px] text-ltt">{dinero(sys.cost)}</span>
                      <span className="font-plex text-[10.5px] text-lttm ml-2">{miles(sys.calls)} llam.</span>
                    </div>
                  </div>
                ))}
              </div>
              {s.bySystem.some((x) => x.name === 'Sin adscribir') && (
                <p className="font-sora text-[11.5px] text-lttm mt-3 leading-snug">
                  La telemetría sin adscribir llega sin <code className="font-plex">fluxion.system_id</code>.
                  Añádelo a los atributos de recurso del exportador para que el gasto
                  se impute al sistema del inventario que corresponde.
                </p>
              )}
            </div>
          </div>
        </>
      )}

      <p className="font-plex text-[10.5px] text-lttm">
        {s.lastRollupAt
          ? `Agregados recalculados el ${new Date(s.lastRollupAt).toLocaleString('es-ES')}.`
          : 'Los agregados no se han calculado todavía.'}
      </p>
    </div>
  )
}
