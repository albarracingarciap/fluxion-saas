'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Coins, Plus, Trash2, Loader2, AlertTriangle, X } from 'lucide-react'

import { saveBudget, deleteBudget, type BudgetRow } from './actions'

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltbg font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan'

function Form({ systems, onDone, onCancel }: {
  systems: Array<{ id: string; name: string }>
  onDone: () => void
  onCancel: () => void
}) {
  const [scope, setScope] = useState<'organization' | 'system'>('organization')
  const [systemId, setSystemId] = useState('')
  const [amount, setAmount] = useState('')
  const [umbrales, setUmbrales] = useState('50, 80, 100')
  const [error, setError] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function submit() {
    setError(null)
    start(async () => {
      const res = await saveBudget({
        scope,
        aiSystemId: scope === 'system' ? systemId : null,
        amount: Number(amount.replace(',', '.')),
        alertAtPct: umbrales.split(',').map((u) => Number(u.trim())).filter(Boolean),
      })
      if ('error' in res) setError(res.error)
      else onDone()
    })
  }

  return (
    <div className="border border-ltb rounded-[12px] bg-ltbg p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Nuevo presupuesto</p>
        <button onClick={onCancel} className="text-lttm hover:text-ltt"><X size={15} /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Ámbito</label>
          <select
            value={scope} onChange={(e) => setScope(e.target.value as 'organization' | 'system')}
            className={inputCls + ' mt-1.5'}
          >
            <option value="organization">Toda la organización</option>
            <option value="system">Un sistema concreto</option>
          </select>
        </div>

        {scope === 'system' && (
          <div>
            <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Sistema</label>
            <select value={systemId} onChange={(e) => setSystemId(e.target.value)} className={inputCls + ' mt-1.5'}>
              <option value="">Elige…</option>
              {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
            Importe mensual (USD)
          </label>
          <input
            type="text" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)}
            placeholder="250" className={inputCls + ' mt-1.5'}
          />
        </div>

        <div>
          <label className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
            Avisar al (% separados por comas)
          </label>
          <input
            type="text" value={umbrales} onChange={(e) => setUmbrales(e.target.value)}
            className={inputCls + ' mt-1.5'}
          />
        </div>
      </div>

      {error && (
        <p className="text-re text-[12px] font-sora flex items-center gap-1.5">
          <AlertTriangle size={13} /> {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          onClick={submit} disabled={pending || !amount}
          className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2"
        >
          {pending && <Loader2 size={13} className="animate-spin" />} Guardar
        </button>
        <button onClick={onCancel} className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-lttm">
          Cancelar
        </button>
      </div>
    </div>
  )
}

export function PresupuestosClient({ budgets, systems }: {
  budgets: BudgetRow[]
  systems: Array<{ id: string; name: string }>
}) {
  const router = useRouter()
  const [creando, setCreando] = useState(false)
  const [pending, start] = useTransition()

  function borrar(id: string) {
    start(async () => {
      await deleteBudget(id)
      router.refresh()
    })
  }

  return (
    <div className="max-w-[900px] w-full mx-auto flex flex-col gap-5 animate-fadein pb-16">
      <Link href="/observabilidad" className="font-sora text-[12.5px] text-lttm hover:text-ltt flex items-center gap-1.5 w-fit">
        <ArrowLeft size={14} /> Observabilidad
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <Coins size={12} /> Control de gasto
          </p>
          <h1 className="font-fraunces text-[26px] text-ltt mt-1">Presupuestos de IA</h1>
          <p className="font-sora text-[13px] text-lttm mt-2 max-w-2xl">
            El aviso llega por los mismos canales que los incidentes: campana, Slack
            y Teams. Se comprueba cada hora, porque un bucle descontrolado se come
            el presupuesto de un mes en una tarde.
          </p>
        </div>
        {!creando && (
          <button
            onClick={() => setCreando(true)}
            className="shrink-0 px-3.5 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] flex items-center gap-1.5"
          >
            <Plus size={14} /> Nuevo
          </button>
        )}
      </div>

      {creando && (
        <Form
          systems={systems}
          onCancel={() => setCreando(false)}
          onDone={() => { setCreando(false); router.refresh() }}
        />
      )}

      {budgets.length === 0 && !creando && (
        <div className="border border-dashed border-ltb rounded-[12px] p-10 text-center">
          <p className="font-sora text-[13px] text-lttm">
            No hay presupuestos definidos. Sin uno, el gasto se ve pero no avisa.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {budgets.map((b) => {
          const pct = Math.min(b.pct, 150)
          const color = b.pct >= 100 ? 'bg-re' : b.pct >= 80 ? 'bg-or' : 'bg-gr'
          const cobertura = b.calls > 0 ? b.calls_costed / b.calls : 1

          return (
            <div key={b.id} className="border border-ltb rounded-[12px] bg-ltcard p-4 flex flex-col gap-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-sora text-[14px] text-ltt font-semibold">
                    {b.scope === 'organization' ? 'Toda la organización' : b.system_name ?? 'Sistema'}
                  </p>
                  <p className="font-plex text-[10.5px] text-lttm mt-0.5">
                    Avisos al {b.alert_at_pct.join(' %, ')} %
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-sora font-bold text-[18px] text-ltt">
                    {b.spent.toFixed(2)} <span className="text-[12px] text-lttm">de {b.amount} {b.currency}</span>
                  </p>
                  <p className="font-plex text-[10.5px] text-lttm">{b.pct} % del mes en curso</p>
                </div>
              </div>

              <div className="h-1.5 w-full rounded-full bg-ltb overflow-hidden">
                <div className={`h-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>

              <div className="flex items-center justify-between gap-3">
                {cobertura < 1 ? (
                  <p className="font-sora text-[11.5px] text-or">
                    El consumo real es mayor: solo el {Math.round(cobertura * 100)} % de las
                    llamadas tiene tarifa registrada.
                  </p>
                ) : <span />}
                <button
                  onClick={() => borrar(b.id)} disabled={pending}
                  className="shrink-0 text-lttm hover:text-re" title="Borrar presupuesto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
