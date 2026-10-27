---
id: FUN-AJUSTES
titulo: Ajustes
tipo: funcional
modulo: transversal
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/ajustes/page.tsx
  - apps/web/app/(app)/ajustes/actions.ts
  - apps/web/app/(app)/ajustes/tabs/mi-cuenta.tsx
  - apps/web/app/(app)/ajustes/tabs/notificaciones.tsx
  - apps/web/app/(app)/ajustes/tabs/sesiones.tsx
  - apps/web/app/(app)/ajustes/tabs/auditoria.tsx
  - apps/web/app/(app)/ajustes/tabs/seguridad.tsx
  - apps/web/app/(app)/ajustes/tabs/api-keys.tsx
  - apps/web/app/(app)/ajustes/tabs/webhooks.tsx
  - apps/web/app/(app)/ajustes/tabs/conectores.tsx
  - apps/web/app/(app)/ajustes/tabs/canales.tsx
  - apps/web/app/(app)/ajustes/tabs/aprobaciones.tsx
  - apps/web/app/(app)/ajustes/tabs/shared.tsx
  - apps/web/lib/auth/scopes.ts
  - apps/web/lib/outbox/events.ts
  - apps/web/lib/approvals/catalog.ts
  - apps/web/lib/channels/send.ts
  - supabase/migrations/20261020150100_aprobaciones_politicas_defecto.sql
  - supabase/migrations/20261020160000_aprobaciones_caducidad.sql
  - supabase/migrations/20261020170100_aprobaciones_consultas_condiciones.sql
  - apps/web/lib/approvals/coverage.ts
---

# Ajustes

Configuración personal (cuenta, avisos y sesiones) y del espacio de trabajo de la organización: registro
de auditoría, seguridad, claves API, webhooks, conectores, canales de aviso y políticas de aprobación.

## Propósito

Agrupar en un solo lugar la configuración técnica de la organización: cómo se integra con otros
sistemas, a dónde envía avisos y quién aprueba qué. También las preferencias personales de cada miembro.

## Acceso y permisos

- **Ruta:** `/ajustes`
- **Navegación:** **Configuración › Ajustes**, o menú de usuario de la barra superior › **Ajustes**.
- **Disponibilidad:** Core.

| Grupo | Pestañas | Quién las ve |
|---|---|---|
| **Personal** | Mi cuenta · Notificaciones · Sesiones activas | Todos los roles |
| **Workspace** | Auditoría · Seguridad · API y desarrolladores · Webhooks · Conectores · Canales de aviso · Aprobaciones | Administrador. **Aprobaciones** también el Responsable del SGAI y el CAIO (B11c) |

Las delegaciones de aprobación se gestionan en [Aprobaciones](aprobaciones.md) › **Delegaciones**, donde
cualquier miembro puede delegar la suya (B11c).

> TODO: confirmar quién debe ver el resto de pestañas de Workspace. El Responsable del SGAI puede gestionar
> conectores y canales, pero no tiene acceso a esas pestañas.

## Campos

### Mi cuenta

Se guarda en `profiles.preferences.account`.

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Idioma de la interfaz** | selector | No | Español (por defecto) · English |
| **Zona horaria** | selector | No | 10 zonas de Europa y América, y UTC. Por defecto Madrid |
| **Formato de fecha** | opciones | No | DD/MM/AAAA (por defecto) · MM/DD/AAAA · AAAA-MM-DD |
| **Formato de hora** | opciones | No | 24 horas (por defecto) · 12 horas |
| **Densidad de la UI** | opciones | No | Cómoda (por defecto) · Compacta |
| **Inicio de semana** | opciones | No | Lunes (por defecto) · Domingo |

### Notificaciones

Se guarda en `profiles.preferences.notifications`.

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| Matriz de categorías × Email / In-app | interruptores | No | Asignaciones, Vencimientos, Menciones y comentarios, Evaluaciones (todos activos), Sistema (solo en la app) |
| **Resumen periódico por email** | selector | No | En tiempo real · Resumen diario (por defecto) · Resumen semanal · Nunca |
| **Hora de envío** | hora | No | Por defecto 09:00. Solo con resumen diario o semanal |

> TODO: confirmar la relación de estas preferencias con las de [Perfil](perfil.md).
> - Las pestañas Mi cuenta y Notificaciones duplican preferencias de Perfil con otro formato, y ninguna
>   de las dos versiones se aplica.
> - No existe envío de resúmenes.
> - Guardar el Perfil borra estas preferencias.

### Sesiones activas

Sesión actual (navegador, sistema, IP, última actividad) y lista de **Otros dispositivos**.

### Auditoría

| Elemento | Descripción |
|---|---|
| Registro de actividad | Eventos de `fluxion.audit_log`, de 25 en 25. Columnas: fecha, actor, acción, objetivo y detalle |
| Filtros | Periodo (Hoy, 7 días, 30 días por defecto, 90 días) y tipo de evento (Miembros, Organización, Seguridad) |
| **Políticas de retención** | Registro de auditoría (por defecto 36 meses), Evidencias (84) y Datos personales (60). Entre 1 y 240 meses. Columnas `organizations.*_retention_months` |

La vista advierte: «La eliminación automática no está activa aún».

> TODO: confirmar dos carencias del registro de auditoría.
> - El filtro no ofrece los eventos de claves API, webhooks, conectores, aprobaciones, seguridad ni
>   módulos.
> - Los eventos generados desde Ajustes aparecen con el actor «Sistema».

### Seguridad

Se guarda en `organizations.settings.security`.

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Exigir MFA a todos los miembros** | interruptor | No | Por defecto desactivado |
| **Dominios permitidos para invitaciones** | lista | No | Dominios del tipo «empresa.com» |
| **Tiempo máximo de sesión inactiva** | selector | No | Sin límite (por defecto) · 30 minutos · 1, 4, 8 o 24 horas |

> **Pendiente de implementar.** Aplicación de estos tres ajustes. Hoy se guardan y quedan en el registro
> de auditoría, pero ninguna parte de la aplicación los aplica.

### API y desarrolladores

Lista de [claves API](../glosario.md#clave-api) activas con su prefijo, permisos, caducidad y último uso.

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Nombre** | texto | Sí | Por ejemplo, «Conector MLflow» |
| **Expiración** | selector | No | Sin expiración (por defecto) · 30 días · 90 días · 6 meses · 1 año |
| **Permisos** | casillas | Sí, al menos uno | Ver tabla de permisos. Por defecto, Publicar señales |

| Permiso | Clave | Para qué |
|---|---|---|
| Publicar señales | `signals:write` | Enviar eventos de monitorización (módulos y conectores) |
| Enviar telemetría | `telemetry:write` | Trazas de llamadas a modelos, sin contenido de prompts |
| Registrar decisiones humanas | `hitl:write` | Decisiones de supervisión humana, con referencias seudonimizadas |
| Leer señales | `signals:read` | Consultar señales recibidas |
| Leer sistemas de IA | `inventory:read` | Consultar el inventario y su clasificación |
| Escribir en inventario | `inventory:write` | Registrar sistemas detectados y hallazgos |
| Sincronizar conectores | `connectors:sync` | Leer la configuración de conectores, credenciales incluidas, y reportar sincronizaciones. Solo para conectores |

> **Pendiente de implementar.** Endpoints de lectura para los permisos **Leer señales** y **Leer
> sistemas de IA**.

### Webhooks

[Integraciones salientes](../glosario.md#integración-saliente-webhook).

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Nombre** | texto | Sí | — |
| **URL del endpoint** | URL | Sí | — |
| **Eventos** | casillas | Sí | **Con emisor:** aprobación pendiente, concedida, rechazada y cancelada; tarea completada. **Marcados «aún sin emisor»:** evaluación completada y aprobada; GAP creado y cerrado; sistema de IA creado; miembro invitado, rol cambiado, miembro desactivado y miembro eliminado |

Las entregas se firman con HMAC-SHA256 en la cabecera `X-Fluxion-Signature`. El detalle está en el
documento técnico de webhooks.

> TODO: confirmar dos carencias de los webhooks.
> - Un webhook no se puede editar ni desactivar: solo crear y eliminar.
> - La fecha de «Último envío» no se actualiza.

### Conectores

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Tipo** | selector | Sí | MLflow · GitHub · GitLab. No se puede cambiar al editar |
| **Nombre** | texto | Sí | — |
| **URL del servidor** | URL | Sí | Se propone según el tipo |
| **Autenticación** | selector | — | MLflow: usuario y contraseña, o sin autenticación. GitHub y GitLab: token de acceso |
| **Organización o grupo** | texto | Sí, con token | Cuenta que se escanea |
| **Token de solo lectura** / **Usuario** y **Contraseña** | password / texto | Según el tipo | Se guardan cifrados en Vault y no se vuelven a mostrar. Vacío al editar = se conserva |
| **Frecuencia de sincronización** | selector | — | Cada 5 minutos · 15 minutos (por defecto) · 1 hora · 6 horas · una vez al día |
| **Conexión activa** | casilla | — | Por defecto activa |

### Canales de aviso

[Avisos a Slack/Teams](../glosario.md#aviso-a-slackteams).

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Plataforma** | selector | Sí | Slack (por defecto) · Microsoft Teams |
| **Nombre** | texto | Sí | Por ejemplo, «#cumplimiento-ia» |
| **URL del webhook** | password | Sí al crear | Debe empezar por `https://`. Se guarda cifrada en Vault |
| **Avisos que recibe** | casillas | No | Incidente registrado · Mitad del plazo de notificación · 80 % del plazo consumido · Plazo de notificación vencido · Presupuesto de IA superado · Sube la discordancia humana. Sin marcar = todos |
| **Canal activo** | casilla | — | Por defecto activo |

### Aprobaciones

[Flujos de aprobación](../glosario.md#flujos-de-aprobación).

| Campo | Tipo | Obligatorio | Descripción y valores |
|---|---|---|---|
| **Tipo de objeto** | selector | Sí | Plan de tratamiento (por defecto) · Documento regulatorio · Declaración de Aplicabilidad · Evidencia · Exclusión de gap. No se puede cambiar al editar. La AISIA es un documento regulatorio (plantilla AISIA, B15) |
| **Nombre** | texto | Sí | — |
| **Se aplica a los niveles** | botones | No | Solo para planes de tratamiento: Nivel 1, 2 o 3. Sin marcar = todos |
| **Se aplica a las plantillas** | botones | No | Solo para documentos: Anexo IV, FRIA, DPIA, Ficha del modelo o AISIA. Sin marcar = todas |
| **Se aplica a los gaps** | botones | No | Solo para exclusiones de gaps (B11d): Riesgo sin tratar, Obligación sin cubrir, Control sin implantar, Evidencia caducada. Sin marcar = todas. Las capas que no gobierne ninguna política se excluyen sin aprobación |
| **Cadena de aprobación** | lista de pasos | Al menos uno de aprobación sin condición | Cada paso indica: el tipo, **Aprobación** o **Consulta (dictamen)** (B11d); **Por rol**, **Persona concreta**, **Comité concreto**, **Comité por tipo** o **Función de gobierno**; el aprobador o consultado; el **Quórum** (comités; en los comités por tipo, vacío = el del comité); el **Rol de respaldo** (comités por tipo y funciones, solo en pasos de aprobación: una consulta sin nadie a quien consultar se omite); en los planes, **Solo si el plan tiene controles de seguridad** (B11d); y **Admite delegación** (por defecto sí) |
| **Quien solicita puede aprobar** | casilla | No | Por defecto no (segregación de funciones) |
| **Activa** | casilla | No | Por defecto activa. Puede haber varias activas por tipo de objeto si tienen condiciones distintas; se aplica la más específica. Cada tipo conserva al menos una activa |

**Políticas por defecto (B11b).** Cada organización recibe al crearse una política por tipo de objeto con el
mapa de aprobaciones de DP-01, marcada **Por defecto**: plan nivel 1, Responsable del SGAI; nivel 2, Comité de
Riesgos de IA; nivel 3, Revisión por la Dirección; AISIA y FRIA, Comité de IA; DPIA, Responsable del
tratamiento; Anexo IV, ficha del modelo y evidencias, Responsable del SGAI; Declaración de Aplicabilidad,
Revisión por la Dirección; exclusión de brechas «Riesgo sin tratar» y «Obligación sin cubrir», Responsable del
SGAI. Con consultas previas (B11d): DPO en la AISIA, la FRIA y la DPIA; CISO, si el plan tiene controles de
seguridad, en los niveles 1 y 2. Se pueden editar como cualquier otra.

En la lista, cada paso se describe como «[Consulta · ]{aprobador}[ · solo si el plan tiene controles de
seguridad]», y las consultas por función o comité indican «(si no hay, se omite)».

**Comité por tipo y función de gobierno.** Al abrir cada solicitud se resuelven al comité activo de ese tipo
(con su quórum, o la mayoría de los miembros con voto) o a la persona designada en Organización ›
Gobernanza. Si el comité no está constituido o no tiene miembros con voto, o la función está sin designar,
decide el rol de respaldo (por defecto, el Responsable del SGAI; en la Revisión por la Dirección, un
Directivo). La resolución queda congelada en la solicitud.
| **Caducidad de las solicitudes (días)** | número | No | Vacío = no caduca. Si nadie decide en ese plazo, la solicitud caduca, el objeto vuelve a borrador y se avisa (B11c) |

Los seis tipos de objeto abren solicitudes con estas políticas (B11a, B11d); ver [Aprobaciones](aprobaciones.md).

**Validación (B11d):** «La política necesita al menos un paso de aprobación sin condición: las consultas no
deciden.»

**Cobertura del plan y del expediente (B11e, B11f).** Al guardar, desactivar o borrar una política de planes
o de expedientes, cada nivel del plan y cada plantilla del expediente tiene que seguir cubierto por una
política activa cuyas condiciones solo miren esa clave (sin condiciones = todos). Si no: «Los planes de
{niveles} se quedarían sin política de aprobación y no se podrían enviar. Crea o activa antes otra política
que cubra ese nivel.» o «Los expedientes {plantillas} se quedarían sin política de aprobación y no se podrían
enviar. Crea o activa antes otra política que cubra esa plantilla.»

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **Guardar cambios** (Mi cuenta, Notificaciones) | El propio usuario | `updateAccountPrefs`, `updateNotificationPrefs` | Actualizan sus preferencias. Sin auditoría |
| **Revocar** (sesión) | El propio usuario | `revokeSession` | Cierra esa sesión |
| **Cerrar todas las demás** | El propio usuario | Pide confirmación y ejecuta `revokeAllOtherSessions` | Cierra el resto de sesiones. Sin auditoría |
| Guardar retención | Administrador | `updateRetentionPolicy` | Sin auditoría |
| Guardar seguridad | Administrador | `updateSecuritySettings` | Auditoría `org.security_updated` |
| **Generar clave** | Administrador | `createApiKey` | Genera `flx_…`, guarda solo su hash y la muestra una vez. Auditoría `api_key.created` |
| **Revocar** (clave) | Administrador | Pide confirmación y ejecuta `revokeApiKey` | La clave deja de funcionar. Auditoría `api_key.revoked` |
| **Crear webhook** | Administrador | `createWebhook` | Genera el secreto `whsec_…` y lo muestra una vez. Auditoría `webhook.created` |
| **Probar** (webhook) | Administrador | `testWebhook`: envío firmado de prueba | Muestra el código de respuesta. Auditoría `webhook.tested` |
| **Eliminar** (webhook) | Administrador | `deleteWebhook` | Auditoría `webhook.deleted` |
| **Crear conexión** / **Guardar cambios** | Administrador | `saveConnectorConnection` | Credencial en Vault. Auditoría `connector.created` / `connector.updated` |
| **Sincronizar ahora** | Administrador | `requestConnectorSync` | El conector sincroniza en su siguiente sondeo. Auditoría `connector.sync_requested` |
| **Historial de sincronizaciones** | Administrador | Muestra las 8 últimas con su resultado y cifras | — |
| Eliminar conexión | Administrador | Pide confirmación y ejecuta `deleteConnectorConnection` | Borra también la credencial. Auditoría `connector.deleted` |
| **Crear canal** / **Guardar cambios** | Administrador | `saveNotificationChannel` | URL en Vault. Sin auditoría |
| **Enviar mensaje de prueba** | Administrador | `testNotificationChannel` | Envía «Prueba de canal · Fluxion» y lo registra en el historial de envíos |
| **Historial de envíos** | Administrador | Muestra los 8 últimos envíos con estado, intentos y error | — |
| Eliminar canal | Administrador | Pide confirmación y ejecuta `deleteNotificationChannel` | Sin auditoría |
| **Guardar** (política) | Administrador | `saveApprovalPolicy` | Las solicitudes en curso conservan su copia de la política. Auditoría `approval_policy.saved` |
| Eliminar política | Administrador | Pide confirmación y ejecuta `deleteApprovalPolicy`. No se permite con solicitudes en curso | Auditoría `approval_policy.deleted` |
| **Delegar** / retirar delegación | Administrador (sobre sí mismo) | `saveApprovalDelegation`, `deleteApprovalDelegation` | Auditoría `approval_delegation.created` / `approval_delegation.revoked` |

## Validaciones

| Situación | Mensaje |
|---|---|
| Clave API sin permisos | «Selecciona al menos un permiso.» |
| Conector sin nombre | «El nombre es obligatorio.» |
| URL de conector incorrecta | «La URL debe empezar por http:// o https://» |
| Conector con token sin organización | «Indica la organización o grupo a escanear.» |
| Autenticación básica sin usuario | «Con autenticación básica el usuario es obligatorio.» |
| URL de canal incorrecta | «La URL del webhook debe empezar por https://» |
| Canal nuevo sin URL | «La URL del webhook es obligatoria al crear el canal.» |
| Política sin pasos | «Una política sin pasos no aprueba nada. Añade al menos uno.» |
| Paso sin aprobador | «El paso {n} no tiene aprobador.» |
| Comité sin quórum | «El paso {n} es de comité y necesita un quórum de al menos 1.» |
| Segunda política activa con las mismas condiciones | «Ya hay una política activa para ese tipo de objeto con las mismas condiciones. Desactívala o cambia las condiciones.» |
| Desactivar o borrar la única activa de un tipo | «Es la única política activa de este tipo de objeto. Crea o activa otra antes: sin ninguna, se aprobaría fuera del circuito.» |
| Quórum de un comité por tipo menor que 1 | «El quórum del paso N debe ser al menos 1, o quedar vacío para usar el del comité.» |
| Política con solicitudes en curso | «Hay solicitudes en curso con esta política. Desactívala en vez de borrarla.» |
| Delegación sin fecha de fin | «La fecha de fin es obligatoria: una delegación sin caducidad no es una delegación.» |
| Delegación en uno mismo | «No tiene sentido delegar en uno mismo.» |
| Fin anterior al inicio | «La fecha de fin no puede ser anterior a la de inicio.» |

## Estados

| Objeto | Estados |
|---|---|
| Clave API | Activa · Expirada · Revocada |
| Webhook | Activo · Inactivo |
| Conexión | Activa / inactiva. Última sincronización: Correcta, Con incidencias, Con error o Sin sincronizar todavía |
| Canal | Activo / inactivo. Envíos: pendiente, enviado, fallido o abandonado |
| Política de aprobación | Activa · Inactiva |
| Delegación | Vigente · Fuera de vigencia |

> TODO: confirmar el texto «Se eliminan automáticamente tras 90 días» de las claves revocadas. No se ha
> encontrado ningún proceso que las borre.

## Vistas relacionadas

- [Perfil](perfil.md): preferencias personales equivalentes.
- [Usuarios](usuarios.md): historial de roles.
- [Organización](organizacion.md): comités que actúan como aprobadores y retenciones.
- [Sistemas detectados](descubrimientos.md): resultado de los conectores.
- [Aprobaciones](aprobaciones.md): solicitudes que crean las políticas.
- Negocio: [Plataforma](../negocio/plataforma.md),
  [Flujos de aprobación](../negocio/flujos-de-aprobacion.md),
  [Descubrimiento de inventario](../negocio/descubrimiento-inventario.md).
