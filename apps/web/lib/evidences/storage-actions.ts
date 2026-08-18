'use server'

import { createClient } from '@/lib/supabase/server'
import { createFluxionClient, createAdminFluxionClient } from '@/lib/supabase/fluxion'
import {
  BUCKET_EVIDENCES,
  objectKey,
  signedUploadUrl,
  signedDownloadUrl,
  statObject,
  deleteObject,
  s3Configured,
} from '@/lib/storage/objects'

/**
 * Autorización de ficheros de evidencia.
 *
 * Antes la ponía Supabase Storage: sus políticas comprobaban que la primera
 * carpeta de la ruta fuese la organización del usuario. MinIO no tiene nada
 * equivalente, así que ese control vive ahora aquí.
 *
 * El mecanismo es deliberadamente simple: **si el usuario no puede ver la fila
 * de `system_evidences` a través de RLS, no puede tocar su fichero**. La misma
 * política que ya protege los metadatos protege ahora el objeto. No se compara
 * la ruta a mano en ningún sitio, porque comparar rutas a mano es como se
 * cometen los errores de inquilino cruzado.
 */

const SUPABASE_BUCKET = 'evidence-files'
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024 // 100 MB

type UploadTicket =
  | { url: string; key: string; bucket: string; error?: never }
  | { url?: never; key?: never; bucket?: never; error: string }

/** Comprueba, vía RLS, que la evidencia es de la organización del usuario. */
async function authorizeEvidence(evidenceId: string) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'No autenticado' as const, evidence: null }

  const fluxion = createFluxionClient()
  const { data: evidence } = await fluxion
    .from('system_evidences')
    .select('id, organization_id, title, storage_path, storage_backend, storage_bucket, mime_type')
    .eq('id', evidenceId)
    .single()

  if (!evidence) return { error: 'Evidencia no encontrada' as const, evidence: null }
  return { error: null, evidence }
}

/**
 * Paso 1 de la subida: el servidor decide la clave y firma una URL de escritura.
 *
 * La clave NUNCA llega del cliente. Es lo único que impide que un navegador
 * escriba en el prefijo de otra organización.
 */
export async function requestEvidenceUpload(input: {
  evidenceId: string
  filename: string
  contentType: string
  size: number
}): Promise<UploadTicket> {
  if (!s3Configured()) {
    return { error: 'El almacenamiento de ficheros no está configurado en este entorno.' }
  }
  if (input.size > MAX_UPLOAD_BYTES) {
    return { error: `El fichero supera el máximo de ${MAX_UPLOAD_BYTES / 1024 / 1024} MB.` }
  }

  const { error, evidence } = await authorizeEvidence(input.evidenceId)
  if (error || !evidence) return { error: error ?? 'Evidencia no encontrada' }

  const key = objectKey({
    organizationId: evidence.organization_id,
    scope: 'evidences',
    entityId: evidence.id,
    filename: input.filename,
  })

  try {
    const url = await signedUploadUrl({
      bucket: BUCKET_EVIDENCES,
      key,
      contentType: input.contentType || 'application/octet-stream',
    })
    return { url, key, bucket: BUCKET_EVIDENCES }
  } catch (e) {
    console.error('requestEvidenceUpload:', e)
    return { error: 'No se pudo preparar la subida del fichero.' }
  }
}

/**
 * Paso 2: confirmar que el objeto llegó de verdad y registrar la referencia.
 *
 * Con subida prefirmada el fichero no pasa por la aplicación, así que sin esta
 * comprobación una fila podría apuntar a un objeto inexistente y nadie se
 * enteraría hasta que un auditor pidiera la evidencia.
 */
export async function confirmEvidenceUpload(input: {
  evidenceId: string
  key: string
  filename: string
  contentType: string
}): Promise<{ path: string; error?: never } | { path?: never; error: string }> {
  const { error, evidence } = await authorizeEvidence(input.evidenceId)
  if (error || !evidence) return { error: error ?? 'Evidencia no encontrada' }

  // Que la clave confirmada sea la que corresponde a esta evidencia, y no otra
  // que el cliente haya podido inventar entre el paso 1 y el paso 2.
  const expectedPrefix = `org/${evidence.organization_id}/evidences/${evidence.id}/`
  if (!input.key.startsWith(expectedPrefix)) {
    return { error: 'La ruta del fichero no corresponde a esta evidencia.' }
  }

  const stat = await statObject({ bucket: BUCKET_EVIDENCES, key: input.key })
  if (!stat.exists) {
    return { error: 'El fichero no llegó al almacenamiento. Inténtalo de nuevo.' }
  }

  const admin = createAdminFluxionClient()
  const { error: updErr } = await admin
    .from('system_evidences')
    .update({
      storage_path:    input.key,
      storage_backend: 's3',
      storage_bucket:  BUCKET_EVIDENCES,
      mime_type:       stat.contentType ?? input.contentType,
      file_size_bytes: stat.size,
    })
    .eq('id', evidence.id)
    .eq('organization_id', evidence.organization_id)

  if (updErr) {
    console.error('confirmEvidenceUpload:', updErr)
    return { error: 'El fichero se subió pero no se pudo registrar. Avisa a soporte.' }
  }

  return { path: input.key }
}

/**
 * URL de lectura de corta duración, según dónde viva el fichero.
 *
 * Se resuelve por `storage_backend` y no por la forma de la ruta: durante la
 * convivencia hay evidencias en los dos sitios y adivinar por el prefijo es
 * pedir un fallo silencioso.
 */
export async function getEvidenceDownloadUrl(
  evidenceId: string,
): Promise<{ url: string; error?: never } | { url?: never; error: string }> {
  const { error, evidence } = await authorizeEvidence(evidenceId)
  if (error || !evidence) return { error: error ?? 'Evidencia no encontrada' }
  if (!evidence.storage_path) return { error: 'La evidencia no tiene fichero adjunto.' }

  if (evidence.storage_backend === 's3') {
    try {
      const url = await signedDownloadUrl({
        bucket: evidence.storage_bucket ?? BUCKET_EVIDENCES,
        key: evidence.storage_path,
      })
      return { url }
    } catch (e) {
      console.error('getEvidenceDownloadUrl (s3):', e)
      return { error: 'No se pudo generar el enlace de descarga.' }
    }
  }

  // Histórico en Supabase Storage: la sesión del usuario y sus políticas.
  const supabase = createClient()
  const { data, error: sErr } = await supabase.storage
    .from(SUPABASE_BUCKET)
    .createSignedUrl(evidence.storage_path, 3600)

  if (sErr || !data?.signedUrl) {
    console.error('getEvidenceDownloadUrl (supabase):', sErr)
    return { error: 'No se pudo generar el enlace de descarga.' }
  }
  return { url: data.signedUrl }
}

/** Borra el fichero de una evidencia, en el backend que corresponda. */
export async function deleteEvidenceObject(
  evidenceId: string,
): Promise<{ ok: true; error?: never } | { ok?: never; error: string }> {
  const { error, evidence } = await authorizeEvidence(evidenceId)
  if (error || !evidence) return { error: error ?? 'Evidencia no encontrada' }
  if (!evidence.storage_path) return { ok: true }

  try {
    if (evidence.storage_backend === 's3') {
      await deleteObject({
        bucket: evidence.storage_bucket ?? BUCKET_EVIDENCES,
        key: evidence.storage_path,
      })
    } else {
      const supabase = createClient()
      const { error: sErr } = await supabase.storage
        .from(SUPABASE_BUCKET)
        .remove([evidence.storage_path])
      if (sErr) throw sErr
    }
  } catch (e) {
    console.error('deleteEvidenceObject:', e)
    return { error: 'No se pudo borrar el fichero del almacenamiento.' }
  }

  const admin = createAdminFluxionClient()
  await admin
    .from('system_evidences')
    .update({ storage_path: null, storage_bucket: null, checksum_sha256: null, file_size_bytes: null })
    .eq('id', evidence.id)

  return { ok: true }
}
