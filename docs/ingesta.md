# Contrato de ingesta

Cómo un módulo publica información en el Core de Fluxion.

Todo módulo —conector de MLflow, monitor de deriva, telemetría, detección de
Shadow AI— entra por aquí. No hay otra vía: los módulos **no** escriben directamente
en la base de datos ni usan el cliente de Supabase.

---

## 1 · Autenticación

Clave API en la cabecera `Authorization`:

```
Authorization: Bearer flx_<64 caracteres hexadecimales>
```

Las claves se emiten en **Ajustes → Claves API**. Se muestran una sola vez: solo
se almacena su SHA-256.

La clave determina la **organización**. Ningún cuerpo de petición lleva
`organization_id`, y si lo llevara se ignoraría.

### Permisos

Formato `recurso:acción`. Emite cada clave con lo mínimo que el módulo necesite.

| Permiso | Para qué |
|---|---|
| `signals:write` | Publicar señales. Es el permiso de casi todos los módulos |
| `signals:read` | Consultar señales recibidas |
| `inventory:read` | Leer el catálogo de sistemas |
| `inventory:write` | Registrar descubrimientos y actualizar metadatos |

Las claves antiguas con permisos gruesos (`read`, `write`, `admin`) siguen
funcionando: `write` cubre cualquier `*:write`, `admin` lo cubre todo. Son deuda
y se migran a granulares cuando se rotan.

### Límites

- **300 peticiones por minuto y clave.** Al superarlo, `429` con cabecera `Retry-After` en segundos.
- **100 señales por petición.**

---

## 2 · Comprobación de conectividad

```
GET /api/ingest/v1/ping
```

Requiere `signals:write`. No toca ningún dato. Úsalo al arrancar el módulo para
fallar pronto si la credencial es incorrecta.

```json
{
  "ok": true,
  "organization_id": "b60e3af0-…",
  "key_id": "…",
  "scopes": ["signals:write"],
  "server_time": "2026-08-18T09:14:02.117Z"
}
```

---

## 3 · Publicar señales

```
POST /api/ingest/v1/signals
Content-Type: application/json
```

Acepta **un objeto o un array** de hasta 100.

### Campos

| Campo | Tipo | Oblig. | Notas |
|---|---|:--:|---|
| `source_module` | texto (≤64) | ✅ | Identificador del módulo: `drift-monitor`, `connector-mlflow` |
| `signal_type` | texto (≤64) | ✅ | Naturaleza de la observación. Ver taxonomía abajo |
| `severity` | enum | ✅ | `info` · `low` · `medium` · `high` · `critical` |
| `title` | texto (≤300) | ✅ | Una línea, legible por una persona |
| `system_id` | uuid | | Sistema afectado. Omitir en señales de ámbito organización |
| `summary` | texto (≤4000) | | Detalle |
| `metric_name` | texto (≤64) | | `psi`, `faithfulness`, `cost_usd`… |
| `metric_value` | número | | Valor observado |
| `threshold` | número | | Umbral que se superó |
| `payload` | objeto | | Contexto libre. No metas aquí datos personales |
| `occurred_at` | ISO 8601 | | Cuándo ocurrió **según el origen**. Por defecto, la recepción |
| `source_ref` | texto (≤256) | | Identificador del hecho en el sistema de origen |
| `dedupe_key` | texto (≤256) | | Clave de idempotencia. Ver abajo |

`system_id` se verifica contra la organización de la clave. Un UUID de otra
organización se rechaza.

### Idempotencia

Sin `dedupe_key`, cada envío crea una señal nueva. Un job horario generaría 24
señales al día de la misma condición.

Con `dedupe_key`, el segundo envío no hace nada y se informa como duplicado.
**Convención**: `<modulo>:<recurso>:<periodo>`

```
drift:sys-4f2a:feature-edad:2026-08-18
mlflow:model-scoring:v7
telemetry:sys-4f2a:faithfulness:2026-W33
```

Elige el periodo según cada cuánto quieres que la señal se repita. Diario para
deriva; por versión para cambios de modelo.

### Respuesta

`200` siempre que la petición esté bien formada, con **resultado por elemento**.
Una señal inválida no invalida el lote: las demás entran.

```json
{
  "received": 3,
  "accepted": 1,
  "duplicates": 1,
  "rejected": 1,
  "results": [
    { "index": 0, "accepted": true,  "duplicate": false, "signal_id": "9a1f…" },
    { "index": 1, "accepted": false, "duplicate": true,  "signal_id": null },
    { "index": 2, "accepted": false, "duplicate": false, "signal_id": null,
      "error": "severity: severity debe ser uno de: info, low, medium, high, critical." }
  ]
}
```

**No reintentes los duplicados** — ya están. Reintenta solo los elementos con
`error`, y solo si el error es transitorio.

### Códigos de error

| Código | `error` | Qué hacer |
|---|---|---|
| 400 | `invalid_json` / `invalid_body` | Corregir el cuerpo. No reintentar |
| 401 | `unauthorized` | Clave ausente, desconocida, revocada o caducada. No reintentar |
| 403 | `insufficient_scope` | La clave no tiene `signals:write`. Emitir una nueva |
| 429 | `rate_limited` | Esperar los segundos de `Retry-After` |
| 500 | `insert_failed` | Reintentar con espera creciente |

---

## 4 · Qué ocurre después

El Core despacha cada señal aceptada:

| Condición | Efecto |
|---|---|
| Siempre | Se registra en `fluxion.signals` |
| Con `system_id` | Evento `signal_received` en la cronología del sistema |
| `severity` ≥ `high` | Aviso a los responsables del sistema; si no hay, a los roles de gobierno |
| `severity` = `critical` | Además, tarea con `source_type = 'signal'` asignada al responsable |

Por debajo de `high` la señal queda registrada y visible, pero **no interrumpe a
nadie**. Elige la gravedad pensando en eso: marcar todo como `high` consigue que
dejen de leerse los avisos.

Un fallo despachando no invalida la ingesta. Si la señal se aceptó, está
guardada.

---

## 5 · Taxonomía de `signal_type`

Formato `dominio.detalle`, en minúsculas. Los dominios en uso:

| Dominio | Ejemplos |
|---|---|
| `drift` | `drift.data`, `drift.concept`, `drift.fairness` |
| `quality` | `quality.faithfulness`, `quality.relevance`, `quality.context_precision` |
| `cost` | `cost.daily`, `cost.per_request` |
| `inventory` | `inventory.model_registered`, `inventory.model_promoted` |
| `discovery` | `discovery.asset`, `discovery.credential` |
| `hitl` | `hitl.disagreement_rate` |
| `gateway` | `gateway.prompt_injection`, `gateway.pii_masked` |

No es una lista cerrada —el campo es texto libre— pero respétala: es lo que
permitirá agrupar y filtrar señales cuando haya varios módulos emitiendo.

---

## 6 · Ejemplo completo

```bash
curl -X POST https://fluxion-ai.es/api/ingest/v1/signals \
  -H "Authorization: Bearer $FLUXION_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "system_id":    "4f2a…",
    "source_module":"drift-monitor",
    "source_ref":   "run-2026-08-18T06:00Z",
    "signal_type":  "drift.data",
    "severity":     "high",
    "title":        "PSI por encima del umbral en edad_cliente",
    "summary":      "Desplazamiento sostenido durante 5 días consecutivos.",
    "metric_name":  "psi",
    "metric_value": 0.31,
    "threshold":    0.2,
    "occurred_at":  "2026-08-18T06:00:00Z",
    "dedupe_key":   "drift:4f2a:edad_cliente:2026-08-18",
    "payload": { "ventana_dias": 5, "informe": "s3://fluxion-artifacts/drift/…" }
  }'
```

---

## 7 · Escribir un módulo nuevo

1. Carpeta en `services/<nombre-con-guiones>/`, paquete `fluxion_<nombre_con_guiones_bajos>/`.
2. Dockerfile con **contexto de build en la raíz** del monorepo, copiando `packages/py-common`.
3. Servicio en Dokploy: contexto `.`, dockerfile `services/<nombre>/Dockerfile`.
4. Clave API con **solo** los permisos que necesite.
5. Llamar a `/ping` al arrancar y fallar si no responde.
6. Enviar por lotes, con `dedupe_key` siempre que la condición pueda repetirse.
7. Añadir su clave a `MODULE_KEYS` en `apps/web/lib/modules/registry.ts`.

Los datos crudos —trazas, lotes de inferencia, informes— **no van en la señal**.
Van al plano de datos o a MinIO, y la señal lleva la referencia. Aquí solo entra
la conclusión.
