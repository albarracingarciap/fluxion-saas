---
id: FUN-SUPERVISION
titulo: Supervisión humana
tipo: funcional
modulo: supervision-post-comercializacion
audiencia: tecnica
version: 0.1
fuente:
  - apps/web/app/(app)/supervision/page.tsx
  - apps/web/lib/hitl/data.ts
  - apps/web/app/api/ingest/v1/hitl-decisions/route.ts
  - apps/web/app/api/cron/hitl-discordance/route.ts
  - supabase/migrations/20260825090000_hitl_decisions.sql
  - supabase/migrations/20260825120000_hitl_overview.sql
  - supabase/migrations/20260826090000_hitl_discordance_spikes.sql
---

# Supervisión humana

Panel de [supervisión humana](../glosario.md#supervisión-humana): cómo las personas usan las propuestas de
los sistemas de IA.

## Propósito

Aportar la prueba de que las decisiones de la IA se revisan de verdad. La vista dice: «La pregunta que
hace un auditor no es si hay supervisión, sino cuántas veces la persona ha estado en desacuerdo con la
máquina.» (AI Act, Art. 14).

## Acceso y permisos

- **Ruta:** `/supervision`
- **Menú:** **Supervisión humana**. Aparece siempre.
- **Disponibilidad:** módulo Supervisión post-comercialización.

| Rol | Ver | Acciones permitidas |
|---|---|---|
| Todos los roles | Datos de la organización | Solo consulta |

> **Pendiente de implementar.** Acceso condicionado a la activación del módulo.

## Campos

**Periodo:** **30 días**, **90 días** (por defecto) o **180 días**.

| Bloque | Contenido |
|---|---|
| **Decisiones revisadas** | Total, con número de sistemas y de revisores |
| **Tasa de concordancia** | Decisiones aceptadas sobre el total. Subtexto: discordancias y veces que no se usó el sistema. En color de aviso desde el 98 % |
| **Tiempo mediano** | Mediana del tiempo de decisión. «Una decisión de dos segundos no es supervisión». En color de aviso por debajo de 5 s |
| **Discordancias sin motivo** | Discordancias sin motivo declarado: «Sin motivo no hay nada que analizar» |
| **Decisiones por día** | Barras, con la parte de discordancias en oscuro |
| **Por sistema** | Sistema (enlace a la [Ficha del sistema](ficha-sistema.md)), % de concordancia, número y mediana |
| **Por revisor** | Referencia y rol del revisor; en naranja si muestra indicios de sesgo |
| **Por qué la persona no siguió a la máquina** | Motivos de discordancia y su frecuencia |

**Indicios de sesgo de automatización** (AI Act, Art. 14.4.b): aviso por revisor con al menos 20
decisiones, al menos 98 % de concordancia y mediana por debajo de 5 segundos. «No es una acusación…»

**Tipos de decisión** (`hitl_decisions.decision`):

| Decisión | Valor | Cuenta como |
|---|---|---|
| Aceptada | `accepted` | Concordancia |
| Modificada | `modified` | Discordancia |
| Anulada | `overridden` | Discordancia |
| No usada | `not_used` | Discordancia |

**Motivos predefinidos:**

| Grupo | Motivos |
|---|---|
| Error del modelo | Error del modelo · Confianza insuficiente |
| Falta de contexto | Contradice el contexto · Datos desactualizados |
| Criterio humano | Criterio profesional · Reparo ético o de equidad |
| Proceso | Restricción normativa · Excepción del proceso |
| Otros | Otro |

**Origen de los datos:**
- Las decisiones llegan por la API de ingesta (`POST /api/ingest/v1/hitl-decisions`), en lotes de 1 a 100.
- Se envían con una [clave API](../glosario.md#clave-api) con el permiso **Registrar decisiones humanas**.
- Solo se admiten referencias seudonimizadas. Se rechazan los metadatos que parecen contenido del caso.

Si no hay datos: «Todavía no hay decisiones registradas.», con las instrucciones de envío.

**Alerta de discordancia:** cada día se comparan los últimos 7 días de cada sistema con los 60 anteriores.
Si la discordancia sube al menos 8 puntos, con un mínimo de 30 decisiones recientes y 50 de referencia:
- se registra una [señal de riesgo](../glosario.md#señal-de-riesgo);
- se envía un [aviso a Slack/Teams](../glosario.md#aviso-a-slackteams) «Sube la discordancia en
  {sistema}».

> TODO: confirmar varios datos del panel.
> - **Orden de las listas:** por sistema, por revisor y por motivo se ordenan como texto («9» antes que
>   «10»).
> - **Decisiones «no usada»:**
>   - cuentan como discordancias;
>   - en el subtexto de la tasa se presentan aparte, aunque se solapan;
>   - también cuentan en «Discordancias sin motivo».
> - **Días sin datos:** no aparecen en el gráfico.
> - **Motivos no reconocidos:** si un motivo enviado no está en el catálogo, aparece como «Sin motivo
>   declarado».
> - **Motivos propios:** no hay pantalla para definirlos.

## Acciones

| Acción | Quién | Qué hace | Efectos |
|---|---|---|---|
| **30 días** / **90 días** / **180 días** | Todos | Cambia el periodo | — |

## Validaciones

Las de la API de ingesta:
- sistema de la organización;
- tipo de decisión válido;
- confianza entre 0 y 1;
- metadatos sin contenido del caso.

Las decisiones repetidas, con la misma clave de deduplicación, se ignoran.

## Estados

No aplica.

## Vistas relacionadas

- [Ficha del sistema](ficha-sistema.md), [Expediente documental](expediente-documental.md): la supervisión
  registrada alimenta los apartados de supervisión humana.
- [Ajustes](ajustes.md), para las claves API.
- Negocio: [Supervisión post-comercialización](../negocio/supervision-post-comercializacion.md).
