'use client'

import { useEffect, useState, useTransition } from 'react'
import { LayoutGrid, Check, Clock, Lock } from 'lucide-react'

import {
  MODULE_CATALOG, TRIAL_DAYS_OPTIONS,
  type OrganizationModuleRow, type TrialDays,
} from '@/lib/modules/registry'
import { getOrganizationModules, setOrganizationModule } from '../actions'
import { SectionHeader } from './shared'

const GRUPOS = ['Integración', 'Supervisión', 'Cumplimiento'] as const

function formatDate(iso: string | null) {
  if (!iso) return null
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

/** Vencida cuenta como inactiva: `licensed_until` es la caducidad efectiva. */
function estaActivo(fila: OrganizationModuleRow | undefined): boolean {
  if (!fila) return false
  if (fila.status !== 'enabled' && fila.status !== 'trial') return false
  if (fila.licensed_until && fila.licensed_until < new Date().toISOString().slice(0, 10)) return false
  return true
}

export function ModulosTab({ isAdmin }: { isAdmin: boolean }) {
  const [filas, setFilas] = useState<OrganizationModuleRow[]>([])
  const [dias, setDias] = useState<TrialDays>(30)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pendiente, startTransition] = useTransition()

  useEffect(() => {
    getOrganizationModules().then((r) => {
      if ('error' in r) setError(r.error)
      else setFilas(r.modules)
      setCargando(false)
    })
  }, [])

  function cambiar(moduleKey: string, action: 'trial' | 'disable') {
    setError(null)
    startTransition(async () => {
      const r = await setOrganizationModule({ moduleKey, action, trialDays: dias })
      if ('error' in r) { setError(r.error); return }
      const actualizado = await getOrganizationModules()
      if ('modules' in actualizado) setFilas(actualizado.modules)
    })
  }

  return (
    <div>
      <SectionHeader
        icon={<LayoutGrid size={16} className="text-ltt2" />}
        title="Módulos"
        description="Capacidades que se despliegan aparte del núcleo. Activarlas en prueba las hace visibles en la aplicación hasta la fecha de vencimiento."
      />

      {error && (
        <div className="mb-5 rounded-[9px] border border-red-200 bg-red-50 px-4 py-2.5 font-sora text-[12.5px] text-red-700">
          {error}
        </div>
      )}

      {isAdmin && (
        <div className="mb-6 flex items-center gap-3">
          <span className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">
            Duración de la prueba
          </span>
          {/* No es un ajuste que se guarde: es el parametro de la accion
              siguiente. Sin decirlo, el selector parece un formulario al que
              le falta el boton de guardar. */}
          <div className="flex gap-1.5">
            {TRIAL_DAYS_OPTIONS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDias(d)}
                className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12.5px] transition-colors ${
                  d === dias
                    ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                    : 'border-ltb bg-ltcard2 text-ltt2 hover:border-ltb2'
                }`}
              >
                {d} días
              </button>
            ))}
          </div>
          <span className="font-sora text-[11.5px] text-lttm">
            Se aplica al activar o renovar. No hay nada que guardar.
          </span>
        </div>
      )}

      {cargando ? (
        <p className="font-sora text-[12.5px] text-lttm">Cargando módulos…</p>
      ) : (
        GRUPOS.map((grupo) => (
          <div key={grupo} className="mb-7">
            <h3 className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-2.5">{grupo}</h3>
            <div className="space-y-2">
              {MODULE_CATALOG.filter((m) => m.group === grupo).map((m) => {
                const fila = filas.find((f) => f.module_key === m.key)
                const activo = estaActivo(fila)
                const hasta = formatDate(fila?.licensed_until ?? null)

                return (
                  <div
                    key={m.key}
                    className="flex items-start gap-4 rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-sora text-[13.5px] font-semibold text-ltt">{m.name}</span>
                        {!m.available && (
                          <span className="inline-flex items-center gap-1 rounded-[5px] bg-ltcard px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm">
                            <Lock size={9} /> En construcción
                          </span>
                        )}
                        {activo && fila?.status === 'trial' && (
                          <span className="inline-flex items-center gap-1 rounded-[5px] bg-cyan-dim2 px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-cyan-700">
                            <Clock size={9} /> Prueba{hasta ? ` · hasta ${hasta}` : ''}
                          </span>
                        )}
                        {activo && fila?.status === 'enabled' && (
                          <span className="inline-flex items-center gap-1 rounded-[5px] bg-emerald-50 px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-emerald-700">
                            <Check size={9} /> Contratado
                          </span>
                        )}
                        {!activo && fila && (
                          <span className="rounded-[5px] bg-ltcard px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm">
                            {/* Vencer y desactivar son cosas distintas: la fila
                                desactivada a mano conserva su fecha, y llamarla
                                «vencida» diria algo que no es cierto. */}
                            {fila.status === 'disabled' ? 'Desactivado' : `Vencido ${hasta}`}
                          </span>
                        )}
                      </div>
                      <p className="font-sora text-[12px] text-lttm mt-0.5">{m.desc}</p>
                    </div>

                    {isAdmin && (
                      <div className="shrink-0">
                        {activo ? (
                          <div className="flex gap-1.5">
                            {/* Renovar reescribe la fecha con la duracion
                                elegida arriba. Sin esto, cambiar los dias de
                                una prueba viva obligaba a desactivarla y
                                volver a activarla. */}
                            <button
                              type="button"
                              disabled={pendiente}
                              onClick={() => cambiar(m.key, 'trial')}
                              className="px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard font-sora text-[12px] text-ltt2 hover:border-cyan-border hover:text-cyan-700 disabled:opacity-50 transition-colors"
                            >
                              Renovar {dias} días
                            </button>
                            <button
                              type="button"
                              disabled={pendiente}
                              onClick={() => cambiar(m.key, 'disable')}
                              className="px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard font-sora text-[12px] text-ltt2 hover:border-red-200 hover:text-red-700 disabled:opacity-50 transition-colors"
                            >
                              Desactivar
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={pendiente || !m.available}
                            onClick={() => cambiar(m.key, 'trial')}
                            className="px-3 py-1.5 rounded-[7px] border border-cyan-border bg-cyan-dim2 font-sora text-[12px] text-cyan-700 hover:bg-cyan-dim disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                          >
                            {fila ? 'Reactivar' : 'Activar prueba'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
