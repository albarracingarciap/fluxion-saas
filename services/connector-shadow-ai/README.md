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

## Ficheros que enumeran proveedores

Si un fichero menciona **cuatro o más** proveedores distintos, el escáner lo
trata como una lista y no como una integración: emite un único hallazgo
informativo en lugar de uno de severidad alta por cada dominio.

Una aplicación real habla con uno o dos proveedores. Diez dominios en el mismo
fichero son un analizador de seguridad, una lista de bloqueo, documentación
comparando modelos… o el catálogo de este mismo escáner, que fue lo que delató
el problema: al escanear el repositorio de Fluxion se encontró a sí mismo y
generó diez hallazgos de severidad alta sobre `patterns.py`.

No se descarta en silencio. Si es un catálogo legítimo, quien lo revise lo
descarta en dos segundos; y si la aplicación de verdad habla con diez
proveedores, el hallazgo sigue ahí.

Se ajusta con `UMBRAL_CATALOGO`.

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

## Topes y presupuesto de peticiones

- Manifiestos: todos
- Código: `MAX_FICHEROS_CODIGO` ficheros (120 por omisión), los más pequeños
  primero, hasta `MAX_BYTES_FICHERO`
- Ficheros de modelo: por extensión, sin abrirlos

Se priorizan los ficheros pequeños porque es donde suele estar la configuración
y las claves.

**GitHub limita a 5.000 peticiones por hora** y cada fichero leído es una. El
escáner lleva la cuenta con la cabecera `x-ratelimit-remaining` y **para cuando
quedan menos de `RESERVA_PETICIONES`** (500 por omisión), reportando la pasada
como `partial` en vez de estrellarse.

La reserva existe porque agotar el límite no solo rompe la pasada: deja sin API
a cualquier otra cosa que use ese token durante el resto de la hora.

Lo que quede sin revisar entra en la siguiente pasada.

⚠️ **No reinicies el contenedor con `docker restart`.** Es una tarea de Swarm
gestionada por Dokploy: reiniciarla a mano hace que Swarm cree reemplazos y deja
las anteriores vivas, con varias copias escaneando a la vez y agotando el límite
entre todas. Usa **Redeploy** en el panel.

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
