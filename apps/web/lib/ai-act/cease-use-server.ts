import 'server-only'

import { createAdminFluxionClient } from '@/lib/supabase/fluxion'

import { ceaseUseRequired, ceaseUseTaskTitle } from './provider-classification'

/**
 * Tarea «Cesar el uso» de las prácticas prohibidas (B27). Abre la tarea de
 * los sistemas prohibidos que no están Retirados y completa la de los que se
 * han retirado o han dejado de ser prohibidos. Con service role: se llama
 * después de guardar el sistema y desde el cron diario. Sin `organizationId`,
 * recorre todas las organizaciones. Devuelve cuántas tareas ha abierto.
 */
export async function syncCeaseUseTasks(organizationId?: string, systemIds?: readonly string[]): Promise<number> {
  const admin = createAdminFluxionClient()
  let q = admin.from('ai_systems').select('id, organization_id, name, status, owner_profile_id, aiact_result, aiact_risk_level')
  if (organizationId) q = q.eq('organization_id', organizationId)
  if (systemIds) {
    if (systemIds.length === 0) return 0
    q = q.in('id', systemIds)
  } else {
    // Sin sistemas concretos: los prohibidos y los que tienen una tarea de cese abierta.
    q = q.or('aiact_risk_level.eq.prohibited,aiact_result->>level.eq.prohibited')
  }
  const { data: sistemas, error } = await q
  if (error) {
    console.error('[cease-use] sistemas:', error)
    return 0
  }
  const filas = (sistemas ?? []) as Array<{
    id: string; organization_id: string; name: string; status: string | null; owner_profile_id: string | null
    aiact_result: { level?: string | null } | null; aiact_risk_level: string | null
  }>

  // Tareas abiertas: de estos sistemas o, en la pasada general, de todos.
  let tq = admin.from('tasks').select('id, organization_id, source_id')
    .eq('source_type', 'cease_use').not('status', 'in', '(done,cancelled)')
  if (organizationId) tq = tq.eq('organization_id', organizationId)
  if (systemIds) tq = tq.in('source_id', systemIds)
  const { data: abiertas } = await tq
  const abiertaDe = new Map(((abiertas ?? []) as Array<{ id: string; source_id: string }>).map((t) => [t.source_id, t.id]))

  let abiertasNuevas = 0
  const exigidos = new Set<string>()
  for (const s of filas) {
    const nivel = s.aiact_result?.level ?? s.aiact_risk_level ?? null
    if (!ceaseUseRequired(nivel, s.status)) continue
    exigidos.add(s.id)
    if (abiertaDe.has(s.id)) continue
    const { error: insErr } = await admin.from('tasks').insert({
      organization_id: s.organization_id,
      system_id: s.id,
      title: ceaseUseTaskTitle(s.name),
      description:
        'Práctica prohibida (AI Act, Art. 5): el sistema no se puede usar. Cesa su uso y retíralo, o rediséñalo y vuelve a clasificarlo. ' +
        'La tarea se completa sola al pasar el sistema a Retirado o si deja de ser una práctica prohibida.',
      priority: 'critical',
      source_type: 'cease_use',
      source_id: s.id,
      assignee_id: s.owner_profile_id,
    })
    if (insErr) console.error('[cease-use] tarea:', insErr)
    else abiertasNuevas++
  }

  // Se completan las que ya no hacen falta.
  const sobran = Array.from(abiertaDe.entries()).filter(([systemId]) => !exigidos.has(systemId)).map(([, taskId]) => taskId)
  if (sobran.length > 0) await admin.from('tasks').update({ status: 'done' }).in('id', sobran)
  return abiertasNuevas
}
