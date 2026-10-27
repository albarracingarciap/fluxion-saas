'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { requirePlatformAdmin, requireSession } from '@/lib/auth/platform';
import { ISO_42001_CONTROLS } from '@/lib/templates/iso42001-catalog';

// Correspondencia plantilla de control → control del Anexo A de la ISO/IEC
// 42001 (B17e2). Alimenta las propuestas de la Declaración de Aplicabilidad.

const adminClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { db: { schema: 'compliance' } }
);

const RUTA = '/datos/mappings/plantilla-anexo-a';
const CONFIANZAS = ['alta', 'media'];

function validar(soaControlCode: string, confidence: string): string | null {
  if (!ISO_42001_CONTROLS.some((c) => c.id === soaControlCode)) return 'El control no es del Anexo A de la ISO/IEC 42001.';
  if (!CONFIANZAS.includes(confidence)) return 'La confianza debe ser alta o media.';
  return null;
}

export async function getMappings() {
  try {
    await requireSession();
    const { data, error } = await adminClient
      .from('control_template_soa_controls')
      .select('template_id, soa_control_code, confidence, control_templates(id, code, title)')
      .order('soa_control_code');
    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function getAllControlTemplates() {
  try {
    await requireSession();
    const { data, error } = await adminClient
      .from('control_templates')
      .select('id, code, title')
      .order('code');
    if (error) return { error: error.message };
    return { data, success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function createMapping(payload: { template_id: string; soa_control_code: string; confidence: string }) {
  try {
    await requirePlatformAdmin();
    const invalido = validar(payload.soa_control_code, payload.confidence);
    if (invalido) return { error: invalido };
    const { error } = await adminClient.from('control_template_soa_controls').insert([payload]);
    if (error) return { error: error.code === '23505' ? 'Esa correspondencia ya existe.' : error.message };
    revalidatePath(RUTA);
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function updateMapping(templateId: string, soaControlCode: string, confidence: string) {
  try {
    await requirePlatformAdmin();
    const invalido = validar(soaControlCode, confidence);
    if (invalido) return { error: invalido };
    const { error } = await adminClient
      .from('control_template_soa_controls')
      .update({ confidence })
      .eq('template_id', templateId)
      .eq('soa_control_code', soaControlCode);
    if (error) return { error: error.message };
    revalidatePath(RUTA);
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}

export async function deleteMapping(templateId: string, soaControlCode: string) {
  try {
    await requirePlatformAdmin();
    const { error } = await adminClient
      .from('control_template_soa_controls')
      .delete()
      .eq('template_id', templateId)
      .eq('soa_control_code', soaControlCode);
    if (error) return { error: error.message };
    revalidatePath(RUTA);
    return { success: true };
  } catch (e: unknown) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
