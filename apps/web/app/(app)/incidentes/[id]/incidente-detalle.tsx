'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft, ShieldAlert, Loader2, AlertCircle, CheckCircle2,
  Scale, Send, ListChecks, Plus,
} from 'lucide-react';

import {
  classifyIncident, recordNotification, updateIncident, addCorrectiveAction,
  type IncidentRow, type IncidentCategory,
} from '../actions';
import { DeadlineClock } from '../deadline-clock';

const inputCls =
  'w-full px-3 py-2 rounded-[8px] border border-ltb bg-ltcard font-sora text-[13px] ' +
  'text-ltt outline-none focus:border-brand-cyan'

const label = 'font-plex text-[10px] uppercase tracking-[0.7px] text-lttm'

/** Las etiquetas citan el artículo: quien clasifica necesita saber qué está aplicando. */
const CATEGORIES: Array<{ value: IncidentCategory; label: string; hint: string }> = [
  { value: 'death',                   label: 'Fallecimiento de una persona',        hint: 'Art. 3.49.a · plazo de 10 días' },
  { value: 'health_harm',             label: 'Daño grave a la salud',               hint: 'Art. 3.49.a · plazo de 15 días' },
  { value: 'critical_infrastructure', label: 'Infraestructuras críticas',           hint: 'Art. 3.49.b · plazo de 2 días' },
  { value: 'fundamental_rights',      label: 'Vulneración de derechos fundamentales', hint: 'Art. 3.49.c · plazo de 15 días' },
  { value: 'property_environment',    label: 'Daños a la propiedad o al medio ambiente', hint: 'Art. 3.49.d · plazo de 15 días' },
  { value: 'other',                   label: 'Ninguno de los anteriores',           hint: 'No encaja en la definición de incidente grave' },
]

const STATUSES = [
  { value: 'open',          label: 'Abierto' },
  { value: 'investigating', label: 'En investigación' },
  { value: 'contained',     label: 'Contenido' },
  { value: 'closed',        label: 'Cerrado' },
]

function toLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function Section({ icon, title, children }: {
  icon: React.ReactNode; title: string; children: React.ReactNode
}) {
  return (
    <section className="border border-ltb rounded-[12px] p-5 bg-ltcard flex flex-col gap-4">
      <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
        {icon} {title}
      </p>
      {children}
    </section>
  )
}

export function IncidenteDetalle({ incident, members, actions, canGovern }: {
  incident: IncidentRow
  members: Array<{ id: string; name: string }>
  actions: Array<{ id: string; title: string; status: string; due_date: string | null }>
  canGovern: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  // Clasificación
  const [category, setCategory]     = useState<IncidentCategory>(incident.category)
  const [isSerious, setSerious]     = useState(incident.is_serious)
  const [widespread, setWidespread] = useState(incident.is_widespread_infringement)
  const [role, setRole]             = useState(incident.reporter_role)
  const [aware, setAware]           = useState(toLocalInput(incident.became_aware_at))
  const [causal, setCausal]         = useState(toLocalInput(incident.causal_link_established_at))

  // Notificación
  const [notifiedAt, setNotifiedAt] = useState(toLocalInput(incident.notified_at) || toLocalInput(new Date().toISOString()))
  const [authority, setAuthority]   = useState(incident.authority ?? '')
  const [notifRef, setNotifRef]     = useState(incident.notification_reference ?? '')

  // Gestión
  const [status, setStatus]     = useState(incident.status)
  const [rootCause, setRoot]    = useState(incident.root_cause ?? '')
  const [impact, setImpact]     = useState(incident.impact_summary ?? '')
  const [owner, setOwner]       = useState(incident.owner_id ?? '')

  // Acción correctiva
  const [actionTitle, setActionTitle] = useState('')

  function run(fn: () => Promise<{ success?: true; error?: string }>, okText: string) {
    setMsg(null)
    start(async () => {
      const res = await fn()
      if (res.error) setMsg({ ok: false, text: res.error })
      else { setMsg({ ok: true, text: okText }); router.refresh() }
    })
  }

  const selected = CATEGORIES.find((c) => c.value === category)

  return (
    <div className="max-w-[1000px] w-full mx-auto flex flex-col gap-6 animate-fadein">
      <div>
        <Link href="/incidentes" className="font-sora text-[12.5px] text-lttm hover:text-ltt flex items-center gap-1.5">
          <ArrowLeft size={13} /> Incidentes
        </Link>
        <div className="flex items-center gap-2.5 mt-2 flex-wrap">
          <span className="font-plex text-[12px] text-lttm">{incident.reference}</span>
          <h1 className="font-fraunces text-[24px] text-ltt">{incident.title}</h1>
          {incident.is_serious && (
            <span className="font-plex text-[10px] uppercase tracking-[0.4px] px-1.5 py-0.5 rounded-[4px] border border-reb text-re">
              incidente grave
            </span>
          )}
        </div>
        {incident.description && (
          <p className="font-sora text-[13px] text-lttm mt-2 whitespace-pre-line">{incident.description}</p>
        )}
        {incident.systems.length > 0 && (
          <p className="font-sora text-[12.5px] text-lttm mt-2">
            Sistemas afectados: {incident.systems.map((s) => s.name).join(' · ')}
          </p>
        )}
      </div>

      <div className="border border-ltb rounded-[12px] p-5 bg-ltbg">
        <DeadlineClock incident={incident} size="lg" />
      </div>

      {msg && (
        <p className={`font-sora text-[12.5px] flex items-center gap-1.5 ${msg.ok ? 'text-gr' : 'text-re'}`}>
          {msg.ok ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />} {msg.text}
        </p>
      )}

      {!canGovern && (
        <p className="font-sora text-[12.5px] text-lttm border border-ltb rounded-[10px] p-3">
          Puedes consultar el incidente, pero clasificarlo y registrar la notificación
          corresponde a los roles de gobierno.
        </p>
      )}

      {/* ── Clasificación ── */}
      <Section icon={<Scale size={12} />} title="Clasificación · artículo 3.49">
        <p className="font-sora text-[12.5px] text-lttm">
          De esto depende el plazo. Al guardar, el reloj se recalcula automáticamente
          desde el momento en que se tuvo conocimiento.
        </p>

        <div className="flex flex-col gap-1.5">
          {CATEGORIES.map((c) => (
            <label key={c.value} className="flex items-start gap-2.5 px-3 py-2 rounded-[8px] border border-ltb cursor-pointer hover:border-[var(--cyan-border)]">
              <input
                type="radio" name="cat" checked={category === c.value}
                onChange={() => setCategory(c.value)} disabled={!canGovern}
                className="mt-0.5 accent-[var(--brand-cyan,#00a3c4)]"
              />
              <span className="flex flex-col">
                <span className="font-sora text-[13px] text-ltt">{c.label}</span>
                <span className="font-plex text-[10.5px] text-lttm">{c.hint}</span>
              </span>
            </label>
          ))}
        </div>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox" checked={isSerious} onChange={(e) => setSerious(e.target.checked)}
            disabled={!canGovern} className="mt-1 accent-[var(--brand-cyan,#00a3c4)]"
          />
          <span className="flex flex-col">
            <span className="font-sora text-[13px] text-ltt">Es un incidente grave del artículo 3.49</span>
            <span className="font-sora text-[11.5px] text-lttm">
              Sin marcar esto no hay obligación de notificar ni plazo. Es una valoración
              humana: no todo daño alcanza la gravedad que exige la definición.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-2.5 cursor-pointer">
          <input
            type="checkbox" checked={widespread} onChange={(e) => setWidespread(e.target.checked)}
            disabled={!canGovern} className="mt-1 accent-[var(--brand-cyan,#00a3c4)]"
          />
          <span className="flex flex-col">
            <span className="font-sora text-[13px] text-ltt">Infracción generalizada</span>
            <span className="font-sora text-[11.5px] text-lttm">
              El artículo 73.3 la equipara a las infraestructuras críticas: reduce el plazo a 2 días.
            </span>
          </span>
        </label>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className={label}>Conocimiento del incidente <span className="text-re">*</span></label>
            <input
              type="datetime-local" value={aware} onChange={(e) => setAware(e.target.value)}
              disabled={!canGovern} className={inputCls + ' mt-1.5'}
            />
            <p className="font-sora text-[11px] text-lttm mt-1">Ancla del plazo.</p>
          </div>
          <div>
            <label className={label}>Nexo causal establecido</label>
            <input
              type="datetime-local" value={causal} onChange={(e) => setCausal(e.target.value)}
              disabled={!canGovern} className={inputCls + ' mt-1.5'}
            />
            <p className="font-sora text-[11px] text-lttm mt-1">Obliga a notificar de inmediato.</p>
          </div>
          <div>
            <label className={label}>Nuestro rol</label>
            <select
              value={role} onChange={(e) => setRole(e.target.value as 'provider' | 'deployer')}
              disabled={!canGovern} className={inputCls + ' mt-1.5'}
            >
              <option value="provider">Proveedor</option>
              <option value="deployer">Responsable del despliegue</option>
            </select>
            <p className="font-sora text-[11px] text-lttm mt-1">Art. 26.5 para el segundo.</p>
          </div>
        </div>

        {selected && (
          <p className="font-sora text-[12px] text-lttm">
            Con esta clasificación: <strong className="text-ltt">{isSerious ? selected.hint : 'sin obligación de notificar'}</strong>
          </p>
        )}

        {canGovern && (
          <div>
            <button
              onClick={() => run(() => classifyIncident(incident.id, {
                category, is_serious: isSerious, is_widespread_infringement: widespread,
                reporter_role: role,
                became_aware_at: new Date(aware).toISOString(),
                causal_link_established_at: causal ? new Date(causal).toISOString() : null,
              }), 'Clasificación guardada y plazo recalculado.')}
              disabled={pending || !aware}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2"
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Guardar clasificación
            </button>
          </div>
        )}
      </Section>

      {/* ── Notificación ── */}
      {incident.is_serious && canGovern && (
        <Section icon={<Send size={12} />} title="Notificación a la autoridad">
          <p className="font-sora text-[12.5px] text-lttm">
            El artículo 73.5 admite una notificación inicial incompleta seguida de una
            completa. Registra aquí lo que se envíe: es la prueba de haber cumplido en plazo.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={label}>Fecha de envío</label>
              <input type="datetime-local" value={notifiedAt} onChange={(e) => setNotifiedAt(e.target.value)} className={inputCls + ' mt-1.5'} />
            </div>
            <div>
              <label className={label}>Autoridad</label>
              <input
                type="text" value={authority} onChange={(e) => setAuthority(e.target.value)}
                placeholder="Ej. AESIA" className={inputCls + ' mt-1.5'}
              />
            </div>
            <div>
              <label className={label}>Referencia o acuse</label>
              <input
                type="text" value={notifRef} onChange={(e) => setNotifRef(e.target.value)}
                placeholder="Nº de expediente" className={inputCls + ' mt-1.5'}
              />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => run(() => recordNotification(incident.id, {
                notification_status: 'initial_sent',
                notified_at: new Date(notifiedAt).toISOString(),
                authority, notification_reference: notifRef,
              }), 'Notificación inicial registrada.')}
              disabled={pending}
              className="px-4 py-2 rounded-[8px] border border-ltb font-sora text-[13px] text-ltt disabled:opacity-50"
            >
              Registrar notificación inicial
            </button>
            <button
              onClick={() => run(() => recordNotification(incident.id, {
                notification_status: 'complete_sent',
                notified_at: new Date(notifiedAt).toISOString(),
                authority, notification_reference: notifRef,
              }), 'Notificación completa registrada. El reloj se detiene.')}
              disabled={pending}
              className="px-4 py-2 rounded-[8px] bg-gr text-white font-sora text-[13px] disabled:opacity-50"
            >
              Registrar notificación completa
            </button>
          </div>
        </Section>
      )}

      {/* ── Acciones correctivas ── */}
      <Section icon={<ListChecks size={12} />} title={`Acciones correctivas (${actions.length})`}>
        {actions.length === 0 && (
          <p className="font-sora text-[12.5px] text-lttm">
            Sin acciones registradas. Se crean como tareas y aparecen en el tablero de Ejecución.
          </p>
        )}

        {actions.map((a) => (
          <div key={a.id} className="flex items-center gap-3 py-1.5 border-b border-ltb last:border-0">
            <span className={`font-plex text-[10px] uppercase tracking-[0.4px] w-24 shrink-0 ${
              a.status === 'done' ? 'text-gr' : 'text-lttm'
            }`}>{a.status}</span>
            <Link href={`/tareas?task=${a.id}`} className="font-sora text-[13px] text-ltt hover:underline">
              {a.title}
            </Link>
            {a.due_date && (
              <span className="font-plex text-[11px] text-lttm ml-auto">
                {new Date(a.due_date).toLocaleDateString('es-ES')}
              </span>
            )}
          </div>
        ))}

        {canGovern && (
          <div className="flex gap-2">
            <input
              type="text" value={actionTitle} onChange={(e) => setActionTitle(e.target.value)}
              placeholder="Nueva acción correctiva" className={inputCls}
            />
            <button
              onClick={() => run(async () => {
                const res = await addCorrectiveAction(incident.id, { title: actionTitle })
                if (!res.error) setActionTitle('')
                return res
              }, 'Acción correctiva creada como tarea.')}
              disabled={pending || !actionTitle.trim()}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-1.5 whitespace-nowrap"
            >
              <Plus size={13} /> Añadir
            </button>
          </div>
        )}
      </Section>

      {/* ── Gestión ── */}
      {canGovern && (
        <Section icon={<ShieldAlert size={12} />} title="Investigación y cierre">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={label}>Estado</label>
              <select
                value={status} onChange={(e) => setStatus(e.target.value as typeof status)}
                className={inputCls + ' mt-1.5'}
              >
                {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Responsable</label>
              <select value={owner} onChange={(e) => setOwner(e.target.value)} className={inputCls + ' mt-1.5'}>
                <option value="">Sin asignar</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label}>Causa raíz</label>
            <textarea
              value={rootCause} onChange={(e) => setRoot(e.target.value)} rows={3}
              className={inputCls + ' mt-1.5 resize-y'}
            />
          </div>

          <div>
            <label className={label}>Impacto</label>
            <textarea
              value={impact} onChange={(e) => setImpact(e.target.value)} rows={3}
              className={inputCls + ' mt-1.5 resize-y'}
            />
          </div>

          <div>
            <button
              onClick={() => run(() => updateIncident(incident.id, {
                status, root_cause: rootCause, impact_summary: impact,
                owner_id: owner || null,
              }), 'Incidente actualizado.')}
              disabled={pending}
              className="px-4 py-2 rounded-[8px] bg-brand-cyan text-white font-sora text-[13px] disabled:opacity-50 flex items-center gap-2"
            >
              {pending && <Loader2 size={13} className="animate-spin" />} Guardar
            </button>
          </div>
        </Section>
      )}
    </div>
  )
}
