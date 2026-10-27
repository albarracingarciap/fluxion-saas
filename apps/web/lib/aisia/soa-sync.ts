import 'server-only';

/**
 * Efecto de las AISIA aprobadas en la Declaración de Aplicabilidad (B08).
 *
 * Los controles A.5.2-A.5.5 pasan a «Implantado» cuando todos los sistemas
 * vinculados a cada uno tienen una AISIA aprobada. Antes se hacía siempre, y
 * cambiaba una Declaración ya enviada o aprobada por detrás de su circuito
 * (GAP-22). Ahora solo se aplica con la Declaración en borrador; si no lo está,
 * no se toca y se aplica al iniciar su siguiente revisión
 * (`transitionSoAStatus('draft')`).
 *
 * Desde B15 la AISIA es una plantilla del expediente (`documents.template_key =
 * 'aisia'`): cuenta un documento aprobado (o aprobado y después sustituido por
 * una versión nueva) igual que una evaluación AISIA aprobada del asistente.
 */

const AISIA_SATISFIES_SOA = ['A.5.2', 'A.5.3', 'A.5.4', 'A.5.5'] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FluxionClient = any;

export type AisiaSoaSyncResult = {
  /** La Declaración no está en borrador: no se tocó nada. */
  deferred: boolean;
  /** Controles que pasaron a «Implantado». */
  implemented: string[];
};

export async function syncAisiaSoaControls(
  fluxion: FluxionClient,
  organizationId: string,
): Promise<AisiaSoaSyncResult> {
  const { data: meta } = await fluxion
    .from('organization_soa_metadata')
    .select('lifecycle_status')
    .eq('organization_id', organizationId)
    .maybeSingle();

  // Sin metadatos la Declaración aún no se ha iniciado: equivale a borrador.
  const estado = (meta?.lifecycle_status as string | null) ?? 'draft';
  if (estado !== 'draft') return { deferred: true, implemented: [] };

  const { data: soaControls } = await fluxion
    .from('organization_soa_controls')
    .select('id, control_code, status')
    .eq('organization_id', organizationId)
    .eq('is_applicable', true)
    .in('control_code', AISIA_SATISFIES_SOA);

  const implemented: string[] = [];
  if (!soaControls || soaControls.length === 0) return { deferred: false, implemented };

  for (const soaControl of soaControls as Array<{ id: string; control_code: string; status: string }>) {
    if (soaControl.status === 'implemented') continue;

    const { data: links } = await fluxion
      .from('organization_soa_system_links')
      .select('ai_system_id')
      .eq('soa_control_id', soaControl.id);

    if (!links || links.length === 0) continue;

    const linkedSystemIds = (links as Array<{ ai_system_id: string }>).map((l) => l.ai_system_id);

    const { data: approvedRows } = await fluxion
      .from('aisia_assessments')
      .select('ai_system_id')
      .eq('organization_id', organizationId)
      .eq('status', 'approved')
      .in('ai_system_id', linkedSystemIds);

    const { data: approvedDocs } = await fluxion
      .from('documents')
      .select('ai_system_id')
      .eq('organization_id', organizationId)
      .eq('template_key', 'aisia')
      .in('status', ['approved', 'superseded'])
      .not('approved_at', 'is', null)
      .in('ai_system_id', linkedSystemIds);

    const approvedSet = new Set(
      ([...(approvedRows ?? []), ...(approvedDocs ?? [])] as Array<{ ai_system_id: string }>).map((r) => r.ai_system_id)
    );
    if (!linkedSystemIds.every((id) => approvedSet.has(id))) continue;

    const { error } = await fluxion
      .from('organization_soa_controls')
      .update({ status: 'implemented' })
      .eq('id', soaControl.id)
      .eq('organization_id', organizationId);

    if (!error) implemented.push(soaControl.control_code);
  }

  return { deferred: false, implemented };
}
