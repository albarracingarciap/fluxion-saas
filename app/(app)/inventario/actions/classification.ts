'use server';

import { createFluxionClient } from '@/lib/supabase/fluxion';

/**
 * Lee la clasificación activa de un sistema con sus obligaciones no archivadas.
 */
export async function getSystemClassification(systemId: string) {
  const fluxion = createFluxionClient();

  const { data, error } = await fluxion
    .from('ai_systems')
    .select(`
      id,
      name,
      aiact_risk_level,
      current_classification_event_id,
      classification_events!current_classification_event_id (
        id,
        version,
        method,
        risk_level,
        risk_label,
        basis,
        reason,
        obligations_set,
        classification_factors,
        status,
        created_at,
        created_by
      ),
      system_obligations (
        id,
        source_framework,
        obligation_code,
        obligation_key,
        obligation_label,
        title,
        description,
        status,
        priority,
        due_date,
        notes,
        work_notes,
        resolution_notes,
        exclusion_justification,
        archived_at,
        classification_event_id,
        resolved_at,
        resolved_by,
        created_at,
        updated_at
      )
    `)
    .eq('id', systemId)
    .is('system_obligations.archived_at', null)
    .single();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Lee el historial de eventos de clasificación de un sistema.
 */
export async function getClassificationHistory(systemId: string) {
  const fluxion = createFluxionClient();

  const { data, error } = await fluxion
    .from('classification_events')
    .select('id, version, method, risk_level, risk_label, basis, reason, obligations_set, status, created_by, created_at, review_notes')
    .eq('ai_system_id', systemId)
    .order('version', { ascending: false });

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Lee los diffs de un evento pendiente para poblar el panel de reconciliación.
 */
export async function getReconciliationDiff(eventId: string) {
  const fluxion = createFluxionClient();

  const { data, error } = await fluxion
    .from('classification_diffs')
    .select('*')
    .eq('classification_event_id', eventId)
    .order('diff_type')
    .order('obligation_key');

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Comprueba si un sistema tiene una reconciliación pendiente.
 * Usado para bloquear los botones de clasificación en la UI.
 */
export async function getPendingReconciliation(systemId: string) {
  const fluxion = createFluxionClient();

  const { data, error } = await fluxion
    .from('classification_events')
    .select('id, version, risk_level, risk_label, created_at')
    .eq('ai_system_id', systemId)
    .eq('status', 'pending_reconciliation')
    .maybeSingle();

  if (error) return { data: null, error: error.message };
  return { data, error: null };
}

/**
 * Guarda notas de trabajo de una obligación.
 */
export async function updateObligationWorkNotes(obligationId: string, workNotes: string) {
  const fluxion = createFluxionClient();

  const { error } = await fluxion
    .from('system_obligations')
    .update({ work_notes: workNotes })
    .eq('id', obligationId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

/**
 * Guarda notas de resolución de una obligación.
 */
export async function updateObligationResolutionNotes(obligationId: string, notes: string) {
  const fluxion = createFluxionClient();

  const { error } = await fluxion
    .from('system_obligations')
    .update({ resolution_notes: notes })
    .eq('id', obligationId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}

/**
 * Actualiza fecha objetivo y prioridad de una obligación.
 */
export async function updateObligationMeta(
  obligationId: string,
  meta: { dueDate?: string; priority?: string }
) {
  const fluxion = createFluxionClient();

  const { error } = await fluxion
    .from('system_obligations')
    .update({
      ...(meta.dueDate && { due_date: meta.dueDate }),
      ...(meta.priority && { priority: meta.priority }),
    })
    .eq('id', obligationId);

  if (error) return { success: false, error: error.message };
  return { success: true, error: null };
}
