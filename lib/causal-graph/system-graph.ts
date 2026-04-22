import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SystemGraphActiveFm = {
  id: string;
  code: string;
  name: string;
  s_actual: number | null;
};

export type SystemGraphNode = {
  id: string;
  name: string;
  domain: string;
  /** True if at least one failure_mode mapped to this node is active in the system */
  active: boolean;
  active_failure_modes: SystemGraphActiveFm[];
  max_s_actual: number | null;
};

export type SystemGraphEdge = {
  id: string;
  source: string;
  target: string;
  type: 'causes' | 'amplifies' | 'enables' | 'correlates';
  activation_condition: string | null;
};

export type SystemCausalGraph = {
  nodes: SystemGraphNode[];
  edges: SystemGraphEdge[];
};

// ---------------------------------------------------------------------------
// Internal row types
// ---------------------------------------------------------------------------

type NodeRow   = { id: string; name: string; domain: string };
type RelRow    = { id: string; source_node_id: string; target_node_id: string; type: string; activation_condition: string | null };
type LinkRow   = { causal_node_id: string; failure_mode_id: string };
type ModeRow   = { failure_mode_id: string; priority_score: number | null };
type FmCatRow  = { id: string; code: string; name: string };

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Fetches the full causal catalog graph (all nodes + all edges) and enriches
 * each node with its activation state in the given system.
 *
 * Source of "active":  system_failure_modes where priority_status != 'dismissed'.
 * Score (S_actual):    priority_score from that same table.
 * All catalog nodes are returned (Decision 1), regardless of activation.
 */
export async function buildSystemCausalGraph(
  systemId: string,
  organizationId: string
): Promise<SystemCausalGraph> {
  const compliance = createComplianceClient();
  const fluxion = createFluxionClient();

  // Parallel: all catalog nodes, all relationships, all links, active modes in system
  const [nodesResult, relsResult, linksResult, modesResult] = await Promise.all([
    compliance
      .from('causal_nodes')
      .select('id, name, domain'),
    compliance
      .from('causal_relationships')
      .select('id, source_node_id, target_node_id, type, activation_condition'),
    compliance
      .from('causal_node_failure_mode_links')
      .select('causal_node_id, failure_mode_id'),
    fluxion
      .from('system_failure_modes')
      .select('failure_mode_id, priority_score')
      .eq('ai_system_id', systemId)
      .eq('organization_id', organizationId)
      .neq('priority_status', 'dismissed'),
  ]);

  const catalogNodes = (nodesResult.data  ?? []) as NodeRow[];
  const rels         = (relsResult.data   ?? []) as RelRow[];
  const links        = (linksResult.data  ?? []) as LinkRow[];
  const activeModes  = (modesResult.data  ?? []) as ModeRow[];

  // Build active failure_mode lookup: fm_id → priority_score
  const activeFmScore = new Map<string, number | null>();
  for (let i = 0; i < activeModes.length; i++) {
    const m = activeModes[i];
    activeFmScore.set(m.failure_mode_id, m.priority_score);
  }
  const activeFmIds = Array.from(activeFmScore.keys());

  // Fetch catalog codes+names for active failure modes (sequential, small set)
  const fmCatalogResult =
    activeFmIds.length > 0
      ? await compliance
          .from('failure_modes')
          .select('id, code, name')
          .in('id', activeFmIds)
      : { data: [] };

  const fmInfo = new Map<string, { code: string; name: string }>(
    ((fmCatalogResult.data ?? []) as FmCatRow[]).map((fm) => [
      fm.id,
      { code: fm.code, name: fm.name },
    ])
  );

  // Build node_id → failure_mode_ids lookup
  const nodeToFms = new Map<string, string[]>();
  for (let i = 0; i < links.length; i++) {
    const l = links[i];
    if (!nodeToFms.has(l.causal_node_id)) nodeToFms.set(l.causal_node_id, []);
    nodeToFms.get(l.causal_node_id)!.push(l.failure_mode_id);
  }

  // Build enriched SystemGraphNode for every catalog node
  const nodes: SystemGraphNode[] = catalogNodes.map((n) => {
    const allFmIds = nodeToFms.get(n.id) ?? [];
    const activeFms: SystemGraphActiveFm[] = [];

    for (let j = 0; j < allFmIds.length; j++) {
      const fmId = allFmIds[j];
      if (!activeFmScore.has(fmId)) continue;
      const info = fmInfo.get(fmId);
      activeFms.push({
        id: fmId,
        code: info?.code ?? fmId.slice(0, 8),
        name: info?.name ?? '',
        s_actual: activeFmScore.get(fmId) ?? null,
      });
    }

    // Sort active fms by s_actual desc
    activeFms.sort((a, b) => (b.s_actual ?? 0) - (a.s_actual ?? 0));

    const maxS =
      activeFms.length > 0
        ? activeFms.reduce<number | null>((acc, fm) => {
            if (fm.s_actual === null) return acc;
            return acc === null ? fm.s_actual : Math.max(acc, fm.s_actual);
          }, null)
        : null;

    return {
      id: n.id,
      name: n.name,
      domain: n.domain ?? 'GEN',
      active: activeFms.length > 0,
      active_failure_modes: activeFms,
      max_s_actual: maxS,
    };
  });

  // Build edges
  const edges: SystemGraphEdge[] = rels.map((r) => ({
    id: r.id,
    source: r.source_node_id,
    target: r.target_node_id,
    type: r.type as 'causes' | 'amplifies' | 'enables' | 'correlates',
    activation_condition: r.activation_condition,
  }));

  return { nodes, edges };
}

/**
 * Fetches the raw causal catalog graph (all nodes + all edges) without any
 * system-specific activation state. Used for taxonomy administration.
 */
export async function getFullCausalGraph(): Promise<SystemCausalGraph> {
  const compliance = createComplianceClient();

  const [nodesResult, relsResult] = await Promise.all([
    compliance.from('causal_nodes').select('id, name, domain'),
    compliance.from('causal_relationships').select('id, source_node_id, target_node_id, type, activation_condition'),
  ]);

  const catalogNodes = (nodesResult.data ?? []) as NodeRow[];
  const rels = (relsResult.data ?? []) as RelRow[];

  const nodes: SystemGraphNode[] = catalogNodes.map((n) => ({
    id: n.id,
    name: n.name,
    domain: n.domain ?? 'GEN',
    active: false,
    active_failure_modes: [],
    max_s_actual: null,
  }));

  const edges: SystemGraphEdge[] = rels.map((r) => ({
    id: r.id,
    source: r.source_node_id,
    target: r.target_node_id,
    type: r.type as 'causes' | 'amplifies' | 'enables' | 'correlates',
    activation_condition: r.activation_condition,
  }));

  return { nodes, edges };
}
