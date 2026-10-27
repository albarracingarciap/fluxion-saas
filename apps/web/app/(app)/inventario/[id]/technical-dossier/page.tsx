import { redirect } from 'next/navigation';

/**
 * El dossier técnico se retiró como pantalla (B16c, DP-06): su contenido útil
 * está en la ficha del sistema y en el Anexo IV del expediente. Las
 * instantáneas guardadas antes siguen en `snapshots/`.
 */
export default function TechnicalDossierLegacyRedirect({ params }: { params: { id: string } }) {
  redirect(`/inventario/${params.id}`);
}
