'use server';

import { revalidatePath } from 'next/cache';

import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import {
  NOTICE_RECIPIENTS,
  NOTICE_RECIPIENT_LABEL,
  SUSPENSION_NOTICES,
  noticeChecks,
  type NoticeCheck,
  type NoticeRecipient,
} from '@/lib/ai-systems/notices';
import { logAuditEvent } from '@/lib/audit';
import { hasAnyRole } from '@/lib/auth/roles';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

/**
 * Uso suspendido (B25a, AI Act, Art. 26.5): el responsable del despliegue
 * suspende el uso de un sistema y deja constancia de los avisos al proveedor
 * o distribuidor y a la autoridad. El sistema conserva su estado. La
 * gestionan los mismos roles que los responsables del sistema.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'system_owner'] as const;
const SIN_PERMISO = 'Solo el Administrador, el Responsable del SGAI o el Responsable del sistema suspenden o reanudan el uso.';

async function ctx() {
  const supabase = createClient();
  const fluxion = createFluxionClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id, full_name, email, role, roles')
    .eq('user_id', user.id)
    .single();
  return profile ? { fluxion, profile, userId: user.id } : null;
}

export type SuspensionNotice = {
  id: string;
  recipient: NoticeRecipient;
  recipientLabel: string;
  recipientName: string | null;
  notifiedAt: string;
  channel: string | null;
  reference: string | null;
  evidenceTitle: string | null;
};

export type SuspensionView = {
  id: string;
  suspendedAt: string;
  reason: string;
  incident: { id: string; reference: string; title: string } | null;
  resumedAt: string | null;
  resumeNotes: string | null;
  notices: SuspensionNotice[];
  checks: NoticeCheck[];
};

export type SystemSuspension = {
  canEdit: boolean;
  active: SuspensionView | null;
  past: SuspensionView[];
  incidents: Array<{ id: string; reference: string; title: string }>;
  evidences: Array<{ id: string; title: string }>;
};

type SuspensionRow = {
  id: string; suspended_at: string; reason: string; incident_id: string | null
  resumed_at: string | null; resume_notes: string | null
};
type NoticeRow = {
  id: string; suspension_id: string; recipient: NoticeRecipient; recipient_name: string | null
  notified_at: string; channel: string | null; reference: string | null; evidence_id: string | null
};

export async function getSystemSuspension(systemId: string): Promise<SystemSuspension | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile } = c;
  const orgId = profile.organization_id as string;

  const [{ data: suspensiones }, { data: vinculos }, { data: evidencias }] = await Promise.all([
    fluxion.from('system_use_suspensions')
      .select('id, suspended_at, reason, incident_id, resumed_at, resume_notes')
      .eq('organization_id', orgId)
      .eq('ai_system_id', systemId)
      .order('suspended_at', { ascending: false }),
    fluxion.from('ai_incident_systems').select('incident_id').eq('organization_id', orgId).eq('ai_system_id', systemId),
    fluxion.from('system_evidences')
      .select('id, title')
      .eq('organization_id', orgId)
      .or(`ai_system_id.eq.${systemId},scope.eq.organization`)
      .order('created_at', { ascending: false }),
  ]);
  const filas = (suspensiones ?? []) as SuspensionRow[];

  const incidentIds = Array.from(new Set([
    ...((vinculos ?? []) as Array<{ incident_id: string }>).map((v) => v.incident_id),
    ...filas.map((s) => s.incident_id).filter((id): id is string => Boolean(id)),
  ]));
  const [{ data: incidentes }, { data: avisos }] = await Promise.all([
    incidentIds.length
      ? fluxion.from('ai_incidents').select('id, reference, title').eq('organization_id', orgId).in('id', incidentIds)
      : Promise.resolve({ data: [] }),
    filas.length
      ? fluxion.from('external_notices')
          .select('id, suspension_id, recipient, recipient_name, notified_at, channel, reference, evidence_id')
          .eq('organization_id', orgId)
          .in('suspension_id', filas.map((s) => s.id))
          .order('notified_at')
      : Promise.resolve({ data: [] }),
  ]);
  const incidente = new Map(((incidentes ?? []) as Array<{ id: string; reference: string; title: string }>).map((i) => [i.id, i]));
  const evid = (evidencias ?? []) as Array<{ id: string; title: string }>;
  const tituloEvidencia = new Map(evid.map((e) => [e.id, e.title]));

  const vista = (s: SuspensionRow): SuspensionView => {
    const propios = ((avisos ?? []) as NoticeRow[]).filter((a) => a.suspension_id === s.id);
    return {
      id: s.id,
      suspendedAt: s.suspended_at,
      reason: s.reason,
      incident: s.incident_id ? incidente.get(s.incident_id) ?? null : null,
      resumedAt: s.resumed_at,
      resumeNotes: s.resume_notes,
      notices: propios.map((a) => ({
        id: a.id,
        recipient: a.recipient,
        recipientLabel: NOTICE_RECIPIENT_LABEL[a.recipient],
        recipientName: a.recipient_name,
        notifiedAt: a.notified_at,
        channel: a.channel,
        reference: a.reference,
        evidenceTitle: a.evidence_id ? tituloEvidencia.get(a.evidence_id) ?? null : null,
      })),
      checks: noticeChecks(SUSPENSION_NOTICES, propios),
    };
  };

  const activa = filas.find((s) => !s.resumed_at);
  return {
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    active: activa ? vista(activa) : null,
    past: filas.filter((s) => s.resumed_at).map(vista),
    incidents: ((vinculos ?? []) as Array<{ incident_id: string }>)
      .map((v) => incidente.get(v.incident_id))
      .filter((i): i is { id: string; reference: string; title: string } => Boolean(i)),
    evidences: evid,
  };
}

export async function suspendSystemUse(input: {
  systemId: string;
  suspendedAt: string;
  reason: string;
  incidentId: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile, userId } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) return { error: SIN_PERMISO };
  if (!input.reason.trim()) return { error: 'Indica el motivo de la suspensión.' };
  if (!input.suspendedAt) return { error: 'Indica la fecha de la suspensión.' };

  const { data: sistema } = await fluxion
    .from('ai_systems').select('id, name').eq('id', input.systemId).eq('organization_id', profile.organization_id).maybeSingle();
  if (!sistema) return { error: 'Sistema no encontrado.' };

  const { error } = await fluxion.from('system_use_suspensions').insert({
    organization_id: profile.organization_id,
    ai_system_id: input.systemId,
    suspended_at: input.suspendedAt,
    reason: input.reason.trim(),
    incident_id: input.incidentId || null,
    suspended_by: profile.id,
  });
  if (error) {
    if (error.code === '23505') return { error: 'El uso de este sistema ya está suspendido.' };
    return { error: 'No se pudo suspender el uso: ' + error.message };
  }

  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'use_suspended',
    event_title: 'Uso suspendido',
    event_summary: input.reason.trim(),
    payload: { suspended_at: input.suspendedAt, incident_id: input.incidentId || null },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.use_suspended',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: sistema.name,
    metadata: { suspended_at: input.suspendedAt, incident_id: input.incidentId || null },
  });

  revalidatePath('/inventario');
  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}

export async function recordSuspensionNotice(input: {
  systemId: string;
  suspensionId: string;
  recipient: NoticeRecipient;
  recipientName: string;
  notifiedAt: string;
  channel: string;
  reference: string;
  evidenceId: string | null;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile, userId } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) return { error: SIN_PERMISO };
  if (!NOTICE_RECIPIENTS.includes(input.recipient)) return { error: 'Destinatario no válido.' };
  if (!input.notifiedAt) return { error: 'Indica la fecha del aviso.' };

  const { data: suspension } = await fluxion
    .from('system_use_suspensions')
    .select('id, ai_system_id, suspended_at')
    .eq('id', input.suspensionId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();
  if (!suspension || suspension.ai_system_id !== input.systemId) return { error: 'Suspensión no encontrada.' };
  if (input.notifiedAt < suspension.suspended_at) return { error: 'El aviso no puede ser anterior a la suspensión.' };

  const { error } = await fluxion.from('external_notices').insert({
    organization_id: profile.organization_id,
    suspension_id: input.suspensionId,
    recipient: input.recipient,
    recipient_name: input.recipientName.trim() || null,
    notified_at: input.notifiedAt,
    channel: input.channel.trim() || null,
    reference: input.reference.trim() || null,
    evidence_id: input.evidenceId || null,
    created_by: profile.id,
  });
  if (error) return { error: 'No se pudo registrar el aviso: ' + error.message };

  const destinatario = NOTICE_RECIPIENT_LABEL[input.recipient] + (input.recipientName.trim() ? ` (${input.recipientName.trim()})` : '');
  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'use_suspension_notice',
    event_title: 'Aviso de la suspensión del uso',
    event_summary: `${destinatario}, ${new Date(input.notifiedAt).toLocaleDateString('es-ES')}.`,
    payload: { suspension_id: input.suspensionId, recipient: input.recipient, reference: input.reference.trim() || null },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.notice_recorded',
    target_type: 'organization',
    target_id: input.systemId,
    target_label: destinatario,
    metadata: { suspension_id: input.suspensionId, recipient: input.recipient },
  });

  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}

export async function resumeSystemUse(input: {
  systemId: string;
  suspensionId: string;
  resumedAt: string;
  notes: string;
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx();
  if (!c) return { error: 'No autenticado.' };
  const { fluxion, profile, userId } = c;
  if (!hasAnyRole(profile, EDIT_ROLES)) return { error: SIN_PERMISO };
  if (!input.resumedAt) return { error: 'Indica la fecha en que se reanuda el uso.' };
  if (!input.notes.trim()) return { error: 'Indica por qué se puede reanudar el uso.' };

  const { data: suspension } = await fluxion
    .from('system_use_suspensions')
    .select('id, ai_system_id, suspended_at, resumed_at')
    .eq('id', input.suspensionId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle();
  if (!suspension || suspension.ai_system_id !== input.systemId || suspension.resumed_at) {
    return { error: 'No hay una suspensión activa que reanudar.' };
  }
  if (input.resumedAt < suspension.suspended_at) return { error: 'La reanudación no puede ser anterior a la suspensión.' };

  const { data: actualizada, error } = await fluxion
    .from('system_use_suspensions')
    .update({ resumed_at: input.resumedAt, resume_notes: input.notes.trim(), resumed_by: profile.id })
    .eq('id', input.suspensionId)
    .eq('organization_id', profile.organization_id)
    .is('resumed_at', null)
    .select('id');
  if (error) return { error: 'No se pudo reanudar el uso: ' + error.message };
  if (!actualizada || actualizada.length === 0) return { error: SIN_PERMISO };

  await insertAiSystemHistoryEvents(fluxion, [{
    ai_system_id: input.systemId,
    organization_id: profile.organization_id,
    event_type: 'use_resumed',
    event_title: 'Uso reanudado',
    event_summary: input.notes.trim(),
    payload: { suspension_id: input.suspensionId, resumed_at: input.resumedAt },
    actor_user_id: userId,
  }]);
  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'system.use_resumed',
    target_type: 'organization',
    target_id: input.systemId,
    metadata: { suspension_id: input.suspensionId, resumed_at: input.resumedAt },
  });

  revalidatePath('/inventario');
  revalidatePath(`/inventario/${input.systemId}`);
  return { ok: true };
}
