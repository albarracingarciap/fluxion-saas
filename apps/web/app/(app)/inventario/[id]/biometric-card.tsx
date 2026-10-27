'use client';

import { useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, ScanFace } from 'lucide-react';

import { TASK_STATUS_LABELS, type TaskStatus } from '@/lib/tasks/types';

import { getSystemPostBiometric, setSystemPostBiometric, type SystemPostBiometric } from './biometric-actions';

/**
 * Identificación biométrica remota en diferido (B21c, AI Act, Art. 26.10).
 * Solo en alto riesgo del Anexo III, punto 1.a, como responsable del
 * despliegue. Marcada, crea cada año la tarea del informe anual.
 */
export function BiometricCard({ systemId }: { systemId: string }) {
  const [data, setData] = useState<SystemPostBiometric | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [saving, start] = useTransition();
  const router = useRouter();

  async function cargar() {
    const res = await getSystemPostBiometric(systemId);
    if ('error' in res) setError(res.error);
    else setData(res);
  }

  useEffect(() => { void cargar(); }, [systemId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data || (!data.applies && !data.checked)) return null;

  function cambiar(checked: boolean) {
    setError(null);
    setAviso(null);
    start(async () => {
      const res = await setSystemPostBiometric({ systemId, checked });
      if ('error' in res) { setError(res.error); return; }
      if (res.taskCreated) setAviso('Creada la tarea del informe anual de este año.');
      await cargar();
      router.refresh();
    });
  }

  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
      <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5 mb-2">
        <ScanFace className="w-3.5 h-3.5" /> Biometría remota en diferido
        {saving && <Loader2 className="w-3 h-3 animate-spin" />}
      </div>
      <label className="flex items-start gap-2 font-sora text-[12px] text-ltt">
        <input type="checkbox" checked={data.checked} disabled={!data.canEdit || saving}
          onChange={(e) => cambiar(e.target.checked)} className="mt-0.5 accent-brand-cyan" />
        Identificación biométrica remota en diferido (AI Act, Art. 26.10)
      </label>
      <p className="mt-1.5 font-sora text-[11px] text-lttm leading-relaxed">
        Con la casilla marcada, cada año se crea la tarea del informe anual a las autoridades de vigilancia del mercado y
        de protección de datos.
      </p>
      {!data.applies && data.checked && (
        <p className="mt-1.5 font-sora text-[11px] text-or">
          El sistema ya no está en el supuesto (alto riesgo del Anexo III, punto 1.a, como responsable del despliegue): no se crean tareas.
        </p>
      )}
      {data.tasks.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {data.tasks.map((t) => (
            <li key={t.id} className="font-sora text-[11.5px] text-ltt2">
              <Link href={`/tareas?task=${t.id}`} className="hover:underline">{t.title}</Link>
              <span className="text-lttm"> · {TASK_STATUS_LABELS[t.status as TaskStatus] ?? t.status}</span>
            </li>
          ))}
        </ul>
      )}
      {aviso && <p className="mt-2 font-sora text-[11.5px] text-gr">{aviso}</p>}
      {error && <p className="mt-2 font-sora text-[11.5px] text-re">{error}</p>}
    </div>
  );
}
