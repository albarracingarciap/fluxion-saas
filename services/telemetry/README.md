# fluxion-telemetry

Ingesta OTLP de telemetría de modelos. Recibe trazas, se queda solo con las
llamadas a modelos, calcula el coste y escribe en `telemetry.llm_spans`.

## Lo que no hace

**No almacena prompts ni respuestas.** El servicio descarta los atributos de
contenido aunque lleguen: no basta con no pedirlos, un SDK mal configurado los
enviará algún día. Guardarlos convertiría a Fluxion en encargado del tratamiento
de los datos personales que los usuarios del cliente escriben en un chat, con
todo lo que arrastra. El razonamiento completo está en
[`docs/modulos/b2-telemetria-finops.md`](../../docs/modulos/b2-telemetria-finops.md).

**No es un APM.** Los tramos sin atributos `gen_ai.*` se descartan y se cuentan.

## Contrato

```
POST /v1/traces
Authorization: Bearer flx_<clave de API con scope telemetry:write>
Content-Type: application/x-protobuf | application/json

→ 200  cuerpo OTLP vacío + cabeceras de recuento
→ 400  lote ilegible
→ 401  credencial inválida, revocada, caducada o sin el scope
→ 413  lote mayor que MAX_BODY_BYTES
→ 503  no se pudo escribir (el exportador reintentará)
```

Los recuentos van en cabeceras y no en el cuerpo:

```
x-fluxion-accepted: 42
x-fluxion-dropped-not-genai: 118
x-fluxion-dropped-out-of-window: 0
x-fluxion-dropped-content-attrs: 6
```

Es por conformidad: OTLP espera un `ExportTraceServiceResponse` y algunos
exportadores fallan al encontrarse campos que no reconocen. Las cabeceras las
lee cualquiera y no las parsea nadie.

`dropped-content-attrs` mayor que cero significa que el cliente está enviando
prompts. No es un error suyo ni nuestro, pero conviene decírselo: está mandando
por la red algo que no hace falta.

## Configuración del cliente

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.fluxion-ai.es
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer flx_xxx
OTEL_RESOURCE_ATTRIBUTES=service.name=scoring,fluxion.system_id=<uuid del sistema>
```

Sin `fluxion.system_id`, los tramos entran sin sistema asignado y aparecen en la
bandeja de telemetría sin adscribir. Igual que con los modelos de MLflow: nada
entra al inventario solo.

## Variables del servicio

```
DATABASE_URL=postgresql://postgres:<contraseña>@supabase-db:5432/postgres
LOG_LEVEL=INFO
MAX_BODY_BYTES=8388608
DB_POOL_MAX=8
```

## Despliegue en Dokploy

Aplicación de tipo Docker en el proyecto `fluxion`:

| Campo | Valor |
|---|---|
| Contexto de build | **raíz del monorepo** |
| Dockerfile | `services/telemetry/Dockerfile` |
| Dominio | `otel.fluxion-ai.es`, puerto 9000→**8000**, HTTPS |

Este servicio **sí lleva dominio**, al revés que el renderizador: lo llaman los
clientes desde fuera.

### ⚠️ La red

El servicio necesita alcanzar `supabase-db`, que vive en la red del compose de
Supabase, no en `dokploy-network`. Es el mismo tropiezo que con MinIO y Traefik,
al revés.

Comprobar en qué red está la base de datos:

```bash
docker inspect supabase-db --format '{{range $k,$v := .NetworkSettings.Networks}}{{$k}}{{"\n"}}{{end}}'
```

Y que el contenedor de telemetría esté también en ella. Como parche inmediato:

```bash
docker network connect <red-de-supabase> $(docker ps -qf name=telemetry)
```

Pero eso **no sobrevive a un redespliegue**: hay que declararlo en la
configuración del servicio en Dokploy. Si no, la telemetría dejará de escribir
en el siguiente despliegue y el síntoma será un 503 que nadie está mirando.

## Prueba

Crea antes una clave de API con el scope **Enviar telemetría** en Ajustes.

```bash
NOW=$(date +%s)
curl -i -X POST https://otel.fluxion-ai.es/v1/traces \
  -H "Authorization: Bearer flx_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": { "attributes": [
        { "key": "service.name", "value": { "stringValue": "prueba" } }
      ]},
      "scopeSpans": [{
        "spans": [{
          "traceId": "5b8efff798038103d269b633813fc60c",
          "spanId": "eee19b7ec3c1b174",
          "startTimeUnixNano": "'$((NOW - 2))000000000'",
          "endTimeUnixNano": "'${NOW}000000000'",
          "attributes": [
            { "key": "gen_ai.operation.name", "value": { "stringValue": "chat" } },
            { "key": "gen_ai.provider.name",  "value": { "stringValue": "openai" } },
            { "key": "gen_ai.request.model",  "value": { "stringValue": "gpt-4o" } },
            { "key": "gen_ai.usage.input_tokens",  "value": { "intValue": "1200" } },
            { "key": "gen_ai.usage.output_tokens", "value": { "intValue": "340" } },
            { "key": "gen_ai.prompt", "value": { "stringValue": "esto no debe guardarse" } }
          ]
        }]
      }]
    }]
  }'
```

Debe responder `200` con `x-fluxion-accepted: 1` y
`x-fluxion-dropped-content-attrs: 1` — ese último confirma que el atributo con
el prompt se tiró.

Y en la base de datos:

```sql
SELECT provider_name, request_model, input_tokens, output_tokens,
       cost_total, cost_status, attributes
  FROM telemetry.llm_spans ORDER BY started_at DESC LIMIT 5;
```

`cost_status = 'unknown'` y `cost_total` nulo es lo esperado mientras
`telemetry.model_prices` esté vacía. Los modelos pendientes de tarifa salen en:

```sql
SELECT * FROM telemetry.v_models_without_price;
```

Repetir el mismo `curl` no duplica: la clave primaria deduplica por
`(organización, inicio, traza, tramo)`.
