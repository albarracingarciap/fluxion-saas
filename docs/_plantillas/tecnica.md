---
id: TEC-<TEMA>                   # id del documento en docs/_mapa.md
titulo: <Título>
tipo: tecnica
modulo: <slug-del-modulo | transversal>  # slug de docs/_mapa.md §0
audiencia: tecnica
version: 0.1
fuente:
  - <ruta/al/fichero/fuente>     # código, migraciones, Dockerfiles, configuración
---

# <Título>

<!-- Audiencia: desarrollo e integración. Precisión técnica: nombres de código en `código` y sin
     traducir, rutas de fichero exactas. Nunca valores de secretos ni URLs internas: usa ejemplos
     ficticios. Si una sección no aplica, escribe «No aplica». Marcas: > TODO: confirmar … ·
     > **Pendiente de implementar.** … · > **Pendiente de definir.** … -->

## Componentes

<!-- Piezas que intervienen (servicios, rutas, server actions, librerías internas, tareas
     programadas), dónde viven en el repositorio y qué responsabilidad tiene cada una. Incluye un
     diagrama Mermaid del flujo principal si aporta. -->

| Componente | Ubicación | Responsabilidad |
|---|---|---|
|  |  |  |

## Modelo de datos

<!-- Tablas, vistas, enums y funciones SQL implicados: columnas clave, relaciones, restricciones,
     triggers y migración que los crea. Indica cómo se aíslan los datos por organización. -->

| Objeto | Tipo | Campos clave | Migración |
|---|---|---|---|
|  |  |  |  |

## API

<!-- Interfaces que expone o consume: endpoints (método, ruta, autenticación, entrada, salida,
     errores), server actions, eventos de outbox o señales. Incluye un ejemplo de petición y respuesta
     con datos ficticios. -->

| Método | Ruta / función | Autenticación | Descripción |
|---|---|---|---|
|  |  |  |  |

## Dependencias

<!-- Servicios internos (agents, renderer, telemetry…) y externos (Supabase, MinIO, OpenAI, Voyage,
     Resend…) de los que depende, para qué y qué ocurre si no están disponibles. Incluye librerías
     relevantes con su versión. -->

- <Dependencia>: <uso>

## Seguridad

<!-- Autenticación, autorización (roles, políticas RLS, scopes de clave API), aislamiento entre
     organizaciones y tratamiento de datos sensibles. Señala lo que aplica el código y lo que depende
     de la configuración. -->

## Configuración

<!-- Variables de entorno, parámetros y valores por defecto necesarios para que funcione, indicando
     dónde se definen (Dokploy, .env.local, base de datos). Sin valores reales. -->

| Variable | Obligatoria | Valor por defecto | Descripción |
|---|---|---|---|
|  |  |  |  |
