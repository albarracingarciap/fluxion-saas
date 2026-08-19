# C1 · Documentación regulatoria

Especificación a nivel de migraciones y contratos. Módulo `doc-engine` del
registro de entitlements.

**Estado**: pasos 1-5 hechos — MinIO, plantilla del Anexo IV verificada,
`documents`, la pantalla de `/inventario/[id]/anexo-iv` y el entregable en PDF
con huella (`services/renderer` + `document_renders`).
Pendiente: `model_card`, `fria` y `dpia` (paso 6).

---

## 0 · Qué existe ya

C1 no parte de cero. Conviene tenerlo presente para no reescribirlo:

| Pieza | Dónde | Qué aporta a C1 |
|---|---|---|
| Dosier técnico e informe de gaps | `app/(app)/inventario/[id]/technical-dossier`, `gap-report` | El contenido y el CSS de impresión |
| `fluxion.system_report_snapshots` | Baseline | Congelación del estado en `payload jsonb` |
| `fluxion.system_evidences` | Baseline | Registro, caducidad, versiones, revisión |
| Cron de caducidad de evidencias | `/api/cron/evidence-expiry` | Avisa cuando el documento envejece |
| `lib/evidences/storage.ts` | — | Un único punto de subida/firma/borrado |

Lo que falta es **el fichero**: hoy el entregable es una URL a la aplicación y un
`window.print()`.

---

## 1 · Almacenamiento: MinIO (precede a C1)

Decisión tomada: los ficheros de evidencias y los documentos generados van a
**MinIO**, no a Supabase Storage. Los metadatos siguen en Supabase.

### ⚠️ Lo que cambia y no da error

Supabase Storage aplica **RLS**. Si un camino de código olvidaba comprobar la
organización, la política lo frenaba igual. **MinIO no sabe quién es tu usuario.**
A partir de aquí, el control de acceso vive **solo** en el servidor de la
aplicación:

- Ningún bucket público. Ninguna política de bucket que sustituya la comprobación.
- Todo acceso mediante **URL firmada generada en el servidor** después de
  comprobar la organización.
- Prefijo por inquilino en la clave: `org/<organization_id>/<...>`. Un bucket por
  cliente no escala y no aporta aislamiento real aquí.

El día que alguien firme una URL sin comprobar el `organization_id`, no habrá
nada detrás que lo pare.

### Migración

`20260819090000_storage_backend.sql`

```sql
ALTER TABLE fluxion.system_evidences
  ADD COLUMN storage_backend  text NOT NULL DEFAULT 'supabase'
    CHECK (storage_backend IN ('supabase', 's3')),
  ADD COLUMN checksum_sha256  text,
  ADD COLUMN storage_bucket   text;

COMMENT ON COLUMN fluxion.system_evidences.storage_backend IS
  'Dónde vive el fichero. Las filas anteriores a MinIO siguen en supabase; no se migran a la fuerza.';
```

**Coexistencia deliberada**: no se mueven los ficheros existentes en el mismo
paso. La columna dice dónde está cada uno y la capa de acceso resuelve según el
valor. Migrar los antiguos es un script posterior e independiente, que puede
fallar sin tumbar nada.

### Capa de acceso

`lib/storage/objects.ts` — nueva, con tres funciones y un despacho por backend:

```ts
putObject(backend, bucket, key, body, contentType) → { key, checksum, size }
signedUrl(backend, bucket, key, ttlSeconds)        → string
deleteObject(backend, bucket, key)                 → void
```

`lib/evidences/storage.ts` pasa a ser un consumidor de esa capa en vez de hablar
con Supabase directamente. Es el único fichero que hoy toca el bucket, así que
la costura está limpia.

Dependencia: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.

### Variables de entorno

```
S3_ENDPOINT=https://minio.fluxion-ai.es
S3_REGION=us-east-1          # MinIO la ignora, el SDK la exige
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_FORCE_PATH_STYLE=true     # obligatorio con MinIO
S3_BUCKET_EVIDENCES=fluxion-evidences
S3_BUCKET_DOCUMENTS=fluxion-documents
```

### Backups

El volumen de MinIO **no está en el plan de copias** actual, que solo cubre
PostgreSQL. Desde el momento en que una evidencia vive ahí, un backup de base de
datos ya no es un punto de recuperación: son metadatos apuntando a ficheros que
no vuelven. Ampliar `docs/infra` sección 5 en la misma tanda.

---

## 2 · Modelo de datos de C1

Tres tablas. Nada de una tabla de "huecos": los huecos se calculan al componer y
se congelan en el `payload` del snapshot.

### 2.1 · `fluxion.document_templates`

La estructura canónica del documento, versionada.

```sql
CREATE TABLE fluxion.document_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULL = plantilla de catálogo, propiedad de Fluxion, visible para todos.
  -- Con valor = adaptación de un cliente.
  organization_id uuid REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  key             text NOT NULL CHECK (key IN ('annex_iv','model_card','fria','dpia')),
  version         integer NOT NULL DEFAULT 1,
  title           text NOT NULL,
  framework       text NOT NULL CHECK (framework IN ('ai_act','gdpr','iso42001')),

  -- Estructura: [{ ref, title, guidance, required, source }]
  --   ref      'IV.2.g'  — la referencia legal, que es lo que cita el auditor
  --   source   'derived:fmea' | 'derived:treatment' | 'manual'
  sections        jsonb NOT NULL DEFAULT '[]'::jsonb,

  validity_months integer NOT NULL DEFAULT 12,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_document_templates_version
  ON fluxion.document_templates (COALESCE(organization_id, '00000000-0000-0000-0000-000000000000'::uuid), key, version);
```

Una plantilla publicada **no se edita**: se sube de versión. Igual que las
migraciones, y por el mismo motivo — un documento generado tiene que poder decir
con qué estructura se generó.

### 2.2 · `fluxion.documents`

El documento vivo. **Guarda solo lo que un humano escribió**; lo derivado del
inventario se recompone en cada render para que no envejezca en dos sitios.

```sql
CREATE TABLE fluxion.documents (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  ai_system_id     uuid REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,

  template_key     text NOT NULL,
  template_version integer NOT NULL,

  title            text NOT NULL,
  status           text NOT NULL DEFAULT 'draft'
                     CHECK (status IN ('draft','in_review','approved','superseded')),

  -- { "<section_ref>": { "text": "...", "author_id": uuid, "updated_at": ts } }
  content          jsonb NOT NULL DEFAULT '{}'::jsonb,

  approved_by      uuid REFERENCES fluxion.profiles(id),
  approved_at      timestamptz,
  created_by       uuid REFERENCES fluxion.profiles(id),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),

  -- FRIA y model card pueden ser de organización; el Anexo IV es siempre de sistema
  CONSTRAINT chk_documents_system_scope
    CHECK (template_key <> 'annex_iv' OR ai_system_id IS NOT NULL)
);
```

### 2.3 · `fluxion.document_renders`

El fichero. **Inmutable por diseño**: regenerar produce una fila nueva.

```sql
CREATE TABLE fluxion.document_renders (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id  uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  document_id      uuid NOT NULL REFERENCES fluxion.documents(id) ON DELETE CASCADE,

  format           text NOT NULL CHECK (format IN ('pdf','docx','html')),
  template_version integer NOT NULL,

  -- El estado completo (derivado + manual) que produjo estos bytes
  snapshot_id      uuid REFERENCES fluxion.system_report_snapshots(id),

  storage_backend  text NOT NULL DEFAULT 's3',
  storage_bucket   text NOT NULL,
  storage_path     text NOT NULL,
  checksum_sha256  text NOT NULL,
  byte_size        bigint NOT NULL,

  -- Secciones obligatorias sin cubrir en el momento de generar
  gaps             jsonb NOT NULL DEFAULT '[]'::jsonb,

  evidence_id      uuid REFERENCES fluxion.system_evidences(id) ON DELETE SET NULL,
  rendered_by      uuid REFERENCES fluxion.profiles(id),
  rendered_at      timestamptz NOT NULL DEFAULT now()
);

-- Un entregable regulatorio que se puede editar después no es un entregable.
CREATE OR REPLACE FUNCTION fluxion.document_renders_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'document_renders es inmutable: genera un render nuevo';
END;
$$;

CREATE TRIGGER trg_document_renders_no_update
  BEFORE UPDATE ON fluxion.document_renders
  FOR EACH ROW EXECUTE FUNCTION fluxion.document_renders_immutable();
```

`system_report_snapshots.report_type` admite valores nuevos: `annex_iv`,
`model_card`, `fria`, `dpia`.

### 2.4 · RLS

Patrón de siempre en las tres tablas:

```sql
organization_id IN (SELECT organization_id FROM fluxion.profiles WHERE user_id = auth.uid())
```

Con la excepción de `document_templates`, cuyo `SELECT` admite además
`organization_id IS NULL` (catálogo). Escritura de catálogo: solo `service_role`.

---

## 3 · Contratos

### 3.1 · Servicio de renderizado

Contenedor propio en Dokploy: `fluxion-renderer` (Chromium headless).

**Recibe el HTML, no una URL.** El servicio **no necesita acceso de red a la
aplicación** y por tanto no hay credencial que filtrar ni página que exponer. Es
la diferencia entre un componente sin privilegios y uno que puede leer cualquier
sistema del inventario si alguien le roba el token.

```
POST /render/v1/pdf
Authorization: Bearer $RENDERER_SECRET
Content-Type: application/json

{
  "html": "<!doctype html>…",     // con el CSS embebido
  "format": "A4",
  "margin": { "top": "18mm", "bottom": "18mm", "left": "16mm", "right": "16mm" },
  "header_html": "…",             // referencia del documento y versión
  "footer_html": "…"              // "Página X de Y" + hash abreviado
}

→ 200 application/pdf   (binario)
→ 400 { "error": "html vacío" }
→ 413 { "error": "html excede 20 MB" }
```

El contenedor arranca **sin salida a Internet**. Un renderizador que puede hacer
peticiones es un lector de tu red interna disfrazado de generador de PDF.

### 3.2 · Aplicación web

Acción de servidor para la interfaz, ruta HTTP para la descarga:

```
generateDocumentRender(documentId, format)   → { renderId } | { error }
```

```
GET /api/documents/v1/renders/:id/download
  → 302 Location: <URL firmada de MinIO, TTL 300 s>
  → 403 si el render no es de la organización del usuario
  → 404 si no existe
```

La comprobación de organización va **antes** de firmar. No después, no en el
cliente.

### 3.3 · Composición

`lib/documents/compose.ts`

```ts
composeDocument(orgId, documentId) → {
  sections: Array<{ ref, title, required, source, content, missing: boolean }>,
  gaps:     Array<{ ref, title }>,   // required && missing
  completeness: number               // 0..1
}
```

Regla que no se negocia: **si un dato no está registrado, la sección sale
marcada como hueco.** Nunca se rellena con texto plausible. Un expediente
regulatorio con párrafos inventados es peor que uno incompleto: el incompleto se
corrige, el inventado es una declaración falsa ante una autoridad.

---

## 4 · Enganche con lo que ya funciona

Al generar un render se inserta una evidencia:

```
evidence_type = 'regulatory_document'
storage_backend = 's3'
expires_at = today + template.validity_months
tags = ['anexo-iv', 'generado']
```

Con eso, el cron de caducidad que ya existe avisa cuando el expediente envejece,
sin escribir un solo aviso nuevo.

**Documento obsoleto por cambio del sistema**: se calcula al leer, comparando
`ai_systems.updated_at` con `rendered_at` del último render. Nada de disparadores
sobre media docena de tablas de origen — eso es mantenimiento perpetuo a cambio
de un aviso que la pantalla puede dar sola.

---

## 5 · Orden de trabajo

| # | Paso | Desbloquea |
|---|---|---|
| 1 | Migración de almacenamiento + `lib/storage/objects.ts` + MinIO en Dokploy | Todo lo demás |
| 2 | Backups de MinIO en `docs/infra` §5 | Que el paso 1 no sea una regresión |
| 3 | `document_templates` + semilla del Anexo IV | La estructura canónica |
| 4 | `documents` + pantalla de cumplimentación con huecos visibles | El valor real: saber qué falta |
| 5 | `fluxion-renderer` + `document_renders` + evidencia automática | El entregable |
| 6 | `model_card`, después `fria` y `dpia` | Ampliación del catálogo |

Los pasos 3 y 4 ya aportan valor **sin el renderizador**: una pantalla que dice
"del Anexo IV te faltan los puntos 2(g), 5 y 9" es vendible tal cual.

## 6 · Verificación del Anexo IV

Hecha contra el **AI Act Service Desk de la Comisión Europea**
(`ai-act-service-desk.ec.europa.eu/en/ai-act/annex-4`), no contra el corpus RAG.
Motivo: el corpus ya nos dio mal los plazos del artículo 73 —le faltaba el
apartado 73(4) y sus `section_ref` son índices de fragmento, no números de
apartado—, y una plantilla mal numerada propaga el error a todos los
expedientes que genere.

Resultado: 9 puntos, 25 secciones contando subapartados.

**El punto 1(h) repite la interfaz de usuario que ya pide 1(g).** Está así en el
texto oficial; se ha comprobado en dos fuentes independientes. Se conserva la
duplicidad en vez de "arreglarla" porque un auditor busca por número de
apartado, y una plantilla que unifica dos epígrafes deja un hueco donde él
espera encontrar una respuesta.

**Cinco apartados van con `required = false`**: 1(b), 1(f), 1(h), 2(d) y 2(f).
Son los que el propio Reglamento condiciona con *"where applicable"* o *"where
relevant"*. Exigirle a un sistema de software puro las fotografías del producto
(1.f) no es rigor: es ruido que entierra los huecos de verdad.
