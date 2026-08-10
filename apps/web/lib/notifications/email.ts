/**
 * lib/notifications/email.ts
 * Wrapper de Resend para envío de emails de notificaciones.
 * Si RESEND_API_KEY no está configurada, los emails se omiten silenciosamente.
 * Los errores nunca bloquean la operación principal.
 */

import { Resend } from 'resend'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM_ADDRESS = process.env.RESEND_FROM_EMAIL ?? 'Fluxion <notificaciones@fluxion.ai>'
const APP_URL      = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.fluxion.ai'

export interface TaskEmailParams {
  to:          string          // email del destinatario
  type:        string          // tipo de evento
  recipientName?: string
  taskTitle:   string
  taskUrl:     string
  actorName?:  string          // quién hizo la acción
  extraLines?: string[]        // líneas adicionales de contexto
}

function buildTaskEmailHtml(p: TaskEmailParams): string {
  const eventLabels: Record<string, string> = {
    task_assigned:    'Se te ha asignado una tarea',
    mention:          'Te han mencionado en un comentario',
    comment_added:    'Nuevo comentario en una tarea que sigues',
    status_changed:   'Una tarea que sigues cambió de estado',
    attachment_added: 'Se añadió un adjunto a una tarea que sigues',
  }
  const subject  = eventLabels[p.type] ?? 'Actualización en Fluxion'
  const greeting = p.recipientName ? `Hola ${p.recipientName},` : 'Hola,'
  const actor    = p.actorName ? `<strong>${p.actorName}</strong>` : 'Un compañero'

  const bodyLines = [
    `${actor} ${subject.toLowerCase()}.`,
    ...(p.extraLines ?? []),
  ].join('<br>')

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:'Inter',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#00adef,#33c3f5);padding:24px 32px;">
            <span style="font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px;">Fluxion</span>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;color:#64748b;font-size:13px;">${greeting}</p>
            <p style="margin:0 0 20px;color:#1e293b;font-size:15px;line-height:1.6;">${bodyLines}</p>
            <!-- Task card -->
            <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:0 0 24px;">
              <p style="margin:0 0 4px;font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:0.5px;">Tarea</p>
              <p style="margin:0;font-size:14px;font-weight:600;color:#1e293b;">${p.taskTitle}</p>
            </div>
            <!-- CTA -->
            <a href="${p.taskUrl}"
               style="display:inline-block;background:linear-gradient(135deg,#00adef,#33c3f5);color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:13px;font-weight:600;">
              Ver tarea →
            </a>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:16px 32px;border-top:1px solid #e2e8f0;">
            <p style="margin:0;font-size:11px;color:#94a3b8;line-height:1.5;">
              Recibiste este email porque eres seguidor de esta tarea.
              Puedes gestionar tus preferencias de notificación en
              <a href="${APP_URL}/ajustes" style="color:#00adef;text-decoration:none;">Ajustes</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`.trim()
}

export async function sendTaskEmail(params: TaskEmailParams & { subject?: string }): Promise<void> {
  const resend = getResend()
  if (!resend || !params.to) return

  const eventLabels: Record<string, string> = {
    task_assigned:    'Se te ha asignado una tarea en Fluxion',
    mention:          'Te han mencionado en Fluxion',
    comment_added:    'Nuevo comentario en una tarea — Fluxion',
    status_changed:   'Actualización de tarea en Fluxion',
    attachment_added: 'Nuevo adjunto en una tarea — Fluxion',
  }

  try {
    await resend.emails.send({
      from:    FROM_ADDRESS,
      to:      params.to,
      subject: params.subject ?? eventLabels[params.type] ?? 'Notificación de Fluxion',
      html:    buildTaskEmailHtml(params),
    })
  } catch (err) {
    console.error('[email] Send error:', err)
  }
}
