'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';

import type { OperationStatus } from '@/lib/governance/operation';

import { getSystemOperation, type SystemOperation } from './operacion/actions';

const fecha = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('es-ES', { timeZone: 'UTC' });

function Linea({ titulo, declarado, status }: { titulo: string; declarado: boolean; status: OperationStatus }) {
  const icono = !declarado ? <Circle size={13} className="text-lttm shrink-0 mt-0.5" />
    : status.overdue ? <AlertTriangle size={13} className="text-re shrink-0 mt-0.5" />
      : status.complete ? <CheckCircle2 size={13} className="text-gr shrink-0 mt-0.5" />
        : <Circle size={13} className="text-or shrink-0 mt-0.5" />;
  const texto = !declarado ? 'Sin declarar'
    : status.overdue ? `Vencida desde el ${fecha(status.nextDueOn!)}`
      : status.complete ? (status.nextDueOn ? `Al día · próxima antes del ${fecha(status.nextDueOn)}` : 'Completo')
        : 'Incompleto';
  return (
    <p className="font-sora text-[12px] text-ltt2 flex items-start gap-1.5">
      {icono}<span><span className="text-ltt">{titulo}:</span> {texto}</span>
    </p>
  );
}

/**
 * Datos de entrada y vigilancia del funcionamiento (B28, AI Act, Art. 26.4 y
 * 26.5): resumen en la ficha; se gestionan en su página.
 */
export function OperationCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<SystemOperation | null>(null);

  useEffect(() => {
    void getSystemOperation(systemId).then((res) => { if (!('error' in res)) setData(res); });
  }, [systemId]);

  if (!data) return null;
  const declarado = Boolean(data.inputData || data.monitoring);

  return (
    <div className={`bg-ltcard border rounded-[12px] p-4 ${data.applies && (data.status.inputData.overdue || data.status.monitoring.overdue) ? 'border-reb' : 'border-ltb'}`}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5">
          <Activity size={12} /> Datos de entrada y vigilancia
        </p>
        <span className="font-sora text-[10.5px] text-lttm">{data.applies ? 'Art. 26.4 y 26.5' : 'Opcional'}</span>
      </div>
      {data.applies || declarado ? (
        <div className="flex flex-col gap-1.5">
          <Linea titulo="Datos de entrada" declarado={Boolean(data.inputData)} status={data.status.inputData} />
          <Linea titulo="Vigilancia" declarado={Boolean(data.monitoring)} status={data.status.monitoring} />
        </div>
      ) : (
        <p className="font-sora text-[12px] text-lttm">No lo exige el AI Act en este sistema; se puede llevar como buena práctica.</p>
      )}
      <Link href={`/inventario/${systemId}/operacion`} className="font-sora text-[12px] text-brand-cyan hover:underline mt-2 inline-block">
        {declarado ? 'Abrir' : 'Declarar'} →
      </Link>
    </div>
  );
}
