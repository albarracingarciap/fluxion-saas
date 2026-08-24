'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Layers, ChevronDown, ChevronRight, Check, X, AlertTriangle } from 'lucide-react'

import {
  getFamilyEstimates, saveFamilyEstimate, deleteFamilyEstimate,
  type FamilyEstimateRow,
} from './actions'

const ESCALA = [1, 2, 3, 4, 5]

// Mismo vocabulario que usa la evaluación individual: más O y más D suben la
// severidad, así que 5 es siempre lo peor.
const O_LABEL: Record<number, string> = {
  1: 'Muy improbable', 2: 'Improbable', 3: 'Posible', 4: 'Probable', 5: 'Casi seguro',
}
const D_LABEL: Record<number, string> = {
  1: 'Se detecta siempre', 2: 'Se detecta casi siempre', 3: 'Detección parcial',
  4: 'Difícil de detectar', 5: 'No se detecta',
}

function Selector({ valor, onChange, labels, disabled }: {
  valor: number
  onChange: (v: number) => void
  labels: Record<number, string>
  disabled?: boolean
}) {
  return (
    <div className="flex gap-1">
      {ESCALA.map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          title={labels[n]}
          className={`w-9 h-9 rounded-[7px] border font-sora text-[13px] transition-colors disabled:opacity-40 ${
            n === valor
              ? 'border-cyan-border bg-cyan-dim2 text-cyan-700 font-semibold'
              : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

function Familia({ fila, aiSystemId, evaluationId, readOnly, onCambio }: {
  fila:         FamilyEstimateRow
  aiSystemId:   string
  evaluationId: string
  readOnly:     boolean
  onCambio:     () => void
}) {
  const [abierto, setAbierto] = useState(false)
  const [o, setO] = useState(fila.oValue ?? 3)
  const [d, setD] = useState(fila.dValue ?? 3)
  const [texto, setTexto] = useState(fila.justification ?? '')
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  const estimada = fila.oValue !== null
  const heredan = fila.modos - fila.manuales

  function guardar() {
    setError(null)
    startTransition(async () => {
      const r = await saveFamilyEstimate({
        aiSystemId, evaluationId,
        familyLabel: fila.familyLabel,
        oValue: o, dValue: d, justification: texto,
      })
      if ('error' in r) { setError(r.error); return }
      setAbierto(false)
      onCambio()
    })
  }

  function retirar() {
    if (!confirm(
      `¿Retirar la estimación de «${fila.familyLabel}»?\n\n`
      + `Los ${heredan} modos que la heredan vuelven a pendiente. `
      + `Los ajustados a mano no se tocan.`
    )) return
    startTransition(async () => {
      const r = await deleteFamilyEstimate({ aiSystemId, evaluationId, familyLabel: fila.familyLabel })
      if ('error' in r) { setError(r.error); return }
      onCambio()
    })
  }

  return (
    <div className="border border-ltb rounded-[10px] bg-ltcard">
      <button
        onClick={() => setAbierto(!abierto)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left"
      >
        {abierto ? <ChevronDown size={14} className="text-lttm shrink-0" />
                 : <ChevronRight size={14} className="text-lttm shrink-0" />}

        <div className="flex-1 min-w-0">
          <p className="font-sora text-[13.5px] font-semibold text-ltt">{fila.familyLabel}</p>
          <p className="font-sora text-[11.5px] text-lttm mt-0.5">
            {fila.modos} modos
            {fila.manuales > 0 && ` · ${fila.manuales} ajustados a mano`}
          </p>
        </div>

        {estimada ? (
          <span className="flex items-center gap-1.5 rounded-[6px] bg-emerald-50 px-2 py-1 font-sora text-[12px] text-emerald-700 shrink-0">
            <Check size={12} /> O {fila.oValue} · D {fila.dValue}
          </span>
        ) : (
          <span className="rounded-[6px] bg-ltcard2 border border-ltb px-2 py-1 font-sora text-[12px] text-lttm shrink-0">
            Sin estimar
          </span>
        )}
      </button>

      {abierto && (
        <div className="border-t border-ltb px-4 py-4 flex flex-col gap-4">
          {fila.manuales > 0 && (
            <p className="font-sora text-[12px] text-lttm flex items-start gap-1.5">
              <AlertTriangle size={13} className="text-or shrink-0 mt-0.5" />
              {fila.manuales} de estos modos se ajustaron individualmente. La estimación
              de familia no los toca: lo que se afinó a mano se respeta.
            </p>
          )}

          <div className="grid grid-cols-2 gap-5">
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                Ocurrencia (O)
              </p>
              <Selector valor={o} onChange={setO} labels={O_LABEL} disabled={readOnly} />
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">{O_LABEL[o]}</p>
            </div>
            <div>
              <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">
                Detección (D)
              </p>
              <Selector valor={d} onChange={setD} labels={D_LABEL} disabled={readOnly} />
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">{D_LABEL[d]}</p>
            </div>
          </div>

          <div>
            <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-ltt2 mb-1.5">
              Justificación
            </p>
            <textarea
              className="w-full bg-ltbg border border-ltb rounded-lg px-3 py-2 text-[13px] text-ltt font-sora outline-none focus:border-brand-cyan"
              rows={3}
              value={texto}
              disabled={readOnly}
              placeholder="Por qué estos modos comparten ocurrencia y detección: qué causa común tienen y qué control los cubre."
              onChange={(e) => setTexto(e.target.value)}
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1">
              {/* Sustituye a la justificación de cada modo de la familia, así que
                  se le exige el mismo mínimo que a una individual. */}
              Sustituye a la de los {heredan} modos que la heredan. Mínimo 50 caracteres
              ({texto.trim().length}).
            </p>
          </div>

          {error && (
            <p className="font-sora text-[12px] text-red-700">{error}</p>
          )}

          {!readOnly && (
            <div className="flex justify-between items-center">
              {estimada ? (
                <button
                  onClick={retirar}
                  disabled={pendiente}
                  className="font-sora text-[12px] text-lttm hover:text-red-600 flex items-center gap-1.5"
                >
                  <X size={13} /> Retirar estimación
                </button>
              ) : <span />}

              <button
                onClick={guardar}
                disabled={pendiente || texto.trim().length < 50}
                className="px-4 py-2 rounded-[7px] bg-brand-cyan font-sora text-[12.5px] text-white disabled:opacity-50"
              >
                {pendiente ? 'Aplicando…' : `Aplicar a ${heredan} modos`}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export function FamiliasPanel({ aiSystemId, evaluationId, readOnly }: {
  aiSystemId:   string
  evaluationId: string
  readOnly:     boolean
}) {
  const router = useRouter()
  const [filas, setFilas] = useState<FamilyEstimateRow[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    getFamilyEstimates({ aiSystemId, evaluationId }).then((r) => {
      if ('error' in r) { setError(r.error); return }
      setFilas(r.familias)
    })
  }, [aiSystemId, evaluationId])

  useEffect(() => { load() }, [load])

  function onCambio() {
    load()
    // La lista de ítems vive en el componente padre y se sirve del servidor:
    // sin esto, los valores propagados no se verían hasta recargar.
    router.refresh()
  }

  if (error) {
    return (
      <div className="border border-ltb rounded-[12px] bg-ltcard p-5">
        <p className="font-sora text-[12.5px] text-red-700">{error}</p>
      </div>
    )
  }

  if (!filas?.length) return null

  const estimadas = filas.filter((f) => f.oValue !== null).length
  const cubiertos = filas.reduce((n, f) => n + (f.oValue !== null ? f.modos - f.manuales : 0), 0)

  return (
    <div className="border border-ltb rounded-[12px] bg-ltcard p-5">
      <div className="mb-4">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
          <Layers size={12} /> Estimación por familia · {estimadas} de {filas.length}
        </p>
        <p className="font-sora text-[12.5px] text-lttm mt-1 max-w-3xl">
          Los modos de una familia comparten causa y control, así que se pueden estimar
          juntos y ajustar después los que se salgan. Es práctica estándar de FMEA: lo
          que exige el artículo 9 es que la estimación esté documentada y justificada, no
          que se haga de una en una.
        </p>
        {cubiertos > 0 && (
          <p className="font-sora text-[12px] text-cyan-700 mt-1.5">
            {cubiertos} modos estimados por familia.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        {filas.map((f) => (
          <Familia
            key={f.familyLabel}
            fila={f}
            aiSystemId={aiSystemId}
            evaluationId={evaluationId}
            readOnly={readOnly}
            onCambio={onCambio}
          />
        ))}
      </div>
    </div>
  )
}
