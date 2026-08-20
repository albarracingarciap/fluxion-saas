# Tareas programadas

## Por qué existe esta carpeta

Hasta el cutover a Dokploy, estos dos trabajos los disparaba **Vercel Cron** desde
`vercel.json`. Al dejar Vercel, ese fichero quedó inerte y **los dos dejaron de
ejecutarse sin que nadie se diera cuenta**: ni alertas de caducidad de evidencias
ni recordatorios de revisión.

Mismo patrón que `pg_cron`, los buckets de Storage y el trigger de `auth.users`:
cosas que vivían fuera del código y que un cambio de plataforma se llevó por delante.

## Los trabajos

| Endpoint | Cuándo | Qué hace |
|---|---|---|
| `GET /api/cron/evidence-expiry` | Diario, 07:00 UTC | Evidencias que caducan en ≤30 y ≤7 días → notificaciones |
| `GET /api/cron/review-reminders` | Lunes, 08:00 UTC | Revisiones periódicas vencidas o próximas → resumen por organización |
| `GET /api/cron/incident-deadlines` | **Cada hora**, minuto 17 | Plazos del art. 73 al 50 %, al 80 % y vencidos → campana y canales |
| `GET /api/cron/cost-budgets` | **Cada hora**, minuto 40 | Presupuestos de gasto en IA al cruzar cada umbral → señal y canales |
| `GET /api/cron/hitl-discordance` | Diario, 06:30 UTC | Sistemas cuya discordancia humana sube sobre su línea base → señal y canales |

### Por qué el de presupuestos también es horario

El gasto en modelos no crece despacio cuando algo va mal: un bucle de
reintentos mal puesto o un agente que se llama a sí mismo queman el presupuesto
de un mes en una tarde. Enterarse a la mañana siguiente es enterarse tarde.

Es idempotente igual que el de incidentes: `cost_budget_alerts` guarda qué
umbral se avisó de cada presupuesto y periodo.

### Por qué el de incidentes es horario

Los otros dos avisan de cosas que se miden en semanas. El del artículo 73 vigila
un plazo que en el peor caso es de **2 días naturales** (art. 73.3, infraestructuras
críticas o infracción generalizada). Con una pasada diaria, un aviso al 80 % del
plazo podría llegar hasta 24 horas tarde sobre una ventana de 48. Ahí el retraso
no es una molestia: es el incumplimiento.

Es idempotente por diseño: `incident_deadline_alerts` guarda qué umbral
(`half` / `urgent` / `overdue`) se avisó ya de cada incidente, así que las 24
ejecuciones diarias producen como mucho tres avisos por incidente. Se puede
ejecutar a mano sin miedo a duplicar.

Ambos aceptan `Authorization: Bearer $CRON_SECRET`. Ojo: la comprobación en el
código es `if (cronSecret && ...)`, de modo que **si `CRON_SECRET` no está definida
en el servicio, los endpoints quedan abiertos**. Defínela.

## Instalación en el VPS

```bash
# 1. Configuración
mkdir -p /etc/fluxion
cat > /etc/fluxion/cron.env <<'EOF'
FLUXION_WEB_URL=https://<dominio-de-la-app>
CRON_SECRET=<mismo valor que la variable CRON_SECRET de fluxion-web en Dokploy>
EOF
chmod 600 /etc/fluxion/cron.env

# 2. Script
mkdir -p /opt/fluxion
cp infra/schedules/app-cron.sh /opt/fluxion/
chmod +x /opt/fluxion/app-cron.sh

# 3. Prueba manual antes de programar nada
/opt/fluxion/app-cron.sh /api/cron/evidence-expiry
tail -5 /var/log/fluxion-cron.log

# 4. Programación
crontab -l 2>/dev/null | { cat; cat infra/schedules/crontab; } | crontab -
crontab -l
```

Si prefieres usar **Schedules de Dokploy** en lugar de cron del sistema, el comando
a programar es el mismo (`/opt/fluxion/app-cron.sh /api/cron/...`) y ganas los logs
en el panel. Es indiferente para la app.

## Comprobar que están programados

**Escribir este fichero en el repositorio no instala nada.** Pasó: los cuatro
trabajos estuvieron documentados y sin programar desde el 11 hasta el 23 de
agosto de 2026, funcionando solo cuando se lanzaban a mano para probarlos. El
`crontab -` que los instalaba nunca llegó a ejecutarse, y un aviso que no salta
es indistinguible de un aviso que no hacía falta.

```bash
# ¿Están los cuatro?
crontab -l | grep -c 'app-cron.sh'      # 4

# ¿Cuándo corrió cada uno por última vez?
for e in evidence-expiry review-reminders incident-deadlines cost-budgets; do
  printf '%-20s ' "$e"
  grep "$e" /var/log/fluxion-cron.log | tail -1 | cut -c1-25 || echo "NUNCA"
done
```

Los tres horarios deben tener una marca de hace menos de una hora. Si alguno
dice `NUNCA` o lleva días sin aparecer, no está corriendo por mucho que la línea
figure en el `crontab`.

## Verificación

```bash
tail -20 /var/log/fluxion-cron.log
```

Cada línea lleva fecha ISO, endpoint, código HTTP y el principio de la respuesta.
Un `HTTP 401` significa que `CRON_SECRET` no coincide con la del servicio.

El de incidentes devuelve un recuento aunque no haya hecho nada
(`{"checkedAt":…,"withOpenDeadline":0,"thresholdsAlerted":0,…}`). Es deliberado: **un trabajo programado que no deja rastro
cuando no encuentra trabajo es indistinguible de un trabajo que ha dejado de
ejecutarse**. Si en el log falta una hora entera de `incident-deadlines`, el cron
está caído, no es que no hubiera incidentes.

## Nota

`vercel.json` se eliminó en la reestructuración a monorepo. No lo recuperes: era
la causa de que estos trabajos pareciesen configurados sin estarlo.
