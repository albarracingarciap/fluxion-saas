import Link from 'next/link';
import { Landmark } from 'lucide-react';

import {
  REQUEST_STATUS_LABEL,
  requestDeadline,
  requestDeadlineLabel,
  type AuthorityRequestStatus,
} from '@/lib/governance/authority-requests';

export type SystemAuthorityRequest = {
  id: string;
  reference: string;
  authority: string;
  title: string;
  status: AuthorityRequestStatus;
  due_at: string | null;
};

const TONO: Record<string, string> = { vencido: 'text-re', proximo: 'text-or', respondido: 'text-gr' };

/**
 * Requerimientos de la autoridad que afectan al sistema (B25d). Solo se
 * muestra si hay alguno; se gestionan en Incidentes › Requerimientos.
 */
export function AuthorityRequestsCard({ requests }: { requests: SystemAuthorityRequest[] }) {
  if (requests.length === 0) return null;
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="bg-ltcard border border-ltb rounded-[12px] p-4">
      <div className="font-plex text-[10.5px] uppercase tracking-[1px] text-lttm flex items-center gap-1.5 mb-3">
        <Landmark className="w-3.5 h-3.5" /> Requerimientos de la autoridad
      </div>
      <ul className="flex flex-col gap-2">
        {requests.map((r) => {
          const plazo = requestDeadline(r.status, r.due_at, today);
          return (
            <li key={r.id}>
              <Link href={`/incidentes/requerimientos/${r.id}`} className="font-sora text-[12px] text-ltt hover:text-brand-cyan">
                <span className="text-lttm">{r.reference}</span> · {r.title}
              </Link>
              <div className="font-sora text-[11px] text-lttm">
                {r.authority} · {REQUEST_STATUS_LABEL[r.status]} · <span className={TONO[plazo.state] ?? ''}>{requestDeadlineLabel(plazo)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
