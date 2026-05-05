'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'compliance' } }
);

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('No autorizado');
  return session.user;
}

export async function getMappings(page = 1, pageSize = 100) {
  try {
    await requireAdmin();
    const start = (page - 1) * pageSize;
    const { data, error, count } = await adminClient
      .from('obligation_evidence_types')
      .select('*, obligations(id, code, title, framework), evidence_types(id, code, name, category)', { count: 'exact' })
      .order('created_at', { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) return { error: error.message };
    return { data, count, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getAllObligations() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('obligations')
      .select('id, code, title, framework')
      .order('framework')
      .order('code');
    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getAllEvidenceTypes() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('evidence_types')
      .select('id, code, name, category')
      .order('category')
      .order('code');
    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createMapping(payload: {
  obligation_id: string
  evidence_type_id: string
  requirement_level: string
  notes?: string
}) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('obligation_evidence_types')
      .insert([payload])
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/mappings/obligacion-evidencia');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateMapping(
  obligationId: string,
  evidenceTypeId: string,
  payload: { requirement_level: string; notes?: string }
) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('obligation_evidence_types')
      .update(payload)
      .eq('obligation_id', obligationId)
      .eq('evidence_type_id', evidenceTypeId)
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/mappings/obligacion-evidencia');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteMapping(obligationId: string, evidenceTypeId: string) {
  try {
    await requireAdmin();
    const { error } = await adminClient
      .from('obligation_evidence_types')
      .delete()
      .eq('obligation_id', obligationId)
      .eq('evidence_type_id', evidenceTypeId);
    if (error) return { error: error.message };
    revalidatePath('/datos/mappings/obligacion-evidencia');
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
