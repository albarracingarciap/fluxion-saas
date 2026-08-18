# Contrato de ingesta

Cómo un módulo se comunica con el Core de Fluxion.

Todo módulo —conector de MLflow, monitor de deriva, telemetría, detección de
Shadow AI— entra por aquí. No hay otra vía: los módulos **no** escriben directamente
en la base de datos ni usan el cliente de Supabase.

En Python, este contrato está implementado en `packages/py-common`
(`SignalsClient`, `ConnectorClient`). Un módulo nuevo no debería hablar con estos
endpoints a mano.

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
| `signals:write` | Publicar señales |
| `signals:read` | Consultar señales recibidas |
| `inventory:read` | Leer el catálogo de sistemas |
| `inventory:write` | **Reportar descubrimientos** |
| `connectors:sync` | **Leer la configuración de las conexiones —incluidas sus credenciales— y reportar sincronizaciones** |

`connectors:sync` es deliberadamente aparte: la respuesta de configuración
contiene contraseñas de sistemas de terceros, y una clave que solo publica
señales no debe poder leerlas.

Un conector típico necesita **tres**: `signals:write`, `inventory:write` y
`connectors:sync`.

Las claves antiguas con permisos gruesos (`read`, `write`, `admin`) siguen
funcionando: `write` cubre cualquier `*:write`, `admin` lo cubre todo. Ojo:
`connectors:sync` **no** lo cubre `write`, solo `admin` — su acción no es ni
lectura ni escritura.

### Límites

- **300 peticiones por minuto y clave.** Al superarlo, `429` con `Retry-After` en segundos.
- **100 elementos por petición** en los endpoints que aceptan lotes.

---

## 2 · Comprobación de conectividad

```
GET /api/ingest/v1/ping
```

Requiere `signals:write`. No toca ningún dato. Llámalo al arrancar el módulo:
fallar en el primer segundo es mucho más barato que descubrir a las tres horas
que la clave estaba revocada.

```json
{
  "ok": true,
  "organization_id": "b60e3af0-…",
  "key_id": "…",
  "scopes": ["signals:write", "connectors:sync"],
  "server_time": "2026-08-18T09:14:02.117Z"
}
```

---

## 3 · Señales

```
POST /api/ingest/v1/signals        (signals:write)
```

Una señal es una observación sobre un sistema de IA: deriva de datos, caída de
calidad, cambio de versión de modelo, coste disparado.

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
| `occurred_at` | ISO 8601 | | Cuándo ocurrió **según el origen**. Admite `Z` y `+02:00` |
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
mlflow:scoring-crediticio:v7
telemetry:sys-4f2a:faithfulness:2026-W33
```

Elige el periodo según cada cuánto quieres que la señal se repita. Diario para
deriva; por versión para cambios de modelo.

Esto es lo que permite que un módulo **no guarde estado**: puede reenviar todo
lo que ve en cada pasada y el Core descarta lo conocido.

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

### Qué ocurre después

| Condición | Efecto |
|---|---|
| Siempre | Se registra en `fluxion.signals` |
| Con `system_id` | Evento `signal_received` en la cronología del sistema |
| `severity` ≥ `high` | Aviso a los responsables del sistema (`profile_systems.is_lead`); si no hay, a los roles de gobierno |
| `severity` = `critical` | Además, tarea con `source_type = 'signal'` asignada al responsable |

Por debajo de `high` la señal queda registrada y visible, pero **no interrumpe a
nadie**. Elige la gravedad pensando en eso: marcar todo como `high` consigue que
dejen de leerse los avisos.

Un fallo despachando no invalida la ingesta. Si la señal se aceptó, está guardada.

---

## 4 · Descubrimientos

```
POST /api/ingest/v1/discoveries    (inventory:write)
```

Un descubrimiento es un activo encontrado en un sistema externo que **todavía no
se sabe si es un sistema de IA de la organización**: un modelo en MLflow, un
repositorio usando librerías de IA, un endpoint de inferencia.

**No crea nada en el inventario.** Entra en una cola que se concilia a mano desde
*Inventario → Descubrimientos*: vincular a un sistema existente, crear uno nuevo,
o descartar indicando por qué. En una herramienta de cumplimiento, un inventario
que se autopuebla no es evidencia de nada.

### Campos

| Campo | Tipo | Oblig. | Notas |
|---|---|:--:|---|
| `source_module` | texto (≤64) | ✅ | Módulo que lo encontró |
| `asset_type` | texto (≤32) | ✅ | `model`, `repository`, `endpoint`… |
| `external_id` | texto (≤512) | ✅ | Identificador **estable** en el origen. Clave de reconciliación |
| `name` | texto (≤300) | ✅ | Nombre legible |
| `connection_id` | uuid | | Conexión de la que proviene |
| `external_url` | texto (≤1000) | | Enlace al activo en su sistema de origen |
| `description` | texto (≤4000) | | |
| `metadata` | objeto | | Contexto: número de versiones, etiquetas, fechas… |

### La regla que importa

Es **idempotente por `(organización, módulo, external_id)`**. Al reenviar, se
refrescan `name`, `external_url`, `description`, `metadata` y `last_seen_at`.

**Nunca se tocan `status` ni `linked_system_id`.** Si alguien ya decidió que un
activo es un sistema —o que hay que ignorarlo—, el conector no puede deshacerlo
por mucho que lo siga viendo cada cinco minutos. La cola de pendientes solo crece
con lo genuinamente nuevo.

### Señal o descubrimiento, no ambos

Un módulo debe elegir por activo:

- **Vinculado** a un sistema del inventario → publica **señales**, que aparecen
  en la cronología de ese sistema.
- **Sin vincular** → publica un **descubrimiento**, uno por activo.

Cómo sabe cuál es cuál: el endpoint de configuración le devuelve el mapa de
vínculos ya resueltos (ver siguiente sección).

---

## 5 · Conectores: configuración y estado

Un conector no lleva su configuración en variables de entorno más allá de las
credenciales de arranque (`FLUXION_API_URL` y `FLUXION_API_KEY`). El resto lo
gestiona el cliente desde *Ajustes → Conectores* y el módulo lo consulta.

### Configuración

```
GET /api/ingest/v1/connectors/config?type=mlflow    (connectors:sync)
```

```json
{
  "type": "mlflow",
  "connections": [
    {
      "id": "9525c09f-…",
      "name": "MLflow principal",
      "base_url": "https://mlflow.ejemplo.com",
      "auth_type": "basic",
      "username": "admin",
      "password": "…",
      "poll_interval_seconds": 300
    }
  ],
  "links": {
    "scoring-crediticio": "200cc52f-…"
  }
}
```

Devuelve **todas** las conexiones activas de ese tipo: un solo contenedor atiende
todas las instancias que tenga configuradas la organización.

`links` mapea `external_id → id del sistema` para los activos ya conciliados. Las
contraseñas se descifran desde Supabase Vault y viajan por HTTPS; es la única
respuesta de la API que contiene credenciales de terceros, y el motivo de que
`connectors:sync` sea un permiso aparte.

### Reporte de sincronizaciones

```
POST /api/ingest/v1/connectors/runs    (connectors:sync)
```

| Campo | Tipo | Oblig. |
|---|---|:--:|
| `connector_type` | texto (≤32) | ✅ |
| `started_at` | ISO 8601 | ✅ |
| `status` | `ok` · `partial` · `error` | ✅ |
| `connection_id` | uuid | |
| `objects_seen` | entero | |
| `signals_published` / `signals_duplicated` / `signals_rejected` | entero | |
| `details` | objeto | Contadores propios del conector |
| `error_message` | texto (≤2000) | |

Repórtalo **siempre**, incluida la pasada fallida: es lo que permite al cliente
ver en la aplicación que su conector lleva tres horas sin poder conectar, en vez
de tener que abrir los logs de un contenedor.

---

## 6 · Códigos de error

| Código | `error` | Qué hacer |
|---|---|---|
| 400 | `invalid_json` / `invalid_body` | Corregir el cuerpo. No reintentar |
| 401 | `unauthorized` | Clave ausente, desconocida, revocada o caducada. No reintentar |
| 403 | `insufficient_scope` | Falta un permiso. La respuesta indica cuál en `required_scope` |
| 402 | `module_not_enabled` | El módulo no está contratado por esa organización |
| 429 | `rate_limited` | Esperar los segundos de `Retry-After` |
| 500 | `insert_failed` / `query_failed` | Reintentar con espera creciente |

---

## 7 · Taxonomía de `signal_type`

Formato `dominio.detalle`, en minúsculas.

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
permitirá agrupar y filtrar cuando haya varios módulos emitiendo.

---

## 8 · Ejemplo completo

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

## 9 · Escribir un módulo nuevo

1. Carpeta en `services/<nombre-con-guiones>/`, paquete `fluxion_<nombre_con_guiones_bajos>/`.
2. Dockerfile con **contexto de build en la raíz** del monorepo, copiando `packages/py-common`.
3. Servicio en Dokploy: contexto `.`, dockerfile `services/<nombre>/Dockerfile`.
4. Clave API con **solo** los permisos que necesite.
5. Usar `SignalsClient` y `ConnectorClient` de `fluxion_common`, no HTTP a mano.
6. Llamar a `ping()` al arrancar y fallar si no responde.
7. Enviar por lotes, con `dedupe_key` siempre que la condición pueda repetirse.
8. Reportar **todas** las pasadas, también las fallidas.
9. Capturar los errores del sistema externo **y** los del Core: ninguno de los
   dos debe tumbar el proceso, solo dejar constancia y reintentar en la siguiente.
10. Añadir su clave a `MODULE_KEYS` en `apps/web/lib/modules/registry.ts`.

Los datos crudos —trazas, lotes de inferencia, informes— **no van en la señal**.
Van al plano de datos o a MinIO, y la señal lleva la referencia. Aquí solo entra
la conclusión.

El conector de MLflow (`services/connector-mlflow/`) es la implementación de
referencia: usa todo lo descrito aquí y es el más simple del catálogo.
