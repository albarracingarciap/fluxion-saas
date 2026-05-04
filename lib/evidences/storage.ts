import { createClient } from '@/lib/supabase/client';

const BUCKET = 'evidence-files';
const SIGNED_URL_TTL = 3600; // 1 hora

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
 * Sube un archivo al bucket evidence-files.
 * Path: {organizationId}/{evidenceId}/{timestamp}-{filename}
 */
export async function uploadEvidenceFile(
  file: File,
  organizationId: string,
  evidenceId: string,
): Promise<UploadEvidenceFileResult> {
  const supabase = createClient();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `${organizationId}/${evidenceId}/${Date.now()}-${safeName}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error) return { error: error.message };
  return { path };
}

/**
 * Genera una URL firmada de corta duración (1h) para visualizar el archivo.
 */
export async function getSignedUrl(storagePath: string): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/**
 * Elimina el archivo del bucket.
 */
export async function deleteEvidenceFile(storagePath: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.storage.from(BUCKET).remove([storagePath]);
  return !error;
}
