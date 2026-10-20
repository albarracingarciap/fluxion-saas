'use client';

import { useEffect, useState, useTransition } from 'react';
import { AlertTriangle, Loader2, UserCheck } from 'lucide-react';

import { hasRole } from '@/lib/auth/roles';
import { humanOversightBlocker } from '@/lib/governance/functions';

import {
  getSystemResponsibles,
  updateSystemResponsibles,
  type SystemResponsibles,
} from './responsables-actions';

const selectCls =
  'w-full bg-ltcard border border-ltb rounded-[8px] px-2.5 py-2 text-[12.5px] text-ltt font-sora outline-none focus:border-brand-cyan disabled:opacity-60';

/**
 * Responsables del sistema (B23b): Responsable del sistema y Responsable de
 * supervisión humana con su suplente. Se guardan al cambiarlos.
 */
export function ResponsablesCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<SystemResponsibles | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  async function cargar() {
    const res = await getSystemResponsibles(systemId);
    if ('error' in res) setError(res.error);
    else setData(res);
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  function guardar(patch: Partial<Pick<SystemResponsibles, 'ownerProfileId' | 'humanOversightOwnerId' | 'humanOversightBackupId'>>) {
    if (!data) return;
    const next = { ...data, ...patch };
    setError(null);
    startSaving(async () => {
      const res = await updateSystemResponsibles({
        systemId,
        ownerProfileId: next.ownerProfileId,
        humanOversightOwnerId: next.humanOversightOwnerId,
        humanOversightBackupId: next.humanOversightBackupId,
      });
      if ('error' in res) setError(res.error);
      await cargar();
    });
  }

  if (!data) {
    return (
      <div className="font-sora text-[12px] text-lttm">{error ?? 'Cargando responsables…'}</div>
    );
  }

  const owners = data.members.filter((m) => hasRole(m, 'system_owner'));
  const avisoSupervision = humanOversightBlocker(data.aiActRiskLevel, data.humanOversightOwnerId);
  const disabled = !data.canEdit || saving;

  return (
    <div>
      <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm mb-3 flex items-center gap-1.5">
        <UserCheck className="w-3.5 h-3.5" /> Responsables
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <div className="space-y-3">
        <div>
          <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Responsable del sistema</label>
          <select
            className={selectCls}
            disabled={disabled}
            value={data.ownerProfileId ?? ''}
            onChange={(e) => guardar({ ownerProfileId: e.target.value || null })}
          >
            <option value="">Sin asignar</option>
            {owners.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {owners.length === 0 && (
            <p className="mt-1 font-sora text-[11px] text-lttm">Nadie tiene el rol Responsable del sistema (se asigna en Usuarios).</p>
          )}
          {data.aiOwnerText && (
            <p className="mt-1 font-sora text-[11px] text-lttm">Equipo indicado en la ficha: {data.aiOwnerText}</p>
          )}
        </div>
        <div>
          <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Responsable de supervisión humana</label>
          <select
            className={selectCls}
            disabled={disabled}
            value={data.humanOversightOwnerId ?? ''}
            onChange={(e) => guardar({ humanOversightOwnerId: e.target.value || null })}
          >
            <option value="">Sin asignar</option>
            {data.members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          {avisoSupervision && (
            <p className="mt-1 font-sora text-[11px] text-or flex items-start gap-1">
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              Obligatorio en alto riesgo (AI Act, Art. 14 y 26.2): sin él no se puede enviar la evaluación de riesgos.
            </p>
          )}
        </div>
        <div>
          <label className="block font-sora text-[11.5px] text-ltt2 mb-1">Suplente de supervisión humana</label>
          <select
            className={selectCls}
            disabled={disabled}
            value={data.humanOversightBackupId ?? ''}
            onChange={(e) => guardar({ humanOversightBackupId: e.target.value || null })}
          >
            <option value="">Sin suplente</option>
            {data.members
              .filter((m) => m.id !== data.humanOversightOwnerId)
              .map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
        {error && <p className="font-sora text-[11.5px] text-re">{error}</p>}
      </div>
    </div>
  );
}
