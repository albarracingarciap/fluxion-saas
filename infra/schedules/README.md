# Tareas programadas

## Por qué existe esta carpeta

Hasta el cutover a Dokploy, estos dos trabajos los disparaba **Vercel Cron** desde
`vercel.json`. Al dejar Vercel, ese fichero quedó inerte y **los dos dejaron de
ejecutarse sin que nadie se diera cuenta**: ni alertas de caducidad de evidencias
ni recordatorios de revisión.

Mismo patrón que `pg_cron`, los buckets de Storage y el trigger de `auth.users`:
cosas que vivían fuera del código y que un cambio de plataforma se llevó por delante.

## Los dos trabajos

| Endpoint | Cuándo | Qué hace |
|---|---|---|
| `GET /api/cron/evidence-expiry` | Diario, 07:00 UTC | Evidencias que caducan en ≤30 y ≤7 días → notificaciones |
| `GET /api/cron/review-reminders` | Lunes, 08:00 UTC | Revisiones periódicas vencidas o próximas → resumen por organización |

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

## Nota

`vercel.json` se eliminó en la reestructuración a monorepo. No lo recuperes: era
la causa de que estos trabajos pareciesen configurados sin estarlo.
