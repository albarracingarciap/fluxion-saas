# C2 · Supervisión humana efectiva (HITL)

Especificación a nivel de migraciones y contratos. Módulo `hitl` del registro de
entitlements.

**Estado**: diseñado, implementación en curso.

---

## 0 · Qué problema resuelve

El artículo 14 exige supervisión humana **efectiva**. Casi todo el mundo lo
documenta con una frase en un procedimiento: *"las decisiones del sistema son
revisadas por un profesional"*.

Eso no es evidencia de nada. Un auditor puede preguntar, con toda la razón:
**¿cuántas veces ese profesional ha estado en desacuerdo con la máquina?** Si la
respuesta es «nunca», la supervisión no está ocurriendo — está ocurriendo un
sello de goma.

Este módulo genera esa evidencia: cada vez que una persona confirma, modifica o
rechaza una sugerencia de IA, queda registrado con su motivo.

## 1 · Anclaje legal, verificado

Contra el texto oficial vía el AI Act Service Desk de la Comisión Europea.

**Art. 14.4.d** — quien supervisa debe poder *"decidir, en cualquier situación
concreta, no utilizar el sistema de IA de alto riesgo o descartar, invalidar o
revertir su resultado"*. De ahí sale la taxonomía de decisiones: aceptar,
modificar, invalidar y no utilizar. No son categorías inventadas.

**Art. 14.4.b** — quien supervisa debe *"ser consciente de la posible tendencia
a confiar automáticamente o en exceso en los resultados"* (sesgo de
automatización). **Este es el apartado que hace valioso el módulo**: es el único
requisito del Reglamento que se puede medir de verdad, y la tasa de concordancia
es su medida directa.

**Art. 26.2** — el responsable del despliegue encomienda la supervisión a
personas con *"la competencia, la formación y la autoridad necesarias"*. Por eso
se registra el rol de quien decide, no solo que alguien decidió.

**Art. 26.6** — los registros se conservan **al menos seis meses**. Es el suelo
de la política de retención, no una elección de producto.

## 2 · Decisiones tomadas antes de escribir código

### 2.1 · No se almacena el caso, solo la decisión

Misma línea que en telemetría, y por motivos más serios: aquí los casos son
diagnósticos radiológicos, evaluaciones de candidatos o decisiones de crédito.

Se guarda una **referencia seudonimizada** del caso —un identificador opaco que
solo el cliente sabe resolver—, la sugerencia de la IA reducida a etiqueta y
confianza, y la decisión humana. **Nunca el contenido clínico, el currículum ni
el expediente.**

Si Fluxion guardase eso, sería encargado del tratamiento de datos de salud de
los pacientes de su cliente, con todo lo que arrastra el artículo 9 del RGPD. La
ventaja de no tenerlos es que no hay que protegerlos.

### 2.2 · El tiempo de decisión es parte de la evidencia

Una decisión tomada en 1,2 segundos sobre un caso complejo no es supervisión:
es un clic. Registrar `decided_in_ms` convierte el sesgo de automatización en
algo observable, en lugar de una advertencia en un manual.

Dos indicadores, y ninguno sirve solo:

- **Tasa de concordancia del 100 %** → o la IA es perfecta, o nadie la está
  revisando. Lo segundo es más probable.
- **Tiempo mediano de decisión de dos segundos** → confirma cuál de las dos.

### 2.3 · Se vende como SDK, no como extensión de navegador

La propuesta original hablaba de un *pop-up* que se acopla a software cerrado.
Eso muere en el comité de seguridad del primer cliente serio.

Lo que se ofrece es una **API de supervisión humana** que integra su equipo o su
proveedor, con un componente web distribuible como implementación de referencia
para quien quiera lo rápido.

### 2.4 · La discordancia alimenta el resto de la plataforma

Una tasa de discordancia que sube es una señal de deriva antes de que ningún
monitor estadístico la detecte: las personas notan que el modelo empeora antes
que las métricas. Por eso una discordancia sostenida emite una **señal** en
`fluxion.signals`, igual que hace el conector de MLflow o el vigilante de
presupuestos.

---

## 3 · Modelo de datos

### 3.1 · `fluxion.hitl_decisions`

```sql
CREATE TABLE fluxion.hitl_decisions (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id   uuid NOT NULL REFERENCES fluxion.organizations(id) ON DELETE CASCADE,
  ai_system_id      uuid NOT NULL REFERENCES fluxion.ai_systems(id) ON DELETE CASCADE,

  -- Identificador OPACO del caso en el sistema del cliente. Nunca un nombre,
  -- un DNI ni un número de historia clínica.
  case_ref          text NOT NULL,

  -- Qué propuso la IA, reducido a etiqueta y confianza.
  ai_suggestion     text,
  ai_confidence     numeric(5,4),

  -- Qué hizo la persona (art. 14.4.d)
  decision          text NOT NULL
                      CHECK (decision IN ('accepted','modified','overridden','not_used')),
  human_outcome     text,
  agreement         boolean NOT NULL,

  -- Por qué. El código es de una taxonomía cerrada para poder agregar;
  -- el texto libre es para lo que la taxonomía no previó.
  reason_code       text,
  reason_note       text,

  -- Quién, con qué autoridad (art. 26.2). Seudonimizado también: el cliente
  -- manda un identificador estable, no el nombre del radiólogo.
  reviewer_ref      text,
  reviewer_role     text,

  -- Sesgo de automatización (art. 14.4.b)
  decided_in_ms     integer,

  occurred_at       timestamptz NOT NULL DEFAULT now(),
  received_at       timestamptz NOT NULL DEFAULT now(),
  api_key_id        uuid REFERENCES fluxion.api_keys(id) ON DELETE SET NULL,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,

  -- Idempotencia: reenviar la misma decisión no la duplica.
  dedupe_key        text,
  CONSTRAINT uq_hitl_dedupe UNIQUE (organization_id, dedupe_key)
);
```

`agreement` se deriva de `decision` en un disparador y no se acepta del cliente:
es la columna sobre la que se calcula todo, y dejar que la envíe quien quiera
sería dejar que el auditado escriba su propia nota.

### 3.2 · `fluxion.hitl_reason_codes`

Taxonomía por organización, con semilla común. Sin códigos cerrados no hay
agregación posible, y sin posibilidad de añadir los suyos ningún cliente lo usa
más de una semana.

---

## 4 · Contratos

```
POST /api/ingest/v1/hitl-decisions
Authorization: Bearer flx_<clave con scope hitl:write>

{ "decisions": [ {
    "system_id": "<uuid>",
    "case_ref": "CASE-9f2a",
    "ai_suggestion": "malignant",
    "ai_confidence": 0.87,
    "decision": "overridden",
    "human_outcome": "benign",
    "reason_code": "contradicts_clinical_context",
    "reason_note": "...",
    "reviewer_ref": "rev-114",
    "reviewer_role": "radiologist",
    "decided_in_ms": 42000,
    "occurred_at": "2026-08-20T10:15:00+00:00",
    "dedupe_key": "CASE-9f2a:rev-114"
} ] }

→ 200 { "accepted": 1, "duplicates": 0 }
```

El endpoint **rechaza** cualquier campo que parezca contenido del caso. No basta
con no pedirlo.

---

## 5 · Fases

| # | Paso |
|---|---|
| 1 | Tablas, taxonomía semilla y disparador de `agreement` |
| 2 | Endpoint de ingesta + scope `hitl:write` |
| 3 | Panel: tasa de concordancia y tiempo de decisión por sistema, revisor y motivo |
| 4 | Señal por discordancia sostenida |
| 5 | Componente web de referencia |
| 6 | El dato entra en el expediente del Anexo IV (apartado 2.e, vigilancia humana) |

El paso 6 es el que cierra el círculo: la evidencia de supervisión humana deja
de ser una afirmación en el expediente y pasa a ser una cifra con su serie
histórica.
