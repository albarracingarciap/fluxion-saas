import {
  requestEvidenceUpload,
  confirmEvidenceUpload,
  getEvidenceDownloadUrl,
} from './storage-actions';

/**
 * Ficheros de evidencia, lado cliente.
 *
 * Las subidas siguen yendo directas del navegador al almacenamiento, sin pasar
 * por el servidor de la aplicación — pero ahora en tres tiempos: el servidor
 * firma, el navegador sube, el servidor confirma.
 *
 * Aquí no hay ninguna credencial ni ningún nombre de bucket. Todo eso vive en
 * `lib/storage/objects.ts`, que es `server-only` y no puede llegar al navegador.
 */

export type UploadEvidenceFileResult =
  | { path: string; error?: never }
  | { path?: never; error: string };

export type FilePreviewType = 'pdf' | 'image' | 'office' | 'other';

export function getPreviewType(mimeType: string): FilePreviewType {
  if (mimeType === 'application/pdf') return 'pdf';
  if (mimeType.startsWith('image/')) return 'image';
  if (
    mimeType.includes('wordprocessingml') ||
    mimeType.includes('spreadsheetml') ||
    mimeType.includes('presentationml')
  )
    return 'office';
  return 'other';
}

export function getFileExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? '';
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * Sube el fichero de una evidencia ya creada.
 *
 * `organizationId` se mantiene en la firma por compatibilidad con las pantallas,
 * pero **no se usa para nada**: la organización la resuelve el servidor a partir
 * de la evidencia. Un identificador de organización que viaja desde el navegador
 * no es una credencial, es una sugerencia.
 */
export async function uploadEvidenceFile(
  file: File,
  _organizationId: string,
  evidenceId: string,
): Promise<UploadEvidenceFileResult> {
  const contentType = file.type || 'application/octet-stream';

  const ticket = await requestEvidenceUpload({
    evidenceId,
    filename: file.name,
    contentType,
    size: file.size,
  });
  if ('error' in ticket && ticket.error) return { error: ticket.error };
  if (!ticket.url || !ticket.key) return { error: 'No se pudo preparar la subida.' };

  let response: Response;
  try {
    response = await fetch(ticket.url, {
      method: 'PUT',
      body: file,
      // Debe coincidir exactamente con el tipo que se firmó, o el
      // almacenamiento rechaza la firma.
      headers: { 'Content-Type': contentType },
    });
  } catch {
    return { error: 'No se pudo conectar con el almacenamiento de ficheros.' };
  }

  if (!response.ok) {
    return { error: `El almacenamiento rechazó el fichero (${response.status}).` };
  }

  const confirmed = await confirmEvidenceUpload({
    evidenceId,
    key: ticket.key,
    filename: file.name,
    contentType,
  });
  if ('error' in confirmed && confirmed.error) return { error: confirmed.error };

  return { path: ticket.key };
}

/**
 * URL firmada para ver o descargar el fichero de una evidencia.
 *
 * Recibe el id de la evidencia, no la ruta: la ruta no autoriza nada y pedirla
 * al cliente invitaba a construirla a mano.
 */
export async function getEvidenceFileUrl(evidenceId: string): Promise<string | null> {
  const res = await getEvidenceDownloadUrl(evidenceId);
  return 'url' in res && res.url ? res.url : null;
}
