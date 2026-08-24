'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, ChevronRight, TrendingUp, X } from 'lucide-react'

import { saveBusinessRisk, clearBusinessRisk, type BusinessRiskRow } from './actions'

const ESCALA = [1, 2, 3, 4, 5]

const P_LABEL: Record<number, string> = {
  1: 'Muy improbable', 2: 'Improbable', 3: 'Posible', 4: 'Probable', 5: 'Casi seguro',
}
const I_LABEL: Record<number, string> = {
  1: 'Insignificante', 2: 'Menor', 3: 'Moderado', 4: 'Grave', 5: 'Crítico',
}

const RESPUESTAS = [
  { v: 'mitigar',    l: 'Mitigar',    h: 'Reducir la probabilidad o el impacto' },
  { v: 'aceptar',    l: 'Aceptar',    h: 'Se asume conscientemente' },
  { v: 'transferir', l: 'Transferir', h: 'Seguro, contrato o proveedor' },
  { v: 'evitar',     l: 'Evitar',     h: 'Cambiar el plan para que no pueda ocurrir' },
] as const

function colorExposicion(e: number) {
  if (e >= 15) return 'bg-red-50 text-red-700 border-red-200'
  if (e >= 8)  return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-emerald-50 text-emerald-700 border-emerald-200'
}

function Escala({ valor, onChange, labels }: {
  valor: number; onChange: (v: number) => void; labels: Record<number, string>
}) {
  return (
    <div className="flex gap-1">
      {ESCALA.map((n) => (
        <button
          key={n} type="button" title={labels[n]} onClick={() => onChange(n)}
          className={`w-9 h-9 rounded-[7px] border font-sora text-[13px] transition-colors ${
            n === valor
              ? 'border-cyan-border bg-cyan-dim2 text-cyan-700 font-semibold'
              : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
          }`}
        >{n}</button>
      ))}
    </div>
  )
}

function Riesgo({ riesgo, aiSystemId, onCambio }: {
  riesgo: BusinessRiskRow; aiSystemId: string; onCambio: () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [p, setP] = useState(riesgo.probability ?? 3)
  const [i, setI] = useState(riesgo.impact ?? 3)
  const [respuesta, setRespuesta] = useState<typeof RESPUESTAS[number]['v']>(
    (riesgo.response as typeof RESPUESTAS[number]['v']) ?? 'mitigar'
  )
  const [texto, setTexto] = useState(riesgo.justification ?? '')
  const [revision, setRevision] = useState(riesgo.reviewDue ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  const valorado = riesgo.exposure !== null

  function guardar() {
    setError(null)
    startTransition(async () => {
      const r = await saveBusinessRisk({
        aiSystemId, failureModeId: riesgo.failureModeId,
        probability: p, impact: i, response: respuesta,
        justification: texto, reviewDue: revision || null,
      })
      if ('error' in r) { setError(r.error); return }
      setAbierto(false)
      onCambio()
    })
  }

  function retirar() {
    startTransition(async () => {
      const r = await clearBusinessRisk({ aiSystemId, failureModeId: riesgo.failureModeId })
      if ('error' in r) { setError(r.error); return }
      onCambio()
    })
  }

  return (
    <div className="border border-ltb rounded-[10px] bg-ltcard">
      <button onClick={() => setAbierto(!abierto)} className="w-full flex items-center gap-3 px-4 py-3 text-left">
        {abierto ? <ChevronDown size={14} className="text-lttm shrink-0" />
                 : <ChevronRight size={14} className="text-lttm shrink-0" />}
        <span className="font-plex text-[11px] text-lttm shrink-0 w-[64px]">{riesgo.code}</span>
        <div className="flex-1 min-w-0">
          <p className="font-sora text-[13px] text-ltt">{riesgo.name}</p>
          {riesgo.subcategoria && (
            <p className="font-sora text-[11.5px] text-lttm mt-0.5">{riesgo.subcategoria}</p>
          )}
        </div>
        {valorado ? (
          <span className={`shrink-0 rounded-[6px] border px-2 py-1 font-sora text-[12px] ${colorExposicion(riesgo.exposure!)}`}>
            {riesgo.probability} × {riesgo.impact} = {riesgo.exposure}
          </span>
        ) : (
          <span className="shrink-0 rounded-[6px] border border-ltb bg-ltcard2 px-2 py-1 font-sora text-[12px] text-lttm">
            Sin valorar
          </span>
        )}
      </button>

      {abierto && (
        <div className="border-t border-ltb px-4 py-4 flex flex-col gap-4">
          {riesgo.description && (
            <p className="font-sora text-[12.5px] text-ltt2">{riesgo.description}</p>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">Probabilidad</p>
              <Escala valor={p} onChange={setP} labels={P_LABEL} />
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">{P_LABEL[p]}</p>
            </div>
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">Impacto</p>
              <Escala valor={i} onChange={setI} labels={I_LABEL} />
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">{I_LABEL[i]}</p>
            </div>
          </div>

          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">Respuesta</p>
            <div className="flex gap-1.5 flex-wrap">
              {RESPUESTAS.map((r) => (
                <button
                  key={r.v} type="button" title={r.h} onClick={() => setRespuesta(r.v)}
                  className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12px] ${
                    respuesta === r.v
                      ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                      : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
                  }`}
                >{r.l}</button>
              ))}
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              {RESPUESTAS.find((r) => r.v === respuesta)?.h}
            </p>
          </div>

          <div className="grid grid-cols-[1fr_180px] gap-4">
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                Justificación {respuesta === 'aceptar' && <span className="text-re">· obligatoria</span>}
              </p>
              <textarea
                className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan"
                rows={2}
                value={texto}
                placeholder={respuesta === 'aceptar'
                  ? 'Por qué se asume este riesgo sin hacer nada al respecto'
                  : 'Opcional'}
                onChange={(e) => setTexto(e.target.value)}
              />
            </div>
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">Revisar el</p>
              <input
                type="date"
                className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan"
                value={revision}
                onChange={(e) => setRevision(e.target.value)}
              />
            </div>
          </div>

          {error && <p className="font-sora text-[12px] text-red-700">{error}</p>}

          <div className="flex justify-between items-center">
            {valorado ? (
              <button onClick={retirar} disabled={pendiente}
                className="font-sora text-[12px] text-lttm hover:text-red-600 flex items-center gap-1.5">
                <X size={13} /> Retirar valoración
              </button>
            ) : <span />}
            <button onClick={guardar} disabled={pendiente}
              className="px-4 py-2 rounded-[7px] bg-brand-cyan font-sora text-[12.5px] text-white disabled:opacity-50">
              {pendiente ? 'Guardando…' : 'Guardar'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function RiesgosNegocioClient({ sistema, riesgos, aiSystemId }: {
  sistema: string; riesgos: BusinessRiskRow[]; aiSystemId: string
}) {
  const router = useRouter()
  const valorados = riesgos.filter((r) => r.exposure !== null)
  const altos = valorados.filter((r) => (r.exposure ?? 0) >= 15).length

  return (
    <div className="max-w-[1100px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      {/* Esta pantalla cuelga de un sistema y no esta en el menu lateral: sin
          esto, la unica salida es el boton de atras del navegador. */}
      <Link
        href={`/inventario/${aiSystemId}`}
        className="flex items-center gap-1.5 font-plex text-[12px] uppercase tracking-wider text-lttm hover:text-brand-cyan transition-colors w-fit"
      >
        <ArrowLeft size={14} /> Volver al sistema
      </Link>

      <div className="flex items-start gap-3">
        <div className="w-[34px] h-[34px] rounded-[9px] bg-ltcard2 border border-ltb flex items-center justify-center shrink-0 mt-0.5">
          <TrendingUp size={16} className="text-ltt2" />
        </div>
        <div>
          <h1 className="font-fraunces text-[22px] text-ltt">Riesgos de negocio</h1>
          <p className="font-sora text-[12.5px] text-lttm mt-0.5 max-w-2xl">
            {sistema} · Riesgos de viabilidad que no salen de ningún artículo del Reglamento:
            coste, adopción, capacidades, dependencias. No entran en el FMEA porque no comparten
            escala con los regulatorios, pero pueden hundir el proyecto igual.
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <div className="border border-ltb rounded-[12px] bg-ltcard px-4 py-3">
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Valorados</p>
          <p className="font-sora font-bold text-[20px] text-ltt mt-0.5">
            {valorados.length} <span className="font-normal text-[13px] text-lttm">de {riesgos.length}</span>
          </p>
        </div>
        <div className="border border-ltb rounded-[12px] bg-ltcard px-4 py-3">
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Exposición alta</p>
          <p className={`font-sora font-bold text-[20px] mt-0.5 ${altos > 0 ? 'text-re' : 'text-ltt'}`}>
            {altos}
          </p>
        </div>
      </div>

      {riesgos.length === 0 ? (
        <div className="border border-ltb rounded-[12px] bg-ltcard px-5 py-8 text-center">
          <p className="font-sora text-[13px] text-ltt">
            Este sistema no tiene riesgos de negocio activados.
          </p>
          <p className="font-sora text-[12px] text-lttm mt-1">
            Los activa el mismo motor de reglas que los regulatorios, a partir de las
            características del sistema.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {riesgos.map((r) => (
            <Riesgo
              key={r.failureModeId}
              riesgo={r}
              aiSystemId={aiSystemId}
              onCambio={() => router.refresh()}
            />
          ))}
        </div>
      )}
    </div>
  )
}
