'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { ShieldCheck, UserCog, ClipboardCheck, Landmark, Loader2, AlertTriangle } from 'lucide-react';

import { hasRole } from '@/lib/auth/roles';
import {
  GOVERNANCE_FUNCTIONS,
  auditorConflictWarning,
  designationBlocker,
  type GovernanceFunction,
} from '@/lib/governance/functions';
import {
  getGovernanceOverview,
  setGovernanceDesignation,
  type GovernanceOverview,
  type GovernanceMember,
} from '../gobernanza-actions';
import { SectionHeader, FieldLabel, inputCls, selectCls, type OrgFormData } from './shared';

interface Props {
  formData: OrgFormData
  setFormData: React.Dispatch<React.SetStateAction<OrgFormData>>
  isAdmin: boolean
}

function nombre(m: GovernanceMember) {
  return m.full_name?.trim() || m.email || 'Miembro'
}

/** Miembros que tienen un rol, con enlace a Usuarios para cambiarlo. */
function MiembrosConRol({ miembros, vacio }: { miembros: GovernanceMember[]; vacio: string }) {
  if (miembros.length === 0) {
    return (
      <p className="font-sora text-[13px] text-or flex items-center gap-1.5">
        <AlertTriangle size={13} /> {vacio}
      </p>
    )
  }
  return (
    <ul className="flex flex-wrap gap-2">
      {miembros.map((m) => (
        <li key={m.id} className="rounded-[8px] border border-ltb bg-ltbg px-3 py-1.5 font-sora text-[13px] text-ltt">
          {nombre(m)}
          {m.email && <span className="ml-1.5 text-lttm text-[12px]">{m.email}</span>}
        </li>
      ))}
    </ul>
  )
}

export function GobernanzaTab({ formData, setFormData, isAdmin }: Props) {
  function set<K extends keyof OrgFormData>(key: K, value: OrgFormData[K]) {
    setFormData((p) => ({ ...p, [key]: value }))
  }

  const [overview, setOverview] = useState<GovernanceOverview | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Partial<Record<GovernanceFunction, string>>>({})
  const [saving, startSaving] = useTransition()

  async function cargar() {
    const res = await getGovernanceOverview()
    if ('error' in res) setLoadError(res.error)
    else setOverview(res)
  }

  useEffect(() => { void cargar() }, [])

  const activos = (overview?.members ?? []).filter((m) => m.is_active)
  const responsablesSgai = activos.filter((m) => hasRole(m, 'sgai_manager'))
  const dpos = activos.filter((m) => hasRole(m, 'dpo'))

  function designar(fn: GovernanceFunction, profileId: string) {
    setErrors((e) => ({ ...e, [fn]: undefined }))
    const persona = activos.find((m) => m.id === profileId)
    const bloqueo = persona ? designationBlocker(fn, persona) : null
    if (bloqueo) {
      setErrors((e) => ({ ...e, [fn]: bloqueo }))
      return
    }
    startSaving(async () => {
      const res = await setGovernanceDesignation({ fn, profileId: profileId || null })
      if ('error' in res) setErrors((e) => ({ ...e, [fn]: res.error }))
      else await cargar()
    })
  }

  return (
    <div className="flex flex-col gap-8">

      {/* Roles de gobierno: salen de los roles de los miembros (B23b) */}
      <div>
        <SectionHeader
          icon={<ShieldCheck size={16} className="text-ltt2" />}
          title="Responsable del SGAI"
          description="Miembros con el rol Responsable del SGAI. Aprueban los planes de nivel 1, las evidencias y los expedientes."
        />
        {overview ? (
          <MiembrosConRol miembros={responsablesSgai} vacio="Nadie tiene el rol Responsable del SGAI: no hay quien apruebe los planes de nivel 1." />
        ) : (
          <p className="font-sora text-[13px] text-lttm">{loadError ?? 'Cargando…'}</p>
        )}
      </div>

      <div>
        <SectionHeader
          icon={<UserCog size={16} className="text-ltt2" />}
          title="Delegado de Protección de Datos (DPO)"
          description="Miembros con el rol DPO. Emiten dictamen en la DPIA y la FRIA; no aprueban (RGPD, Art. 38)."
        />
        {overview && <MiembrosConRol miembros={dpos} vacio="Nadie tiene el rol DPO." />}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 mt-4">
          <div>
            <FieldLabel>Teléfono de contacto del DPO</FieldLabel>
            <input
              type="tel"
              disabled={!isAdmin}
              value={formData.dpo_phone}
              onChange={(e) => set('dpo_phone', e.target.value)}
              className={inputCls}
              placeholder="+34 600 000 000"
            />
          </div>
        </div>
        <p className="mt-3 font-sora text-[12px] text-lttm">
          Los roles se asignan en <Link href="/usuarios" className="text-brand-cyan hover:underline">Usuarios</Link>.
          El DPO y el Responsable del SGAI no pueden ser la misma persona.
        </p>
      </div>

      {/* Funciones de gobierno: designaciones (B23b) */}
      <div>
        <SectionHeader
          icon={<Landmark size={16} className="text-ltt2" />}
          title="Funciones de gobierno"
          description="Funciones que intervienen en el circuito de aprobación sin ser roles de permisos. La persona conserva su rol y además ocupa la función."
        />
        {overview && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
            {GOVERNANCE_FUNCTIONS.map((f) => {
              const actual = overview.designations.find((d) => d.function === f.key)?.profile_id ?? ''
              const persona = activos.find((m) => m.id === actual)
              const funciones = persona
                ? overview.designations.filter((d) => d.profile_id === persona.id).map((d) => d.function)
                : []
              const aviso = persona ? auditorConflictWarning(persona, funciones) : null
              return (
                <div key={f.key}>
                  <FieldLabel>{f.label}</FieldLabel>
                  <select
                    disabled={!overview.canEdit || saving}
                    value={actual}
                    onChange={(e) => designar(f.key, e.target.value)}
                    className={selectCls}
                  >
                    <option value="">Sin designar</option>
                    {activos.map((m) => (
                      <option key={m.id} value={m.id}>{nombre(m)}</option>
                    ))}
                  </select>
                  <p className="mt-1 font-sora text-[11.5px] text-lttm leading-snug">{f.description}</p>
                  {errors[f.key] && <p className="mt-1 font-sora text-[11.5px] text-re">{errors[f.key]}</p>}
                  {aviso && <p className="mt-1 font-sora text-[11.5px] text-or">{aviso}</p>}
                </div>
              )
            })}
          </div>
        )}
        {overview && !overview.canEdit && (
          <p className="mt-3 font-sora text-[12px] text-lttm">Las designa el Administrador o el Responsable del SGAI.</p>
        )}
        {saving && <Loader2 size={14} className="mt-2 animate-spin text-lttm" />}
      </div>

      {/* Auditor externo */}
      <div>
        <SectionHeader
          icon={<ClipboardCheck size={16} className="text-ltt2" />}
          title="Auditor externo designado"
          description="Entidad o profesional externo responsable de las auditorías del SGAI."
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div>
            <FieldLabel>Nombre / Empresa auditora</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.external_auditor_name}
              onChange={(e) => set('external_auditor_name', e.target.value)}
              className={inputCls}
              placeholder="Ej. Deloitte Advisory S.L."
            />
          </div>

          <div>
            <FieldLabel>Contacto</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.external_auditor_contact}
              onChange={(e) => set('external_auditor_contact', e.target.value)}
              className={inputCls}
              placeholder="Email o teléfono de contacto"
            />
          </div>

          <div>
            <FieldLabel>Certificación / Acreditación</FieldLabel>
            <input
              type="text"
              disabled={!isAdmin}
              value={formData.external_auditor_cert}
              onChange={(e) => set('external_auditor_cert', e.target.value)}
              className={inputCls}
              placeholder="Ej. ISO 27001 Lead Auditor, ENS"
            />
          </div>

        </div>
      </div>

    </div>
  )
}
