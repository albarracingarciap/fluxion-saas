# A2 · Detección de Shadow AI

Especificación a nivel de migraciones y contratos. Módulo `shadow-ai` del
registro de entitlements.

**Estado**: diseñado, implementación en curso.

---

## 0 · Qué problema resuelve

El inventario de sistemas de IA se rellena con lo que la organización **sabe**
que tiene. El artículo 6 y las obligaciones del responsable del despliegue
aplican a lo que tiene de verdad.

La diferencia entre ambas cosas es el Shadow AI: el script que un analista
subió con `openai` en el `requirements.txt`, el prototipo que alguien dejó en
producción, la integración que se hizo sin pasar por gobierno. Nadie lo oculta
con mala intención; simplemente nunca hubo un momento en que declararlo.

Este módulo escanea los repositorios de código de la organización y **propone**
lo que encuentra. No lo mete en el inventario: lo deja en la bandeja de
descubrimientos, igual que el conector de MLflow.

## 1 · Alcance: solo Git, y a propósito

La propuesta original hablaba también de registros de proxy, CASB y accesos SSO.
Se descarta por ahora:

- Requiere integración con las herramientas de seguridad del cliente, que es una
  conversación de meses con su equipo de seguridad.
- Produce muchísimo ruido: una llamada a `api.openai.com` en un registro de
  proxy puede ser un empleado usando ChatGPT en su navegador, que no es un
  sistema de IA de la organización.

El código fuente, en cambio, es **declarativo**: un `requirements.txt` con
`langchain` no es una sospecha, es un hecho. Y el acceso de solo lectura a un
repositorio es una petición que un equipo de sistemas concede sin comité.

## 2 · Decisiones tomadas antes de escribir código

### 2.1 · No se almacena código fuente. Nunca.

Se guarda **qué se encontró, en qué fichero y en qué línea**. No el fragmento,
no el contexto, no el fichero.

El motivo no es solo la propiedad intelectual del cliente: es que el escáner va
a encontrar credenciales, y un almacén de fragmentos de código con claves
dentro es exactamente el objetivo que un atacante busca.

### 2.2 · Una credencial encontrada no se guarda, ni siquiera parcialmente

Si el escáner detecta algo con la forma de una clave de OpenAI, registra el
hallazgo con su fichero y su línea, y **descarta el valor**. Ni completo, ni los
últimos cuatro caracteres, ni un hash.

Un hash parece inofensivo hasta que alguien lo compara contra un diccionario de
claves filtradas. Y para lo que sirve el hallazgo —avisar de que hay que rotarla
y sacarla del repositorio— el valor no aporta nada.

### 2.3 · Los hallazgos tienen su propia tabla

`discovered_assets` guarda el repositorio como candidato a sistema de IA. Pero
la pregunta que hace útil el módulo es *«¿por qué crees que esto es IA?»*, y esa
se responde con la lista de detecciones concretas.

Sin esa lista, el módulo dice «este repositorio parece IA» y no hay forma de
juzgarlo. Con ella, dice «usa `langchain` en `requirements.txt:12` y llama a
`api.openai.com` en `src/agent.py:88`», que es una afirmación que alguien puede
confirmar o descartar en diez segundos.

### 2.4 · Las credenciales expuestas emiten señal, no descubrimiento

Un repositorio con una clave de API dentro no es un hallazgo de inventario: es
un incidente de seguridad. Emite una **señal crítica** en `fluxion.signals`, que
sale por los canales igual que un presupuesto superado.

Es un efecto colateral del módulo, y probablemente el que más rápido justifique
su precio.

### 2.5 · Los patrones viven en el código del escáner

No en la base de datos. Actualizarlos es un despliegue del servicio, que es lo
correcto: son la lógica del producto, y una lista de detección que cada cliente
puede editar deja de ser comparable entre clientes.

## 3 · Modelo de datos

Reutiliza `connector_connections` —ampliando `connector_type` con `github` y
`gitlab`, y `auth_type` con `token`— y `discovered_assets`, que ya contemplaba
`source_module = 'shadow-ai'` y `asset_type = 'repository'` desde agosto.

Lo único nuevo:

```sql
CREATE TABLE fluxion.shadow_ai_findings (
  id                  uuid PRIMARY KEY,
  organization_id     uuid NOT NULL,
  discovered_asset_id uuid NOT NULL,     -- el repositorio

  finding_type        text NOT NULL,     -- library | endpoint | credential | model_file
  category            text NOT NULL,     -- llm | ml | vector_db | provider | secret
  pattern             text NOT NULL,     -- 'langchain', 'api.openai.com'
  file_path           text NOT NULL,
  line_number         integer,
  severity            text NOT NULL,

  first_seen_at       timestamptz,
  last_seen_at        timestamptz,
  resolved_at         timestamptz,       -- desapareció del repositorio
  UNIQUE (discovered_asset_id, finding_type, pattern, file_path, line_number)
);
```

`resolved_at` importa: cuando alguien quita la clave del repositorio, el
hallazgo no se borra —queda el rastro de que estuvo— pero deja de contar.

## 4 · Contratos

El escáner reutiliza el contrato de conectores que ya existe:

```
GET  /api/ingest/v1/connectors/config     scope connectors:sync
POST /api/ingest/v1/discoveries           scope inventory:write
POST /api/ingest/v1/signals               scope signals:write
POST /api/ingest/v1/connectors/runs       scope connectors:sync
```

Y añade uno:

```
POST /api/ingest/v1/shadow-ai/findings    scope inventory:write
```

Sin SDK nuevo ni endpoints paralelos: el conector de MLflow ya demostró que el
contrato aguanta.

## 5 · Fases

| # | Paso |
|---|---|
| 1 | Migración: tipos de conector, `shadow_ai_findings`, endpoint de hallazgos |
| 2 | `services/connector-shadow-ai`: listar repositorios y escanear manifiestos |
| 3 | Detección de credenciales expuestas + señal crítica |
| 4 | Los hallazgos, visibles en la bandeja de descubrimientos |
| 5 | Alta de conexiones de GitHub/GitLab desde Ajustes |
