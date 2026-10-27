import { redirect } from 'next/navigation';

/**
 * El informe de gaps del sistema es ahora el análisis de gaps filtrado por
 * sistema, con su instantánea (B16c, DP-06). Las instantáneas guardadas antes
 * siguen en `snapshots/`.
 */
export default function GapReportLegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/gaps?system_id=${params.id}`);
}
