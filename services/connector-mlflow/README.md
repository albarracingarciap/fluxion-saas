# Conector MLflow

Sincroniza el registro de modelos de MLflow con Fluxion.

Es el primer módulo del catálogo y la **implementación de referencia**: usa todo
el contrato de [`docs/ingesta.md`](../../docs/ingesta.md) —señales,
descubrimientos, configuración remota y reporte de sincronizaciones— y es el más
simple de los diez.

## Qué mira, y qué no

Solo el **Registro de Modelos** (`registered-models` y `model-versions`). No mira
experimentos ni *runs* de entrenamiento.

Es deliberado: puedes lanzar cientos de runs entrenando, y un experimento no es
un sistema de IA — es trabajo en curso. **Registrar un modelo sí es un acto de
intención**: alguien ha decidido que ese artefacto es candidato a usarse. Ese es
el umbral razonable para entrar en una cola de gobernanza. Vigilando
experimentos, Descubrimientos sería inservible en una semana.

## Qué publica

Por cada modelo del registro, el conector decide entre dos cosas — nunca las dos:

**Si el modelo está vinculado a un sistema del inventario**, publica señales por
cada versión:

| Señal | Cuándo | Gravedad |
|---|---|---|
| `inventory.model_registered` | Siempre | `info` |
| `inventory.model_promoted` | La versión tiene alias `production`/`prod`/`champion`, o etapa `Production` | `medium` |

La segunda es la que importa para gobernanza: significa que el sistema de IA que
figura en el inventario **ya no es el que describe su dossier técnico**.

**Si no está vinculado**, publica un descubrimiento — uno por modelo, no por
versión. Lo que hay que decidir es si ese modelo es un sistema de IA de la
organización, no cada una de sus versiones.

## Cómo se vincula un modelo con un sistema

**La vía normal**: en *Inventario → Descubrimientos*, el modelo aparece como
pendiente y se resuelve con *Vincular / Crear sistema / Ignorar*. A partir de la
siguiente pasada, el conector lo trata como vinculado y empieza a publicar
señales en la cronología de ese sistema. No hay que tocar nada en MLflow.

**El atajo**: una etiqueta en MLflow, en el modelo registrado o en una versión
concreta.

```
fluxion.system_id = <uuid del sistema en Fluxion>
```

Tiene **prioridad** sobre la conciliación de la aplicación, porque es una
declaración explícita de quien administra MLflow. Útil para poblar de golpe un
registro grande, no para el día a día.

## No guarda estado

En cada pasada reenvía el registro completo. El Core descarta lo conocido:

- Las señales, por `dedupe_key`: `mlflow:<modelo>:v<version>` y `…:production`.
- Los descubrimientos, por `(organización, módulo, external_id)`.

Eso lo hace reiniciable, redesplegable y reproducible sin volumen ni base de
datos propia. Y una decisión ya tomada en la aplicación nunca se revierte por
mucho que el conector siga viendo el mismo modelo cada cinco minutos.

## Configuración

En Dokploy solo van las credenciales de arranque:

| Variable | Oblig. | Notas |
|---|:--:|---|
| `FLUXION_API_URL` | ✅ | `https://fluxion-ai.es` |
| `FLUXION_API_KEY` | ✅ | Con `signals:write`, `inventory:write` y `connectors:sync` |
| `RUN_ONCE` | | `true` para una pasada y salir. Útil para probar |

El resto —URL de MLflow, credenciales, frecuencia— se gestiona en
**Ajustes → Conectores**, se guarda cifrado en Supabase Vault y el conector lo
pide al arrancar cada pasada.

### Respaldo por entorno

Si el Core no devuelve ninguna conexión —o la clave no tiene `connectors:sync`—
el conector cae a `MLFLOW_TRACKING_URI`, `MLFLOW_USERNAME` y `MLFLOW_PASSWORD`.
Existe para que un despliegue anterior no se rompa durante la migración; en
cuanto la configuración esté en la aplicación, conviene quitarlas.

## Despliegue

Servicio en Dokploy con **contexto de build en la raíz** del monorepo:

```
Docker File          services/connector-mlflow/Dockerfile
Docker Context Path  .
```

El módulo debe estar activo para la organización, o la pantalla de
Descubrimientos no aparece en la navegación:

```sql
INSERT INTO fluxion.organization_modules (organization_id, module_key, status)
VALUES ('<org>', 'connector-mlflow', 'enabled')
ON CONFLICT (organization_id, module_key) DO UPDATE SET status = 'enabled';
```

## Probar sin desplegar

Desde la raíz del monorepo:

```bash
export PYTHONPATH="$PWD/packages/py-common:$PWD/services/connector-mlflow"
pip install -r services/connector-mlflow/requirements.txt

export FLUXION_API_URL=https://fluxion-ai.es
export FLUXION_API_KEY=flx_...
export RUN_ONCE=true

python -m fluxion_connector_mlflow.main
```

Arranca comprobando la credencial contra `/api/ingest/v1/ping`: si la clave está
mal, falla en el primer segundo en lugar de a las tres horas.

## Cómo saber si funciona

*Ajustes → Conectores* muestra el estado de cada conexión y el historial de las
últimas sincronizaciones, con sus contadores y el mensaje de error si lo hubo. No
hace falta abrir los logs del contenedor — que es justo lo que un cliente no
puede hacer.

## Lo que no hace

No crea sistemas en el inventario por su cuenta. Un inventario de cumplimiento
que se autopuebla sin que nadie lo confirme no es evidencia de nada: la creación
pasa siempre por la pantalla de Descubrimientos.
