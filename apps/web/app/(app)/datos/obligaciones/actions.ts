'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';

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

/**
 * El catálogo es global (lo comparten todas las organizaciones): retirar o
 * recuperar una obligación cambia lo que se sugiere a todos los sistemas, así
 * que solo lo hace la administración de la plataforma (B13e).
 */
async function isPlatformAdmin(userId: string) {
  const { data } = await createFluxionClient()
    .from('profiles')
    .select('platform_role')
    .eq('user_id', userId)
    .maybeSingle();
  return data?.platform_role === 'platform_admin';
}

/** Una obligación del AI Act sin ámbito no la sugiere el motor: se exige uno. */
function validarAmbito(payload: Record<string, unknown>) {
  if (payload.framework === 'AI_ACT' && !payload.scope) {
    return 'Las obligaciones del AI Act necesitan un ámbito: sin él no se sugieren a ningún sistema.';
  }
  return null;
}

export async function getObligations(page = 1, pageSize = 50, framework?: string) {
  try {
    const user = await requireAdmin();
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
    return { data, count, success: true, canRetire: await isPlatformAdmin(user.id) };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createObligation(payload: Record<string, unknown>) {
  try {
    await requireAdmin();
    const invalido = validarAmbito(payload);
    if (invalido) return { error: invalido };
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
    const invalido = validarAmbito(payload);
    if (invalido) return { error: invalido };
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

/** Retira (`retired = true`) o recupera una obligación del catálogo. */
export async function setObligationRetired(id: string, retired: boolean) {
  try {
    const user = await requireAdmin();
    if (!(await isPlatformAdmin(user.id))) {
      return { error: 'Solo la administración de la plataforma puede retirar o recuperar obligaciones del catálogo.' };
    }
    const { error } = await adminClient
      .from('obligations')
      .update({ retired_at: retired ? new Date().toISOString() : null })
      .eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/datos/obligaciones');
    return { success: true };
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
