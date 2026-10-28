import Link from 'next/link'
import { AlertTriangle, Eye, Gauge, ShieldCheck, Timer, Users } from 'lucide-react'

import { getHitlOverview, getHitlSystems, detectarSesgo, SESGO } from '@/lib/hitl/data'
import { HITL_SILENCE_DAYS, REVIEW_MODE_LABEL, silentPerCaseSystems } from '@/lib/hitl/review-mode'

import { getAppAuthState } from '@/lib/auth/app-state'
import { hasAnyRole } from '@/lib/auth/roles'

import { FiltroSistema } from './filtro-sistema'
import { Herramientas } from './herramientas'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Supervisión humana · CompaaS IA' }

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
  searchParams: { dias?: string; sistema?: string }
}) {
  const dias = RANGOS.includes(Number(searchParams.dias)) ? Number(searchParams.dias) : 90
  const systems = await getHitlSystems()
  // B30a: filtro por sistema; solo se acepta un sistema de la organización.
  const sistema = systems.find((x) => x.id === searchParams.sistema) ?? null
  const [o, recientes] = await Promise.all([
    getHitlOverview(dias, sistema?.id ?? null),
    getHitlOverview(HITL_SILENCE_DAYS),
  ])
  const conDecisiones = new Set(recientes.por_sistema.map((x) => x.system_id))
  const silencios = silentPerCaseSystems(systems, conDecisiones).filter((x) => !sistema || x.id === sistema.id)
  const qs = sistema ? `&sistema=${sistema.id}` : ''
  // B30b: importar CSV y generar el informe, para quienes documentan la supervisión.
  const auth = await getAppAuthState()
  const canEdit = Boolean(auth.membership && hasAnyRole(auth.membership, ['org_admin', 'sgai_manager', 'system_owner']))
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
        <div className="flex gap-1.5 shrink-0 flex-wrap items-center">
          <FiltroSistema systems={systems} actual={sistema?.id ?? null} dias={dias} />
          {RANGOS.map((r) => (
            <Link
              key={r} href={`/supervision?dias=${r}${qs}`}
              className={`px-3 py-1.5 rounded-[7px] font-sora text-[12.5px] border transition-colors ${
                r === dias ? 'border-brand-cyan text-brand-cyan bg-ltcard' : 'border-ltb text-lttm hover:text-ltt'
              }`}
            >
              {r} días
            </Link>
          ))}
        </div>
      </div>

      {canEdit && <Herramientas systems={systems} sistemaId={sistema?.id ?? null} dias={dias} />}

      {/* B30a: sistemas que deberían enviar decisiones y no lo hacen. */}
      {silencios.length > 0 && (
        <div className="border border-orb bg-[var(--or-dim,#fff8ef)] rounded-[12px] p-4">
          <p className="font-sora text-[13px] text-or font-semibold flex items-center gap-1.5">
            <AlertTriangle size={14} /> Sistemas con supervisión por caso sin decisiones en {HITL_SILENCE_DAYS} días
          </p>
          <p className="font-sora text-[12.5px] text-ltt mt-1.5">
            Su supervisión documentada dice que cada resultado lo revisa una persona, pero no llega ninguna decisión.
            O no se están enviando o la modalidad indicada no es la real.
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {silencios.map((x) => (
              <Link key={x.id} href={`/inventario/${x.id}`} className="font-sora text-[12.5px] text-brand-cyan hover:underline w-fit">{x.name}</Link>
            ))}
          </div>
        </div>
      )}

      {t.decisiones === 0 ? (
        sistema ? (
          <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
            <p className="font-sora text-[13.5px] text-ltt">{sistema.name} no tiene decisiones registradas en los últimos {dias} días.</p>
            <p className="font-sora text-[12.5px] text-lttm mt-2">
              Modalidad de supervisión: {sistema.mode ? REVIEW_MODE_LABEL[sistema.mode] : 'sin indicar (en la ficha del sistema, Supervisión documentada)'}.
            </p>
          </div>
        ) : (
          <div className="border border-dashed border-ltb rounded-[12px] p-8 flex flex-col gap-4">
            <div>
              <p className="font-sora text-[14px] text-ltt font-semibold">Todavía no hay decisiones registradas</p>
              <p className="font-sora text-[12.5px] text-lttm mt-1 max-w-3xl">
                Esta pantalla muestra cada vez que una persona confirma, modifica o rechaza un resultado de un sistema de IA.
                Las decisiones las envía la aplicación donde se revisan los resultados. Solo referencias seudonimizadas:
                nunca el contenido del caso.
              </p>
            </div>
            <ol className="flex flex-col gap-3 font-sora text-[12.5px] text-ltt2 list-decimal pl-5">
              <li>
                Indica en la ficha de cada sistema, en <strong>Supervisión documentada</strong>, su modalidad de supervisión.
                Solo los sistemas <em>por caso</em> o <em>por muestreo</em> envían decisiones.
              </li>
              <li>
                Crea una clave en{' '}
                <Link href="/ajustes?tab=api" className="text-brand-cyan hover:underline">Ajustes › API y desarrolladores</Link>{' '}
                con el permiso <strong>Registrar decisiones humanas</strong>.
              </li>
              <li>
                Envía cada decisión a <code className="font-plex">POST /api/ingest/v1/hitl-decisions</code> (hasta 100 por
                envío), con el identificador del sistema, o impórtalas desde un CSV con las mismas columnas:
                <pre className="mt-2 bg-ltcard border border-ltb rounded-[8px] p-3 font-plex text-[11.5px] text-ltt overflow-x-auto">{`{
  "system_id": "<identificador del sistema>",
  "case_ref": "CASO-2026-00123",
  "ai_suggestion": "aprobar",
  "decision": "overridden",
  "human_outcome": "denegar",
  "reason_code": "datos_incompletos",
  "reviewer_ref": "REV-07",
  "decided_in_ms": 48000
}`}</pre>
                <span className="block mt-1 text-lttm">
                  <code className="font-plex">decision</code>: <code className="font-plex">accepted</code> (confirma),{' '}
                  <code className="font-plex">modified</code>, <code className="font-plex">overridden</code> (lo cambia) o{' '}
                  <code className="font-plex">not_used</code> (no usa el resultado).
                </span>
              </li>
            </ol>
            {systems.length > 0 && (
              <div>
                <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2">Identificadores de los sistemas</p>
                <table className="w-full font-sora text-[12px]">
                  <tbody>
                    {systems.map((x) => (
                      <tr key={x.id} className="border-t border-ltb">
                        <td className="py-1.5 text-ltt">{x.name}</td>
                        <td className="py-1.5 text-lttm">{x.mode ? REVIEW_MODE_LABEL[x.mode] : 'Modalidad sin indicar'}</td>
                        <td className="py-1.5 font-plex text-[11px] text-ltt2 select-all">{x.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
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
                    <Link href={`/supervision?dias=${dias}&sistema=${s.system_id}`}
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
