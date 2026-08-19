'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Tag, Plus, Trash2, Loader2, AlertTriangle, X, Lock, Pencil,
} from 'lucide-react'

import { savePrice, deletePrice, type PriceRow, type MissingPrice } from './actions'

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltbg font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan'

const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm'

type Borrador = {
  id?: string
  provider: string
  model: string
  effectiveFrom: string
  input: string
  output: string
  cached: string
  reasoning: string
  currency: string
  source: string
}

function vacio(prefill?: Partial<Borrador>): Borrador {
  return {
    provider: 'openai', model: '', effectiveFrom: new Date().toISOString().slice(0, 10),
    input: '', output: '', cached: '', reasoning: '', currency: 'USD', source: '',
    ...prefill,
  }
}

function Form({ inicial, onDone, onCancel }: {
  inicial: Borrador
  onDone: () => void
  onCancel: () => void
}) {
  const [f, setF] = useState<Borrador>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  const num = (v: string) => Number(v.replace(',', '.'))

  function submit() {
    setError(null)
    start(async () => {
      const res = await savePrice({
        id: f.id,
        provider: f.provider,
        model: f.model,
        effectiveFrom: f.effectiveFrom,
        inputPerMillion: num(f.input),
        outputPerMillion: num(f.output),
        cachedInputPerMillion: f.cached ? num(f.cached) : null,
        reasoningPerMillion: f.reasoning ? num(f.reasoning) : null,
        currency: f.currency,
        source: f.source,
      })
      if ('error' in res) setError(res.error)
      else onDone()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] bg-ltbg p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className={label}>{f.id ? 'Editar tarifa' : 'Nueva tarifa'}</p>
        <button onClick={onCancel} className="text-lttm hover:text-ltt"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div>
          <label className={label}>Proveedor</label>
          <input value={f.provider} onChange={(e) => setF({ ...f, provider: e.target.value })}
                 placeholder="openai" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Modelo</label>
          <input value={f.model} onChange={(e) => setF({ ...f, model: e.target.value })}
                 placeholder="gpt-5.6-terra" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Vigente desde</label>
          <input type="date" value={f.effectiveFrom}
                 onChange={(e) => setF({ ...f, effectiveFrom: e.target.value })}
                 className={inputCls + ' mt-1.5'} />
        </div>

        <div>
          <label className={label}>Entrada / millón</label>
          <input value={f.input} onChange={(e) => setF({ ...f, input: e.target.value })}
                 inputMode="decimal" placeholder="2.50" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Salida / millón</label>
          <input value={f.output} onChange={(e) => setF({ ...f, output: e.target.value })}
                 inputMode="decimal" placeholder="10.00" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Moneda</label>
          <input value={f.currency} onChange={(e) => setF({ ...f, currency: e.target.value })}
                 className={inputCls + ' mt-1.5'} />
        </div>

        <div>
          <label className={label}>Caché / millón</label>
          <input value={f.cached} onChange={(e) => setF({ ...f, cached: e.target.value })}
                 inputMode="decimal" placeholder="opcional" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Razonamiento / millón</label>
          <input value={f.reasoning} onChange={(e) => setF({ ...f, reasoning: e.target.value })}
                 inputMode="decimal" placeholder="opcional" className={inputCls + ' mt-1.5'} />
        </div>
        <div>
          <label className={label}>Procedencia</label>
          <input value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}
                 placeholder="factura de agosto" className={inputCls + ' mt-1.5'} />
        </div>
      </div>

      <p className="font-sora text-[11.5px] text-lttm">
        Caché y razonamiento no son adorno: si el modelo los usa y no tienen tarifa,
        el coste sale marcado como estimado, y con modelos de razonamiento la
        desviación llega a ser de un factor de tres.
      </p>

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button onClick={submit} disabled={pending || !f.model || !f.input || !f.output}
                className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2">
          {pending && <Loader2 size={13} className="animate-spin" />} Guardar
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export function TarifasClient({ prices, missing }: {
  prices: PriceRow[]
  missing: MissingPrice[]
}) {
  const router = useRouter()
  const [form, setForm] = useState<Borrador | null>(null)
  const [pending, start] = useTransition()

  function borrar(id: string) {
    start(async () => { await deletePrice(id); router.refresh() })
  }

  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <Link href="/observabilidad" className="font-sora text-[12.5px] text-lttm hover:text-ltt flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> Observabilidad
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <Tag size={12} /> Control de gasto
          </p>
          <h1 className="font-fraunces text-[26px] text-ltt mt-1">Tarifas de modelos</h1>
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
            El coste se calcula al recibir cada llamada con la tarifa vigente ese día
            y se congela. Cambiar un precio no reescribe el pasado: es lo que evita
            que el informe de marzo cambie en junio.
          </p>
        </div>
        {!form && (
          <button onClick={() => setForm(vacio())}
                  className="shrink-0 px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] flex items-center gap-1.5">
            <Plus size={14} /> Nueva tarifa
          </button>
        )}
      </div>

      {form && (
        <Form inicial={form} onCancel={() => setForm(null)}
              onDone={() => { setForm(null); router.refresh() }} />
      )}

      {/* Modelos con tráfico y sin tarifa */}
      {missing.length > 0 && (
        <div className="border border-orb bg-[var(--or-dim,#fff8ef)] rounded-[12px] p-4">
          <p className="font-sora text-[13px] text-or font-semibold flex items-center gap-1.5">
            <AlertTriangle size={14} /> Modelos con tráfico y sin tarifa
          </p>
          <p className="font-sora text-[12px] text-lttm mt-1">
            Mientras estén aquí, el coste total de la organización está incompleto.
          </p>
          <div className="flex flex-col gap-1.5 mt-2.5">
            {missing.map((m) => (
              <div key={`${m.provider}/${m.model}`} className="flex items-center justify-between gap-3">
                <span className="font-sora text-[12.5px] text-ltt">
                  <span className="font-plex text-[11px] text-lttm">{m.provider}</span> {m.model}
                  <span className="font-plex text-[10.5px] text-lttm ml-2">
                    {m.calls.toLocaleString('es-ES')} llamadas
                  </span>
                </span>
                <button
                  onClick={() => setForm(vacio({ provider: m.provider, model: m.model }))}
                  className="shrink-0 font-sora text-[12px] text-brand-cyan"
                >
                  Poner tarifa
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {prices.length === 0 && !form && (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13px] text-lttm">
            No hay ninguna tarifa. Sin ellas, la telemetría cuenta tokens pero no
            puede decir cuánto cuestan.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {prices.map((p) => (
          <div key={p.id}
               className={`border rounded-[10px] p-3.5 flex items-center justify-between gap-4 ${
                 p.overridden ? 'border-ltb bg-ltbg opacity-60' : 'border-ltb bg-ltcard'
               }`}>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-sora text-[13.5px] text-ltt font-semibold">{p.model}</span>
                <span className="font-plex text-[10.5px] text-lttm">{p.provider}</span>
                {p.isCatalog && (
                  <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-lttm flex items-center gap-1">
                    <Lock size={9} /> catálogo
                  </span>
                )}
                {p.overridden && (
                  <span className="font-plex text-[9.5px] uppercase tracking-[0.4px] text-or">
                    anulada por tu tarifa
                  </span>
                )}
              </div>
              <p className="font-plex text-[10.5px] text-lttm mt-0.5">
                desde {new Date(p.effective_from).toLocaleDateString('es-ES')}
                {p.source && ` · ${p.source}`}
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <p className="font-sora font-bold text-[13px] text-ltt">
                  {p.input_per_million} / {p.output_per_million}
                  <span className="font-plex text-[10px] text-lttm ml-1">{p.currency} por M</span>
                </p>
                <p className="font-plex text-[10px] text-lttm">
                  entrada / salida
                  {p.cached_input_per_million != null && ` · caché ${p.cached_input_per_million}`}
                  {p.reasoning_per_million != null && ` · razona ${p.reasoning_per_million}`}
                </p>
              </div>

              {!p.isCatalog && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setForm({
                      id: p.id, provider: p.provider, model: p.model,
                      effectiveFrom: p.effective_from,
                      input: String(p.input_per_million), output: String(p.output_per_million),
                      cached: p.cached_input_per_million?.toString() ?? '',
                      reasoning: p.reasoning_per_million?.toString() ?? '',
                      currency: p.currency, source: p.source ?? '',
                    })}
                    className="text-lttm hover:text-brand-cyan" title="Editar"
                  >
                    <Pencil size={13} />
                  </button>
                  <button onClick={() => borrar(p.id)} disabled={pending}
                          className="text-lttm hover:text-re" title="Borrar">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <p className="font-sora text-[11.5px] text-lttm">
        Las tarifas del catálogo las mantiene Fluxion y las comparten todas las
        organizaciones. Si tienes precios negociados, crea la tuya para el mismo
        modelo: prevalece sobre la del catálogo.
      </p>
    </div>
  )
}
