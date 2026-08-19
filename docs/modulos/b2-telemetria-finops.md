# B2 · Telemetría y FinOps de IA

Especificación a nivel de migraciones y contratos. Módulo `telemetry` del
registro de entitlements.

**Estado**: diseñado, no implementado.

---

## 0 · Qué existe ya

| Pieza | Dónde | Qué aporta |
|---|---|---|
| `fluxion.agent_sessions` | Baseline | Ya guarda `tokens_input`, `tokens_output` y `model` — pero solo de los agentes propios |
| `fluxion.signals` | `20260812090000` | La espina para que una desviación de coste se convierta en aviso |
| `fluxion.api_keys` + scopes | `lib/auth/api-key.ts` | Autenticación máquina a máquina, ya con límite de tasa |
| Canales y entregas | `20260818190000` | Slack y Teams con reintentos, ya funcionando |
| `services/agents` | — | **Un servicio de LLM en producción que es nuestro**: se instrumenta sin pedirle permiso a nadie |

Eso último es la razón de que B2 vaya antes que B3. La monitorización de deriva
necesita registros de inferencia de un cliente real; la telemetría se puede
probar contra `agent1` desde el primer día.

---

## 1 · Decisiones tomadas antes de escribir código

### 1.1 · No se almacenan prompts ni respuestas. Nunca.

El semconv permite capturar el contenido de las conversaciones como opción. Aquí
se descarta de raíz, y no por ahorro de espacio:

Fluxion es un producto de cumplimiento. Guardar los prompts de un cliente
convertiría a Fluxion en **encargado del tratamiento de los datos personales que
sus usuarios escriben en un chat**, con todo lo que arrastra: contrato del
artículo 28 del RGPD, análisis de transferencias, derecho de supresión sobre un
almacén de trazas, y un objetivo de exfiltración de altísimo valor dentro de
nuestra propia base de datos.

Se guardan **metadatos**: modelo, tokens, latencia, error, coste. Con eso se hace
FinOps y observabilidad. El contenido se queda en casa del cliente.

Consecuencia de diseño: el servicio de ingesta **descarta los atributos de
contenido aunque lleguen**. No basta con no pedirlos; un SDK mal configurado los
enviará algún día y no puede quedarse nada.

### 1.2 · El coste se calcula al ingerir, no al consultar

Los precios de los modelos cambian. Si el coste se calculase al leer, el informe
de marzo cambiaría en junio, y un informe que cambia solo no sirve para
justificar un presupuesto.

Se calcula una vez, con la tarifa vigente ese día, y se guarda junto a la
referencia de la tarifa aplicada.

### 1.3 · Esto no es un APM

Solo se conservan los tramos que llevan atributos `gen_ai.*`. El resto de la
traza se descarta en la ingesta.

Aceptar cualquier tramo convertiría esto en un Datadog pobre, con el volumen de
un APM y ninguna de sus prestaciones. El valor está en la capa de IA, que es la
que nadie más está midiendo con la mirada del cumplimiento.

### 1.4 · Esquema propio, pensado para mudarse

Todo vive en un esquema `telemetry`, no en `fluxion`. Es el volumen que no debe
compartir destino con los datos de cumplimiento: una restauración del expediente
regulatorio no debería arrastrar cuatro millones de tramos.

Es también la primera pieza real de la separación Control/Data que quedó
pendiente de la Ola 0. Empieza en la misma instancia; el esquema aparte es lo
que hará que mudarla sea un `pg_dump -n telemetry` y no un proyecto.

### 1.5 · Particionado nativo, no TimescaleDB

`timescaledb` está en `shared_preload_libraries` de la instancia, así que sería
posible. Se descarta: añade una extensión de la que dependería el volcado base y
la restauración, para un beneficio que a este volumen no se nota. Particionado
nativo por mes y a otra cosa. Si algún día un cliente mete cien millones de
tramos, se reconsidera con datos.

---

## 2 · Modelo de datos

### 2.1 · `telemetry.llm_spans`

Un tramo por llamada al modelo. Nombres alineados con el semconv de GenAI, que
se movió al repositorio `open-telemetry/semantic-conventions-genai`.

```sql
CREATE SCHEMA IF NOT EXISTS telemetry;

CREATE TABLE telemetry.llm_spans (
  id               uuid        NOT NULL DEFAULT gen_random_uuid(),
  organization_id  uuid        NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,

  -- Identidad OTel
  trace_id         text        NOT NULL,
  span_id          text        NOT NULL,
  parent_span_id   text,

  started_at       timestamptz NOT NULL,
  ended_at         timestamptz NOT NULL,
  duration_ms      integer     NOT NULL,

  -- gen_ai.* (obligatorios en el semconv)
  operation_name   text        NOT NULL,   -- gen_ai.operation.name  (chat, embeddings…)
  provider_name    text        NOT NULL,   -- gen_ai.provider.name   (openai, anthropic…)

  -- Condicionales y recomendados
  request_model    text,                   -- gen_ai.request.model
  response_model   text,                   -- gen_ai.response.model
  input_tokens     integer,                -- gen_ai.usage.input_tokens
  output_tokens    integer,                -- gen_ai.usage.output_tokens
  conversation_id  text,                   -- gen_ai.conversation.id
  response_id      text,                   -- gen_ai.response.id
  finish_reasons   text[],                 -- gen_ai.response.finish_reasons
  error_type       text,                   -- error.type
  is_stream        boolean,                -- gen_ai.request.stream

  -- Coste congelado en el momento de ingerir
  cost_input       numeric(14,6),
  cost_output      numeric(14,6),
  cost_total       numeric(14,6),
  currency         text        NOT NULL DEFAULT 'USD',
  price_id         uuid REFERENCES telemetry.model_prices(id),

  -- Contexto propio
  ai_system_id     uuid REFERENCES fluxion.ai_systems(id) ON DELETE SET NULL,
  service_name     text,                   -- service.name del recurso
  environment      text,                   -- deployment.environment.name

  -- Lo que no tiene columna. NUNCA contenido de prompts ni respuestas.
  attributes       jsonb       NOT NULL DEFAULT '{}'::jsonb,

  ingested_at      timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (organization_id, started_at, trace_id, span_id)
) PARTITION BY RANGE (started_at);
```

**La clave primaria es la deduplicación.** Los exportadores de OTel reintentan
ante un 5xx; sin esto, un corte de red duplica el coste del día. Mismo principio
que `dedupe_key` en `signals`.

Particiones mensuales creadas por adelantado. Retención de tramos crudos
configurable (90 días por defecto); los agregados no caducan.

### 2.2 · `telemetry.model_prices`

```sql
CREATE TABLE telemetry.model_prices (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider                  text NOT NULL,
  model                     text NOT NULL,
  effective_from            date NOT NULL,

  input_per_million         numeric(12,4) NOT NULL,
  output_per_million        numeric(12,4) NOT NULL,
  cached_input_per_million  numeric(12,4),
  reasoning_per_million     numeric(12,4),

  currency                  text NOT NULL DEFAULT 'USD',
  source                    text,
  UNIQUE (provider, model, effective_from)
);
```

Las dos últimas columnas de precio no son adorno: **con modelos de razonamiento y
con caché de contexto, calcular el coste solo con entrada y salida da cifras
falsas**, a veces por un factor de tres. Si el dato no viene en el tramo, el
coste se marca como estimado en vez de inventarse.

Catálogo semilla mantenido por Fluxion (`organization_id` no aplica); un cliente
con tarifas negociadas podrá sobrescribir en una fase posterior.

### 2.3 · `telemetry.rollup_daily`

```sql
CREATE TABLE telemetry.rollup_daily (
  organization_id uuid NOT NULL,
  day             date NOT NULL,
  ai_system_id    uuid,
  provider_name   text NOT NULL,
  request_model   text NOT NULL,
  environment     text NOT NULL DEFAULT 'unknown',

  calls           bigint  NOT NULL,
  errors          bigint  NOT NULL,
  input_tokens    bigint  NOT NULL,
  output_tokens   bigint  NOT NULL,
  cost_total      numeric(14,6) NOT NULL,
  duration_p50_ms integer,
  duration_p95_ms integer,

  computed_at     timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, day, ai_system_id, provider_name, request_model, environment)
);
```

Las pantallas leen de aquí. Consultar los tramos crudos para pintar un panel es
lo que convierte una base de datos compartida en un problema de todos.

### 2.4 · `telemetry.rollup_runs`

```sql
CREATE TABLE telemetry.rollup_runs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ran_at       timestamptz NOT NULL DEFAULT now(),
  day_from     date NOT NULL,
  day_to       date NOT NULL,
  rows_written integer NOT NULL,
  duration_ms  integer NOT NULL,
  error        text
);
```

**Existe por una razón concreta**: ya nos pasó que `pg_cron` desapareció en una
migración y nadie se enteró durante semanas. Un agregado que no se calcula
produce paneles a cero, que es indistinguible de "no hubo tráfico". Esta tabla
convierte esa ambigüedad en una consulta.

### 2.5 · Presupuestos

```sql
CREATE TABLE telemetry.cost_budgets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  scope           text NOT NULL CHECK (scope IN ('organization', 'system')),
  ai_system_id    uuid REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,
  period          text NOT NULL DEFAULT 'month' CHECK (period IN ('month')),
  amount          numeric(12,2) NOT NULL,
  currency        text NOT NULL DEFAULT 'USD',
  alert_at_pct    integer[] NOT NULL DEFAULT '{50,80,100}',
  is_active       boolean NOT NULL DEFAULT true,
  CONSTRAINT chk_budget_scope
    CHECK ((scope = 'system') = (ai_system_id IS NOT NULL))
);

CREATE TABLE telemetry.cost_budget_alerts (
  budget_id  uuid NOT NULL REFERENCES telemetry.cost_budgets(id) ON DELETE CASCADE,
  period_key text NOT NULL,          -- '2026-08'
  threshold  integer NOT NULL,
  sent_at    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (budget_id, period_key, threshold)
);
```

La clave primaria de las alertas es la idempotencia, calcada de
`incident_deadline_alerts`: el vigilante puede correr cada hora sin repetir
avisos.

Un umbral superado **emite una señal** en `fluxion.signals` y de ahí sale por los
canales que ya existen. No se construye una segunda vía de avisos.

### 2.6 · RLS

Patrón de siempre en todas las tablas con `organization_id`. `model_prices` es
catálogo: lectura para `authenticated`, escritura solo `service_role`.

---

## 3 · Contratos

### 3.1 · Ingesta OTLP

Servicio nuevo `services/telemetry` (FastAPI), desplegado en Dokploy con dominio
propio `otel.fluxion-ai.es`.

```
POST /v1/traces
Authorization: Bearer flx_<clave de API>
Content-Type: application/x-protobuf | application/json

→ 200 {"accepted": 42, "dropped": 118}
→ 401 clave inválida o revocada
→ 403 la clave no tiene el scope telemetry:write
→ 429 límite de tasa
```

**Es OTLP estándar a propósito.** El cliente no instala nada de Fluxion:
configura las variables que ya conoce.

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=https://otel.fluxion-ai.es
OTEL_EXPORTER_OTLP_HEADERS=authorization=Bearer flx_xxx
OTEL_RESOURCE_ATTRIBUTES=service.name=scoring,fluxion.system_id=<uuid>
```

Que la integración sean tres variables de entorno y ningún SDK propietario es la
diferencia entre una venta técnica de una tarde y un proyecto de tres meses.

`dropped` en la respuesta es deliberado: dice cuántos tramos se descartaron por
no ser de IA. Sin ese número, un cliente que envía todo su APM creería que
Fluxion se está comiendo sus datos.

**Nuevo scope**: `telemetry:write`, en `lib/auth/scopes.ts`. Cubierto por el
legado `write`.

### 3.2 · Resolución del sistema

Tres vías, por orden:

1. `fluxion.system_id` en los atributos de recurso — explícito, el ideal.
2. `service.name` casado contra `connector_connections` / `discovered_assets`.
3. Ninguna: el tramo se guarda con `ai_system_id` nulo y aparece en una bandeja
   de **telemetría sin adscribir**, que es la versión de descubrimiento de este
   módulo.

Igual que con los modelos de MLflow: nada entra al inventario solo. Aparece,
alguien lo reconcilia.

### 3.3 · Alternativa para quien no tiene OTel

```
POST /api/ingest/v1/llm-calls
{ "calls": [ { "occurred_at": "...", "provider": "openai", "model": "gpt-4o",
               "input_tokens": 1200, "output_tokens": 340,
               "duration_ms": 890, "error_type": null,
               "system_id": "<uuid>" } ] }
```

El mismo modelo de datos por la puerta sencilla. Muchos clientes no tienen
OpenTelemetry y no lo van a montar para probar un módulo.

---

## 4 · Comer de nuestro propio plato

`services/agents` se instrumenta con el SDK de OTel y exporta contra el servicio
de telemetría. Beneficios inmediatos:

- Datos reales desde el primer día, para diseñar las pantallas mirando algo.
- El coste de `agent1` deja de ser una incógnita: hoy se sabe cuántos tokens
  gasta una sesión (`agent_sessions.tokens_input`), pero no cuánto cuesta ni qué
  parte se va en RAG frente a generación.
- La ruta de ingesta se prueba con carga de verdad antes de enseñarla.

`agent_sessions.tokens_*` se mantiene: es el registro funcional de la sesión. La
telemetría es la vía general y no lo sustituye.

---

## 5 · Fases

| # | Paso | Qué desbloquea |
|---|---|---|
| 1 | Esquema `telemetry`, `model_prices` con catálogo semilla, `llm_spans` particionada | El almacén |
| 2 | `services/telemetry` con OTLP + scope `telemetry:write` | La entrada |
| 3 | Instrumentar `agent1` | Datos reales |
| 4 | Agregados diarios con `pg_cron` + `rollup_runs` | Consultas rápidas |
| 5 | Pantalla de coste y latencia, por organización y por sistema | Lo que se enseña |
| 6 | Presupuestos, umbrales y señales | Lo que se paga |

Los pasos 1 a 3 ya tienen valor interno aunque no haya pantalla: responden a
"cuánto nos cuesta `agent1`", que hoy no sabemos.

---

## 6 · Riesgos y cosas que decidir

**Volumen.** Un cliente con un millón de llamadas al mes son un millón de filas.
A eso, con particiones mensuales y retención de 90 días, PostgreSQL ni se
inmuta. El problema no llega por el tamaño sino por compartir instancia: ver 1.4.

**Exactitud del coste.** Tokens en caché, tokens de razonamiento y descuentos por
lote pueden desviar la cifra de forma seria. La tabla de precios los contempla,
pero si el tramo no trae el desglose, hay que marcar el coste como **estimado** y
que la pantalla lo diga. Un panel de costes en el que no se puede confiar es peor
que no tenerlo: se usa para decidir.

**Deriva del semconv.** Los atributos de GenAI han cambiado de nombre más de una
vez —y las convenciones se han movido a un repositorio propio—. El ingestor debe
aceptar los alias antiguos y registrar cuáles ve, para saber cuándo dejar de
soportarlos.

**Reloj del cliente.** `started_at` viene de la máquina del cliente. Si su reloj
va desfasado, los agregados diarios se desplazan. Hay que rechazar tramos con
fechas absurdas —más de 48 h en el futuro o más de 30 días en el pasado— y
contarlos en la respuesta, no descartarlos en silencio.
