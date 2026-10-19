# Incidencias detectadas durante la documentación

**Versión:** 1.0 · **Fecha:** 2026-10-15 · **Estado:** para revisión

Este documento reúne los errores, las incongruencias y las carencias detectados al documentar Fluxion
(Fase 2). Agrupa y prioriza lo que está repartido en los `TODO` de los documentos y en
[`_pendientes.md`](_pendientes.md).

**Cómo leer las tablas:**

| Columna | Valores |
|---|---|
| **Tipo** | **Error**: el código no hace lo que pretende · **Incongruencia**: dos partes de la aplicación, o la aplicación y su documentación, dicen cosas distintas · **Carencia**: falta algo necesario o anunciado en la propia interfaz · **Doc**: documentación del repositorio desactualizada · **Decisión**: necesita una definición del responsable |
| **Prioridad** | **Alta**: rompe una función principal, pierde datos o afecta al cumplimiento normativo · **Media**: comportamiento incorrecto con alternativa o impacto limitado · **Baja**: textos, etiquetas o detalles visuales |
| **Verif.** | **Código**: comprobado leyendo el código durante la documentación · **Análisis**: detectado en el análisis del código, sin ejecutar la aplicación · **Probable**: deducido, requiere comprobarlo en ejecución |
| **Ref.** | Número de fila en `_pendientes.md` |

Ninguna incidencia se ha comprobado ejecutando la aplicación. Las marcadas **Probable** deberían
verificarse en un entorno real antes de corregirlas.

---

## 0. Resumen

**Incidencias más importantes:**

| # | Incidencia | Área |
|---|---|---|
| 1 | Los controles sugeridos no aparecen en la evaluación FMEA, el plan de tratamiento ni las brechas: la consulta pide una columna que no existe | Riesgo y tratamiento |
| 2 | Las tareas no se crean desde las acciones del plan de tratamiento | Riesgo y tratamiento |
| 3 | Ninguna evaluación FMEA llega a «Aprobada»: la comparativa entre versiones es inalcanzable | Riesgo y tratamiento |
| 4 | Dos motores de clasificación AI Act con reglas distintas; el de reclasificación no detecta prácticas prohibidas ni dos dominios | Clasificación |
| 5 | Un sistema prohibido clasificado con IA queda sin obligaciones | Clasificación |
| 6 | La Declaración de Aplicabilidad no se puede enviar a revisión ni aprobar: el rol se busca por la columna equivocada | Cumplimiento |
| 7 | El historial de versiones de las evidencias y de los controles de la Declaración no se guarda | Evidencias |
| 8 | La señal de credenciales expuestas del conector Shadow AI se rechaza siempre | Integración |
| 9 | Los PDF de la FRIA, la DPIA, la ficha del modelo y las actas salen rotulados como «Anexo IV» | Documentación del sistema |
| 10 | El corpus del AI Act no incluye los anexos ni los considerandos | RAG |
| 11 | Las vistas guardadas de tareas no se guardan | Tareas |
| 12 | Los ficheros de Supabase Storage (logos, avatares, adjuntos, evidencias históricas) no tienen copia de seguridad | Operación |
| 13 | El script de copia de Postgres no está en el repositorio | Operación |
| 14 | Las comprobaciones estáticas que exige `CLAUDE.md` no funcionan como se indica | Herramientas |
| 15 | Los nombres de los miembros salen como «Usuario» o vacíos en planes, evidencias y Declaración (patrón P1) | Transversal |
| 16 | Nuevos hallazgos de seguridad no recogidos en `_inventario.md` §7 (ver §10) | Seguridad |

**Recuento.**
- Secciones 2 a 9: 144 incidencias.
  - Por tipo: 95 errores, 26 carencias, 18 incongruencias y 5 decisiones.
  - Por prioridad: 26 altas, 89 medias y 29 bajas.
- Además: 12 patrones transversales (§1), 16 hallazgos de seguridad nuevos (§10), 7 documentos del
  repositorio desactualizados (§11) y 12 decisiones pendientes (§12).

---|---|---|
| Error | 55 % | Consultas a columnas inexistentes, acciones sin efecto, cálculos incorrectos |
| Incongruencia | 25 % | Textos de la interfaz que no se cumplen, enums distintos entre capas |
| Carencia | 10 % | Datos que existen pero no tienen pantalla |
| Doc | 5 % | READMEs desactualizados |
| Decisión | 5 % | Terminología, roles, alcance comercial |

---

## 1. Patrones que se repiten

Corregir cada patrón resuelve muchas incidencias a la vez.

| Id | Patrón | Dónde aparece | Prioridad | Verif. |
|---|---|---|---|---|
| P1 | **Confusión entre `profiles.id` y `profiles.user_id`** (`auth.users.id`). Se guarda un identificador y se busca por el otro, o una FK apunta a `auth.users` y se escribe `profiles.id` | Declaración de Aplicabilidad (rol y propietario), plan de tratamiento y planes (nombres, filtro por aprobador, reasignar), evidencias (responsable y revisor), revisiones pendientes (destinatario), vistas guardadas de tareas | Alta | Código |
| P2 | **Roles que no existen:** `getRoleLabel` del layout compara con `admin`, `editor` y `viewer`, así que casi todos los roles se muestran como «Miembro» | Menú lateral | Baja | Código |
| P3 | **Valores de enumeración distintos entre la interfaz y la base de datos:** etiquetas para estados que no existen, y estados reales que no tienen etiqueta | Dossier técnico, registro UE, detalle de evidencia, ficha del sistema, catálogo de medidas (`organizational`), catálogo de obligaciones (`all`, `transparency`), modos de fallo, incidentes | Media | Código |
| P4 | **Códigos sin traducir en la interfaz** (`zona_iv`, `Pmedium`, `causes`, `assignee id changed`, estados de tareas) | Ficha del sistema, dossier, incidentes, tareas, relaciones causales, AISIA | Baja | Análisis |
| P5 | **Errores silenciosos:** la base de datos rechaza la operación (RLS) o falla, y la interfaz la da por hecha sin avisar | Evidencias, brechas excluidas, plantillas de tareas, Kanban, límites WIP, tarifas, presupuestos, detalle de evidencia | Media | Análisis |
| P6 | **Ficheros huérfanos:** borrar o sustituir registros no borra el fichero del almacén | Evidencias, adjuntos de tareas, evidencias del plan, renders fallidos | Media | Análisis |
| P7 | **Preferencias de usuario rotas:** Perfil y Ajustes las guardan con estructuras distintas, el envío no lee ninguna y guardar el perfil borra las de Ajustes | Notificaciones, correo | Media | Análisis |
| P8 | **Datos que existen pero no tienen pantalla** | Responsable de obligaciones, de riesgos de negocio y de acciones correctivas; personas afectadas por un incidente; roles en la cadena de valor de las obligaciones; nodos y familias causales; motivos propios de supervisión humana | Media | Código |
| P9 | **Textos de la interfaz que prometen algo que no ocurre** | «Solo lectura para tenants comunes» (catálogo), aviso de presupuesto «en la campana», «pantalla de lectura» (brechas), «siguen siendo auditables» (brechas excluidas), «se eliminan tras 90 días» (claves API), «Próximamente» (modos de fallo) | Media | Código |
| P10 | **Operaciones de varios pasos sin transacción** | Reconciliación de la clasificación, `migrate.sh` (aplicar y registrar), generación de PDF, alta de incidentes | Media | Análisis |
| P11 | **Lotes sin trocear o lecturas sin paginar** | `publish_discoveries`, tareas programadas, lista de evidencias (24 primeras), catálogos con filtro solo en la página cargada | Media | Análisis |
| P12 | **`NEXT_PUBLIC_APP_URL`** no se pasa al compilar, tiene dos valores por defecto con dominios distintos y en algunos avisos queda vacía (enlaces relativos) | Avisos, correos, tareas programadas | Media | Análisis |

---

## 2. Acceso y plataforma

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| A1 | Un invitado ve el campo de empresa en el registro, aunque se descarta | Incongruencia | Baja | Análisis | 57 |
| A2 | Onboarding de invitados no administradores: la subida del logo falla y las respuestas no se guardan (RLS de `organizations`) | Error | Media | Análisis | 58 |
| A3 | Dashboard: las pestañas no guardan el foco; **Revisar evidencias pendientes** lleva a otro sitio | Error | Baja | Análisis | 59 |
| A4 | Chip de organización: muestra «Miembro» para casi todos y parece pulsable sin serlo (P2) | Error | Baja | Código | 60 |
| A5 | Notificaciones: una notificación marcada como leída no sale de **No leídas** hasta recargar | Error | Baja | Análisis | 62 |
| A6 | Perfil: **Cargo** y **Departamento** se guardan en `preferences`, pero se leen de columnas propias | Error | Media | Análisis | 63 |
| A7 | Perfil: el **Email alternativo** dice recibir avisos, pero no se usa | Incongruencia | Baja | Análisis | 64 |
| A8 | Perfil: la zona horaria, el formato de fecha y el primer día de la semana no tienen efecto. Ajustes duplica estas preferencias | Carencia | Baja | Análisis | 65, 73 |
| A9 | Perfil: **Guardar cambios** borra las preferencias guardadas desde Ajustes (P7) | Error | Media | Análisis | 66 |
| A10 | Organización: el tamaño tiene 5 valores y en el onboarding 3; «España» frente a «Espana» | Incongruencia | Baja | Análisis | 67 |
| A11 | Organización: los campos de Gobernanza y Operaciones (responsables, ejercicio, idioma, color, pie) no los usa nada | Carencia | Media | Análisis | 68 |
| A12 | Organización: renovar un módulo lo pasa a «en prueba»; un miembro de comité dado de baja no se puede volver a añadir | Error | Media | Análisis | 69 |
| A13 | Usuarios: la columna de correo sale vacía y la búsqueda por correo no funciona | Error | Media | Análisis | 70 |
| A14 | Usuarios: el selector de la fila permite asignar Administrador, aunque al invitar no se puede; los errores no se muestran | Incongruencia | Media | Análisis | 71 |
| A15 | Ajustes: las pestañas de Workspace solo las ve el Administrador, pero el servidor deja gestionar a otros roles | Decisión | Media | Análisis | 72 |
| A16 | Ajustes › Auditoría: el filtro no ofrece varios tipos de evento | Carencia | Baja | Análisis | 74 |
| A17 | Ajustes › Seguridad: MFA obligatoria, dominios permitidos y tiempo de sesión se guardan, pero no se aplican | Carencia | Alta | Análisis | — |
| A18 | No hay recuperación de contraseña en la aplicación | Carencia | Media | Análisis | — |
| A19 | El «Resumen semanal» de las preferencias no se envía | Carencia | Baja | Análisis | 20, 73 |

## 3. Inventario y clasificación AI Act

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| I1 | **Dos motores de reglas.** El TypeScript (alta y edición) y el Python (reclasificación) difieren en prácticas prohibidas, biometría, infraestructura crítica, educación, salud, seguridad, justicia, migración y Art. 50 | Incongruencia | Alta | Código | 26, 80, 201 |
| I2 | El motor Python compara con los dominios `finanzas_banca` y `atencion_cliente`, que no existen: esos sistemas salen `minimal` | Error | Alta | Código | 201 |
| I3 | El motor Python no tiene regla de prohibido e ignora `prohibited_practice` | Error | Alta | Código | 201 |
| I4 | La clasificación con IA descarta `art_5`: un sistema prohibido queda sin obligaciones | Error | Alta | Análisis | 191, 202 |
| I5 | `classify` no actualiza el nivel de riesgo de la ficha, y la acción de alta no comprueba la respuesta | Error | Media | Código | 201 |
| I6 | La reconciliación no es atómica y no valida la resolución elegida | Error | Media | Análisis | 191, 203 |
| I7 | **Revisar clasificación** no envía tres factores que sí usa la vista previa | Error | Media | Análisis | 84 |
| I8 | Al recargar con una reclasificación pendiente, la reconciliación ya no se puede abrir | Error | Media | Análisis | 88 |
| I9 | Resolver o excluir una obligación nacida de una reconciliación crea un duplicado | Error | Media | Análisis | 89 |
| I10 | Reclasificar y conciliar no dejan historial ni actualizan la justificación de la cabecera | Carencia | Media | Análisis | 90 |
| I11 | Alta: el **Tipo de output** admite varias opciones, pero solo se guarda la primera | Error | Media | Análisis | 78 |
| I12 | Alta: la madurez ISO 42001 de la vista previa no se guarda | Error | Baja | Análisis | 79 |
| I13 | Alta: los datos de los campos que se ocultan se guardan igualmente | Error | Baja | Análisis | 81 |
| I14 | Ficha: **Exportar PDF** y **Abrir agente** no hacen nada | Error | Media | Análisis | 82 |
| I15 | Ficha: varios eventos del historial aparecen como «Evento» y no se pueden filtrar | Error | Baja | Análisis | 85 |
| I16 | Ficha: el modal de evidencias permite fijar «Válida» sin revisión y solo admite URL | Incongruencia | Media | Análisis | 86 |
| I17 | Edición: sobrescribe quién creó el sistema y no inicia reconciliación | Error | Media | Análisis | 92 |
| I18 | Edición: los roles sin permiso recorren el asistente entero y fallan al guardar | Carencia | Baja | Análisis | 91 |
| I19 | Sistemas detectados: los hallazgos se ordenan por gravedad como texto (los críticos al final) | Error | Media | Análisis | 93 |
| I20 | Sistemas detectados: el alta crea el sistema sin descripción ni enlace y no lo clasifica | Carencia | Media | Análisis | 94 |
| I21 | Inventario: **Próximas revisiones** mide antigüedad, no revisiones reales | Incongruencia | Baja | Análisis | 77 |
| I22 | Las obligaciones de cada sistema no salen del catálogo; el cálculo por rol en la cadena de valor solo lo usa una pantalla sin uso | Incongruencia | Media | Código | 29, 179 |
| I23 | El tratamiento de GPAI como nivel de riesgo no coincide con el AI Act, donde es una categoría de modelo | Decisión | Media | — | 8, 27 |

## 4. Riesgo y tratamiento

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| R1 | **✔ Resuelta en B02.** **Controles sugeridos vacíos:** las consultas piden `control_templates.name`, que no existe (es `title`). Afecta a la evaluación FMEA, al plan de tratamiento y a las brechas | Error | Alta | Código | 177, 181, 184 |
| R2 | **✔ Resuelta en B03** (requiere la migración `20261019100000`). **Las tareas no se crean desde las acciones del plan:** las acciones se insertan sin opción y la regla solo actúa al insertar con opción | Error | Alta | Código | 104, 116, 160 |
| R3 | Ninguna evaluación FMEA llega a «Aprobada» ni a «Sustituida»: la comparativa es inalcanzable | Error | Alta | Análisis | 31, 100 |
| R4 | **✔ Resuelta en B05.** Guardar, también el guardado automático, devuelve a borrador una evaluación enviada y cambia el evaluador | Error | Alta | Análisis | 98 |
| R5 | **✔ Resuelta en B05.** El guardado automático pone O = 3 y D = 3 en los ítems pendientes, y esos valores aparecen en informes | Error | Media | Análisis | 99, 96 |
| R6 | **✔ Resuelta en B05.** La estimación por familia sobrescribe los ajustes manuales | Error | Media | Análisis | 97 |
| R7 | **✔ Resuelta en B05.** **Guardar borrador** del plan no guarda las decisiones, aunque la vista las marca como guardadas | Error | Alta | Análisis | 105 |
| R8 | **✔ Resuelta en B05.** «Diferir» no guarda fecha de revisión: esas acciones nunca entran en Revisiones pendientes | Error | Media | Análisis | 103, 109 |
| R9 | **✔ Resuelta en B02** (requiere la migración `20261019090000`). Sin control en el catálogo, no se puede mitigar | Carencia | Media | Análisis | 102 |
| R10 | Nombres de responsables y aprobadores vacíos, y el filtro por aprobador no funciona (P1) | Error | Media | Código | 106, 107, 185 |
| R11 | El recordatorio semanal de revisiones puede no llegar a la persona correcta (P1) | Error | Media | Análisis | 108 |
| R12 | No consta cómo pasa un plan a «En curso» y «Cerrado» | Carencia | Media | — | 32 |
| R13 | Brechas: **Crear tareas en bloque** no crea ninguna | Error | Alta | Código | 111 |
| R14 | Brechas: la cabecera dice «de lectura», pero la vista permite editar | Incongruencia | Baja | Código | 110 |
| R15 | Brechas excluidas: **Reactivar** no funciona para otros roles y no avisa; al reactivar se pierde la traza | Error | Media | Análisis | 112, 113 |
| R16 | Instantáneas de brechas: posible fallo de permisos al comparar y borrar; las excluidas no se muestran | Error | Media | Probable | 114, 115 |
| R17 | La pestaña Plan de tratamiento de la ficha muestra códigos sin traducir | Error | Baja | Análisis | 87 |

## 5. Evidencias, cumplimiento e informes

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| E1 | **✔ Resuelta en B04.** **Declaración de Aplicabilidad bloqueada:** el rol se busca con `.eq('id', user.id)`. Nadie ve **Enviar a revisión** ni **Aprobar**, y «Aprobado por» sale «Desconocido» | Error | Alta | Código | 117, 141 |
| E2 | **✔ Resuelta en B04.** Declaración: asignar el propietario de un control probablemente falla (P1) | Error | Media | Probable | 118 |
| E3 | **Resuelta en parte en B04** (historial de controles). Declaración: **Aplicar propuestas** borra la justificación de los excluidos; el historial de controles no guarda nada; la impresión muestra «Fluxion SaaS» y «Página 1 de 1» fijos | Error | Media | Análisis | 119 |
| E4 | **Historial de versiones de evidencias vacío:** la tabla no admite inserciones con los permisos del usuario | Error | Alta | Análisis | 123, 140 |
| E5 | Biblioteca: solo muestra 24 evidencias, sin paginación; los filtros ofrecen 6 opciones; falta «Rechazada» | Error | Media | Análisis | 120 |
| E6 | Biblioteca: permite fijar «Válida» sin revisión; el fichero se sube aunque se cancele; límite de 20 MB en la vista y 100 MB en el servidor | Incongruencia | Media | Análisis | 122 |
| E7 | Las evidencias de la biblioteca no guardan su huella SHA-256 | Carencia | Media | Análisis | 209 |
| E8 | Detalle de evidencia: estados que no existen, enlaces a pestañas inexistentes, no muestra los controles que valida, errores silenciosos | Error | Media | Análisis | 125, 126 |
| E9 | Dossier técnico: estados de obligación y plan erróneos, prioridad sin traducir, orden alfabético, datos cargados que no se muestran | Error | Media | Análisis | 127 |
| E10 | Informes del sistema: si falla **Guardar como evidencia**, se borra lo escrito y el error queda detrás del modal | Error | Media | Análisis | 128 |
| E11 | Instantáneas: el pie dice «estado actual»; el enlace del nombre lleva al informe en vivo | Incongruencia | Baja | Análisis | 129 |
| E12 | Registro UE: la evidencia guardada no se puede abrir (`eu_registry_prep` frente a `eu_registry`) | Error | Media | Código | 132 |
| E13 | Registro UE: la lista de comprobación no cubre la mayor parte del Anexo VIII | Carencia | Alta | Análisis | 39, 130 |
| E14 | Informe de brechas: las excluidas y las sugeridas cuentan como pendientes; los controles «no aplica» cuentan como brechas | Error | Media | Análisis | 133 |
| E15 | **Expediente: todos los PDF dicen «Anexo IV»**, incluidos la FRIA, la DPIA, la ficha del modelo y las actas, y también en el nombre del fichero, la instantánea y la evidencia | Error | Alta | Análisis | 135, 143, 208 |
| E16 | Expediente: los PDF generan evidencias válidas sin revisión; los cambios de estado no dejan historial; no se puede volver a borrador desde revisión; «Sustituido» nunca se asigna | Incongruencia | Media | Análisis | 135 |
| E17 | Expediente: la ficha del modelo se ofrece aunque el sistema no sea GPAI; el IV.8 pide un documento firmado, pero solo admite texto; las actas no se pueden abrir | Carencia | Media | Análisis | 52, 134 |
| E18 | Actas: si falla su PDF, no se vuelve a intentar | Error | Media | Análisis | 208 |
| E19 | AISIA: los valores precargados no se guardan si no se editan; la S3 muestra el origen en lugar del nombre; no se puede actualizar una AISIA aprobada | Error | Media | Análisis | 136, 137 |
| E20 | Cuestionario preliminar: preguntas duplicadas, obligatoriedad incoherente, orientado a prestadores de servicios a terceros; no clasifica ni da de alta | Decisión | Media | Análisis | 56, 139 |

## 6. Operación diaria

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| O1 | Incidentes: el indicador «sin clasificar» siempre vale 0; no se distingue un incidente sin clasificar de uno no grave | Error | Media | Código | 144 |
| O2 | Incidentes: se puede registrar la notificación inicial después de la completa, y el plazo vuelve a contar | Error | Alta | Análisis | 150 |
| O3 | Incidentes: los avisos de plazo no llegan al Analista de riesgos | Incongruencia | Media | Código | 149 |
| O4 | Incidentes: el número de personas afectadas no tiene pantalla; las acciones correctivas no admiten responsable ni fecha | Carencia | Media | Análisis | 148, 171 |
| O5 | Incidentes: el resumen del plazo con infracción generalizada es erróneo; se puede marcar como grave sin categoría | Error | Media | Análisis | 147 |
| O6 | Incidentes: al reabrir se conserva la fecha de cierre; no hay alta desde una señal | Error | Baja | Análisis | 40, 151 |
| O7 | Aprobaciones: el solicitante nunca ve **Cancelar solicitud**; cancelar no avisa ni devuelve el plan a borrador | Error | Media | Código | 153 |
| O8 | Aprobaciones: cada voto vuelve a avisar a todos; las solicitudes no caducan; los mensajes del motor son técnicos | Error | Media | Análisis | 153 |
| O9 | Supervisión humana: las listas se ordenan como texto («9» antes que «10»); las decisiones «no usada» se cuentan dos veces | Error | Media | Código | 154 |
| O10 | Coste y uso: el pie nunca muestra la fecha de cálculo (falta permiso de lectura) | Error | Baja | Código | 155 |
| O11 | Coste y uso: las monedas se suman sin convertir; «sin tarifa» es permanente; las trazas con más de 2 días de retraso no se agregan | Error | Media | Análisis | 155, 156, 200 |
| O12 | Presupuestos: el aviso no llega a la campana; con umbrales repetidos no avisa nunca; no se pueden editar | Error | Media | Código | 158 |
| O13 | **Tareas: las vistas guardadas no se guardan** (FK a `auth.users`, se escribe `profiles.id`) | Error | Alta | Código | 159 |
| O14 | Tareas: el cambio de asignado sale sin traducir; no se registran varios cambios; las tareas de señal e incidente no enlazan con su origen | Error | Baja | Código | 161 |
| O15 | Tareas: eliminar en bloque quita de la lista tareas que no se borran | Error | Media | Análisis | 162 |
| O16 | Kanban: arrastrar no deja actividad, no avisa ni emite `task.completed` | Error | Media | Análisis | 163 |
| O17 | Recurrentes: **Ejecutar ahora** puede duplicar tareas; editar no recalcula; la anual usa como máximo el día 28 | Error | Media | Código | 168 |
| O18 | Plantillas: las personales las ve todo el mundo; las ajenas parecen editables | Error | Media | Análisis | 167 |
| O19 | Métricas: «SLA» cuenta como a tiempo las tareas sin fecha | Decisión | Baja | Análisis | 41, 165 |
| O20 | Asistente: las conversaciones no se pueden retomar; el primer mensaje falla en pantallas con identificador que no es un sistema; el interruptor del copiloto no tiene efecto | Error | Media | Análisis | 169, 190 |

## 7. Catálogo de tablas básicas

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| C1 | Catálogo único para todas las organizaciones y editable por cualquier usuario (decisión pendiente de implementar) | Carencia | Alta | Código | — |
| C2 | Modos de fallo: el peso W usa otra fórmula; la S_default se introduce a mano; la descripción, el tipo y el origen normativo no se pueden editar | Error | Media | Código | 10, 174 |
| C3 | Modos de fallo: borrar uno elimina sus activaciones en todas las organizaciones, sin aviso; no hay auditoría de cambios | Carencia | Media | Análisis | 175 |
| C4 | Medidas: la categoría `organizational` (17 medidas) no está contemplada | Error | Baja | Análisis | 176 |
| C5 | Obligaciones: los ámbitos «General» y «Prohibido» no aplican a nada; `all` y `transparency` no se pueden elegir; los roles en la cadena de valor no tienen pantalla | Error | Media | Análisis | 179 |
| C6 | Tipos de evidencia y Obligación ↔ Evidencia no se usan fuera de `/datos` | Incongruencia | Media | Análisis | 178, 180 |
| C7 | Relaciones causales: se permiten relaciones de un nodo consigo mismo, duplicadas y ciclos; la confianza no se usa; errata «Ato (high)»; nodos y familias sin pantalla | Error | Baja | Análisis | 182 |
| C8 | Grafo: la leyenda no incluye «Se correlaciona»; los colores de dominio no coinciden con los datos | Error | Baja | Código | 183 |
| C9 | El menú marca Modos de fallo como «Próximamente»; la página dice «Solo lectura para tenants comunes» | Incongruencia | Baja | Código | 173 |

## 8. Integración y servicios

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| S1 | **Shadow AI: la señal de credenciales expuestas no lleva `source_module`** y se rechaza siempre | Error | Alta | Código | 199 |
| S2 | `publish_discoveries` no trocea en lotes de 100: con más de 100 elementos falla la pasada, y en MLflow tampoco se publican las señales | Error | Alta | Análisis | 188, 199 |
| S3 | Ingesta: dos elementos con la misma clave en un lote hacen fallar el lote entero; los hallazgos sin línea se duplican en cada pasada | Error | Media | Análisis | 187 |
| S4 | Ingesta: `ping` exige `signals:write`; el mapa `links` no se filtra por tipo; las respuestas no son homogéneas | Incongruencia | Baja | Análisis | 187 |
| S5 | Cliente Python: reintenta POST no idempotentes y puede duplicar pasadas y decisiones | Error | Media | Análisis | 188 |
| S6 | Shadow AI: ignora el intervalo de la conexión; no tiene cursor; los hallazgos de repositorios sin IA no se cierran; GitLab solo admite grupos | Error | Media | Análisis | 199 |
| S7 | Telemetría: los nombres antiguos de tokens se descartan como contenido (llamadas sin coste) | Error | Alta | Código | 200 |
| S8 | Telemetría: sin gzip, un Collector por defecto pierde los datos; un `system_id` no válido bloquea el lote; `/health` siempre responde 200 | Error | Media | Análisis | 200 |
| S9 | Webhooks: `approval.cancelled` no se emite; `task.completed` solo se emite desde la ficha; el primer reintento sale a los 5 min; `failed` y «Último envío» no se usan | Error | Media | Código | 192, 193 |
| S10 | Webhooks: no se pueden editar ni desactivar; posibles entregas dobles al solaparse pasadas | Carencia | Media | Análisis | 194, 193 |
| S11 | Avisos: las señales de las tareas programadas no pasan por el despacho (sin aviso en la app ni tarea) | Error | Media | Análisis | 195 |
| S12 | Avisos: el correo de aprobaciones nunca se envía; los canales no reintentan; el enlace de `approval.pending` es relativo | Error | Media | Análisis | 196, 197 |
| S13 | RAG: muchas consultas de la clasificación leen campos inexistentes (`critical_infra`, `biometric`, `recursos_humanos`) y nunca se lanzan | Error | Alta | Código | 207 |
| S14 | RAG: la clasificación no consulta ISO 42001, RGPD, DORA, MDR, IVDR ni ENS; el asistente no consulta el ENS | Carencia | Media | Análisis | 207 |
| S15 | **RAG: el corpus del AI Act no incluye anexos ni considerandos**; muchas referencias llevan una letra de más («Art. 5P(1)») | Error | Alta | Análisis | 205 |
| S16 | RAG: la búsqueda híbrida está rota; hay índices HNSW duplicados; no existe ingestor | Carencia | Media | Código | 204, 206 |
| S17 | Agentes: el prompt de clasificación lleva un nombre de cliente fijo y una numeración del Anexo III que no coincide con el Reglamento | Error | Media | Código | 202 |
| S18 | PDF: los errores al guardar la instantánea y la evidencia se ignoran; si falla el registro, el PDF queda huérfano; las fuentes del CSS no están en la imagen | Error | Media | Análisis | 208 |
| S19 | Ficheros: la función de borrado no se usa y deja la fila en un estado que la base de datos no admite; límites de tamaño distintos; la configuración de MinIO no está en el repositorio | Error | Media | Análisis | 209, 210 |
| S20 | Modelo de la Declaración de Aplicabilidad fijado en el código (`gpt-5.4`), no configurable | Incongruencia | Baja | Análisis | 215 |

## 9. Operación e infraestructura

| Id | Incidencia | Tipo | Prior. | Verif. | Ref. |
|---|---|---|---|---|---|
| T1 | **Supabase Storage sin copia de seguridad** (logos, avatares, adjuntos de tareas, evidencias históricas) | Carencia | Alta | Análisis | 211, 224 |
| T2 | **El script de copia de Postgres no está en el repositorio** | Carencia | Alta | Análisis | 223 |
| T3 | La copia de MinIO en B2 nunca se verifica; `minio-backup.sh` no avisa de fallos; `offsite-verify.sh` deja volcados descifrados en `/tmp` si falla | Carencia | Media | Análisis | 224 |
| T4 | No consta que la clave de Vault se copie: los secretos se restauran ilegibles | Carencia | Media | Análisis | 224 |
| T5 | No hay RPO/RTO ni ensayo de recuperación ante desastre | Decisión | Media | — | 225 |
| T6 | `app-cron.sh`: los fallos de conexión no quedan en el log; no usa bloqueo; la instalación duplica las tareas si se repite | Error | Media | Análisis | 213 |
| T7 | `outbox` sin límite de duración ni bloqueo; `cost-budgets` registra el umbral antes de avisar; una recurrencia con error bloquea las demás | Error | Media | Análisis | 212 |
| T8 | No hay tarea de conservación de telemetría; los fallos de `telemetry-rollup` no se registran | Carencia | Media | Análisis | 200, 212 |
| T9 | `migrate.sh`: aplicar y registrar no son atómicos | Error | Media | Análisis | 221 |
| T10 | Kong publica sus puertos en el servidor (choque con el stack compartido) | Error | Media | Análisis | 219 |
| T11 | La red de la telemetría depende de un sufijo de Dokploy escrito a mano | Error | Media | Análisis | 220 |
| T12 | `NEXT_PUBLIC_APP_URL` no se pasa en la compilación (P12) | Error | Media | Análisis | 215, 218 |
| T13 | Ninguna imagen define `HEALTHCHECK`; las imágenes Python corren como root; dos no fijan la versión de Debian | Carencia | Media | Análisis | 222 |
| T14 | Nombres distintos para la clave de servicio y la URL de Supabase según el componente; los conectores no admiten `LOG_LEVEL`; no hay `.env.example` de la web | Incongruencia | Baja | Análisis | 214, 216, 217 |
| T15 | **✔ Resuelta en B00a ([registro de cambios](producto/registro-de-cambios.md)).** **Comprobaciones de `CLAUDE.md`:** los scripts no tienen permiso de ejecución; `check-server-actions.sh` no funciona en el bash de macOS; `check-python.sh` da por bueno el resultado si falta `pyflakes` | Error | Alta | Código | 226 |
| T16 | Scripts de `apps/web/scripts`: varios no cargan `.env.local`; `seed_causal_relations.ts` escribe en `public` | Error | Baja | Análisis | 227 |

## 10. Seguridad (para la Fase 2)

Por decisión de la revisión, los hallazgos de seguridad no están en la documentación. Se listan aquí para
la Fase 2, sin datos sensibles.

**Ya recogidos en `_inventario.md` §7:**
1. Credenciales versionadas.
2. Catálogos sin control de rol.
3. Vistas sin `security_invoker`.
4. `rag.search_chunks` con `org_id` arbitrario.
5. Rutas fuera del middleware.
6. Activación de módulos solo en el menú.
7. MFA, dominios y tiempo de sesión sin aplicar.
8. `classify-system/confirm` sin comprobar la organización.
9. Renderer sin bloqueo de red.
10. Servicio de agentes con service key.

**Nuevos, detectados durante la documentación:**

| Id | Hallazgo | Verif. |
|---|---|---|
| X1 | Las políticas de edición de `profiles` no limitan las columnas: un usuario podría cambiar su rol o su organización directamente por PostgREST | Probable |
| X2 | Las acciones de adjuntos, comentarios, lista de comprobación y seguidores de tareas usan el cliente admin sin comprobar la organización de la tarea | Análisis |
| X3 | `failure_mode_control_refs` no tiene RLS y concede escritura a `authenticated` | Análisis |
| X4 | `saveApprovalPolicy` reescribe los pasos de una política sin comprobar la organización | Análisis |
| X5 | La prueba de canal y `deliverPending` leen el canal por id sin filtrar por organización | Análisis |
| X6 | `createWebhook` no valida la URL en el servidor (riesgo de SSRF) | Análisis |
| X7 | El secreto de los webhooks salientes se guarda sin Vault | Análisis |
| X8 | `audit_log` no tiene protección de inmutabilidad | Análisis |
| X9 | No hay cabeceras de seguridad (CSP, HSTS); el límite de peticiones está en memoria | Análisis |
| X10 | Ingesta: `discoveries` no comprueba la pertenencia de `connection_id`; telemetría acepta un `system_id` de otra organización | Análisis |
| X11 | El historial del asistente admite mensajes con rol `system` enviados por el cliente | Análisis |
| X12 | Logos y avatares en buckets públicos sin lista de tipos, con la extensión del usuario | Probable |
| X13 | El límite de 100 MB de las evidencias se puede saltar: el PUT presignado no firma el tamaño | Análisis |
| X14 | `CRON_SECRET` y `RENDERER_SECRET` se comparan de forma no constante | Código |
| X15 | Hay datos de infraestructura reales en `infra/backups/README.md` y `docs/infra/README.md` (bucket, región, host) | Análisis |
| X16 | Permisos del esquema `rag`: `ingestion_jobs` sin RLS; `public.search_chunks` posiblemente ejecutable por `anon` | Probable |

## 11. Documentación del repositorio desactualizada

| Id | Fichero | Problema | Ref. |
|---|---|---|---|
| D1 | `docs/ingesta.md` | Le faltan dos endpoints y dos scopes, documenta un 402 que no existe y su ejemplo usa el dominio real | 189 |
| D2 | `infra/schedules/README.md` | No incluye `outbox` ni pg_cron, espera 4 tareas, describe mal el secreto | 213 |
| D3 | `infra/backups/README.md` | Dice que no hay copia externa, remite a un procedimiento de restauración que no existe y contiene datos reales | 224, 225 |
| D4 | `docs/infra/README.md` | Describe la instancia compartida de Supabase | 222 |
| D5 | `README.md` raíz | Dice «tres servicios» | 222 |
| D6 | `services/telemetry/README.md` | La describe como Application; contiene una clave `flx_` completa | 222 |
| D7 | `apps/web/scripts/README.md` | Dice que los scripts leen `.env.local` | 227 |

## 12. Decisiones pendientes

| Id | Decisión | Ref. |
|---|---|---|
| N1 | Niveles de aprobación del plan de tratamiento y rol que aprueba en cada uno | 2 |
| N2 | Contenido y precio de los planes | 3 |
| N3 | Nombres de negocio de los roles («Responsable del SGAI», «Responsable del sistema») | 15, 17, 19 |
| N4 | «Vigilancia poscomercialización» (término del AI Act) frente a «Supervisión post-comercialización» | 14, 50 |
| N5 | Nombre del catálogo («tablas básicas» o «metodológico») y «Medidas» frente a «Controles» | 11, 16, 45 |
| N6 | Nombres de negocio de «Legal tipo B», «ROI» y de las gravedades de las señales | 9, 13 |
| N7 | Qué código del sistema ve el usuario (`internal_id` o `code`) | 5, 24 |
| N8 | Marcos que se presentan comercialmente como cubiertos | 7, 18 |
| N9 | Funciones de `platform_admin` y `partner` | — |
| N10 | Qué roles pueden aprobar o reabrir expedientes y AISIA, y guardar informes como evidencia | — |
| N11 | Si las conversaciones del asistente son de la organización o de cada persona | 43 |
| N12 | Formato de importación en CloudFramework | 1 |
