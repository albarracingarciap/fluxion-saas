'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'compliance'
  }
});

async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autorizado");
  return session.user;
}

export async function getCausalRelationships(page = 1, pageSize = 50) {
  try {
    await requireAdmin();
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await adminClient
      .from('causal_relationships')
      .select(`
        *,
        causal_families(name),
        source:causal_nodes!source_node_id(name, domain),
        target:causal_nodes!target_node_id(name, domain)
      `, { count: 'exact' })
      .order('id', { ascending: true })
      .range(start, end);

    if (error) {
      console.error(error);
      return { error: error.message };
    }

    // Adapt payload
    const processedData = data.map((item: any) => ({
      ...item,
      family_name: item.causal_families?.name,
      source_name: item.source?.name,
      source_domain: item.source?.domain,
      target_name: item.target?.name,
      target_domain: item.target?.domain,
    }));

    return { data: processedData, count, success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getCausalFamilies() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('causal_families')
      .select('id, name')
      .order('id', { ascending: true });

    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getCausalNodes() {
  try {
    await requireAdmin();
    const { data, error } = await adminClient
      .from('causal_nodes')
      .select('id, name, domain')
      .order('name', { ascending: true });

    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function createCausalRelationship(payload: any) {
  try {
    await requireAdmin();
    
    const { data, error } = await adminClient
      .from('causal_relationships')
      .insert([payload])
      .select();

    if (error) return { error: error.message };

    revalidatePath('/datos/relaciones-causales');
    return { success: true, data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateCausalRelationship(id: string, payload: any) {
  try {
    await requireAdmin();

    const { data, error } = await adminClient
      .from('causal_relationships')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) return { error: error.message };

    revalidatePath('/datos/relaciones-causales');
    return { success: true, data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteCausalRelationship(id: string) {
  try {
    await requireAdmin();

    const { error } = await adminClient
      .from('causal_relationships')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/datos/relaciones-causales');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
