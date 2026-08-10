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

export async function getEvidenceTypes(page = 1, pageSize = 50) {
  try {
    await requireAdmin();
    const start = (page - 1) * pageSize;
    const { data, error, count } = await adminClient
      .from('evidence_types')
      .select('*', { count: 'exact' })
      .order('code', { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) return { error: error.message };
    return { data, count, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createEvidenceType(payload: Record<string, unknown>) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('evidence_types')
      .insert([payload])
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/tipos-de-evidencia');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateEvidenceType(id: string, payload: Record<string, unknown>) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('evidence_types')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/tipos-de-evidencia');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteEvidenceType(id: string) {
  try {
    await requireAdmin();
    const { error } = await adminClient
      .from('evidence_types')
      .delete()
      .eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/datos/tipos-de-evidencia');
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
