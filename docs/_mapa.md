# Mapa de documentación

| Versión | Fecha | Estado | Cambios |
|---|---|---|---|
| **2.0** | **2026-10-14** | Borrador, pendiente de validar | Rehecho con la estructura de `CLAUDE.md`: `negocio/` (uno por módulo), `funcional/` (uno por vista) y `tecnica/`. Una audiencia por documento. Base: `docs/_inventario.md` v1.4 |
| 1.3 | 2026-10-14 | Sustituida | Estructura anterior por áreas (guía, referencia, arquitectura…) con audiencias mezcladas |

> Plan de los documentos de la Fase 2. Las reglas de redacción, las plantillas y el flujo de trabajo están
> en [`CLAUDE.md`](../CLAUDE.md), sección «Documentación». Solo se generan los documentos que figuran aquí.
> Los nombres usan el glosario (`_inventario.md` §9) y los módulos la estructura objetivo (§10).
>
> No se documentan las rutas sin uso, el código muerto ni las tablas legacy (`_inventario.md` §11.1-§11.3).

- **Tipos y audiencias:** `negocio` → comercial · `funcional` → técnica · `tecnica` → técnica.
- **Estados:** `pendiente` → `borrador` (generado por Claude) → `revisado` (lo asigna el responsable).
- **Ficheros fuente** (abreviaturas):

  | Abreviatura | Ruta |
  |---|---|
  | `(app)/` | `apps/web/app/(app)/` |
  | `(auth)/` | `apps/web/app/(auth)/` |
  | `api/` | `apps/web/app/api/` |
  | `lib/` | `apps/web/lib/` |
  | `components/` | `apps/web/components/` |
  | `mig/` | `supabase/migrations/` |

  Las demás rutas son relativas a la raíz del repo.

## 0. Módulos (slug del front-matter)

| Slug | Módulo (nombre de negocio) | Disponibilidad |
|---|---|---|
| `transversal` | Plataforma (navegación, organización, usuarios, avisos) | Core |
| `inventario` | Inventario de sistemas de IA | Core |
| `clasificacion-ai-act` | Clasificación AI Act | Core |
| `obligaciones` | Obligaciones | Core |
| `analisis-modos-de-fallo` | Análisis de modos de fallo (FMEA) | Core |
| `plan-de-tratamiento` | Plan de tratamiento | Core |
| `brechas` | Análisis de brechas | Core |
| `biblioteca-evidencias` | Biblioteca de evidencias | Core |
| `declaracion-aplicabilidad` | Declaración de Aplicabilidad ISO 42001 | Core |
| `informes-del-sistema` | Informes del sistema (dossier técnico, registro UE, informe de brechas) | Core |
| `incidentes` | Incidentes (Art. 73) | Core |
| `flujos-de-aprobacion` | Flujos de aprobación | Core (todos los planes) |
| `tareas` | Tareas | Core |
| `asistente-sgai` | Asistente SGAI | Core |
| `catalogo-tablas-basicas` | Catálogo de tablas básicas | Core |
| `descubrimiento-inventario` | Descubrimiento de inventario (Conector MLflow, Detección de IA no declarada) | Módulo |
| `coste-uso-ia` | Coste y uso de IA (FinOps) | Módulo |
| `supervision-post-comercializacion` | Supervisión post-comercialización (Supervisión humana, Art. 14) | Módulo |
| `documentacion-del-sistema` | Documentación del sistema | Módulo |
| `actas-y-auditoria` | Actas y paquetes de auditoría | Módulo |
| `evaluacion-de-impacto` | Evaluación de impacto (AISIA, riesgos de negocio, cuestionario preliminar) | Módulo |

Evaluación de calidad, Integración ITSM, Linaje y AI Gateway no existen todavía: solo aparecen en la hoja de ruta.

## 1. Raíz

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| GEN-CLAUDE | `CLAUDE.md` | tecnica | tecnica | transversal | `README.md`, `recursos/db/README.md`, `tools/*.sh`, `apps/web/package.json`, `docs/_inventario.md` | borrador |
| GEN-INDICE | `docs/indice.md` | — (índice) | comercial, tecnica | transversal | `docs/_mapa.md` | borrador |
| GEN-GLOSARIO | `docs/glosario.md` | — (glosario) | comercial, tecnica | transversal | `docs/_inventario.md` §9, `lib/fmea/domain.ts`, `lib/fmea/treatment-plan.ts` | borrador |

## 2. Negocio (`docs/negocio/`, uno por módulo, audiencia comercial)

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| NEG-VISION | `docs/negocio/vision-general.md` | negocio | comercial | transversal | `README.md`, `docs/producto/*`, `docs/_inventario.md` §1 y §10, `lib/modules/registry.ts` | borrador |
| NEG-MODULOS-PLANES | `docs/negocio/modulos-y-planes.md` | negocio | comercial | transversal | `lib/modules/{registry,entitlements}.ts`, `(app)/organizacion/tabs/{modulos,plan}.tsx`, `docs/_inventario.md` §10 | borrador |
| NEG-PLATAFORMA | `docs/negocio/plataforma.md` | negocio | comercial | transversal | `(app)/organizacion/**`, `(app)/usuarios/**`, `lib/users/roles.ts`, `lib/types/auth.ts`, `lib/notifications/*`, `lib/channels/send.ts`, `lib/audit.ts` | borrador |
| NEG-INVENTARIO | `docs/negocio/inventario.md` | negocio | comercial | inventario | `(app)/inventario/{page.tsx,nuevo/*,[id]/page.tsx}`, `components/inventory/SystemWizard.jsx`, `lib/ai-systems/history.ts` | borrador |
| NEG-CLASIFICACION | `docs/negocio/clasificacion-ai-act.md` | negocio | comercial | clasificacion-ai-act | `components/classification/*`, `services/agents/fluxion_agents/{routes,prompts}/classification.py`, `recursos/panel_agente_1.md` | borrador |
| NEG-OBLIGACIONES | `docs/negocio/obligaciones.md` | negocio | comercial | obligaciones | `(app)/inventario/[id]/obligaciones/actions.ts`, `mig/20260904090000_obligaciones_ai_act.sql`, `mig/20260911090000_rol_cadena_de_valor.sql`, `docs/producto/obligaciones-ai-act.csv` | borrador |
| NEG-FMEA | `docs/negocio/analisis-modos-de-fallo.md` | negocio | comercial | analisis-modos-de-fallo | `lib/fmea/domain.ts`, `lib/failure-modes/activation-engine.ts`, `lib/causal-graph/*`, `docs/producto/{circuito,dos-universos-de-riesgo,flujo-completo}.md` | borrador |
| NEG-PLAN-TRATAMIENTO | `docs/negocio/plan-de-tratamiento.md` | negocio | comercial | plan-de-tratamiento | `lib/fmea/treatment-plan.ts`, `lib/treatment-plans/*`, `docs/producto/plan-de-accion.md` | borrador |
| NEG-BRECHAS | `docs/negocio/brechas.md` | negocio | comercial | brechas | `lib/gaps/*`, `(app)/gaps/page.tsx` | borrador |
| NEG-EVIDENCIAS | `docs/negocio/biblioteca-evidencias.md` | negocio | comercial | biblioteca-evidencias | `lib/evidences/*`, `(app)/evidencias/page.tsx` | borrador |
| NEG-SOA | `docs/negocio/declaracion-aplicabilidad.md` | negocio | comercial | declaracion-aplicabilidad | `(app)/plantillas/soa-iso42001/*`, `lib/templates/iso42001-catalog.ts` | borrador |
| NEG-INFORMES | `docs/negocio/informes-del-sistema.md` | negocio | comercial | informes-del-sistema | `lib/ai-systems/{technical-dossier,eu-registry,gap-report}.ts` | borrador |
| NEG-INCIDENTES | `docs/negocio/incidentes.md` | negocio | comercial | incidentes | `(app)/incidentes/**`, `mig/20260818170000_incidents_core.sql` | borrador |
| NEG-APROBACIONES | `docs/negocio/flujos-de-aprobacion.md` | negocio | comercial | flujos-de-aprobacion | `lib/approvals/*`, `docs/modulos/c3-aprobaciones.md`, `mig/20260831090000_approvals_core.sql` | borrador |
| NEG-TAREAS | `docs/negocio/tareas.md` | negocio | comercial | tareas | `lib/tasks/*`, `components/tasks/*` | borrador |
| NEG-ASISTENTE | `docs/negocio/asistente-sgai.md` | negocio | comercial | asistente-sgai | `components/assistant/*`, `recursos/agent4_assistant_spec.md` | borrador |
| NEG-CATALOGO | `docs/negocio/catalogo-tablas-basicas.md` | negocio | comercial | catalogo-tablas-basicas | `mig/00000000000005_seed_compliance.sql`, `recursos/modos_de_fallo/*.json`, `recursos/relaciones_causales/*.json`, `docs/_inventario.md` §14.1 | borrador |
| NEG-DESCUBRIMIENTO | `docs/negocio/descubrimiento-inventario.md` | negocio | comercial | descubrimiento-inventario | `services/connector-mlflow/README.md`, `services/connector-shadow-ai/README.md`, `docs/modulos/a2-shadow-ai.md` | borrador |
| NEG-COSTE-USO | `docs/negocio/coste-uso-ia.md` | negocio | comercial | coste-uso-ia | `lib/telemetry/data.ts`, `docs/modulos/b2-telemetria-finops.md` | borrador |
| NEG-SUPERVISION | `docs/negocio/supervision-post-comercializacion.md` | negocio | comercial | supervision-post-comercializacion | `lib/hitl/data.ts`, `docs/modulos/c2-supervision-humana.md` | borrador |
| NEG-DOCUMENTACION | `docs/negocio/documentacion-del-sistema.md` | negocio | comercial | documentacion-del-sistema | `lib/documents/templates.ts`, `docs/modulos/c1-documentacion-regulatoria.md` | borrador |
| NEG-ACTAS | `docs/negocio/actas-y-auditoria.md` | negocio | comercial | actas-y-auditoria | `lib/approvals/minutes.ts`, `lib/documents/derive-approval.ts`, `mig/20260902090000_approval_minutes.sql` | borrador |
| NEG-IMPACTO | `docs/negocio/evaluacion-de-impacto.md` | negocio | comercial | evaluacion-de-impacto | `lib/documents/derive-aisia.ts`, `(app)/inventario/[id]/riesgos-negocio/*`, `(app)/cuestionario-preliminar/**`, `docs/modulos/aisia-auditoria.md` | borrador |
| NEG-HOJA-RUTA | `docs/negocio/hoja-de-ruta.md` | negocio | comercial | transversal | `docs/_inventario.md` §10, §11.4 y §12, `lib/modules/registry.ts` (`available: false`) | borrador |

## 3. Funcional (`docs/funcional/`, uno por vista, audiencia técnica)

Las pestañas y las subrutas de instantáneas se documentan dentro de su vista.

### 3.1 Acceso y plataforma

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-LOGIN | `docs/funcional/login.md` | funcional | tecnica | transversal | `(auth)/login/page.tsx`, `(auth)/actions.ts`, `lib/supabase/middleware.ts` | borrador |
| FUN-REGISTRO | `docs/funcional/registro.md` | funcional | tecnica | transversal | `(auth)/register/page.tsx`, `(auth)/actions.ts`, `mig/20260829090000_onboarding_nombre_y_modulos.sql` | borrador |
| FUN-ONBOARDING | `docs/funcional/onboarding.md` | funcional | tecnica | transversal | `(auth)/onboarding/*` | borrador |
| FUN-DASHBOARD | `docs/funcional/dashboard.md` | funcional | tecnica | transversal | `(app)/dashboard/*`, `lib/dashboard/data.ts` | borrador |
| FUN-NAVEGACION | `docs/funcional/navegacion.md` | funcional | tecnica | transversal | `components/layout/*`, `(app)/layout.tsx` | borrador |
| FUN-NOTIFICACIONES | `docs/funcional/notificaciones.md` | funcional | tecnica | transversal | `(app)/notificaciones/*`, `components/notifications/NotificationsBell.tsx` | borrador |
| FUN-PERFIL | `docs/funcional/perfil.md` | funcional | tecnica | transversal | `(app)/perfil/**`, `components/profile/*`, `api/user/upload-avatar/route.ts` | borrador |
| FUN-ORGANIZACION | `docs/funcional/organizacion.md` | funcional | tecnica | transversal | `(app)/organizacion/**`, `components/organization/LogoUpload.tsx`, `api/organization/upload-logo/route.ts`, `lib/organization/options.ts` | borrador |
| FUN-USUARIOS | `docs/funcional/usuarios.md` | funcional | tecnica | transversal | `(app)/usuarios/**`, `lib/users/roles.ts` | borrador |
| FUN-AJUSTES | `docs/funcional/ajustes.md` | funcional | tecnica | transversal | `(app)/ajustes/**`, `lib/channels/send.ts` | borrador |

### 3.2 Inventario y clasificación

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-INVENTARIO | `docs/funcional/inventario.md` | funcional | tecnica | inventario | `(app)/inventario/{page.tsx,systems-table-client.tsx}` | borrador |
| FUN-INVENTARIO-ALTA | `docs/funcional/inventario-alta.md` | funcional | tecnica | inventario | `(app)/inventario/nuevo/*`, `components/inventory/SystemWizard.jsx`, `components/questionnaire/*`, `lib/preliminary-questionnaire/to-wizard.ts` | borrador |
| FUN-FICHA-SISTEMA | `docs/funcional/ficha-sistema.md` | funcional | tecnica | inventario | `(app)/inventario/[id]/{page.tsx,system-detail-client.tsx,causal-map-canvas.tsx}`, `(app)/inventario/[id]/{obligaciones,modos-de-fallo,evidencias}/actions.ts`, `components/classification/*` | borrador |
| FUN-FICHA-EDICION | `docs/funcional/ficha-sistema-edicion.md` | funcional | tecnica | inventario | `(app)/inventario/[id]/editar/*` | borrador |
| FUN-DESCUBRIMIENTOS | `docs/funcional/descubrimientos.md` | funcional | tecnica | descubrimiento-inventario | `(app)/inventario/descubrimientos/*` | borrador |

### 3.3 Riesgo y tratamiento

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-EVALUACIONES | `docs/funcional/evaluaciones.md` | funcional | tecnica | analisis-modos-de-fallo | `(app)/evaluaciones/page.tsx`, `lib/evaluations/data.ts` | borrador |
| FUN-FMEA-EVALUAR | `docs/funcional/fmea-evaluacion.md` | funcional | tecnica | analisis-modos-de-fallo | `(app)/inventario/[id]/fmea/page.tsx`, `(app)/inventario/[id]/fmea/[evaluationId]/evaluar/*`, `(app)/inventario/[id]/fmea/[evaluationId]/exportar/route.ts`, `lib/fmea/{domain,data}.ts` | borrador |
| FUN-FMEA-COMPARAR | `docs/funcional/fmea-comparativa.md` | funcional | tecnica | analisis-modos-de-fallo | `(app)/inventario/[id]/fmea/[evaluationId]/comparar/*` | borrador |
| FUN-PLAN | `docs/funcional/plan-de-tratamiento.md` | funcional | tecnica | plan-de-tratamiento | `(app)/inventario/[id]/fmea/[evaluationId]/plan/*`, `lib/fmea/treatment-plan*.ts`, `lib/treatment-plans/*` | borrador |
| FUN-PLANES | `docs/funcional/planes-de-tratamiento.md` | funcional | tecnica | plan-de-tratamiento | `(app)/planes/{page.tsx,plans-view-client.tsx}` | borrador |
| FUN-REVISIONES | `docs/funcional/revisiones-pendientes.md` | funcional | tecnica | plan-de-tratamiento | `(app)/planes/revisiones-pendientes/*`, `components/layout/overdue-reviews-banner.tsx` | borrador |
| FUN-BRECHAS | `docs/funcional/brechas.md` | funcional | tecnica | brechas | `(app)/gaps/*.tsx`, `(app)/gaps/actions.ts`, `lib/gaps/*` | borrador |
| FUN-BRECHAS-EXCLUIDAS | `docs/funcional/brechas-excluidas.md` | funcional | tecnica | brechas | `(app)/gaps/excluded/page.tsx`, `(app)/gaps/export-excluded-csv-button.tsx` | borrador |
| FUN-BRECHAS-INSTANTANEAS | `docs/funcional/brechas-instantaneas.md` | funcional | tecnica | brechas | `(app)/gaps/snapshots/**`, `lib/gaps/compare.ts` | borrador |

### 3.4 Evidencias, cumplimiento e informes

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-EVIDENCIAS | `docs/funcional/evidencias.md` | funcional | tecnica | biblioteca-evidencias | `(app)/evidencias/{page.tsx,evidences-library-client.tsx,expiry-alerts-client.tsx,actions.ts}`, `lib/evidences/*` | borrador |
| FUN-EVIDENCIA-DETALLE | `docs/funcional/evidencia-detalle.md` | funcional | tecnica | biblioteca-evidencias | `(app)/evidencias/[id]/*`, `lib/evidences/{detail,versions}.ts` | borrador |
| FUN-SOA | `docs/funcional/declaracion-aplicabilidad.md` | funcional | tecnica | declaracion-aplicabilidad | `(app)/plantillas/soa-iso42001/*` | borrador |
| FUN-DOSSIER | `docs/funcional/dossier-tecnico.md` | funcional | tecnica | informes-del-sistema | `(app)/inventario/[id]/technical-dossier/**`, `lib/ai-systems/technical-dossier.ts` | borrador |
| FUN-REGISTRO-UE | `docs/funcional/registro-ue.md` | funcional | tecnica | informes-del-sistema | `(app)/inventario/[id]/eu-registry/**`, `lib/ai-systems/eu-registry.ts` | borrador |
| FUN-INFORME-BRECHAS | `docs/funcional/informe-brechas-sistema.md` | funcional | tecnica | informes-del-sistema | `(app)/inventario/[id]/gap-report/**`, `lib/ai-systems/gap-report.ts` | borrador |
| FUN-EXPEDIENTE | `docs/funcional/expediente-documental.md` | funcional | tecnica | documentacion-del-sistema | `(app)/inventario/[id]/expediente/[key]/*`, `lib/documents/*` | borrador |
| FUN-AISIA | `docs/funcional/aisia.md` | funcional | tecnica | evaluacion-de-impacto | `lib/documents/derive-aisia.ts`, `(app)/inventario/[id]/expediente/[key]/*`, `lib/aisia/soa-sync.ts` | borrador |
| FUN-RIESGOS-NEGOCIO | `docs/funcional/riesgos-negocio.md` | funcional | tecnica | evaluacion-de-impacto | `(app)/inventario/[id]/riesgos-negocio/*` | borrador |
| FUN-CUESTIONARIO | `docs/funcional/cuestionario-preliminar.md` | funcional | tecnica | evaluacion-de-impacto | `(app)/cuestionario-preliminar/{page.tsx,list-client.tsx,actions.ts}` | borrador |
| FUN-CUESTIONARIO-FORM | `docs/funcional/cuestionario-preliminar-formulario.md` | funcional | tecnica | evaluacion-de-impacto | `(app)/cuestionario-preliminar/{nuevo,[id]}/page.tsx`, `(app)/cuestionario-preliminar/{questionnaire-form.tsx,classification-panel.tsx}`, `lib/preliminary-questionnaire/{schema.ts,to-aiact.ts}`, `mig/20261022100000_cuestionario_clasificacion.sql` | borrador |

### 3.5 Operación diaria

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-INCIDENTES | `docs/funcional/incidentes.md` | funcional | tecnica | incidentes | `(app)/incidentes/{page.tsx,incidentes-client.tsx,deadline-clock.tsx,actions.ts}` | borrador |
| FUN-INCIDENTE-DETALLE | `docs/funcional/incidente-detalle.md` | funcional | tecnica | incidentes | `(app)/incidentes/[id]/*` | borrador |
| FUN-APROBACIONES | `docs/funcional/aprobaciones.md` | funcional | tecnica | flujos-de-aprobacion | `(app)/aprobaciones/*`, `lib/approvals/*` | borrador |
| FUN-SUPERVISION | `docs/funcional/supervision-humana.md` | funcional | tecnica | supervision-post-comercializacion | `(app)/supervision/page.tsx`, `lib/hitl/data.ts` | borrador |
| FUN-COSTE-USO | `docs/funcional/coste-uso-ia.md` | funcional | tecnica | coste-uso-ia | `(app)/observabilidad/page.tsx`, `lib/telemetry/data.ts` | borrador |
| FUN-TARIFAS | `docs/funcional/tarifas-modelos.md` | funcional | tecnica | coste-uso-ia | `(app)/observabilidad/tarifas/*` | borrador |
| FUN-PRESUPUESTOS | `docs/funcional/presupuestos.md` | funcional | tecnica | coste-uso-ia | `(app)/observabilidad/presupuestos/*` | borrador |
| FUN-TAREAS | `docs/funcional/tareas.md` | funcional | tecnica | tareas | `(app)/tareas/{page.tsx,actions.ts}`, `components/tasks/{TasksView,TaskDetailPanel,CreateTaskModal,TaskComments,TaskAttachments,TaskChecklist,TaskActivity}.tsx` | borrador |
| FUN-KANBAN | `docs/funcional/kanban.md` | funcional | tecnica | tareas | `(app)/kanban/page.tsx`, `components/tasks/KanbanView.tsx` | borrador |
| FUN-TAREAS-CALENDARIO | `docs/funcional/tareas-calendario.md` | funcional | tecnica | tareas | `(app)/tareas/calendario/page.tsx`, `components/tasks/CalendarView.tsx` | borrador |
| FUN-TAREAS-METRICAS | `docs/funcional/tareas-metricas.md` | funcional | tecnica | tareas | `(app)/tareas/metricas/page.tsx`, `components/tasks/MetricsView.tsx`, `lib/tasks/metrics.ts` | borrador |
| FUN-TAREAS-PLANTILLAS | `docs/funcional/tareas-plantillas.md` | funcional | tecnica | tareas | `(app)/tareas/plantillas/page.tsx`, `components/tasks/PlantillasView.tsx` | borrador |
| FUN-TAREAS-RECURRENTES | `docs/funcional/tareas-recurrentes.md` | funcional | tecnica | tareas | `(app)/tareas/recurrentes/page.tsx`, `components/tasks/RecurrentTasksView.tsx` | borrador |
| FUN-ASISTENTE | `docs/funcional/asistente-sgai.md` | funcional | tecnica | asistente-sgai | `components/assistant/*`, `api/agent/assistant/**` | borrador |

### 3.6 Catálogo de tablas básicas

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-CATALOGO | `docs/funcional/catalogo.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/page.tsx` | borrador |
| FUN-CAT-MODOS | `docs/funcional/catalogo-modos-de-fallo.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/modos-de-fallo/*` | borrador |
| FUN-CAT-MEDIDAS | `docs/funcional/catalogo-medidas.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/medidas/*` | borrador |
| FUN-CAT-TIPOS-EVIDENCIA | `docs/funcional/catalogo-tipos-de-evidencia.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/tipos-de-evidencia/*` | borrador |
| FUN-CAT-OBLIGACIONES | `docs/funcional/catalogo-obligaciones.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/obligaciones/*` | borrador |
| FUN-CAT-OBL-EVIDENCIA | `docs/funcional/catalogo-obligacion-evidencia.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/mappings/obligacion-evidencia/*` | borrador |
| FUN-CAT-MODO-MEDIDA | `docs/funcional/catalogo-modo-medida.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/mappings/modo-medida/*` | borrador |
| FUN-CAT-RELACIONES | `docs/funcional/catalogo-relaciones-causales.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/relaciones-causales/*` | borrador |
| FUN-CAT-GRAFO | `docs/funcional/catalogo-grafo-causal.md` | funcional | tecnica | catalogo-tablas-basicas | `(app)/datos/catalogo-causal/*` | borrador |

### 3.7 Flujos transversales

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| FUN-FLUJO-COMPLETO | `docs/funcional/flujo-completo-evaluacion.md` | funcional | tecnica | transversal | `(auth)/{actions.ts,onboarding/actions.ts}`, `(app)/{organizacion,usuarios,ajustes,aprobaciones,evidencias,gaps}/actions.ts`, `(app)/inventario/**/actions.ts`, `(app)/plantillas/soa-iso42001/actions.ts`, `lib/fmea/treatment-plan.ts`, `lib/approvals/effects.ts`, `lib/dashboard/data.ts`, `docs/funcional/*`, `docs/_incidencias.md` | borrador |

## 4. Técnica (`docs/tecnica/`, audiencia técnica)

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| TEC-ARQUITECTURA | `docs/tecnica/arquitectura.md` | tecnica | tecnica | transversal | `README.md`, `apps/web/Dockerfile`, `services/*/Dockerfile`, `services/*/README.md`, `apps/web/next.config.mjs` | borrador |
| TEC-MODELO-DATOS | `docs/tecnica/modelo-datos.md` | tecnica | tecnica | transversal | `supabase/migrations/*`, `recursos/db/README.md` | borrador |
| TEC-SEGURIDAD | `docs/tecnica/seguridad.md` | tecnica | tecnica | transversal | `apps/web/middleware.ts`, `lib/supabase/{middleware,server,client}.ts`, `lib/auth/*`, `lib/cron/auth.ts`, políticas RLS en `supabase/migrations/*` | borrador |
| TEC-API-INGESTA | `docs/tecnica/api-ingesta.md` | tecnica | tecnica | transversal | `docs/ingesta.md`, `api/ingest/v1/**`, `lib/auth/{api-key,scopes}.ts`, `lib/signals/*`, `packages/py-common/fluxion_common/*` | borrador |
| TEC-API-INTERNA | `docs/tecnica/api-interna.md` | tecnica | tecnica | transversal | `api/agent/**`, `api/v1/**`, `api/documents/**`, `api/organization/**`, `api/user/**` | borrador |
| TEC-WEBHOOKS | `docs/tecnica/webhooks-salientes.md` | tecnica | tecnica | transversal | `lib/outbox/{events,emit,dispatch}.ts`, `mig/20260914090000_outbox.sql` | borrador |
| TEC-EVENTOS-AVISOS | `docs/tecnica/eventos-y-avisos.md` | tecnica | tecnica | transversal | `lib/signals/*`, `lib/outbox/*`, `lib/channels/send.ts`, `lib/notifications/*`, `lib/approvals/notify.ts` | borrador |
| TEC-AGENTES | `docs/tecnica/servicio-agentes.md` | tecnica | tecnica | clasificacion-ai-act | `services/agents/**`, `recursos/agent4_assistant_spec.md` | borrador |
| TEC-RAG | `docs/tecnica/rag.md` | tecnica | tecnica | asistente-sgai | `services/agents/fluxion_agents/rag/retriever.py`, `recursos/baseline/rag_corpus.manifest.json`, `mig/00000000000002_public_objects.sql` | borrador |
| TEC-CONECTORES | `docs/tecnica/conectores.md` | tecnica | tecnica | descubrimiento-inventario | `services/connector-mlflow/**`, `services/connector-shadow-ai/**`, `packages/py-common/fluxion_common/connectors.py` | borrador |
| TEC-TELEMETRIA | `docs/tecnica/telemetria.md` | tecnica | tecnica | coste-uso-ia | `services/telemetry/**`, `packages/py-common/fluxion_common/telemetry.py`, `mig/20260821090000_telemetry_core.sql` … `mig/20260824090000_model_prices_per_org.sql` | borrador |
| TEC-PDF | `docs/tecnica/generacion-pdf.md` | tecnica | tecnica | documentacion-del-sistema | `services/renderer/**`, `lib/documents/{render,render-html,compose}.ts` | borrador |
| TEC-FICHEROS | `docs/tecnica/almacenamiento-ficheros.md` | tecnica | tecnica | transversal | `lib/storage/objects.ts`, `lib/evidences/{storage,storage-actions}.ts`, `mig/00000000000003_auth_storage.sql`, `mig/20260819090000_storage_backend.sql` | borrador |
| TEC-TAREAS-PROGRAMADAS | `docs/tecnica/tareas-programadas.md` | tecnica | tecnica | transversal | `api/cron/**`, `mig/00000000000004_cron_jobs.sql`, `mig/20260822090000_telemetry_rollups.sql`, `infra/schedules/*` | borrador |
| TEC-CONFIGURACION | `docs/tecnica/configuracion.md` | tecnica | tecnica | transversal | `process.env.*` en `apps/web`, `services/*/fluxion_*/main.py`, `services/agents/fluxion_agents/models.py`, `packages/py-common/fluxion_common/config.py`, `infra/supabase/env.propio.example` | borrador |
| TEC-DESPLIEGUE | `docs/tecnica/despliegue.md` | tecnica | tecnica | transversal | `docs/infra/README.md`, `docs/infra/migracion-supabase-propio.md`, `infra/supabase/*`, `services/telemetry/docker-compose.yml`, `infra/db/migrate.sh` | borrador |
| TEC-BACKUPS | `docs/tecnica/copias-de-seguridad.md` | tecnica | tecnica | transversal | `infra/backups/*.sh`, `infra/backups/README.md` | borrador |
| TEC-HERRAMIENTAS | `docs/tecnica/herramientas-internas.md` | tecnica | tecnica | transversal | `apps/web/scripts/*`, `tools/*` | borrador |

## 5. Ficheros existentes a actualizar (decisión 53)

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| ACT-README | `README.md` | tecnica | tecnica | transversal | `README.md`, `services/*/README.md` | pendiente |
| ACT-B2 | `docs/modulos/b2-telemetria-finops.md` | tecnica | tecnica | coste-uso-ia | `docs/modulos/b2-telemetria-finops.md`, `services/telemetry/*` | pendiente |
| ACT-SCHEDULES | `infra/schedules/README.md` | tecnica | tecnica | transversal | `infra/schedules/{crontab,app-cron.sh}`, `api/cron/**`, `lib/cron/auth.ts` | pendiente |
| ACT-DB-INVENTORY | `recursos/docs/db_inventory_2026-04-28.md` | tecnica | tecnica | transversal | `supabase/migrations/*` | pendiente |

## 6. Especificaciones de producto (`docs/producto/`)

Documentos que dicen lo que **debe** hacer la aplicación, no lo que hace. El tipo `especificacion` no está
entre los de `CLAUDE.md`; se añadió a petición del responsable (2026-10-19).

| id | Ruta del .md | Tipo | Audiencia | Módulo | Ficheros fuente | Estado |
|---|---|---|---|---|---|---|
| PRD-CUESTIONARIO-REGLAS | `docs/producto/cuestionario-preliminar-reglas.md` | especificacion | producto, tecnica | evaluacion-de-impacto | `lib/preliminary-questionnaire/{schema.ts,to-aiact.ts,to-wizard.ts}`, `components/questionnaire/*`, `(app)/cuestionario-preliminar/*`, `components/inventory/SystemWizard.jsx`, `lib/ai-systems/scoring.ts`, `(app)/inventario/nuevo/actions.ts`, `mig/20260915090000_cuestionario_preliminar.sql`, `mig/20260904090000_obligaciones_ai_act.sql`, `mig/20260911090000_rol_cadena_de_valor.sql` | borrador |
| PRD-PLAN-GAPS | `docs/producto/plan-resolucion-gaps.md` | especificacion | producto, tecnica | transversal | `docs/funcional/flujo-completo-evaluacion.md`, `docs/producto/cuestionario-preliminar-reglas.md`, `docs/_incidencias.md`, `(app)/inventario/[id]/fmea/**/actions.ts`, `lib/fmea/*`, `lib/approvals/effects.ts`, `(app)/plantillas/soa-iso42001/*`, `(app)/inventario/[id]/aisia/actions.ts`, `lib/dashboard/data.ts`, `lib/evaluations/data.ts` | borrador |
| PRD-REGISTRO-CAMBIOS | `docs/producto/registro-de-cambios.md` | especificacion | producto, tecnica | transversal | `docs/producto/plan-resolucion-gaps.md`, historial de git | borrador |

---

**Total:** 111 documentos.

| Grupo | Documentos |
|---|---|
| Raíz | 3 (`CLAUDE.md` en borrador) |
| Negocio | 24 |
| Funcional | 59 |
| Técnica | 18 |
| A actualizar | 4 |
| Producto | 3 |

## Notas para validar

1. **Una vista, un documento:** las pestañas (Ajustes, Organización, Perfil, Usuarios, Ficha del sistema) se documentan como secciones de su vista. Si alguna es muy extensa (Ajustes tiene 10 pestañas), se puede partir más adelante.
2. **`FUN-NAVEGACION`** no es una ruta: describe el sidebar, la barra superior y los avisos globales que comparten todas las vistas.
3. **`docs/ingesta.md`:** su contenido pasa a `docs/tecnica/api-ingesta.md`. **Decisión:** el fichero antiguo se conserva como enlace al nuevo, porque lo citan `README.md` y `CLAUDE.md`. Esa redirección se hará al generar `TEC-API-INGESTA`.
4. **`docs/infra/*` y `infra/backups/README.md`:** son fuente de `TEC-DESPLIEGUE` y `TEC-BACKUPS`. No están en la lista de la decisión 53, así que no se actualizan.
5. **`docs/modulos/*` existentes** (`a2`, `aisia-auditoria`, `c1`, `c2`, `c3`): se usan como fuente; solo `b2` se actualiza. ¿Se archivan cuando existan los documentos nuevos?
6. **`NEG-CATALOGO` / `FUN-CAT-*`:** describen el estado objetivo (catálogo por organización que mantiene el `org_admin`) y avisan de que hoy el catálogo es global (`_inventario.md` §14.1).
7. **`NEG-APROBACIONES` / `FUN-APROBACIONES`:** marcan los niveles de aprobación como «Pendiente de definir».
