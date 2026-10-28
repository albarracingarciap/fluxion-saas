'use server'

import { revalidatePath } from 'next/cache'

import { logAuditEvent } from '@/lib/audit'
import { hasAnyRole } from '@/lib/auth/roles'
import { SGAI_CLAUSES, SGAI_STATUS_LABEL, sgaiDataProposal, type SgaiFacts, type SgaiProposal, type SgaiStatus } from '@/lib/iso/management-system'
import { loadSgaiFacts } from '@/lib/iso/management-system-server'
import { obligationProposal } from '@/lib/obligations/proposals'
import { createComplianceClient } from '@/lib/supabase/compliance'
import { createAdminFluxionClient, createFluxionClient } from '@/lib/supabase/fluxion'
import { createClient } from '@/lib/supabase/server'

/**
 * Sistema de gestión ISO/IEC 42001 (B20a, DP-09): las cláusulas del catálogo
 * a nivel de organización, con estado, responsable, evidencias y propuestas.
 * Las editan el Administrador, el Responsable del SGAI y el Analista de
 * cumplimiento.
 */

const EDIT_ROLES = ['org_admin', 'sgai_manager', 'compliance_analyst'] as const
const ESTADOS: SgaiStatus[] = ['pending', 'in_progress', 'resolved']

async function ctx() {
  const supabase = createClient()
  const fluxion = createFluxionClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, user_id, organization_id, full_name, email, role, roles')
    .eq('user_id', user.id)
    .single()
  return profile ? { fluxion, profile } : null
}

export type SgaiObligationView = {
  id: string
  code: string
  clause: string
  title: string
  description: string
  status: SgaiStatus
  statusLabel: string
  ownerUserId: string | null
  ownerName: string | null
  dueDate: string | null
  notes: string
  resolutionNotes: string
  resolvedAt: string | null
  evidences: Array<{ id: string; title: string; status: string }>
  mandatoryTypes: string[]
  proposal: SgaiProposal | null
}

export type SgaiView = {
  canEdit: boolean
  facts: SgaiFacts
  obligations: SgaiObligationView[]
  members: Array<{ userId: string; name: string }>
  evidences: Array<{ id: string; title: string; status: string }>
}

export async function getSgaiView(): Promise<SgaiView | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  const { fluxion, profile } = c
  const orgId = profile.organization_id as string
  const compliance = createComplianceClient()

  const { data: catalogo } = await compliance
    .from('obligations')
    .select('id, code, article, title, description')
    .in('code', [...SGAI_CLAUSES])
  const cat = (catalogo ?? []) as Array<{ id: string; code: string; article: string; title: string; description: string | null }>

  // Las filas de la organización se crean la primera vez que se abre la vista.
  const { data: existentes } = await fluxion.from('organization_obligations').select('obligation_code').eq('organization_id', orgId)
  const tiene = new Set(((existentes ?? []) as Array<{ obligation_code: string }>).map((r) => r.obligation_code))
  const faltan = cat.filter((o) => !tiene.has(o.code))
  if (faltan.length > 0) {
    await createAdminFluxionClient().from('organization_obligations')
      .upsert(faltan.map((o) => ({ organization_id: orgId, obligation_code: o.code })), { onConflict: 'organization_id,obligation_code', ignoreDuplicates: true })
  }

  const [{ data: filas }, { data: vinculos }, { data: perfiles }, { data: evidencias }, { data: exigidos }, facts] = await Promise.all([
    fluxion.from('organization_obligations')
      .select('id, obligation_code, status, owner_user_id, due_date, notes, resolution_notes, resolved_at')
      .eq('organization_id', orgId),
    fluxion.from('organization_obligation_evidences')
      .select('obligation_id, system_evidences(id, title, status, evidence_type_id)')
      .eq('organization_id', orgId),
    fluxion.from('profiles').select('user_id, full_name, display_name, is_active').eq('organization_id', orgId),
    fluxion.from('system_evidences').select('id, title, status').eq('organization_id', orgId).order('created_at', { ascending: false }),
    compliance.from('obligation_evidence_types').select('obligation_id, requirement_level, evidence_types(id, name)')
      .eq('requirement_level', 'mandatory').in('obligation_id', cat.map((o) => o.id)),
    loadSgaiFacts(fluxion, orgId),
  ])

  const nombre = new Map(((perfiles ?? []) as Array<{ user_id: string; full_name: string | null; display_name: string | null }>)
    .map((p) => [p.user_id, p.display_name || p.full_name || 'Usuario']))
  type Ev = { id: string; title: string; status: string; evidence_type_id: string | null }
  const evDe = new Map<string, Ev[]>()
  for (const v of (vinculos ?? []) as unknown as Array<{ obligation_id: string; system_evidences: Ev | Ev[] | null }>) {
    const e = Array.isArray(v.system_evidences) ? v.system_evidences[0] : v.system_evidences
    if (e) (evDe.get(v.obligation_id) ?? evDe.set(v.obligation_id, []).get(v.obligation_id)!).push(e)
  }
  const tiposDe = new Map<string, Array<{ id: string; name: string }>>()
  for (const r of (exigidos ?? []) as unknown as Array<{ obligation_id: string; evidence_types: { id: string; name: string } | Array<{ id: string; name: string }> | null }>) {
    const t = Array.isArray(r.evidence_types) ? r.evidence_types[0] : r.evidence_types
    if (t) (tiposDe.get(r.obligation_id) ?? tiposDe.set(r.obligation_id, []).get(r.obligation_id)!).push(t)
  }

  const ahora = new Date().toISOString()
  const filaDe = new Map(((filas ?? []) as Array<Record<string, unknown>>).map((f) => [String(f.obligation_code), f]))
  const obligations: SgaiObligationView[] = SGAI_CLAUSES
    .map((code) => ({ code, o: cat.find((x) => x.code === code), f: filaDe.get(code) }))
    .filter((x) => x.o && x.f)
    .map(({ code, o, f }) => {
      const status = (f!.status as SgaiStatus) ?? 'pending'
      const evs = evDe.get(String(f!.id)) ?? []
      const tipos = tiposDe.get(o!.id) ?? []
      const proposal = status === 'resolved' ? null
        : sgaiDataProposal(code, facts, ahora)
          ?? obligationProposal(code, status, { approvedEvaluation: null, approvedDocuments: {}, euRegistrySection: null, mandatoryEvidenceTypes: { [code]: tipos } },
            evs.map((e) => ({ status: e.status, typeId: e.evidence_type_id })))
      const owner = (f!.owner_user_id as string | null) ?? null
      return {
        id: String(f!.id),
        code,
        clause: o!.article,
        title: o!.title,
        description: o!.description ?? '',
        status,
        statusLabel: SGAI_STATUS_LABEL[status],
        ownerUserId: owner,
        ownerName: owner ? nombre.get(owner) ?? null : null,
        dueDate: (f!.due_date as string | null) ?? null,
        notes: (f!.notes as string | null) ?? '',
        resolutionNotes: (f!.resolution_notes as string | null) ?? '',
        resolvedAt: (f!.resolved_at as string | null) ?? null,
        evidences: evs.map((e) => ({ id: e.id, title: e.title, status: e.status })),
        mandatoryTypes: tipos.map((t) => t.name),
        proposal: proposal ? { status: 'resolved', reason: proposal.reason } : null,
      }
    })

  return {
    canEdit: hasAnyRole(profile, EDIT_ROLES),
    facts,
    obligations,
    members: ((perfiles ?? []) as Array<{ user_id: string; full_name: string | null; display_name: string | null; is_active: boolean | null }>)
      .filter((p) => p.is_active !== false && p.user_id)
      .map((p) => ({ userId: p.user_id, name: p.display_name || p.full_name || 'Usuario' })),
    evidences: (evidencias ?? []) as Array<{ id: string; title: string; status: string }>,
  }
}

export async function saveSgaiObligation(input: {
  id: string
  status: SgaiStatus
  ownerUserId: string | null
  dueDate: string | null
  notes: string
  resolutionNotes: string
  evidenceIds: string[]
}): Promise<{ ok: true } | { error: string }> {
  const c = await ctx()
  if (!c) return { error: 'No autenticado.' }
  const { fluxion, profile } = c
  if (!hasAnyRole(profile, EDIT_ROLES)) {
    return { error: 'Solo el Administrador, el Responsable del SGAI o el Analista de cumplimiento gestionan el sistema de gestión.' }
  }
  if (!ESTADOS.includes(input.status)) return { error: 'Estado no válido.' }
  if (input.status === 'resolved' && !input.resolutionNotes.trim()) return { error: 'Explica cómo se cumple para marcarla como resuelta.' }

  const { data: previa } = await fluxion
    .from('organization_obligations').select('id, obligation_code, status')
    .eq('id', input.id).eq('organization_id', profile.organization_id).maybeSingle()
  if (!previa) return { error: 'Obligación no encontrada.' }

  const resuelta = input.status === 'resolved'
  const { error } = await fluxion
    .from('organization_obligations')
    .update({
      status: input.status,
      owner_user_id: input.ownerUserId || null,
      due_date: input.dueDate || null,
      notes: input.notes.trim() || null,
      resolution_notes: input.resolutionNotes.trim() || null,
      resolved_at: resuelta ? (previa.status === 'resolved' ? undefined : new Date().toISOString()) : null,
      resolved_by: resuelta ? profile.user_id : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.id)
    .eq('organization_id', profile.organization_id)
  if (error) return { error: 'No se pudo guardar: ' + error.message }

  await fluxion.from('organization_obligation_evidences').delete().eq('obligation_id', input.id).eq('organization_id', profile.organization_id)
  if (input.evidenceIds.length > 0) {
    const { error: evErr } = await fluxion.from('organization_obligation_evidences').insert(
      input.evidenceIds.map((e) => ({ obligation_id: input.id, evidence_id: e, organization_id: profile.organization_id })),
    )
    if (evErr) return { error: 'Guardado, pero no se pudieron vincular las evidencias: ' + evErr.message }
  }

  void logAuditEvent({
    organization_id: profile.organization_id,
    actor_id: profile.id,
    actor_name: profile.full_name ?? undefined,
    actor_email: profile.email ?? undefined,
    action: 'org.sgai_obligation_updated',
    target_type: 'organization',
    target_id: input.id,
    target_label: previa.obligation_code,
    metadata: { status: input.status, previous_status: previa.status, evidences: input.evidenceIds.length },
  })

  revalidatePath('/plantillas/sgai-iso42001')
  return { ok: true }
}

export async function acceptSgaiProposal(id: string): Promise<{ ok: true } | { error: string }> {
  const view = await getSgaiView()
  if ('error' in view) return view
  if (!view.canEdit) return { error: 'No tienes permiso para aceptar la propuesta.' }
  const o = view.obligations.find((x) => x.id === id)
  if (!o?.proposal) return { error: 'La propuesta ya no está vigente: revisa la obligación y resuélvela a mano si procede.' }
  return saveSgaiObligation({
    id, status: 'resolved', ownerUserId: o.ownerUserId, dueDate: o.dueDate, notes: o.notes,
    resolutionNotes: o.proposal.reason, evidenceIds: o.evidences.map((e) => e.id),
  })
}
