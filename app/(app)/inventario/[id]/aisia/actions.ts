'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

// Secciones de la AISIA en orden
const AISIA_SECTION_CODES = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6'] as const;

// ─── initAisia ────────────────────────────────────────────────────────────────
// Crea una evaluación AISIA nueva (draft) + las 6 secciones vacías.
// Sólo se puede iniciar si no existe ya una evaluación activa (draft/submitted).

export async function initAisia(systemId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  // Obtener profile.id (no auth UID) + organization_id
  const { data: profile, error: profileError } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();

  if (profileError || !profile) {
    return { error: 'No se encontró el perfil del usuario.' };
  }

  // Verificar que el sistema pertenece a la organización
  const { data: sys } = await fluxion
    .from('ai_systems')
    .select('id, name')
    .eq('id', systemId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!sys) {
    return { error: 'Sistema no encontrado o sin permisos.' };
  }

  // Comprobar que no existe ya un borrador o evaluación enviada
  const { data: existing } = await fluxion
    .from('aisia_assessments')
    .select('id, status')
    .eq('ai_system_id', systemId)
    .in('status', ['draft', 'submitted'])
    .maybeSingle();

  if (existing) {
    return {
      error: 'Ya existe una evaluación AISIA activa para este sistema.',
      assessmentId: existing.id,
    };
  }

  // Calcular siguiente versión
  const { data: lastVersion } = await fluxion
    .from('aisia_assessments')
    .select('version')
    .eq('ai_system_id', systemId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // Crear la evaluación
  const { data: assessment, error: assessmentError } = await fluxion
    .from('aisia_assessments')
    .insert({
      ai_system_id: systemId,
      organization_id: profile.organization_id,
      status: 'draft',
      version: nextVersion,
      title: `Evaluación AISIA — ${sys.name}`,
      created_by: profile.id,
    })
    .select('id')
    .single();

  if (assessmentError || !assessment) {
    console.error('initAisia — assessment insert:', assessmentError);
    return { error: 'No se pudo crear la evaluación. Inténtalo de nuevo.' };
  }

  // Crear las 6 secciones vacías
  const sectionInserts = AISIA_SECTION_CODES.map((code) => ({
    assessment_id: assessment.id,
    section_code: code,
    data: {},
    status: 'pending',
  }));

  const { error: sectionsError } = await fluxion
    .from('aisia_sections')
    .insert(sectionInserts);

  if (sectionsError) {
    console.error('initAisia — sections insert:', sectionsError);
    // Rollback manual: eliminar la evaluación creada
    await fluxion.from('aisia_assessments').delete().eq('id', assessment.id);
    return { error: 'No se pudieron crear las secciones. Inténtalo de nuevo.' };
  }

  // Registrar evento en historial
  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: systemId,
      organization_id: profile.organization_id,
      event_type: 'aisia_created',
      event_title: 'Evaluación AISIA iniciada',
      event_summary: `Se inició la evaluación de impacto AISIA (v${nextVersion}) para ${sys.name}.`,
      payload: {
        assessment_id: assessment.id,
        version: nextVersion,
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${systemId}`);
  return { success: true, assessmentId: assessment.id };
}

// ─── updateAisiaSection ───────────────────────────────────────────────────────
// Actualiza el contenido JSONB de una sección y su estado.

export async function updateAisiaSection(
  assessmentId: string,
  sectionCode: string,
  data: Record<string, unknown>,
  sectionStatus: 'pending' | 'in_progress' | 'complete' = 'in_progress'
) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado.' };

  // Verificar que la evaluación pertenece a la org y está editable
  const { data: assessment } = await fluxion
    .from('aisia_assessments')
    .select('id, status, ai_system_id')
    .eq('id', assessmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!assessment) return { error: 'Evaluación no encontrada.' };
  if (assessment.status !== 'draft') {
    return { error: 'Solo se puede editar una evaluación en borrador.' };
  }

  const { error } = await fluxion
    .from('aisia_sections')
    .update({ data, status: sectionStatus })
    .eq('assessment_id', assessmentId)
    .eq('section_code', sectionCode);

  if (error) {
    console.error('updateAisiaSection:', error);
    return { error: 'No se pudo guardar la sección.' };
  }

  revalidatePath(`/inventario/${assessment.ai_system_id}`);
  return { success: true };
}

// ─── submitAisia ──────────────────────────────────────────────────────────────
// Envía la evaluación para aprobación (draft → submitted).

export async function submitAisia(assessmentId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado.' };

  const { data: assessment } = await fluxion
    .from('aisia_assessments')
    .select('id, status, ai_system_id, version')
    .eq('id', assessmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!assessment) return { error: 'Evaluación no encontrada.' };
  if (assessment.status !== 'draft') {
    return { error: 'Solo se puede enviar una evaluación en borrador.' };
  }

  const now = new Date().toISOString();

  const { error } = await fluxion
    .from('aisia_assessments')
    .update({
      status: 'submitted',
      submitted_by: profile.id,
      submitted_at: now,
    })
    .eq('id', assessmentId);

  if (error) return { error: 'No se pudo enviar la evaluación.' };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: assessment.ai_system_id,
      organization_id: profile.organization_id,
      event_type: 'aisia_submitted',
      event_title: 'AISIA enviada para aprobación',
      event_summary: `La evaluación AISIA v${assessment.version} fue enviada para revisión.`,
      payload: { assessment_id: assessmentId, version: assessment.version },
      actor_user_id: user.id,
      created_at: now,
    },
  ]);

  revalidatePath(`/inventario/${assessment.ai_system_id}`);
  return { success: true };
}

// ─── approveAisia ─────────────────────────────────────────────────────────────
// Aprueba la evaluación (submitted → approved). Solo admins/dpo.

export async function approveAisia(
  assessmentId: string,
  minutesRef?: string
) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado.' };

  const { data: assessment } = await fluxion
    .from('aisia_assessments')
    .select('id, status, ai_system_id, version')
    .eq('id', assessmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!assessment) return { error: 'Evaluación no encontrada.' };
  if (assessment.status !== 'submitted') {
    return { error: 'Solo se puede aprobar una evaluación enviada.' };
  }

  const now = new Date().toISOString();

  const { error } = await fluxion
    .from('aisia_assessments')
    .update({
      status: 'approved',
      approved_by: profile.id,
      approved_at: now,
      approval_minutes_ref: minutesRef ?? null,
    })
    .eq('id', assessmentId);

  if (error) return { error: 'No se pudo aprobar la evaluación.' };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: assessment.ai_system_id,
      organization_id: profile.organization_id,
      event_type: 'aisia_approved',
      event_title: 'AISIA aprobada',
      event_summary: `La evaluación AISIA v${assessment.version} fue aprobada formalmente.`,
      payload: {
        assessment_id: assessmentId,
        version: assessment.version,
        minutes_ref: minutesRef ?? null,
      },
      actor_user_id: user.id,
      created_at: now,
    },
  ]);

  // ── Fase 7: actualizar controles SoA A.5.x ────────────────────────────────
  // Si todos los sistemas vinculados a un control A.5.x tienen AISIA aprobada,
  // ese control pasa a 'implemented' en la declaración de aplicabilidad org.
  await syncAisiaSoaControls(fluxion, profile.organization_id);
  // ─────────────────────────────────────────────────────────────────────────

  revalidatePath(`/inventario/${assessment.ai_system_id}`);
  revalidatePath('/plantillas/soa-iso42001');
  return { success: true };
}

// ─── syncAisiaSoaControls ─────────────────────────────────────────────────────
// Comprueba los controles A.5.2–A.5.5 de la org y los marca como 'implemented'
// cuando TODOS los sistemas vinculados al control tienen una AISIA aprobada.
// Llamada tras cada aprobación de AISIA.

const AISIA_SATISFIES_SOA = ['A.5.2', 'A.5.3', 'A.5.4', 'A.5.5'] as const;

async function syncAisiaSoaControls(
  fluxion: ReturnType<typeof import('@/lib/supabase/fluxion').createFluxionClient>,
  organizationId: string,
) {
  // 1. Obtener los controles SoA aplicables de la org para los 4 códigos
  const { data: soaControls } = await fluxion
    .from('organization_soa_controls')
    .select('id, control_code, status')
    .eq('organization_id', organizationId)
    .eq('is_applicable', true)
    .in('control_code', AISIA_SATISFIES_SOA);

  if (!soaControls || soaControls.length === 0) return;

  for (const soaControl of soaControls) {
    // Ya implantado: no hacer nada
    if (soaControl.status === 'implemented') continue;

    // 2. Sistemas vinculados a este control
    const { data: links } = await fluxion
      .from('organization_soa_system_links')
      .select('ai_system_id')
      .eq('soa_control_id', soaControl.id);

    if (!links || links.length === 0) continue; // sin sistemas vinculados → no aplica aún

    const linkedSystemIds = links.map((l) => l.ai_system_id as string);

    // 3. ¿Cuántos sistemas vinculados tienen AISIA aprobada?
    const { data: approvedRows } = await fluxion
      .from('aisia_assessments')
      .select('ai_system_id')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .in('ai_system_id', linkedSystemIds);

    const approvedSet = new Set((approvedRows ?? []).map((r) => r.ai_system_id as string));
    const allApproved = linkedSystemIds.every((id) => approvedSet.has(id));

    if (allApproved) {
      await fluxion
        .from('organization_soa_controls')
        .update({ status: 'implemented' })
        .eq('id', soaControl.id);

      console.log(`[AISIA] Control ${soaControl.control_code} → implemented (org ${organizationId})`);
    }
  }
}

// ─── rejectAisia ──────────────────────────────────────────────────────────────
// Rechaza la evaluación (submitted → rejected) con motivo.

export async function rejectAisia(assessmentId: string, reason: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: profile } = await fluxion
    .from('profiles')
    .select('id, organization_id')
    .eq('user_id', user.id)
    .single();

  if (!profile) return { error: 'Perfil no encontrado.' };

  const { data: assessment } = await fluxion
    .from('aisia_assessments')
    .select('id, status, ai_system_id, version')
    .eq('id', assessmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!assessment) return { error: 'Evaluación no encontrada.' };
  if (assessment.status !== 'submitted') {
    return { error: 'Solo se puede rechazar una evaluación enviada.' };
  }

  const now = new Date().toISOString();

  const { error } = await fluxion
    .from('aisia_assessments')
    .update({
      status: 'rejected',
      rejected_by: profile.id,
      rejected_at: now,
      rejection_reason: reason,
    })
    .eq('id', assessmentId);

  if (error) return { error: 'No se pudo rechazar la evaluación.' };

  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id: assessment.ai_system_id,
      organization_id: profile.organization_id,
      event_type: 'aisia_rejected',
      event_title: 'AISIA rechazada',
      event_summary: `La evaluación AISIA v${assessment.version} fue rechazada.`,
      payload: {
        assessment_id: assessmentId,
        version: assessment.version,
        reason,
      },
      actor_user_id: user.id,
      created_at: now,
    },
  ]);

  revalidatePath(`/inventario/${assessment.ai_system_id}`);
  return { success: true };
}
