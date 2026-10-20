'use client'

import { useEffect, useState, useCallback } from 'react'
import { GitBranch, Plus, Trash2, X, ArrowUp, ArrowDown, AlertTriangle, UserCog } from 'lucide-react'

import {
  getApprovalPolicies, getApprovalApproverOptions,
  saveApprovalPolicy, deleteApprovalPolicy,
  getApprovalDelegations, saveApprovalDelegation, deleteApprovalDelegation,
  type ApprovalDelegationRow,
} from '../actions'
import {
  APPROVAL_COMMITTEE_TYPES,
  APPROVAL_GAP_LAYERS,
  APPROVAL_OBJECT_TYPES,
  APPROVAL_STEP_CONDITIONS,
  APPROVAL_STEP_KINDS,
  type ApprovalPolicyRow, type ApprovalStepRow, type ApprovalObjectType,
  type ApprovalApproverOptions,
} from '@/lib/approvals/catalog'
import { GOVERNANCE_FUNCTIONS, getGovernanceFunctionLabel } from '@/lib/governance/functions'
import { TEMPLATE_KEYS, templateMeta } from '@/lib/documents/templates'
import { FieldLabel, inputCls, selectCls, SelectArrow } from './shared'
import { ROLE_LABELS } from '@/lib/auth/role-labels'


// Solo para planes de tratamiento. Es la única condición que tiene sentido hoy:
// el nivel lo calcula el propio plan a partir del riesgo residual, y es lo que
// distingue una aprobación de trámite de una que acepta riesgo alto.
const NIVELES = ['level_1', 'level_2', 'level_3'] as const
const NIVEL_LABELS: Record<string, string> = {
  level_1: 'Nivel 1 · riesgo bajo',
  level_2: 'Nivel 2 · riesgo medio',
  level_3: 'Nivel 3 · riesgo alto',
}

type FormState = {
  id?:                string
  object_type:        ApprovalObjectType
  name:               string
  niveles:            string[]
  /** Plantillas del expediente a las que se aplica (B11b). */
  plantillas:         string[]
  /** Capas de brecha cuya exclusión gobierna (B11d). */
  capas:              string[]
  /** Días hasta que caduca la solicitud; vacío = no caduca (B11c). */
  caducidad:          string
  author_can_approve: boolean
  is_active:          boolean
  steps:              ApprovalStepRow[]
}

const PASO_NUEVO: ApprovalStepRow = {
  position: 1, approver_type: 'role', approver_ref: 'sgai_manager',
  quorum: null, allow_delegation: true,
}

function formVacio(): FormState {
  return {
    object_type: 'treatment_plan',
    name: '',
    niveles: ['level_3'],
    plantillas: [],
    capas: [],
    caducidad: '',
    author_can_approve: false,
    is_active: true,
    steps: [{ ...PASO_NUEVO }],
  }
}

function describeStep(s: ApprovalStepRow, opciones: ApprovalApproverOptions): string {
  // Consulta y condición delante (B11d): «Consulta · CISO · si hay controles de seguridad».
  const pre = s.kind === 'consultation' ? 'Consulta · ' : ''
  const cond = APPROVAL_STEP_CONDITIONS
    .filter((c) => (s.condition?.[c.key] ?? []).includes(c.value))
    .map((c) => ` · ${c.label.toLowerCase()}`)
    .join('')
  return pre + describeApprover(s, opciones) + cond
}

function describeApprover(s: ApprovalStepRow, opciones: ApprovalApproverOptions): string {
  if (s.approver_type === 'role') return ROLE_LABELS[s.approver_ref] ?? s.approver_ref
  if (s.approver_type === 'profile') {
    return opciones.profiles.find((p) => p.id === s.approver_ref)?.label ?? 'Persona'
  }
  // Una consulta sin nadie a quien consultar se omite: no tiene respaldo (B11d).
  const respaldo = s.kind === 'consultation'
    ? ' (si no hay, se omite)'
    : ` (si no hay: ${ROLE_LABELS[s.fallback_role ?? 'sgai_manager'] ?? s.fallback_role})`
  if (s.approver_type === 'committee_type') {
    const t = APPROVAL_COMMITTEE_TYPES.find((c) => c.key === s.approver_ref)?.label ?? 'Comité'
    return `${t} · quórum ${s.quorum ?? 'del comité'}${respaldo}`
  }
  if (s.approver_type === 'function') return `${getGovernanceFunctionLabel(s.approver_ref)}${respaldo}`
  const c = opciones.committees.find((c) => c.id === s.approver_ref)?.label ?? 'Comité'
  return `${c} · quórum ${s.quorum ?? 1}`
}

// ── Editor ──────────────────────────────────────────────────────────────────

function Editor({ inicial, opciones, onClose, onSaved }: {
  inicial:  FormState
  opciones: ApprovalApproverOptions
  onClose:  () => void
  onSaved:  () => void
}) {
  const [form, setForm]   = useState<FormState>(inicial)
  const [error, setError] = useState<string | null>(null)
  const [guardando, setGuardando] = useState(false)

  function setPaso(i: number, cambios: Partial<ApprovalStepRow>) {
    setForm((f) => ({
      ...f,
      steps: f.steps.map((s, j) => (j === i ? { ...s, ...cambios } : s)),
    }))
  }

  function mover(i: number, delta: number) {
    setForm((f) => {
      const pasos = [...f.steps]
      const destino = i + delta
      if (destino < 0 || destino >= pasos.length) return f
      ;[pasos[i], pasos[destino]] = [pasos[destino], pasos[i]]
      return { ...f, steps: pasos }
    })
  }

  async function guardar() {
    setGuardando(true)
    setError(null)
    const r = await saveApprovalPolicy({
      id:                 form.id,
      object_type:        form.object_type,
      name:               form.name,
      // Solo las condiciones que la aplicación envía en el contexto: el nivel
      // del plan, la plantilla del expediente (B11b) y la capa de la brecha
      // (B11d). Una condición sobre una clave que nadie envía dejaría la
      // política sin aplicar jamás.
      conditions:         form.object_type === 'treatment_plan' && form.niveles.length
                            ? { approval_level: form.niveles }
                            : form.object_type === 'document' && form.plantillas.length
                              ? { template_key: form.plantillas }
                              : form.object_type === 'gap_disposition' && form.capas.length
                                ? { gap_layer: form.capas }
                                : {},
      author_can_approve: form.author_can_approve,
      is_active:          form.is_active,
      expires_after_days: form.caducidad ? Number(form.caducidad) : null,
      steps:              form.steps,
    })
    setGuardando(false)
    if ('error' in r) { setError(r.error); return }
    onSaved()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-ltcard rounded-[14px] border border-ltb shadow-[0_20px_60px_rgba(0,0,0,0.18)]">
        <div className="sticky top-0 bg-ltcard2 px-6 py-4 border-b border-ltb flex items-center justify-between rounded-t-[14px]">
          <h2 className="font-sora text-[14px] font-semibold text-ltt">
            {form.id ? 'Editar política' : 'Nueva política de aprobación'}
          </h2>
          <button onClick={onClose} className="text-lttm hover:text-ltt"><X size={16} /></button>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {error && (
            <div className="rounded-[9px] border border-red-200 bg-red-50 px-4 py-2.5 font-sora text-[12.5px] text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <FieldLabel>Tipo de objeto</FieldLabel>
              <div className="relative">
                <select
                  className={selectCls}
                  value={form.object_type}
                  disabled={!!form.id}
                  onChange={(e) => setForm((f) => ({ ...f, object_type: e.target.value as ApprovalObjectType }))}
                >
                  {APPROVAL_OBJECT_TYPES.map((t) => (
                    <option key={t.key} value={t.key}>{t.label}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <FieldLabel>Nombre</FieldLabel>
              <input
                className={inputCls}
                value={form.name}
                placeholder="Aprobación de riesgo residual alto"
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
          </div>

          {form.object_type === 'treatment_plan' && (
            <div>
              <FieldLabel>Se aplica a los niveles</FieldLabel>
              <div className="flex gap-1.5">
                {NIVELES.map((n) => {
                  const activo = form.niveles.includes(n)
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        niveles: activo ? f.niveles.filter((x) => x !== n) : [...f.niveles, n],
                      }))}
                      className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-colors ${
                        activo
                          ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                          : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
                      }`}
                    >
                      {NIVEL_LABELS[n]}
                    </button>
                  )
                })}
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Sin ninguno marcado, la política se aplica a todos los planes.
              </p>
            </div>
          )}

          {form.object_type === 'document' && (
            <div>
              <FieldLabel>Se aplica a las plantillas</FieldLabel>
              <div className="flex gap-1.5 flex-wrap">
                {TEMPLATE_KEYS.map((k) => {
                  const activo = form.plantillas.includes(k)
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        plantillas: activo ? f.plantillas.filter((x) => x !== k) : [...f.plantillas, k],
                      }))}
                      className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-colors ${
                        activo
                          ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                          : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
                      }`}
                    >
                      {templateMeta(k).label}
                    </button>
                  )
                })}
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Sin ninguna marcada, la política se aplica a todos los expedientes. Si varias políticas
                encajan, se aplica la más específica.
              </p>
            </div>
          )}

          {form.object_type === 'gap_disposition' && (
            <div>
              <FieldLabel>Se aplica a las brechas</FieldLabel>
              <div className="flex gap-1.5 flex-wrap">
                {APPROVAL_GAP_LAYERS.map((c) => {
                  const activo = form.capas.includes(c.key)
                  return (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => setForm((f) => ({
                        ...f,
                        capas: activo ? f.capas.filter((x) => x !== c.key) : [...f.capas, c.key],
                      }))}
                      className={`px-3 py-1.5 rounded-[7px] border font-sora text-[12px] transition-colors ${
                        activo
                          ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                          : 'border-ltb bg-ltcard2 text-lttm hover:border-ltb2'
                      }`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
              <p className="font-sora text-[11.5px] text-lttm mt-1.5">
                Sin ninguna marcada, toda exclusión de brechas pasa por aprobación. Las brechas de las
                capas que no gobierne ninguna política se excluyen directamente.
              </p>
            </div>
          )}

          {/* ── Cadena ── */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <FieldLabel>Cadena de aprobación</FieldLabel>
              <button
                type="button"
                onClick={() => setForm((f) => ({
                  ...f,
                  steps: [...f.steps, { ...PASO_NUEVO, position: f.steps.length + 1 }],
                }))}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-[6px] border border-ltb font-sora text-[12px] text-lttm hover:text-ltt"
              >
                <Plus size={13} /> Añadir paso
              </button>
            </div>

            <div className="flex flex-col gap-2">
              {form.steps.map((s, i) => (
                <div key={i} className="rounded-[9px] border border-ltb bg-ltcard2 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-6 h-6 rounded-full bg-ltcard border border-ltb flex items-center justify-center font-sora text-[11px] font-semibold text-ltt2 shrink-0">
                      {i + 1}
                    </span>
                    <div className="flex-1" />
                    <button type="button" onClick={() => mover(i, -1)} disabled={i === 0}
                      className="p-1 text-lttm hover:text-ltt disabled:opacity-30"><ArrowUp size={13} /></button>
                    <button type="button" onClick={() => mover(i, 1)} disabled={i === form.steps.length - 1}
                      className="p-1 text-lttm hover:text-ltt disabled:opacity-30"><ArrowDown size={13} /></button>
                    <button type="button"
                      onClick={() => setForm((f) => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}
                      disabled={form.steps.length === 1}
                      className="p-1 text-lttm hover:text-red-600 disabled:opacity-30"><Trash2 size={13} /></button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="relative">
                      <select
                        className={selectCls}
                        value={s.kind ?? 'approval'}
                        onChange={(e) => setPaso(i, { kind: e.target.value as ApprovalStepRow['kind'] })}
                      >
                        {APPROVAL_STEP_KINDS.map((k) => (
                          <option key={k.key} value={k.key}>{k.label}</option>
                        ))}
                      </select>
                      <SelectArrow />
                    </div>
                    {form.object_type === 'treatment_plan' && APPROVAL_STEP_CONDITIONS.map((c) => (
                      <label key={c.key} className="flex items-center gap-2 font-sora text-[12px] text-ltt2">
                        <input
                          type="checkbox"
                          checked={(s.condition?.[c.key] ?? []).includes(c.value)}
                          onChange={(e) => {
                            const resto = { ...(s.condition ?? {}) }
                            delete resto[c.key]
                            setPaso(i, { condition: e.target.checked ? { ...resto, [c.key]: [c.value] } : resto })
                          }}
                        />
                        {c.label}
                      </label>
                    ))}
                  </div>

                  {s.kind === 'consultation' && (
                    <p className="font-sora text-[11.5px] text-lttm mb-3">
                      Quien consulta emite un dictamen favorable o desfavorable, siempre con texto. Consta
                      en la solicitud y en el acta, pero no decide: la solicitud pasa al paso siguiente.
                      Si no hay nadie a quien consultar, el paso se omite.
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                      <select
                        className={selectCls}
                        value={s.approver_type}
                        onChange={(e) => {
                          const tipo = e.target.value as ApprovalStepRow['approver_type']
                          setPaso(i, {
                            approver_type: tipo,
                            approver_ref:
                              tipo === 'role'           ? 'sgai_manager'
                            : tipo === 'profile'        ? (opciones.profiles[0]?.id ?? '')
                            : tipo === 'committee_type' ? 'risk_committee'
                            : tipo === 'function'       ? 'data_controller'
                            :                             (opciones.committees[0]?.id ?? ''),
                            quorum: tipo === 'committee' ? 2 : null,
                            fallback_role: tipo === 'committee_type' || tipo === 'function' ? 'sgai_manager' : null,
                          })
                        }}
                      >
                        <option value="role">Por rol</option>
                        <option value="profile">Persona concreta</option>
                        <option value="committee">Comité concreto</option>
                        <option value="committee_type">Comité por tipo</option>
                        <option value="function">Función de gobierno</option>
                      </select>
                      <SelectArrow />
                    </div>

                    <div className="relative">
                      <select
                        className={selectCls}
                        value={s.approver_ref}
                        onChange={(e) => setPaso(i, { approver_ref: e.target.value })}
                      >
                        {s.approver_type === 'role' && Object.entries(ROLE_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                        {s.approver_type === 'profile' && opciones.profiles.map((p) => (
                          <option key={p.id} value={p.id}>{p.label}</option>
                        ))}
                        {s.approver_type === 'committee' && opciones.committees.map((c) => (
                          <option key={c.id} value={c.id}>{c.label}</option>
                        ))}
                        {s.approver_type === 'committee_type' && APPROVAL_COMMITTEE_TYPES.map((c) => (
                          <option key={c.key} value={c.key}>{c.label}</option>
                        ))}
                        {s.approver_type === 'function' && GOVERNANCE_FUNCTIONS.map((f) => (
                          <option key={f.key} value={f.key}>{f.label}</option>
                        ))}
                      </select>
                      <SelectArrow />
                    </div>
                  </div>

                  {s.approver_type === 'committee' && opciones.committees.length > 0 && (
                    <p className="font-sora text-[11.5px] text-lttm mt-2">
                      Solo votan los miembros del comité con cuenta en Fluxion. Los externos
                      constan en el comité pero no pueden emitir voto, así que cuéntalos fuera
                      al fijar el quórum.
                    </p>
                  )}

                  {(s.approver_type === 'committee_type' || s.approver_type === 'function') && (
                    <div className="mt-2">
                      <p className="font-sora text-[11.5px] text-lttm">
                        {s.approver_type === 'committee_type'
                          ? 'Al abrir cada solicitud se usa el comité activo de ese tipo, con su quórum (o la mayoría de los miembros con voto). Si no está constituido o no tiene miembros con voto, decide el rol de respaldo.'
                          : 'Al abrir cada solicitud se usa la persona designada en Organización › Gobernanza. Si la función está sin designar, decide el rol de respaldo.'}
                      </p>
                      {s.kind !== 'consultation' && <label className="flex items-center gap-2 font-sora text-[12px] text-ltt2 mt-2">
                        Rol de respaldo
                        <span className="relative">
                          <select
                            className={`${selectCls} py-1`}
                            value={s.fallback_role ?? 'sgai_manager'}
                            onChange={(e) => setPaso(i, { fallback_role: e.target.value })}
                          >
                            {Object.entries(ROLE_LABELS).map(([k, v]) => (
                              <option key={k} value={k}>{v}</option>
                            ))}
                          </select>
                          <SelectArrow />
                        </span>
                      </label>}
                    </div>
                  )}

                  {s.approver_type === 'committee' && opciones.committees.length === 0 && (
                    <p className="font-sora text-[11.5px] text-amber-700 mt-2 flex items-center gap-1.5">
                      <AlertTriangle size={12} /> No hay comités activos. Créalos en la ficha de la organización.
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-3">
                    {s.approver_type === 'committee' && (
                      <label className="flex items-center gap-2 font-sora text-[12px] text-ltt2">
                        Quórum
                        <input
                          type="number" min={1}
                          className={`${inputCls} w-16 py-1`}
                          value={s.quorum ?? 1}
                          onChange={(e) => setPaso(i, { quorum: Number(e.target.value) })}
                        />
                      </label>
                    )}
                    {s.approver_type === 'committee_type' && (
                      <label className="flex items-center gap-2 font-sora text-[12px] text-ltt2">
                        Quórum
                        <input
                          type="number" min={1}
                          className={`${inputCls} w-20 py-1`}
                          value={s.quorum ?? ''}
                          placeholder="Comité"
                          onChange={(e) => setPaso(i, { quorum: e.target.value ? Number(e.target.value) : null })}
                        />
                      </label>
                    )}
                    <label className="flex items-center gap-2 font-sora text-[12px] text-ltt2">
                      <input
                        type="checkbox"
                        checked={s.allow_delegation}
                        onChange={(e) => setPaso(i, { allow_delegation: e.target.checked })}
                      />
                      Admite delegación
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Segregación de funciones ── */}
          <div className="rounded-[9px] border border-ltb bg-ltcard2 px-4 py-3">
            <label className="flex items-start gap-2.5 font-sora text-[12.5px] text-ltt">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.author_can_approve}
                onChange={(e) => setForm((f) => ({ ...f, author_can_approve: e.target.checked }))}
              />
              <span>
                Quien solicita puede aprobar
                <span className="block font-sora text-[11.5px] text-lttm mt-0.5">
                  Desactivado es lo normal: quien redacta no aprueba. Marcarlo queda
                  registrado en la política, para que se vea como una decisión y no como
                  un descuido.
                </span>
              </span>
            </label>
          </div>

          <div>
            <FieldLabel>Caducidad de las solicitudes (días)</FieldLabel>
            <input
              type="number"
              min={1}
              className={`${inputCls} w-32`}
              value={form.caducidad}
              placeholder="No caduca"
              onChange={(e) => setForm((f) => ({ ...f, caducidad: e.target.value }))}
            />
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Si nadie decide en ese plazo, la solicitud caduca: el objeto vuelve a borrador y se avisa a quien la
              pidió y a quien tenía que decidir.
            </p>
          </div>

          <label className="flex items-center gap-2 font-sora text-[12.5px] text-ltt">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            Activa
          </label>
        </div>

        <div className="sticky bottom-0 bg-ltcard2 px-6 py-4 border-t border-ltb flex justify-end gap-2 rounded-b-[14px]">
          <button onClick={onClose} className="px-4 py-2 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm hover:text-ltt">
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando}
            className="px-4 py-2 rounded-[7px] bg-brand-cyan font-sora text-[12.5px] text-white disabled:opacity-50"
          >
            {guardando ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Pestaña ─────────────────────────────────────────────────────────────────

export function AprobacionesTab() {
  const [rows, setRows]     = useState<ApprovalPolicyRow[] | null>(null)
  const [opciones, setOpciones] = useState<ApprovalApproverOptions>({ profiles: [], committees: [] })
  const [editando, setEditando] = useState<FormState | null>(null)
  const [error, setError]   = useState<string | null>(null)

  const load = useCallback(() => {
    getApprovalPolicies().then(setRows)
    getApprovalApproverOptions().then(setOpciones)
  }, [])

  useEffect(() => { load() }, [load])

  async function borrar(row: ApprovalPolicyRow) {
    if (!confirm(`¿Eliminar la política «${row.name}»?`)) return
    const r = await deleteApprovalPolicy(row.id)
    if (r.error) { setError(r.error); return }
    setError(null)
    load()
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <GitBranch size={12} /> Políticas de aprobación ({rows?.length ?? 0})
          </p>
          <p className="font-sora text-[12.5px] text-lttm mt-1 max-w-2xl">
            Quién tiene que dar el visto bueno a cada tipo de objeto, en qué orden y con
            qué quórum. La política se copia dentro de cada solicitud al abrirla, así que
            cambiarla no altera las que ya estén en curso.
          </p>
        </div>
        <button
          onClick={() => setEditando(formVacio())}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] bg-brand-cyan font-sora text-[12.5px] text-white shrink-0"
        >
          <Plus size={14} /> Nueva política
        </button>
      </div>

      {error && (
        <div className="rounded-[9px] border border-red-200 bg-red-50 px-4 py-2.5 font-sora text-[12.5px] text-red-700">
          {error}
        </div>
      )}

      {rows === null ? (
        <p className="font-sora text-[12.5px] text-lttm">Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-[9px] border border-ltb bg-ltcard2 px-5 py-6 text-center">
          <p className="font-sora text-[13px] text-ltt">Todavía no hay ninguna política.</p>
          <p className="font-sora text-[12px] text-lttm mt-1">
            Cada organización recibe las políticas por defecto del modelo de gobierno al crearse.
            Sin política, un objeto se aprueba por su vía propia.
          </p>
        </div>
      ) : (
        rows.map((row) => (
          <div key={row.id} className="rounded-[9px] border border-ltb bg-ltcard px-5 py-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-sora text-[13.5px] font-semibold text-ltt">{row.name}</span>
                  <span className="rounded-[5px] bg-ltcard2 border border-ltb px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm">
                    {APPROVAL_OBJECT_TYPES.find((t) => t.key === row.object_type)?.label ?? row.object_type}
                  </span>
                  {row.is_default && (
                    <span className="rounded-[5px] bg-cyan-dim border border-cyan-border px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-brand-cyan">
                      Por defecto
                    </span>
                  )}
                  {!row.is_active && (
                    <span className="rounded-[5px] bg-ltcard2 px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm">
                      Inactiva
                    </span>
                  )}
                  {row.author_can_approve && (
                    <span className="rounded-[5px] bg-amber-50 px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-amber-700">
                      El autor puede aprobar
                    </span>
                  )}
                </div>

                <div className="flex items-center flex-wrap gap-1.5 mt-2">
                  {row.steps.map((s, i) => (
                    <span key={s.id ?? i} className="flex items-center gap-1.5">
                      {i > 0 && <span className="text-lttm">→</span>}
                      <span className="rounded-[6px] border border-ltb bg-ltcard2 px-2 py-1 font-sora text-[12px] text-ltt2">
                        {describeStep(s, opciones)}
                      </span>
                    </span>
                  ))}
                </div>

                {(row.conditions.approval_level ?? []).length > 0 && (
                  <p className="font-sora text-[11.5px] text-lttm mt-2">
                    Solo cuando el nivel es{' '}
                    {(row.conditions.approval_level ?? []).map((n) => NIVEL_LABELS[n] ?? n).join(', ')}
                  </p>
                )}
                {row.expires_after_days && (
                  <p className="font-sora text-[11.5px] text-lttm mt-2">
                    Las solicitudes caducan a los {row.expires_after_days} días
                  </p>
                )}
                {(row.conditions.template_key ?? []).length > 0 && (
                  <p className="font-sora text-[11.5px] text-lttm mt-2">
                    Solo para{' '}
                    {(row.conditions.template_key ?? []).map((k) => templateMeta(k).label).join(', ')}
                  </p>
                )}
                {(row.conditions.gap_layer ?? []).length > 0 && (
                  <p className="font-sora text-[11.5px] text-lttm mt-2">
                    Solo para{' '}
                    {(row.conditions.gap_layer ?? [])
                      .map((k) => APPROVAL_GAP_LAYERS.find((c) => c.key === k)?.label ?? k).join(', ')}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => setEditando({
                    id: row.id,
                    object_type: row.object_type,
                    name: row.name,
                    niveles: row.conditions.approval_level ?? [],
                    plantillas: row.conditions.template_key ?? [],
                    capas: row.conditions.gap_layer ?? [],
                    caducidad: row.expires_after_days ? String(row.expires_after_days) : '',
                    author_can_approve: row.author_can_approve,
                    is_active: row.is_active,
                    steps: row.steps,
                  })}
                  className="px-2.5 py-1.5 rounded-[6px] border border-ltb font-sora text-[12px] text-lttm hover:text-ltt"
                >
                  Editar
                </button>
                <button onClick={() => borrar(row)} className="p-1.5 rounded-[6px] text-lttm hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </div>
        ))
      )}

      <p className="font-sora text-[12px] text-lttm">
        Las delegaciones de autoridad se gestionan en <a href="/aprobaciones" className="text-brand-cyan hover:underline">Aprobaciones</a> › Delegaciones,
        donde cualquier miembro puede delegar la suya.
      </p>

      {editando && (
        <Editor
          inicial={editando}
          opciones={opciones}
          onClose={() => setEditando(null)}
          onSaved={load}
        />
      )}
    </div>
  )
}

// ── Delegaciones ────────────────────────────────────────────────────────────

function hoyISO() {
  return new Date().toISOString().slice(0, 10)
}

/** Delegaciones de autoridad (B11c: también en Aprobaciones › Delegaciones, para cualquier miembro). */
export function Delegaciones({ opciones }: { opciones: ApprovalApproverOptions }) {
  const [filas, setFilas] = useState<ApprovalDelegationRow[] | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    toProfileId: '',
    validFrom:   hoyISO(),
    validUntil:  '',
    objectTypes: [] as string[],
  })

  const load = useCallback(() => { getApprovalDelegations().then(setFilas) }, [])
  useEffect(() => { load() }, [load])

  async function guardar() {
    setError(null)
    const r = await saveApprovalDelegation(form)
    if ('error' in r) { setError(r.error); return }
    setAbierto(false)
    setForm({ toProfileId: '', validFrom: hoyISO(), validUntil: '', objectTypes: [] })
    load()
  }

  async function retirar(id: string) {
    if (!confirm('¿Retirar esta delegación?')) return
    const r = await deleteApprovalDelegation(id)
    if (r.error) { setError(r.error); return }
    load()
  }

  return (
    <div className="border-t border-ltb pt-5 mt-2">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm flex items-center gap-1.5">
            <UserCog size={12} /> Delegaciones ({filas?.length ?? 0})
          </p>
          <p className="font-sora text-[12.5px] text-lttm mt-1 max-w-2xl">
            Quién puede decidir en tu nombre mientras no estás. La decisión se registra
            siempre a nombre de quien la toma, anotando por cuenta de quién: delegar no es
            suplantar.
          </p>
        </div>
        <button
          onClick={() => setAbierto(!abierto)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-[7px] border border-ltb font-sora text-[12.5px] text-lttm hover:text-ltt shrink-0"
        >
          <Plus size={14} /> Delegar
        </button>
      </div>

      {error && (
        <div className="mb-3 rounded-[9px] border border-red-200 bg-red-50 px-4 py-2.5 font-sora text-[12.5px] text-red-700">
          {error}
        </div>
      )}

      {abierto && (
        <div className="rounded-[9px] border border-ltb bg-ltcard2 p-4 mb-3 flex flex-col gap-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <FieldLabel>En quién delego</FieldLabel>
              <div className="relative">
                <select
                  className={selectCls}
                  value={form.toProfileId}
                  onChange={(e) => setForm((f) => ({ ...f, toProfileId: e.target.value }))}
                >
                  <option value="">Elige a alguien…</option>
                  {opciones.profiles.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <SelectArrow />
              </div>
            </div>
            <div>
              <FieldLabel>Desde</FieldLabel>
              <input
                type="date" className={inputCls} value={form.validFrom}
                onChange={(e) => setForm((f) => ({ ...f, validFrom: e.target.value }))}
              />
            </div>
            <div>
              <FieldLabel>Hasta</FieldLabel>
              <input
                type="date" className={inputCls} value={form.validUntil}
                onChange={(e) => setForm((f) => ({ ...f, validUntil: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Alcance</FieldLabel>
            <div className="flex gap-1.5 flex-wrap">
              {APPROVAL_OBJECT_TYPES.map((t) => {
                const activo = form.objectTypes.includes(t.key)
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setForm((f) => ({
                      ...f,
                      objectTypes: activo
                        ? f.objectTypes.filter((x) => x !== t.key)
                        : [...f.objectTypes, t.key],
                    }))}
                    className={`px-2.5 py-1 rounded-[6px] border font-sora text-[12px] ${
                      activo
                        ? 'border-cyan-border bg-cyan-dim2 text-cyan-700'
                        : 'border-ltb bg-ltcard text-lttm hover:border-ltb2'
                    }`}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
            <p className="font-sora text-[11.5px] text-lttm mt-1.5">
              Sin ninguno marcado, la delegación cubre todos los tipos.
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setAbierto(false)}
              className="px-3 py-1.5 rounded-[7px] border border-ltb font-sora text-[12px] text-lttm"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={!form.toProfileId || !form.validUntil}
              className="px-3 py-1.5 rounded-[7px] bg-brand-cyan font-sora text-[12px] text-white disabled:opacity-50"
            >
              Delegar
            </button>
          </div>
        </div>
      )}

      {filas === null ? (
        <p className="font-sora text-[12.5px] text-lttm">Cargando…</p>
      ) : filas.length === 0 ? (
        <p className="font-sora text-[12.5px] text-lttm">No hay ninguna delegación activa.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {filas.map((d) => (
            <div key={d.id} className="flex items-center justify-between gap-4 rounded-[9px] border border-ltb bg-ltcard2 px-4 py-2.5">
              <div>
                <p className="font-sora text-[12.5px] text-ltt">
                  <strong>{d.from_name ?? 'Alguien'}</strong> → {d.to_name ?? 'alguien'}
                  {!d.vigente && (
                    <span className="ml-2 rounded-[5px] bg-ltcard px-1.5 py-0.5 font-plex text-[9.5px] uppercase tracking-[0.6px] text-lttm">
                      Fuera de vigencia
                    </span>
                  )}
                </p>
                <p className="font-sora text-[11.5px] text-lttm mt-0.5">
                  Del {d.valid_from} al {d.valid_until}
                  {' · '}
                  {d.object_types.length
                    ? d.object_types.map((t) => APPROVAL_OBJECT_TYPES.find((x) => x.key === t)?.label ?? t).join(', ')
                    : 'todos los tipos'}
                </p>
              </div>
              <button onClick={() => retirar(d.id)} className="p-1.5 rounded-[6px] text-lttm hover:text-red-600 shrink-0">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
