import { redirect } from 'next/navigation';

/**
 * El asistente de la AISIA se retiró en B15: la AISIA es una plantilla del
 * expediente documental. Los enlaces antiguos (historial, solicitudes de
 * aprobación ya cerradas) llevan a su documento.
 */
export default function AisiaLegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/inventario/${params.id}/expediente/aisia`);
}
