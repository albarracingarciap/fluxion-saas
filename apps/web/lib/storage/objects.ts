import 'server-only';

import { createHash } from 'node:crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl as presign } from '@aws-sdk/s3-request-presigner';

/**
 * Acceso a objetos en MinIO (S3).
 *
 * `server-only`: este módulo no puede acabar en un paquete del navegador.
 * Si alguien lo importa desde un componente cliente, el build falla — que es
 * exactamente lo que queremos, porque aquí viven las credenciales.
 *
 * ⚠️ MinIO no aplica RLS. Antes existía una red debajo: aunque un camino de
 * código olvidase comprobar la organización, la política de Supabase Storage lo
 * paraba. Ya no. Toda llamada a `signedDownloadUrl` / `signedUploadUrl` debe ir
 * precedida de una comprobación explícita de `organization_id`, y la clave del
 * objeto la construye SIEMPRE el servidor con `objectKey()`.
 */

export type StorageBackend = 'supabase' | 's3';

export const BUCKET_EVIDENCES = process.env.S3_BUCKET_EVIDENCES ?? 'fluxion-evidences';
export const BUCKET_DOCUMENTS = process.env.S3_BUCKET_DOCUMENTS ?? 'fluxion-documents';

const DOWNLOAD_TTL = 300; // 5 min: lo justo para que el navegador la siga
const UPLOAD_TTL   = 300;

let client: S3Client | null = null;

function s3(): S3Client {
  if (client) return client;

  const endpoint = process.env.S3_ENDPOINT;
  const accessKeyId = process.env.S3_ACCESS_KEY_ID;
  const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;

  // Sin credenciales, el SDK buscaría el rol de instancia y fallaría mucho más
  // tarde, con un error que no menciona la configuración. Mejor aquí.
  if (!endpoint || !accessKeyId || !secretAccessKey) {
    throw new Error(
      'Almacenamiento S3 sin configurar: faltan S3_ENDPOINT, S3_ACCESS_KEY_ID o S3_SECRET_ACCESS_KEY',
    );
  }

  client = new S3Client({
    endpoint,
    region: process.env.S3_REGION ?? 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    // MinIO sirve los buckets como ruta, no como subdominio.
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
  });

  return client;
}

/** ¿Está configurado el backend S3? Para decidir dónde escribir lo nuevo. */
export function s3Configured(): boolean {
  return Boolean(
    process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY,
  );
}

/**
 * Construye la clave del objeto. El prefijo de organización es la frontera
 * entre inquilinos, así que el nombre que llega del usuario se sanea y nunca
 * puede introducir `../` ni salirse de su carpeta.
 */
export function objectKey(parts: {
  organizationId: string;
  scope: string;        // 'evidences' | 'documents'
  entityId: string;
  filename: string;
}): string {
  const safeName = parts.filename
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/^\.+/, '_')
    .slice(0, 120);

  return `org/${parts.organizationId}/${parts.scope}/${parts.entityId}/${Date.now()}-${safeName}`;
}

/** Sube un objeto desde el servidor y devuelve su huella. */
export async function putObject(input: {
  bucket: string;
  key: string;
  body: Buffer | Uint8Array;
  contentType: string;
}): Promise<{ key: string; checksum: string; size: number }> {
  const body = Buffer.from(input.body);
  const checksum = createHash('sha256').update(body).digest('hex');

  await s3().send(
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      Body: body,
      ContentType: input.contentType,
      Metadata: { sha256: checksum },
    }),
  );

  return { key: input.key, checksum, size: body.length };
}

/**
 * URL de descarga de corta duración.
 *
 * `filename` fuerza el nombre con el que el navegador guarda el fichero: sin
 * esto el usuario se descarga `1755...-informe.pdf` con el sello de tiempo
 * pegado delante.
 */
export async function signedDownloadUrl(input: {
  bucket: string;
  key: string;
  filename?: string;
  ttlSeconds?: number;
}): Promise<string> {
  return presign(
    s3(),
    new GetObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ResponseContentDisposition: input.filename
        ? `attachment; filename="${input.filename.replace(/"/g, '')}"`
        : undefined,
    }),
    { expiresIn: input.ttlSeconds ?? DOWNLOAD_TTL },
  );
}

/**
 * URL de subida de corta duración.
 *
 * La clave la decide el servidor, nunca el cliente: es lo que impide que un
 * navegador escriba en el prefijo de otra organización.
 */
export async function signedUploadUrl(input: {
  bucket: string;
  key: string;
  contentType: string;
  ttlSeconds?: number;
}): Promise<string> {
  return presign(
    s3(),
    new PutObjectCommand({
      Bucket: input.bucket,
      Key: input.key,
      ContentType: input.contentType,
    }),
    { expiresIn: input.ttlSeconds ?? UPLOAD_TTL },
  );
}

/**
 * Comprueba que el objeto existe y devuelve su tamaño real.
 *
 * Necesario porque con subida prefirmada el fichero llega a MinIO sin pasar por
 * la aplicación: sin esta comprobación, un registro en base de datos podría
 * apuntar a un objeto que nunca se subió y nadie se enteraría hasta que un
 * auditor pidiese el fichero.
 */
export async function statObject(input: {
  bucket: string;
  key: string;
}): Promise<{ exists: boolean; size: number; contentType: string | null }> {
  try {
    const res = await s3().send(
      new HeadObjectCommand({ Bucket: input.bucket, Key: input.key }),
    );
    return {
      exists: true,
      size: res.ContentLength ?? 0,
      contentType: res.ContentType ?? null,
    };
  } catch {
    return { exists: false, size: 0, contentType: null };
  }
}

/**
 * Borra un objeto.
 *
 * En `fluxion-documents` hay retención GOVERNANCE a 10 años y el usuario de la
 * aplicación no tiene `s3:BypassGovernanceRetention`, así que esta llamada
 * fallará sobre un documento regulatorio dentro de su plazo. Es deliberado.
 */
export async function deleteObject(input: { bucket: string; key: string }): Promise<void> {
  await s3().send(new DeleteObjectCommand({ Bucket: input.bucket, Key: input.key }));
}
