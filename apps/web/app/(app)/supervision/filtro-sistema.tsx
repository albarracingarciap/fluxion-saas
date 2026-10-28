'use client';

import { useRouter } from 'next/navigation';

/** Filtro por sistema de Supervisión humana (B30a). */
export function FiltroSistema({ systems, actual, dias }: {
  systems: Array<{ id: string; name: string }>
  actual: string | null
  dias: number
}) {
  const router = useRouter();
  return (
    <select
      value={actual ?? ''}
      onChange={(e) => router.push(`/supervision?dias=${dias}${e.target.value ? `&sistema=${e.target.value}` : ''}`)}
      className="px-3 py-1.5 rounded-[7px] border border-ltb bg-ltcard font-sora text-[12.5px] text-ltt outline-none focus:border-brand-cyan max-w-[260px]"
    >
      <option value="">Todos los sistemas</option>
      {systems.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}
