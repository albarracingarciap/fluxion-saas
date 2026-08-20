# fluxion-connector-shadow-ai

Escanea los repositorios de GitHub o GitLab de la organización y **propone** los
que contienen IA. No los mete en el inventario: los deja en la bandeja de
descubrimientos, igual que el conector de MLflow.

## Lo que no hace

**No almacena código fuente.** Se guarda qué patrón casó, en qué fichero y en
qué línea. Nada más.

**No almacena el valor de una credencial encontrada.** Ni completo, ni truncado,
ni en hash. Un hash parece inofensivo hasta que alguien lo compara contra un
diccionario de claves filtradas, y para lo que sirve el hallazgo —rotarla y
sacarla del repositorio— el valor no aporta nada.

## Qué detecta

| Tipo | De dónde | Ejemplo |
|---|---|---|
| `library` | Manifiestos de dependencias | `langchain` en `requirements.txt:12` |
| `endpoint` | Código | `api.openai.com` en `src/agent.py:88` |
| `model_file` | Extensiones | `modelo.onnx` |
| `credential` | Código | Clave con forma de OpenAI en `.env:3` |

Las librerías declaradas son la señal más fiable: una dependencia declarada no
es una sospecha, es un hecho. Por eso los manifiestos se leen siempre y el
código se escanea con tope.

## Configuración de la conexión

En **Ajustes → Conectores**, tipo `github` o `gitlab`:

| Campo | Valor |
|---|---|
| `base_url` | `https://api.github.com` o `https://gitlab.com` |
| **usuario** | **La organización o grupo a escanear** |
| `auth_type` | `token` |
| secreto | Token de **solo lectura** |

⚠️ El campo `username` guarda la organización, no un usuario. Es un compromiso:
`connector_connections` no tenía columna para esto y añadir una solo por esto no
compensaba. Está documentado aquí y en el código para que no sorprenda.

Permisos del token: en GitHub, `repo` en modo lectura (o `public_repo` si solo
hay repositorios públicos); en GitLab, `read_api` y `read_repository`. **Nunca
uno con escritura**: el escáner no la necesita, y una credencial que no puede
escribir no puede ser usada para escribir si se filtra del contenedor.

## Variables del servicio

```
FLUXION_API_URL=https://fluxion-ai.es
FLUXION_API_KEY=flx_<clave con inventory:write, signals:write y connectors:sync>
POLL_INTERVAL_SECONDS=86400
RUN_ONCE=false
```

Un día de intervalo, no quince minutos como MLflow: el código de una
organización no cambia tanto, y cada pasada consume presupuesto de peticiones
del proveedor.

## Topes por repositorio

- Manifiestos: todos
- Código: **300 ficheros**, los más pequeños primero, hasta 200 KB cada uno
- Ficheros de modelo: por extensión, sin abrirlos

Un monorepo con veinte mil ficheros agotaría el límite de peticiones y tardaría
horas para no decir nada nuevo. Se priorizan los ficheros pequeños porque es
donde suele estar la configuración y las claves.

Cuando el escaneo es parcial, queda en el log del servicio.

## Despliegue en Dokploy

| Campo | Valor |
|---|---|
| Contexto de build | **raíz del monorepo** |
| Dockerfile | `services/connector-shadow-ai/Dockerfile` |
| Dominio | **ninguno** |

No lleva dominio: nadie le habla, él habla al Core.

## Prueba

Con `RUN_ONCE=true` hace una pasada y sale, que es lo cómodo para probar contra
tu propio repositorio antes de dejarlo en marcha.

```bash
docker logs $(docker ps -aqf name=shadow-ai) --tail 40
```

Y en la aplicación: **Inventario → Descubrimientos**, con los repositorios
encontrados y sus hallazgos.

Si aparece una señal crítica de credencial expuesta, recuerda que **el historial
de Git conserva lo borrado**: no basta con quitar la clave en un commit nuevo,
hay que rotarla.
