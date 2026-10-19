---
id: NEG-HOJA-RUTA
titulo: Hoja de ruta
tipo: negocio
modulo: transversal
audiencia: comercial
version: 0.1
fuente:
  - docs/_inventario.md
  - apps/web/lib/modules/registry.ts
  - apps/web/lib/outbox/events.ts
  - apps/web/lib/auth/scopes.ts
  - recursos/agent4_assistant_spec.md
  - recursos/baseline/rag_corpus.manifest.json
---

# Hoja de ruta

Funcionalidades y módulos de Fluxion que están decididos pero aún no disponibles. Sirve para responder
qué viene después y para no presentar como existente lo que todavía no lo es.

> **Pendiente de definir.** Fechas y prioridades. Ninguna funcionalidad de esta lista tiene fecha
> comprometida.

## Propósito

Recoger en un solo lugar la evolución prevista del producto, agrupada por área, con la base que ya
existe en la plataforma para cada funcionalidad.

## Problema que resuelve

Evita dos riesgos comerciales: prometer lo que no existe y no saber explicar lo que viene. Cada
funcionalidad de esta lista está marcada en los documentos de su módulo como *Pendiente de
implementar*.

## Roles

No aplica: la hoja de ruta no se ejecuta dentro de la aplicación. Cada funcionalidad, una vez
disponible, tendrá los roles que se describan en el documento de su módulo.

## Flujo de trabajo

Las funcionalidades se agrupan por área. La columna «Base» indica lo que ya existe y sobre lo que se
construirá.

### Nuevos módulos

| Módulo | Qué aportará | Base |
|---|---|---|
| Evaluación de calidad | Calidad de los sistemas basados en recuperación de información | Ninguna; hoy el módulo de coste y uso solo mide coste y latencia |
| Deriva y equidad | Desplazamiento de datos, caída de rendimiento y sesgos. Formará parte de la [Supervisión post-comercialización](../glosario.md#supervisión-post-comercialización) | Ninguna |
| Integración ITSM | Sincronización de incidentes con Jira, ServiceNow y otras herramientas | Registro de incidentes del Core |
| Linaje de datos y modelos | Recorrido de los datos hasta el modelo y propagación de obligaciones | Ninguna |
| AI Gateway | Control de prompts y respuestas: inyecciones, datos personales y contenido tóxico | Ninguna |
| Paquetes de auditoría | Exportación conjunta de la información de un sistema o de la organización para auditoría | [Instantáneas](../glosario.md#instantánea) e informes del sistema |

### Inteligencia artificial en el producto

| Funcionalidad | Qué aportará | Base |
|---|---|---|
| [Generador de documentos](../glosario.md#generador-de-documentos) | Redacción automática de los documentos regulatorios | Plantillas y exportación a PDF; idioma y pie de página ya configurables en la organización |
| Revisión IA de la [priorización](../glosario.md#priorización) | Propuesta de qué modos de fallo evaluar primero | El modelo de datos ya admite priorizaciones de origen IA |
| Generación IA en la evaluación de impacto | Propuesta de contenido para las secciones de la AISIA | Registro previsto de cada generación |
| Refinamiento IA en la ficha del sistema | Opción «Refinar mediante IA» | Marcada como próximamente en la aplicación |
| Clasificación automática | Reclasificación sin intervención | Marcada como «Fase 2» en la aplicación |
| Modelo configurable por organización | Que cada organización elija el modelo de IA que usa Fluxion | Hoy se usa GPT de OpenAI para todas |

> TODO: confirmar el alcance de «Refinar mediante IA» y de la clasificación automática; en la
> aplicación solo aparecen como etiquetas.

### Gobierno y riesgo

| Funcionalidad | Qué aportará | Base |
|---|---|---|
| Sesiones de comité y actas | Convocatoria, orden del día, asistentes, decisiones y acta de cada sesión de [comité](../glosario.md#comité) | Comités ya constituibles; plantilla de acta |
| Disparadores de reevaluación | Reabrir automáticamente el análisis de modos de fallo ante un incidente, un cambio del sistema, un cambio normativo o un vencimiento | Modelo de datos previsto |
| Niveles de aprobación | Definición de quién aprueba en cada [nivel de aprobación](../glosario.md#nivel-de-aprobación) | Nivel calculado según la zona de riesgo |
| Aviso de escalado | Aviso al aprobador cuando se escala una revisión de aceptación | Revisión periódica de acciones aceptadas |

### Catálogo y conocimiento

| Funcionalidad | Qué aportará | Base |
|---|---|---|
| Catálogo por organización | Cada organización mantiene su copia del [catálogo de tablas básicas](../glosario.md#catálogo-de-tablas-básicas), parte del [catálogo estándar de Fluxion](../glosario.md#catálogo-estándar-de-fluxion) y recibe sus actualizaciones como oferta, que el administrador acepta o rechaza | Catálogo único compartido |
| Documentos propios en el corpus | Que el Asistente SGAI consulte también las políticas y documentos de la organización | Estructura de datos prevista |
| Actualización del corpus normativo | Herramienta independiente para incorporar nueva normativa y guías al [corpus normativo](../glosario.md#corpus-normativo) | Requisitos ya definidos |

### Plataforma

| Funcionalidad | Qué aportará | Base |
|---|---|---|
| Recuperación de contraseña | Restablecer la contraseña desde el inicio de sesión | Enlace presente, sin funcionalidad |
| Política de seguridad de la organización | Verificación en dos pasos obligatoria, dominios de correo permitidos y caducidad de sesión | Ajustes ya configurables |
| Varias organizaciones por persona | Selector de organización | Una persona ya puede pertenecer a varias |
| Facturación y planes | Contratación de módulos y planes desde la aplicación | Planes Starter, Pro y Enterprise definidos, sin contenido |
| Avisos por correo | Envío por correo de los avisos según las preferencias de cada persona | Preferencias ya configurables; servicio de correo integrado |
| Avisos de caducidad de evidencias | Aviso a los responsables cuando una evidencia va a caducar | Alertas de caducidad calculadas a diario |
| Más eventos en webhooks | Evaluaciones, brechas, sistemas nuevos y cambios de miembros | Eventos de aprobaciones y tareas ya disponibles |
| API de consulta | Lectura de señales e inventario por API | Permisos de lectura ya definidos en las claves API |
| Más idiomas | Interfaz en otros idiomas | Marcado como próximamente en el perfil |

## Relación normativa

| Norma | Referencia | Funcionalidad prevista |
|---|---|---|
| AI Act | Art. 72 | Deriva y equidad, dentro de la vigilancia poscomercialización |
| AI Act | Art. 73 | Integración ITSM de incidentes |
| AI Act | Art. 9.2 | Disparadores de reevaluación: gestión de riesgos como proceso iterativo durante todo el ciclo de vida |
| ISO/IEC 42001 | §9.3 | Sesiones de la Revisión por la Dirección y sus actas |
| ISO/IEC 42001 | §9.2 | Paquetes de auditoría como apoyo a la auditoría interna |

## Módulos relacionados

- [Módulos y planes](modulos-y-planes.md): módulos disponibles hoy.
- [Visión general](vision-general.md): recorrido actual del producto.
- [Plataforma](plataforma.md): funcionalidades comunes y sus pendientes.
