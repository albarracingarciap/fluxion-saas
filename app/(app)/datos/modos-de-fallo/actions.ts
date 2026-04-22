'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { createClient as createServerClient } from '@/lib/supabase/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente administrador para bypasear RLS en catálogos
const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'compliance'
  }
});

// Verificación rápida de que es un admin real para seguridad adicional (opcional pero recomendada)
async function requireAdmin() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error("No autorizado");
  // Aquí podríamos validar el rol según fluxion.organization_members
  return session.user;
}

export async function getFailureModes(page = 1, pageSize = 50) {
  try {
    await requireAdmin();
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data, error, count } = await adminClient
      .from('failure_modes')
      .select('*, risk_dimensions(name)', { count: 'exact' })
      .order('code', { ascending: true })
      .range(start, end);

    if (error) {
      console.error(error);
      return { error: error.message };
    }

    return { data, count, success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function createFailureMode(payload: any) {
  try {
    await requireAdmin();
    
    // Asignar w_calculated asumiendo R, I, D, E son enviados (R+I+D+E / etc.)
    // La fórmula exacta de RIDE según fluxion_plan_compliance_riesgos.md: (R*I*D*E)^{1/4} (Media geométrica? o Media aritmética?). 
    // Usaremos media aritmética: (R + I + D + E) / 4 para simplificar, o el usuario lo envía procesado.
    
    const { data, error } = await adminClient
      .from('failure_modes')
      .insert([payload])
      .select();

    if (error) return { error: error.message };

    revalidatePath('/datos/modos-de-fallo');
    return { success: true, data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateFailureMode(id: string, payload: any) {
  try {
    await requireAdmin();

    const { data, error } = await adminClient
      .from('failure_modes')
      .update(payload)
      .eq('id', id)
      .select();

    if (error) return { error: error.message };

    revalidatePath('/datos/modos-de-fallo');
    return { success: true, data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteFailureMode(id: string) {
  try {
    await requireAdmin();

    const { error } = await adminClient
      .from('failure_modes')
      .delete()
      .eq('id', id);

    if (error) return { error: error.message };

    revalidatePath('/datos/modos-de-fallo');
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getRiskDimensions() {
  try {
    const { data, error } = await adminClient
      .from('risk_dimensions')
      .select('id, name')
      .order('display_order', { ascending: true });

    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
