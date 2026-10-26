'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin, requireSession } from '@/lib/auth/platform';

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'compliance' } }
);

export async function getControlTemplates(page = 1, pageSize = 50, category?: string) {
  try {
    await requireSession();
    const start = (page - 1) * pageSize;
    let query = adminClient
      .from('control_templates')
      .select('*', { count: 'exact' })
      .order('code', { ascending: true })
      .range(start, start + pageSize - 1);
    if (category) query = query.eq('category', category);
    const { data, error, count } = await query;
    if (error) return { error: error.message };
    return { data, count, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createControlTemplate(payload: Record<string, unknown>) {
  try {
    await requirePlatformAdmin();
    const { data, error } = await adminClient
      .from('control_templates')
      .insert([payload])
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/medidas');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateControlTemplate(id: string, payload: Record<string, unknown>) {
  try {
    await requirePlatformAdmin();
    const { data, error } = await adminClient
      .from('control_templates')
      .update(payload)
      .eq('id', id)
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/medidas');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteControlTemplate(id: string) {
  try {
    await requirePlatformAdmin();
    const { error } = await adminClient
      .from('control_templates')
      .delete()
      .eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/datos/medidas');
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
