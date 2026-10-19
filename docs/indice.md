---
id: GEN-INDICE
titulo: Índice de la documentación
tipo: indice
modulo: transversal
audiencia: comercial, tecnica
version: 0.1
fuente:
  - docs/_mapa.md
---

# Índice de la documentación

Punto de entrada a la documentación de Fluxion. Hay tres tipos de documento:

| Tipo | Para quién | Qué encontrarás |
|---|---|---|
| [Negocio](#negocio) | Comerciales, clientes y responsables de cumplimiento | Qué hace cada módulo, qué problema resuelve y su relación con el AI Act y la ISO/IEC 42001 |
| [Funcional](#funcional) | Técnicos que configuran, soportan o enseñan la aplicación | Cada vista de la aplicación: acceso, permisos, campos, acciones y estados |
| [Técnica](#técnica) | Desarrollo, integración y operación | Arquitectura, modelo de datos, API, seguridad y despliegue |

Antes de leer cualquier documento, consulta el **[Glosario](glosario.md)**. Recoge la terminología
oficial que usan todos.

Los documentos que aún no se han redactado aparecen sin enlace y con la marca *pendiente*. El estado
de cada uno está en [`_mapa.md`](_mapa.md).

## Negocio

### Visión general

- [Visión general de Fluxion](negocio/vision-general.md): qué es, qué problema resuelve y recorrido completo
- [Módulos y planes](negocio/modulos-y-planes.md): Core, módulos contratables, activación y planes
- [Plataforma](negocio/plataforma.md): organización, miembros, roles, comités, avisos e integraciones
- [Hoja de ruta](negocio/hoja-de-ruta.md): módulos y funcionalidades previstos

### Core

- [Inventario de sistemas de IA](negocio/inventario.md)
- [Clasificación AI Act](negocio/clasificacion-ai-act.md)
- [Obligaciones](negocio/obligaciones.md)
- [Análisis de modos de fallo (FMEA)](negocio/analisis-modos-de-fallo.md)
- [Plan de tratamiento](negocio/plan-de-tratamiento.md)
- [Análisis de brechas](negocio/brechas.md)
- [Biblioteca de evidencias](negocio/biblioteca-evidencias.md)
- [Declaración de Aplicabilidad ISO 42001](negocio/declaracion-aplicabilidad.md)
- [Informes del sistema](negocio/informes-del-sistema.md)
- [Incidentes](negocio/incidentes.md)
- [Flujos de aprobación](negocio/flujos-de-aprobacion.md)
- [Tareas](negocio/tareas.md)
- [Asistente SGAI](negocio/asistente-sgai.md)
- [Catálogo de tablas básicas](negocio/catalogo-tablas-basicas.md)

### Módulos contratables

- [Descubrimiento de inventario](negocio/descubrimiento-inventario.md)
- [Coste y uso de IA (FinOps)](negocio/coste-uso-ia.md)
- [Supervisión post-comercialización](negocio/supervision-post-comercializacion.md)
- [Documentación del sistema](negocio/documentacion-del-sistema.md)
- [Actas y paquetes de auditoría](negocio/actas-y-auditoria.md)
- [Evaluación de impacto](negocio/evaluacion-de-impacto.md)

## Funcional

### Flujo completo

- [Flujo completo, del onboarding al sistema evaluado](funcional/flujo-completo-evaluacion.md): recorrido de punta a punta con aprobaciones, evidencias y gaps

### Acceso y plataforma

- [Inicio de sesión](funcional/login.md)
- [Registro](funcional/registro.md)
- [Onboarding](funcional/onboarding.md)
- [Dashboard](funcional/dashboard.md)
- [Navegación (menú lateral, barra superior y avisos globales)](funcional/navegacion.md)
- [Notificaciones](funcional/notificaciones.md)
- [Perfil](funcional/perfil.md)
- [Organización](funcional/organizacion.md)
- [Usuarios](funcional/usuarios.md)
- [Ajustes](funcional/ajustes.md)

### Inventario y clasificación

- [Inventario](funcional/inventario.md)
- [Alta de sistema](funcional/inventario-alta.md)
- [Ficha del sistema](funcional/ficha-sistema.md)
- [Edición de la ficha del sistema](funcional/ficha-sistema-edicion.md)
- [Sistemas detectados (descubrimientos)](funcional/descubrimientos.md)

### Riesgo y tratamiento

- [Evaluaciones](funcional/evaluaciones.md)
- [Evaluación FMEA](funcional/fmea-evaluacion.md)
- [Comparativa FMEA](funcional/fmea-comparativa.md)
- [Plan de tratamiento](funcional/plan-de-tratamiento.md)
- [Planes de tratamiento](funcional/planes-de-tratamiento.md)
- [Revisiones pendientes](funcional/revisiones-pendientes.md)
- [Análisis de brechas](funcional/brechas.md)
- [Brechas excluidas](funcional/brechas-excluidas.md)
- [Instantáneas de brechas](funcional/brechas-instantaneas.md)

### Evidencias, cumplimiento e informes

- [Biblioteca de evidencias](funcional/evidencias.md)
- [Detalle de evidencia](funcional/evidencia-detalle.md)
- [Declaración de Aplicabilidad ISO 42001](funcional/declaracion-aplicabilidad.md)
- [Dossier técnico](funcional/dossier-tecnico.md)
- [Ficha para el registro UE](funcional/registro-ue.md)
- [Informe de brechas del sistema](funcional/informe-brechas-sistema.md)
- [Expediente documental](funcional/expediente-documental.md)
- [Evaluación de impacto del sistema de IA (AISIA)](funcional/aisia.md)
- [Riesgos de negocio](funcional/riesgos-negocio.md)
- [Cuestionarios preliminares](funcional/cuestionario-preliminar.md)
- [Formulario del cuestionario preliminar](funcional/cuestionario-preliminar-formulario.md)

### Operación diaria

- [Incidentes](funcional/incidentes.md)
- [Detalle de incidente](funcional/incidente-detalle.md)
- [Aprobaciones](funcional/aprobaciones.md)
- [Supervisión humana](funcional/supervision-humana.md)
- [Coste y uso de IA](funcional/coste-uso-ia.md)
- [Tarifas de modelos](funcional/tarifas-modelos.md)
- [Presupuestos de IA](funcional/presupuestos.md)
- [Tareas](funcional/tareas.md)
- [Kanban](funcional/kanban.md)
- [Calendario de tareas](funcional/tareas-calendario.md)
- [Métricas de tareas](funcional/tareas-metricas.md)
- [Plantillas de tareas](funcional/tareas-plantillas.md)
- [Tareas recurrentes](funcional/tareas-recurrentes.md)
- [Asistente SGAI](funcional/asistente-sgai.md)

### Catálogo de tablas básicas

- [Catálogo de tablas básicas](funcional/catalogo.md)
- [Modos de fallo](funcional/catalogo-modos-de-fallo.md)
- [Controles (medidas)](funcional/catalogo-medidas.md)
- [Tipos de evidencia](funcional/catalogo-tipos-de-evidencia.md)
- [Obligaciones](funcional/catalogo-obligaciones.md)
- [Relación obligación-evidencia](funcional/catalogo-obligacion-evidencia.md)
- [Relación modo de fallo-control](funcional/catalogo-modo-medida.md)
- [Relaciones causales](funcional/catalogo-relaciones-causales.md)
- [Grafo causal](funcional/catalogo-grafo-causal.md)

## Técnica

### Visión general

- [Arquitectura](tecnica/arquitectura.md): componentes, comunicación, despliegue e integraciones
- [Modelo de datos](tecnica/modelo-datos.md): esquemas, entidades y relaciones, con diagramas ER
- [Seguridad](tecnica/seguridad.md): autenticación, autorización, RLS, credenciales, secretos y trazabilidad

### API e integración

- [API de ingesta](tecnica/api-ingesta.md): endpoints, scopes, señales y cliente Python
- [API interna](tecnica/api-interna.md): route handlers de la interfaz y proxys al servicio de agentes
- [Webhooks salientes](tecnica/webhooks-salientes.md): catálogo de eventos, firma y reintentos
- [Eventos y avisos](tecnica/eventos-y-avisos.md): señales, avisos en la app, correo, canales y webhooks
- [Conectores](tecnica/conectores.md): MLflow, detección de IA no declarada y cómo escribir uno
- [Telemetría](tecnica/telemetria.md): ingesta OTLP, coste y agregados

### Servicios

- [Servicio de agentes](tecnica/servicio-agentes.md): clasificación AI Act (motor de reglas y agente de IA) y asistente
- [RAG y corpus normativo](tecnica/rag.md): corpus, búsqueda vectorial y recuperación
- [Generación de PDF](tecnica/generacion-pdf.md): renderer, composición HTML y registro inmutable
- [Almacenamiento de ficheros](tecnica/almacenamiento-ficheros.md): MinIO/S3, Supabase Storage y copias de seguridad

### Operación

- [Tareas programadas](tecnica/tareas-programadas.md): crontab, pg_cron y app-cron.sh
- [Configuración](tecnica/configuracion.md): variables de entorno por componente
- [Despliegue](tecnica/despliegue.md): Dokploy, Supabase autoalojado, MinIO y migraciones
- [Copias de seguridad](tecnica/copias-de-seguridad.md): Postgres, MinIO, copia externa y restauración
- [Herramientas internas](tecnica/herramientas-internas.md): comprobaciones estáticas y scripts de desarrollo

## Referencia

- [Glosario](glosario.md): terminología oficial
- [Componentes de terceros y licencias](legal/componentes-de-terceros.md)
- [Contrato de la API de ingesta (versión anterior)](ingesta.md): sustituido por [API de ingesta](tecnica/api-ingesta.md)

### Especificaciones de producto

- [Cuestionario preliminar: reglas de clasificación AI Act y volcado al alta](producto/cuestionario-preliminar-reglas.md)
- [Plan de resolución de gaps y simplificación del flujo de evaluación](producto/plan-resolucion-gaps.md)
- [Registro de cambios del plan de resolución de gaps](producto/registro-de-cambios.md)

### Ficheros de control (equipo de documentación)

- [`CLAUDE.md`](../CLAUDE.md): reglas de redacción y flujo de trabajo
- [`_inventario.md`](_inventario.md): inventario revisado y decisiones de alcance
- [`_mapa.md`](_mapa.md): plan de documentos y su estado
- [`_pendientes.md`](_pendientes.md): puntos pendientes de confirmar
- [`_incidencias.md`](_incidencias.md): errores, incongruencias y carencias detectados, agrupados y priorizados
- [`_plantillas/`](_plantillas/): plantillas de negocio, vista y técnica
