'use server';

import { createClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { insertAiSystemHistoryEvents } from '@/lib/ai-systems/history';
import { AISIA_PREFILL_SYSTEM_COLUMNS, buildAisiaPrefill } from '@/lib/aisia/prefill';
import { cancelLiveApprovalRequest, openApprovalRequest } from '@/lib/approvals/open';
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
    .select(`id, ${AISIA_PREFILL_SYSTEM_COLUMNS}`)
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

  // Crear las 6 secciones. S1 y S2 se guardan ya con los datos de la ficha
  // (B08, E19): antes solo se enseñaban y, si nadie los editaba, no constaban.
  const prefill = buildAisiaPrefill(sys as Record<string, unknown>);
  const sectionInserts = AISIA_SECTION_CODES.map((code) => ({
    assessment_id: assessment.id,
    section_code: code,
    data: code === 'S1' ? prefill.S1 : code === 'S2' ? prefill.S2 : {},
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
    .select('id, status, ai_system_id, version, created_by')
    .eq('id', assessmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!assessment) return { error: 'Evaluación no encontrada.' };
  if (assessment.status !== 'draft') {
    return { error: 'Solo se puede enviar una evaluación en borrador.' };
  }

  // La AISIA solo se aprueba en Flujos de aprobación (B11g). Quien la creó y
  // quien la envía no deciden (DP-01): el motor los excluye por el contexto.
  const apertura = await openApprovalRequest({
    organizationId: profile.organization_id,
    objectType: 'aisia_assessment',
    objectId: assessmentId,
    requestedByProfileId: profile.id,
    context: { prepared_by: [assessment.created_by, profile.id].filter(Boolean) },
  });
  if ('error' in apertura) return { error: apertura.error };
  if (apertura.requestId === null) {
    return { error: 'No hay ninguna política de aprobación activa para la AISIA. Configúrala en Ajustes › Aprobaciones antes de enviarla.' };
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

  if (error) {
    // La solicitud se abrió pero la AISIA no cambió: no puede quedar viva.
    await cancelLiveApprovalRequest('aisia_assessment', assessmentId, 'La AISIA no se pudo enviar.');
    return { error: 'No se pudo enviar la evaluación.' };
  }

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

// ─── reopenAisia ─────────────────────────────────────────────────────────────
// Crea una nueva versión borrador copiando las secciones de una evaluación
// rechazada. La versión rechazada se conserva como auditoría.

export async function reopenAisia(rejectedAssessmentId: string) {
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

  // Obtener la evaluación rechazada + sus secciones
  const { data: rejected } = await fluxion
    .from('aisia_assessments')
    .select(`
      id, ai_system_id, status, version, title,
      aisia_sections ( section_code, data, status )
    `)
    .eq('id', rejectedAssessmentId)
    .eq('organization_id', profile.organization_id)
    .single();

  if (!rejected) return { error: 'Evaluación no encontrada.' };
  if (rejected.status !== 'rejected') {
    return { error: 'Solo se puede reabrir una evaluación rechazada.' };
  }

  // Verificar que no existe ya un borrador o enviado activo
  const { data: existing } = await fluxion
    .from('aisia_assessments')
    .select('id, status')
    .eq('ai_system_id', rejected.ai_system_id)
    .in('status', ['draft', 'submitted'])
    .maybeSingle();

  if (existing) {
    return {
      error: 'Ya existe una evaluación activa para este sistema. Complétala primero.',
      assessmentId: existing.id,
    };
  }

  // Calcular siguiente versión
  const { data: lastVersion } = await fluxion
    .from('aisia_assessments')
    .select('version')
    .eq('ai_system_id', rejected.ai_system_id)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersion = (lastVersion?.version ?? 0) + 1;

  // Crear nueva evaluación
  const { data: newAssessment, error: insertError } = await fluxion
    .from('aisia_assessments')
    .insert({
      ai_system_id:    rejected.ai_system_id,
      organization_id: profile.organization_id,
      status:          'draft',
      version:         nextVersion,
      title:           rejected.title ?? null,
      created_by:      profile.id,
    })
    .select('id')
    .single();

  if (insertError || !newAssessment) {
    console.error('reopenAisia — assessment insert:', insertError);
    return { error: 'No se pudo crear la nueva versión.' };
  }

  // Copiar secciones de la versión rechazada (preservando datos y estado)
  const rejectedSections = (rejected.aisia_sections as { section_code: string; data: unknown; status: string }[]) ?? [];

  // Asegurar que existen las 6 secciones aunque la rechazada no las tenga todas
  const sectionMap = new Map(rejectedSections.map((s) => [s.section_code, s]));
  const sectionInserts = AISIA_SECTION_CODES.map((code) => {
    const prev = sectionMap.get(code);
    return {
      assessment_id: newAssessment.id,
      section_code:  code,
      data:          (prev?.data ?? {}) as Record<string, unknown>,
      status:        prev?.status === 'complete' ? 'complete' : (prev?.status ?? 'pending'),
    };
  });

  const { error: sectionsError } = await fluxion
    .from('aisia_sections')
    .insert(sectionInserts);

  if (sectionsError) {
    console.error('reopenAisia — sections insert:', sectionsError);
    await fluxion.from('aisia_assessments').delete().eq('id', newAssessment.id);
    return { error: 'No se pudieron copiar las secciones.' };
  }

  // Registrar evento en historial
  await insertAiSystemHistoryEvents(fluxion, [
    {
      ai_system_id:    rejected.ai_system_id,
      organization_id: profile.organization_id,
      event_type:      'aisia_created',
      event_title:     'AISIA reabierta para corrección',
      event_summary:   `Se creó la evaluación AISIA v${nextVersion} a partir de la versión rechazada (v${rejected.version}).`,
      payload: {
        assessment_id:      newAssessment.id,
        version:            nextVersion,
        reopened_from:      rejectedAssessmentId,
        previous_version:   rejected.version,
      },
      actor_user_id: user.id,
    },
  ]);

  revalidatePath(`/inventario/${rejected.ai_system_id}`);
  return { success: true, assessmentId: newAssessment.id };
}
