# Componentes de terceros, licencias y dependencias

Inventario de software de terceros que Fluxion incorpora o del que depende.

**Fecha**: 24 de agosto de 2026
**Alcance**: aplicación web, servicios auxiliares, infraestructura y servicios
externos.

> ⚠️ **Qué es y qué no es este documento.** Es un inventario factual extraído de
> los manifiestos del repositorio y de los paquetes instalados: nombres,
> versiones y el campo de licencia que cada paquete declara. **No es un dictamen
> jurídico ni una auditoría de cumplimiento de licencias.** Una licencia
> declarada en `package.json` puede no coincidir con el fichero `LICENSE` real, y
> la compatibilidad entre licencias es una valoración legal. Para un acuerdo de
> cesión conviene contrastarlo con un análisis de composición de software (SCA) y
> con asesoría legal.

---

## 1 · Resumen

| Bloque | Componentes | Observación |
|---|---|---|
| Dependencias npm (aplicación web) | 31 directas · 652 en el árbol | Todas permisivas salvo una, de compilación |
| Dependencias Python (5 servicios) | 13 directas | Permisivas |
| Imágenes de contenedor | 8 del stack Supabase + 2 base | Apache-2.0 y PostgreSQL License |
| Servicios externos de pago | 4 | OpenAI, Voyage AI, Resend, Backblaze B2 |
| Tipografías | 3 familias | SIL Open Font License |

**Sin licencias copyleft fuertes** (GPL, AGPL, LGPL) en ninguna capa.

---

## 2 · Dependencias npm — directas

Aplicación web (`apps/web/package.json`). Versión resuelta en el momento del
inventario.

### 2.1 · De ejecución

| Paquete | Versión | Licencia |
|---|---|---|
| `@aws-sdk/client-s3` | 3.1113.0 | Apache-2.0 |
| `@aws-sdk/s3-request-presigner` | 3.1113.0 | Apache-2.0 |
| `@base-ui/react` | 1.3.0 | MIT |
| `@dagrejs/dagre` | 3.0.0 | MIT |
| `@supabase/ssr` | 0.9.0 | MIT |
| `@supabase/supabase-js` | 2.99.2 | MIT |
| `@tanstack/react-query` | 5.91.0 | MIT |
| `@xyflow/react` | 12.10.2 | MIT |
| `class-variance-authority` | 0.7.1 | Apache-2.0 |
| `clsx` | 2.1.1 | MIT |
| `framer-motion` | 12.38.0 | MIT |
| `lucide-react` | 0.577.0 | ISC |
| `next` | 14.2.35 | MIT |
| `react` | 18.3.1 | MIT |
| `react-dom` | 18.3.1 | MIT |
| `resend` | 6.12.2 | MIT |
| `server-only` | 0.0.1 | MIT |
| `shadcn` | 4.0.8 | MIT |
| `tailwind-merge` | 3.5.0 | MIT |
| `tailwindcss-animate` | 1.0.7 | MIT |
| `tw-animate-css` | 1.4.0 | MIT |
| `zod` | 4.4.3 | MIT |
| `zustand` | 5.0.12 | MIT |

### 2.2 · De desarrollo y compilación

No se distribuyen con la aplicación.

| Paquete | Versión | Licencia |
|---|---|---|
| `@types/node` | 20.19.37 | MIT |
| `@types/react` | 18.3.28 | MIT |
| `@types/react-dom` | 18.3.7 | MIT |
| `eslint` | 8.57.1 | MIT |
| `eslint-config-next` | 14.2.35 | MIT |
| `postcss` | 8.5.8 | MIT |
| `tailwindcss` | 3.4.19 | MIT |
| `typescript` | 5.9.3 | Apache-2.0 |

---

## 3 · Dependencias npm — árbol completo

652 paquetes instalados, contando las transitivas.

| Licencia | Paquetes |
|---|---|
| MIT | 538 |
| ISC | 43 |
| Apache-2.0 | 39 |
| BSD-2-Clause | 11 |
| BSD-3-Clause | 10 |
| BlueOak-1.0.0 | 3 |
| Otras (una cada una) | 8 |

### 3.1 · Casos que merecen mirarse

**`axe-core` 4.11.1 — MPL-2.0.** La única licencia con copyleft de todo el
árbol, y es débil: obliga a publicar los cambios sobre los ficheros de ese
paquete, no sobre el software que lo usa.

Llega por `eslint-config-next` → `eslint-plugin-jsx-a11y`, es decir, por una
**dependencia de desarrollo**: se usa al pasar el linter y **no se incluye en el
paquete que se despliega**. No se ha modificado.

**`caniuse-lite` 1.0.30001780 — CC-BY-4.0.** Es una base de datos de
compatibilidad de navegadores, no código. La usa `browserslist` en tiempo de
compilación. CC-BY exige atribución si se redistribuye el dato.

**Otras licencias singulares**, todas permisivas y todas transitivas:
`argparse` (Python-2.0), `fast-sha256` (Unlicense), `jackspeak`, `minipass`,
`path-scurry` (BlueOak-1.0.0), `language-subtag-registry` (CC0-1.0),
`postal-mime` (MIT-0), `tslib` (0BSD), `type-fest` (MIT o CC0-1.0).

---

## 4 · Dependencias Python

Cinco servicios auxiliares, cada uno con su propio contenedor.

| Servicio | Dependencia | Versión | Licencia |
|---|---|---|---|
| agents | `fastapi` | 0.115.0 | MIT |
| | `uvicorn[standard]` | 0.30.6 | BSD-3-Clause |
| | `openai` | 1.51.0 | Apache-2.0 |
| | `supabase` | 2.10.0 | MIT |
| | `voyageai` | 0.3.7 | MIT |
| | `python-dotenv` | 1.0.1 | BSD-3-Clause |
| | `pydantic` | 2.9.2 | MIT |
| | `httpx` | 0.27.2 | BSD-3-Clause |
| | `opentelemetry-sdk` | 1.29.0 | Apache-2.0 |
| | `opentelemetry-exporter-otlp-proto-http` | 1.29.0 | Apache-2.0 |
| renderer | `fastapi`, `uvicorn`, `pydantic` | 0.115.6 / 0.34.0 / 2.10.4 | MIT / BSD-3-Clause / MIT |
| | `playwright` | 1.49.1 | Apache-2.0 |
| telemetry | `fastapi`, `uvicorn` | 0.115.6 / 0.34.0 | MIT / BSD-3-Clause |
| | `asyncpg` | 0.30.0 | Apache-2.0 |
| | `opentelemetry-proto` | 1.29.0 | Apache-2.0 |
| connector-mlflow | `httpx` | 0.27.2 | BSD-3-Clause |
| connector-shadow-ai | `httpx` | 0.27.2 | BSD-3-Clause |

⚠️ **Las licencias Python de esta tabla no se han extraído de los paquetes
instalados**, como sí se hizo con npm: son las licencias públicas conocidas de
cada proyecto. Conviene confirmarlas con `pip-licenses` sobre los contenedores
reales antes de firmar.

**`playwright` descarga navegadores** (Chromium, Firefox, WebKit) durante la
instalación. Chromium es BSD-3-Clause con componentes de terceros propios. Solo
se usa el renderizador de PDF, en un contenedor sin salida a internet.

---

## 5 · Imágenes de contenedor

### 5.1 · Stack Supabase autoalojado

| Imagen | Versión | Licencia |
|---|---|---|
| `supabase/postgres` | 15.8.1.085 | PostgreSQL License |
| `postgrest/postgrest` | v14.8 | MIT |
| `supabase/gotrue` | v2.186.0 | MIT |
| `supabase/storage-api` | v1.48.26 | Apache-2.0 |
| `supabase/studio` | 2026.04.08 | Apache-2.0 |
| `supabase/postgres-meta` | v0.96.3 | Apache-2.0 |
| `supabase/supavisor` | 2.7.4 | Apache-2.0 |
| `kong/kong` | 3.9.1 | Apache-2.0 |

### 5.2 · Imágenes base

| Imagen | Uso | Licencia |
|---|---|---|
| `node:20-alpine` | Aplicación web | MIT (Node.js) + Alpine (MIT/BSD) |
| `python:3.11-slim-bookworm` | Servicios Python | PSF License + Debian |
| `minio/minio` | Almacenamiento de objetos | **AGPL-3.0** — ver aviso |
| `minio/mc` | Cliente de MinIO, solo en copias | **AGPL-3.0** — ver aviso |

> ⚠️ **MinIO es AGPL-3.0.** Es la única pieza con copyleft fuerte de todo el
> inventario, y merece atención en un acuerdo de cesión.
>
> Se usa **como servicio separado, sin modificar y sin enlazarlo con el código
> de Fluxion**: la aplicación habla con él por su API S3, igual que hablaría con
> Amazon S3. Bajo esa forma de uso, la interpretación habitual es que la AGPL no
> se propaga al software que lo consume. Pero **la AGPL es la licencia que más
> discusión genera en este punto** y la valoración corresponde a asesoría legal,
> no a este documento.
>
> Si el adquirente prefiere evitar la cuestión, MinIO es sustituible por
> cualquier almacenamiento compatible con S3 —Amazon S3, Cloudflare R2, Wasabi—
> sin tocar el código: solo cambian las variables de entorno.

---

## 6 · Servicios externos

### 6.1 · De pago, con datos saliendo de la plataforma

| Servicio | Uso | Qué se le envía |
|---|---|---|
| **OpenAI** | Asistente y clasificación (`gpt-5.6-terra`) | Consultas del usuario y fragmentos del corpus normativo |
| **Voyage AI** | Vectores del corpus RAG | Texto de la normativa a indexar |
| **Resend** | Correo transaccional | Direcciones y contenido de las notificaciones |
| **Backblaze B2** | Copias de seguridad fuera del servidor | Volcados **cifrados** de la base y de los objetos |

**Nota sobre las copias**: se cifran con `rclone crypt` antes de subirse, incluidos
los nombres de fichero. Backblaze no tiene acceso al contenido.

### 6.2 · Sin coste o del lado del cliente

| Servicio | Uso |
|---|---|
| **Google Fonts** | Tipografías Sora, Fraunces e IBM Plex Mono, cargadas desde el navegador |
| **Slack** | Webhooks de aviso, si el cliente los configura |
| **GitHub API** | Conector de Shadow AI, con credencial del cliente |
| **MLflow** | Conector de MLOps, instancia del cliente |

⚠️ **Google Fonts se carga desde el navegador del usuario final**, lo que implica
una conexión de ese navegador a servidores de Google. En algunas
interpretaciones del RGPD esto requiere base legal o alojar las tipografías
localmente. Es una decisión que conviene revisar.

### 6.3 · Infraestructura

| Componente | Uso | Licencia |
|---|---|---|
| **Dokploy** | Plataforma de despliegue | Apache-2.0 |
| **Docker / Docker Swarm** | Contenedores | Apache-2.0 |
| **Traefik** | Proxy inverso y certificados | MIT |
| **rclone** | Copias cifradas fuera del servidor | MIT |

---

## 7 · Tipografías

| Familia | Licencia |
|---|---|
| Sora | SIL Open Font License 1.1 |
| Fraunces | SIL Open Font License 1.1 |
| IBM Plex Mono | SIL Open Font License 1.1 |

La OFL permite uso comercial y redistribución. Prohíbe vender las tipografías
por separado y exige conservar el aviso de licencia si se redistribuyen los
ficheros.

---

## 8 · Contenido normativo incorporado

No es software, pero conviene declararlo en una cesión.

| Fuente | Uso | Situación |
|---|---|---|
| Reglamento (UE) 2024/1689 | Corpus RAG y catálogo de obligaciones | Texto legal de la UE. Reutilizable; conviene citar la fuente oficial |
| ISO/IEC 42001 | Referencias a cláusulas y controles del Anexo A | **Norma de pago.** Solo se citan identificadores y títulos, no su texto |

⚠️ **La ISO/IEC 42001 está protegida por derechos de autor.** Fluxion referencia
identificadores de cláusula y descripciones propias, no reproduce el texto de la
norma. Si en algún momento se incorporara texto literal, haría falta licencia de
ISO. Conviene verificar que ningún contenido de la base de datos lo haga.

---

## 9 · Cómo reproducir este inventario

```bash
# npm: licencias declaradas de todo el arbol
cd apps/web && npx license-checker --summary

# Python: licencias reales dentro de cada contenedor
docker exec <contenedor> pip install pip-licenses && pip-licenses

# Imagenes en uso
grep -h "image:" infra/supabase/docker-compose.propio.yaml services/*/docker-compose.yml
```

Recomendable regenerarlo antes de firmar, y automatizarlo después: un inventario
de dependencias envejece con cada `npm install`.
