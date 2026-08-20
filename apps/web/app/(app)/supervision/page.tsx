import Link from 'next/link'
import { AlertTriangle, Eye, Gauge, ShieldCheck, Timer, Users } from 'lucide-react'

import { getHitlOverview, detectarSesgo, SESGO } from '@/lib/hitl/data'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Supervisión humana · Fluxion' }

const RANGOS = [30, 90, 180]

function pct(n: number, d: number): string {
  if (!d) return '—'
  return `${Math.round((n / d) * 100)} %`
}

function dur(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return `${ms} ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)} s`
  return `${Math.round(ms / 60000)} min`
}

function Kpi({ icon, label, value, hint, tone = 'normal' }: {
  icon: React.ReactNode
  label: string
  value: string
  hint?: string
  tone?: 'normal' | 'warn' | 'good'
}) {
  const color = tone === 'warn' ? 'text-or' : tone === 'good' ? 'text-gr' : 'text-ltt'
  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
        {icon} {label}
      </p>
      <p className={`font-sora font-bold text-[24px] mt-1.5 ${color}`}>{value}</p>
      {hint && <p className="font-sora text-[11.5px] text-lttm mt-1 leading-snug">{hint}</p>}
    </div>
  )
}

export default async function SupervisionPage({
  searchParams,
}: {
  searchParams: { dias?: string }
}) {
  const dias = RANGOS.includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 90
  const o = await getHitlOverview(dias)
  const t = o.totales
  const sesgo = detectarSesgo(o)

  const concordancia = t.decisiones ? t.conformes / t.decisiones : 0
  const maxDia = Math.max(...o.serie.map((d) => d.decisiones), 1)

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <Eye size={12} /> Cumplimiento · Artículo 14
          </p>
          <h1 className="font-fraunces text-[26px] text-ltt mt-1">Supervisión humana</h1>
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
            Evidencia de que las decisiones de la IA se revisan de verdad. La pregunta
            que hace un auditor no es si hay supervisión, sino cuántas veces la persona
            ha estado en desacuerdo con la máquina.
          </p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          {RANGOS.map((r) => (
            <Link
              key={r} href={`/supervision?dias=${r}`}
              className={`px-3 py-1.5 rounded-[7px] font-sora text-[12.5px] border transition-colors ${
                r === dias ? 'border-brand-cyan text-brand-cyan bg-ltcard' : 'border-ltb text-lttm hover:text-ltt'
              }`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      {t.decisiones === 0 ? (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13.5px] text-ltt">Todavía no hay decisiones registradas.</p>
          <p className="font-sora text-[12.5px] text-lttm mt-2 max-w-lg mx-auto">
            Cada vez que una persona confirme, modifique o rechace una sugerencia de IA,
            envíala a <code className="font-plex">/api/ingest/v1/hitl-decisions</code> con
            una clave que tenga el permiso <strong>Registrar decisiones humanas</strong>.
            Solo referencias seudonimizadas: nunca el contenido del caso.
          </p>
        </div>
      ) : (
        <>
          {/* Sesgo de automatización — lo primero, porque es lo que nadie mira */}
          {sesgo.length > 0 && (
            <div className="border border-orb bg-[var(--or-dim,#fff8ef)] rounded-[12px] p-4">
              <p className="font-sora text-[13px] text-or font-semibold flex items-center gap-1.5">
                <AlertTriangle size={14} /> Indicios de sesgo de automatización
              </p>
              <p className="font-sora text-[12.5px] text-ltt mt-1.5">
                El artículo 14.4.b exige que quien supervisa sea consciente de la
                tendencia a confiar en exceso en la máquina. Estos revisores aceptan
                casi todo y deciden muy rápido:
              </p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {sesgo.map((s) => (
                  <p key={s.ref} className="font-sora text-[12.5px] text-ltt">
                    <span className="font-plex text-[11.5px]">{s.ref}</span>
                    {s.rol && <span className="text-lttm"> · {s.rol}</span>}
                    {' — '}
                    {Math.round(s.concordancia * 100)} % de conformidad en {s.decisiones} decisiones,
                    mediana de {dur(s.medianaMs)}
                  </p>
                ))}
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-2.5">
                No es una acusación: puede que el sistema acierte y los casos sean
                sencillos. Pero es lo que hay que poder explicar, y ahora se puede
                explicar con datos. Umbrales: ≥{SESGO.MIN_CASOS} decisiones,
                ≥{Math.round(SESGO.CONCORDANCIA * 100)} % de conformidad y mediana
                por debajo de {SESGO.MEDIANA_MS / 1000} s.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Kpi icon={<ShieldCheck size={12} />} label="Decisiones revisadas"
                 value={t.decisiones.toLocaleString('es-ES')}
                 hint={`${t.sistemas} sistemas · ${t.revisores} revisores`} />
            <Kpi icon={<Gauge size={12} />} label="Tasa de concordancia"
                 value={pct(t.conformes, t.decisiones)}
                 hint={`${t.discordantes} discordancias, ${t.no_usadas} veces sin usar el sistema`}
                 tone={concordancia >= SESGO.CONCORDANCIA ? 'warn' : 'normal'} />
            <Kpi icon={<Timer size={12} />} label="Tiempo mediano"
                 value={dur(t.mediana_ms)}
                 hint="Una decisión de dos segundos no es supervisión"
                 tone={t.mediana_ms != null && t.mediana_ms < SESGO.MEDIANA_MS ? 'warn' : 'normal'} />
            <Kpi icon={<Users size={12} />} label="Discordancias sin motivo"
                 value={t.sin_motivo.toLocaleString('es-ES')}
                 hint={t.sin_motivo > 0 ? 'Sin motivo no hay nada que analizar' : 'Todas justificadas'}
                 tone={t.sin_motivo > 0 ? 'warn' : 'good'} />
          </div>

          {/* Serie */}
          <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">
              Decisiones por día · la parte oscura son discordancias
            </p>
            <div className="flex items-end gap-1 h-[110px]">
              {o.serie.map((d) => {
                const disc = d.decisiones - d.conformes
                return (
                  <div key={d.day} className="flex-1 flex flex-col justify-end group relative">
                    <div className="w-full bg-or rounded-t-[3px]"
                         style={{ height: `${(disc / maxDia) * 100}%` }} />
                    <div className="w-full bg-brand-cyan"
                         style={{ height: `${Math.max((d.conformes / maxDia) * 100, 2)}%` }} />
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 hidden group-hover:block
                                     font-plex text-[10px] text-ltt bg-ltbg border border-ltb rounded px-1.5 py-0.5 whitespace-nowrap z-10">
                      {new Date(d.day).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })} · {d.decisiones} ({disc} disc.)
                    </span>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Por sistema */}
            <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">Por sistema</p>
              <div className="flex flex-col gap-2.5">
                {o.por_sistema.map((s) => (
                  <div key={s.system_id} className="flex items-baseline justify-between gap-3">
                    <Link href={`/inventario/${s.system_id}`}
                          className="font-sora text-[13px] text-ltt hover:text-brand-cyan truncate">
                      {s.system_name ?? 'Sistema'}
                    </Link>
                    <div className="shrink-0 text-right">
                      <span className="font-sora font-bold text-[13px] text-ltt">
                        {pct(s.conformes, s.decisiones)}
                      </span>
                      <span className="font-plex text-[10.5px] text-lttm ml-2">
                        {s.decisiones} · {dur(s.mediana_ms)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Por revisor */}
            <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-3">Por revisor</p>
              <div className="flex flex-col gap-2.5">
                {o.por_revisor.map((r) => {
                  const marcado = sesgo.some((s) => s.ref === r.reviewer_ref)
                  return (
                    <div key={r.reviewer_ref} className="flex items-baseline justify-between gap-3">
                      <span className={`font-sora text-[13px] truncate ${marcado ? 'text-or' : 'text-ltt'}`}>
                        {r.reviewer_ref}
                        {r.reviewer_role && <span className="font-plex text-[10.5px] text-lttm ml-1.5">{r.reviewer_role}</span>}
                      </span>
                      <div className="shrink-0 text-right">
                        <span className={`font-sora font-bold text-[13px] ${marcado ? 'text-or' : 'text-ltt'}`}>
                          {pct(r.conformes, r.decisiones)}
                        </span>
                        <span className="font-plex text-[10.5px] text-lttm ml-2">
                          {r.decisiones} · {dur(r.mediana_ms)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Motivos */}
          {o.por_motivo.length > 0 && (
            <div className="border border-ltb rounded-[12px] bg-ltcard p-4">
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">
                Por qué la persona no siguió a la máquina
              </p>
              <p className="font-sora text-[11.5px] text-lttm mb-3">
                Es la parte que dice qué arreglar: si domina «error del modelo», el
                problema es el sistema; si domina «contradice el contexto», el problema
                es lo que el sistema no ve.
              </p>
              <div className="flex flex-col gap-2">
                {o.por_motivo.map((m) => (
                  <div key={m.code} className="flex items-center justify-between gap-3">
                    <span className="font-sora text-[13px] text-ltt">
                      {m.label}
                      <span className="font-plex text-[10px] text-lttm ml-2">{m.category}</span>
                    </span>
                    <div className="flex items-center gap-2 shrink-0 w-[45%]">
                      <div className="h-1.5 flex-1 rounded-full bg-ltb overflow-hidden">
                        <div className="h-full bg-or"
                             style={{ width: `${(m.veces / Math.max(t.discordantes, 1)) * 100}%` }} />
                      </div>
                      <span className="font-plex text-[10.5px] text-lttm w-8 text-right">{m.veces}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
