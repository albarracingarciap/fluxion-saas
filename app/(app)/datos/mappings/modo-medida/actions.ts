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

export async function getModeMappings(page = 1, pageSize = 100) {
  try {
    await requireAdmin();
    const start = (page - 1) * pageSize;
    const { data, error, count } = await adminClient
      .from('failure_mode_control_refs')
      .select(
        '*, failure_modes(id, code, name, dimension_id), control_templates(id, code, title, category)',
        { count: 'exact' }
      )
      .order('created_at', { ascending: true })
      .range(start, start + pageSize - 1);
    if (error) return { error: error.message };
    return { data, count, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getAllFailureModes() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('failure_modes')
      .select('id, code, name, dimension_id')
      .order('code');
    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getAllControlTemplates() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('control_templates')
      .select('id, code, title, category')
      .eq('is_active', true)
      .order('code');
    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createModeMapping(payload: {
  failure_mode_id: string
  control_template_id: string
  is_primary: boolean
}) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('failure_mode_control_refs')
      .insert([payload])
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/mappings/modo-medida');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateModeMapping(
  failureModeId: string,
  controlTemplateId: string,
  payload: { is_primary: boolean }
) {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('failure_mode_control_refs')
      .update(payload)
      .eq('failure_mode_id', failureModeId)
      .eq('control_template_id', controlTemplateId)
      .select();
    if (error) return { error: error.message };
    revalidatePath('/datos/mappings/modo-medida');
    return { success: true, data };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteModeMapping(failureModeId: string, controlTemplateId: string) {
  try {
    await requireAdmin();
    const { error } = await adminClient
      .from('failure_mode_control_refs')
      .delete()
      .eq('failure_mode_id', failureModeId)
      .eq('control_template_id', controlTemplateId);
    if (error) return { error: error.message };
    revalidatePath('/datos/mappings/modo-medida');
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
