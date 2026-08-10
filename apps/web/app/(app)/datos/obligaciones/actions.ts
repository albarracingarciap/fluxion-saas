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

export async function getObligations(page = 1, pageSize = 50, framework?: string) {
  try {
    await requireAdmin();
    const start = (page - 1) * pageSize;
    let query = adminClient
      .from('obligations')
      .select('*', { count: 'exact' })
      .order('framework', { ascending: true })
      .order('code', { ascending: true })
      .range(start, start + pageSize - 1);
    if (framework) query = query.eq('framework', framework);
    const { data, error, count } = await query;
    if (error) return { error: error.message };
    return { data, count, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createObligation(payload: Record<string, unknown>) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('obligations')
      .insert([payload])
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/obligaciones');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateObligation(id: string, payload: Record<string, unknown>) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('obligations')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/obligaciones');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteObligation(id: string) {
  try {
    await requireAdmin();
    const { error } = await adminClient
      .from('obligations')
      .delete()
      .eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/datos/obligaciones');
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
