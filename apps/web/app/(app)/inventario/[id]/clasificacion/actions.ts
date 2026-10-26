'use server';

import { redirect } from 'next/navigation';

import type { AiActInputs } from '@/lib/ai-act';
import { classifyWithCatalog, fallbackFieldsFromRow, loadAiActCatalog } from '@/lib/ai-act/server';
import { createFluxionClient } from '@/lib/supabase/fluxion';
import { createClient } from '@/lib/supabase/server';

// Suelo de zona FMEA por nivel de riesgo. Un sistema de alto riesgo no puede
// quedar por debajo de Zona II por muy bien que puntue: el nivel regulatorio
// pone un minimo que la evaluacion tecnica no puede rebajar.
const FLOOR_ZONE: Record<string, string> = {
  prohibited: 'Zona I',
  high:       'Zona II',
  limited:    'Zona III',
  minimal:    'Zona IV',
};

/**
 * Clasifica un sistema con sus datos reales.
 *
 * Antes esta función era un stub: esperaba 2,5 segundos y devolvía siempre lo
 * mismo —riesgo alto, «Anexo III · 5(b)» y los mismos siete artículos— para
 * cualquier sistema. La pantalla de tres capas era una animación sobre un valor
 * fijo.
 *
 * Usa el motor único (`lib/ai-act`, B13a): dos implementaciones de la misma
 * regla legal terminan divergiendo, y el día que lo hagan el expediente dirá
 * una cosa distinta según quién lo mire.
 *
 * Las obligaciones tampoco se inventan: salen del catálogo
 * `compliance.obligations` con las reglas RN-O del motor
 * (`suggestObligations`). La vista `compliance.v_system_obligations` aplica la
 * misma lógica en SQL (B13d).
 */
export async function runClassificationEngine(systemId: string) {
  const supabase = createClient();
  const fluxion = createFluxionClient();

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect('/login');

  const { data: membership } = await fluxion
    .from('profiles')
    .select('organization_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) {
    return { success: false, error: 'No se encontró la organización del usuario.' };
  }

  const { data: system } = await fluxion
    .from('ai_systems')
    .select('*')
    .eq('organization_id', membership.organization_id)
    .eq('id', systemId)
    .maybeSingle();

  if (!system) {
    return { success: false, error: 'No se encontró el sistema.' };
  }

  // Motor único (B13a): supuestos AI Act si los hay; si no, la vía de respaldo.
  const roles = (system.value_chain_roles ?? []) as string[];
  const { result: r, obligations } = classifyWithCatalog({
    inputs: (system.aiact_inputs as AiActInputs | null) ?? null,
    fields: fallbackFieldsFromRow(system),
    roles,
    catalog: await loadAiActCatalog(),
  });

  if (r.scope === 'not_ai_system' || r.scope === 'out_of_scope') {
    return {
      success: true,
      result: {
        riskLevel: r.scope,
        floorZone: '—',
        baseRule: r.display.basis || r.display.label,
        reason: r.display.reason,
        appliedArticles: [] as string[],
        extraObligations: [] as string[],
        ambiguityDetected: false,
        avisos: r.warnings.map((w) => w.text),
        rolesDeclarados: roles,
        systemId,
      },
    };
  }

  // El Anexo III clasifica por FINALIDAD PREVISTA, no por sector, y el Art. 6.3
  // admite excepciones que exigen juicio humano. Un alto riesgo por la vía de
  // respaldo es una presunción, no un veredicto: se marca como ambiguo.
  const ambiguityDetected = r.method === 'respaldo' && r.level === 'high';
  const sinRol = roles.length === 0;

  return {
    success: true,
    result: {
      riskLevel: r.level ?? 'pending',
      floorZone: FLOOR_ZONE[r.level ?? ''] ?? '—',
      baseRule: r.display.basis,
      reason: r.display.reason,
      appliedArticles: obligations.map((o) => o.label.split(' — ')[0]),
      extraObligations: [] as string[],
      ambiguityDetected: ambiguityDetected || sinRol,
      avisos: r.warnings.map((w) => w.text),
      rolesDeclarados: roles,
      systemId,
    },
  };
}
