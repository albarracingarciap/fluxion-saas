import { redirect } from 'next/navigation';

/**
 * La ficha para el registro UE pasó a ser la plantilla `eu_registry` del
 * expediente (B16b, DP-06), con la sección del Anexo VIII que corresponde al
 * sistema. Las instantáneas guardadas antes siguen en `snapshots/`.
 */
export default function EuRegistryLegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/inventario/${params.id}/expediente/eu_registry`);
}
