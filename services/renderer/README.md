# fluxion-renderer

Convierte HTML en PDF. Nada más.

## Por qué recibe el HTML y no una URL

La alternativa obvia —darle la URL de una página de Fluxion y una credencial
para autenticarse— convierte un generador de PDF en **un lector de todo el
inventario** el día que alguien se lleve ese token, y obliga a exponer una ruta
que renderice sin sesión de usuario.

Aquí no hay token de la aplicación ni ruta que exponer: el servicio recibe el
documento ya construido y devuelve los bytes. Y arranca **sin salida a
internet**, de modo que un `<img src="http://…">` en el HTML no carga. Eso es
correcto: un renderizador que puede hacer peticiones es un cliente HTTP dentro
de la red interna disfrazado de generador de documentos.

Consecuencia práctica: **todo el CSS y todas las imágenes van embebidos**. De
eso se encarga `apps/web/lib/documents/render-html.ts`.

## Contrato

```
POST /render/v1/pdf
Authorization: Bearer $RENDERER_SECRET
Content-Type: application/json

{ "html": "<!doctype html>…", "footer_html": "…", "format": "A4" }

→ 200 application/pdf
→ 401 sin autorización
→ 413 html mayor que MAX_HTML_BYTES (20 MB por omisión)
→ 503 RENDERER_SECRET sin configurar
```

`GET /health` responde `{"status":"ok","browser":true}`.

**Sin `RENDERER_SECRET` el servicio rechaza todo** en lugar de aceptar todo. Es
la lección de `CRON_SECRET`, donde la comprobación era `if (secret && …)` y una
variable ausente dejaba los endpoints abiertos.

## Despliegue en Dokploy

Aplicación de tipo Docker, en el proyecto `fluxion`:

| Campo | Valor |
|---|---|
| Contexto de build | **raíz del monorepo** |
| Dockerfile | `services/renderer/Dockerfile` |
| Puerto | 8000 |
| Dominio | **ninguno** |

**No le pongas dominio.** Solo lo llama la aplicación web por la red interna. Un
renderizador accesible desde fuera es una fábrica de PDF gratuita para
cualquiera y un consumidor de memoria a demanda.

Variables:

```
RENDERER_SECRET=<openssl rand -base64 32 | tr -d '/+='>
MAX_HTML_BYTES=20971520
LOG_LEVEL=INFO
```

Y en `fluxion-saas`, las dos que necesita para llamarlo:

```
RENDERER_URL=http://<nombre-del-contenedor>:8000
RENDERER_SECRET=<el mismo valor>
```

Ambos servicios tienen que compartir red. Si no se ven, es lo mismo que pasó con
MinIO: hay que unirlos a `dokploy-network` declarándola como `external: true`.

## Notas de operación

**La imagen pesa alrededor de 1 GB.** Es Chromium con sus dependencias del
sistema, y no hay forma de evitarlo si se quiere que el PDF tenga el mismo
maquetado que el navegador. El primer build tarda varios minutos.

**Un solo Chromium para todo el proceso.** Levantarlo por petición cuesta uno o
dos segundos y multiplica la memoria. Cada render usa su propio contexto, así
que no hay estado compartido entre documentos.

**`--no-sandbox`** es necesario dentro de un contenedor sin privilegios
adicionales. Es aceptable *precisamente porque* este servicio solo procesa HTML
generado por la propia aplicación y no tiene acceso a la red.

Comprobación rápida desde el VPS:

```bash
docker run --rm --network <red-de-dokploy> curlimages/curl:latest \
  -s http://<contenedor-renderer>:8000/health
```
