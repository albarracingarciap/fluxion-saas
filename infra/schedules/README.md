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
