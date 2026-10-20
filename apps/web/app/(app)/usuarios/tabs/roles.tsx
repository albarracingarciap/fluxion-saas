'use client';

import { useEffect, useState } from 'react';
import { ShieldAlert, Shield, UserCheck, Eye, AlertTriangle } from 'lucide-react';

import { APPROVAL_MAP, type ApprovalActor } from '@/lib/governance/approval-map';
import { getGovernanceFunctionLabel } from '@/lib/governance/functions';

import { getApprovalMapHolders } from '../mapa-actions';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_BADGE_CLS } from './shared';

const COMMITTEE_LABELS: Record<string, string> = {
  ai_committee: 'Comité de IA',
  risk_committee: 'Comité de Riesgos de IA',
  director_review: 'Revisión por la Dirección',
  technical_committee: 'Comité técnico',
}

function actorLabel(a: ApprovalActor): string {
  if (a.kind === 'role') return ROLE_LABELS[a.key] ?? a.key
  if (a.kind === 'function') return getGovernanceFunctionLabel(a.key)
  if (a.kind === 'committee') return COMMITTEE_LABELS[a.key] ?? a.key
  return a.label
}

/** Un papel del mapa con quién lo ocupa hoy, o un aviso si nadie. */
function Actor({ actor, holders }: { actor: ApprovalActor; holders: Record<string, string[]> | null }) {
  if (actor.kind === 'anyone') return <div className="font-sora text-[12px] text-ltt">{actor.label}</div>
  const quienes = holders?.[`${actor.kind}:${actor.key}`] ?? null
  return (
    <div className="font-sora text-[12px] leading-snug">
      <span className="text-ltt font-medium">{actorLabel(actor)}</span>
      {quienes === null ? null : quienes.length > 0 ? (
        <span className="text-lttm"> · {quienes.join(', ')}</span>
      ) : (
        <span className="text-or inline-flex items-center gap-1"> · <AlertTriangle className="w-3 h-3" /> sin asignar</span>
      )}
    </div>
  )
}

function Celda({ actors, note, holders }: { actors: ApprovalActor[]; note?: string; holders: Record<string, string[]> | null }) {
  if (actors.length === 0) return <span className="font-sora text-[12px] text-lttm">—</span>
  return (
    <div className="space-y-1">
      {actors.map((a, i) => <Actor key={i} actor={a} holders={holders} />)}
      {note && <div className="font-sora text-[11px] text-lttm italic">{note}</div>}
    </div>
  )
}

/** Mapa de aprobaciones de DP-01 con las personas que ocupan hoy cada papel (B23b). */
function MapaAprobaciones() {
  const [holders, setHolders] = useState<Record<string, string[]> | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void getApprovalMapHolders().then((res) => {
      if ('error' in res) setError(res.error as string)
      else setHolders(res)
    })
  }, [])

  return (
    <div className="mt-8">
      <h3 className="font-sora text-[15px] font-semibold text-ltt mb-1">Mapa de aprobaciones</h3>
      <p className="font-sora text-[12.5px] text-ltt2 mb-4 leading-relaxed">
        Quién prepara, revisa y aprueba cada objeto según el modelo de gobierno de la organización, y quién ocupa
        hoy cada papel. Regla general: quien prepara no aprueba. La columna «Hoy» indica lo que ya aplica la
        aplicación con las políticas por defecto de Flujos de aprobación (Ajustes › Aprobaciones).
      </p>
      {error && <p className="font-sora text-[12px] text-re mb-3">{error}</p>}
      <div className="overflow-x-auto rounded-[10px] border border-ltb">
        <table className="w-full min-w-[860px] text-left">
          <thead className="bg-ltcard2">
            <tr>
              {['Objeto', 'Prepara', 'Revisa o consulta', 'Aprueba', 'Hoy'].map((h) => (
                <th key={h} className="px-3 py-2 font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {APPROVAL_MAP.map((row) => (
              <tr key={row.object} className="border-t border-ltb align-top">
                <td className="px-3 py-2.5 font-sora text-[12.5px] font-semibold text-ltt">{row.object}</td>
                <td className="px-3 py-2.5"><Celda actors={row.prepares} holders={holders} /></td>
                <td className="px-3 py-2.5"><Celda actors={row.reviews} note={row.reviewNote} holders={holders} /></td>
                <td className="px-3 py-2.5"><Celda actors={row.approves} note={row.approveNote} holders={holders} /></td>
                <td className="px-3 py-2.5 font-sora text-[12px] text-ltt2">{row.today}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 font-sora text-[11.5px] text-lttm">
        Los comités cuentan solo a sus miembros con voto (los asesores tienen voz sin voto). Las funciones de
        gobierno se designan en Organización › Gobernanza y los comités, en Organización › Comités.
      </p>
    </div>
  )
}

function RoleIcon({ role }: { role: string }) {
  const cls = 'w-4 h-4'
  if (role === 'org_admin') return <ShieldAlert className={cls} />
  if (['caio', 'sgai_manager', 'dpo'].includes(role)) return <Shield className={cls} />
  if (['system_owner', 'risk_analyst', 'compliance_analyst'].includes(role)) return <UserCheck className={cls} />
  return <Eye className={cls} />
}

const ROLE_ORDER = [
  'org_admin', 'sgai_manager', 'caio', 'dpo',
  'system_owner', 'risk_analyst', 'compliance_analyst',
  'executive', 'auditor', 'viewer',
]

export function RolesTab() {
  return (
    <div>
      <p className="font-sora text-[13px] text-ltt2 mb-5 leading-relaxed">
        Un miembro puede tener varios roles; sus permisos son la suma de todos ellos. Solo un Administrador
        puede cambiar roles, puede haber varios Administradores y la organización siempre conserva al menos uno.
        DPO y Responsable del SGAI no pueden recaer en la misma persona (RGPD, Art. 38.6).
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {ROLE_ORDER.map((role) => {
          const badgeCls = ROLE_BADGE_CLS[role] ?? 'bg-ltcard2 border-ltb text-lttm'
          return (
            <div key={role} className="flex gap-3.5 p-4 bg-ltbg rounded-[10px] border border-ltb hover:border-ltbl transition-colors">
              <div className={`w-9 h-9 rounded-[9px] flex items-center justify-center shrink-0 border ${badgeCls}`}>
                <RoleIcon role={role} />
              </div>
              <div>
                <p className="font-sora text-[13px] font-semibold text-ltt mb-0.5">
                  {ROLE_LABELS[role]}
                </p>
                <p className="font-sora text-[12px] text-ltt2 leading-relaxed">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
      <MapaAprobaciones />
    </div>
  )
}
