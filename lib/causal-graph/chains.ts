import { createComplianceClient } from '@/lib/supabase/compliance';
import { createFluxionClient } from '@/lib/supabase/fluxion';

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type CausalChainStep = {
  node_id: string;
  /** Short human-readable label for the chain display */
  label: string;
};

export type ActiveCausalChain = {
  system_id: string;
  system_name: string;
  /** Ordered path from root cause to final effect */
  chain: CausalChainStep[];
  /** Number of nodes in the chain (chain.length) */
  length: number;
};

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type EdgeRow = { source_node_id: string; target_node_id: string };
type NodeRow  = { id: string; name: string };
type LinkRow  = { causal_node_id: string; failure_mode_id: string };
type ModeRow  = { ai_system_id: string; failure_mode_id: string };
type SystemRow = { id: string; name: string };

// ---------------------------------------------------------------------------
// DFS implementation
// ---------------------------------------------------------------------------

/**
 * Depth-first search that emits MAXIMAL paths (root-to-leaf) in the
 * active subgraph for a given system. A path is maximal when its last
 * node has no active successors.
 *
 * Uses visited set to avoid cycles.
 */
function dfs(
  nodeId: string,
  currentPath: string[],
  activeNodeIds: Set<string>,
  adjacency: Map<string, string[]>,
  visited: Set<string>,
  results: string[][]
): void {
  const successors = adjacency.get(nodeId) ?? [];
  const activeSuccessors: string[] = [];

  for (let i = 0; i < successors.length; i++) {
    const s = successors[i];
    if (activeNodeIds.has(s) && !visited.has(s)) {
      activeSuccessors.push(s);
    }
  }

  if (activeSuccessors.length === 0) {
    // Leaf → emit maximal path
    results.push([...currentPath]);
    return;
  }

  for (let i = 0; i < activeSuccessors.length; i++) {
    const next = activeSuccessors[i];
    visited.add(next);
    currentPath.push(next);
    dfs(next, currentPath, activeNodeIds, adjacency, visited, results);
    currentPath.pop();
    visited.delete(next);
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

/**
 * Detects the longest causally-connected chains of simultaneously active
 * failure modes across all systems in the organization.
 *
 * A "chain" is a directed path through the causal graph (following
 * 'causes' and 'amplifies' edges) where ALL nodes are mapped to at least
 * one failure mode that is active (not dismissed) in the same system.
 *
 * @param organizationId  Org to scope the system_failure_modes lookup
 * @param options.minLength  Minimum chain length in nodes (default: 3)
 * @param options.limit  Max chains to return (default: 5)
 */
export async function detectActiveCausalChains(
  organizationId: string,
  options: { minLength?: number; limit?: number } = {}
): Promise<ActiveCausalChain[]> {
  const minLength = options.minLength ?? 3;
  const limit = options.limit ?? 5;

  const compliance = createComplianceClient();
  const fluxion = createFluxionClient();

  // Parallel fetch: graph edges, all node names, node→fm links, active modes, systems
  const [relsResult, nodesResult, linksResult, modesResult, systemsResult] = await Promise.all([
    compliance
      .from('causal_relationships')
      .select('source_node_id, target_node_id')
      .in('type', ['causes', 'amplifies']),
    compliance
      .from('causal_nodes')
      .select('id, name'),
    compliance
      .from('causal_node_failure_mode_links')
      .select('causal_node_id, failure_mode_id'),
    fluxion
      .from('system_failure_modes')
      .select('ai_system_id, failure_mode_id')
      .eq('organization_id', organizationId)
      .neq('priority_status', 'dismissed'),
    fluxion
      .from('ai_systems')
      .select('id, name')
      .eq('organization_id', organizationId),
  ]);

  const edges   = (relsResult.data   ?? []) as EdgeRow[];
  const nodes   = (nodesResult.data  ?? []) as NodeRow[];
  const links   = (linksResult.data  ?? []) as LinkRow[];
  const modes   = (modesResult.data  ?? []) as ModeRow[];
  const systems = (systemsResult.data ?? []) as SystemRow[];

  if (edges.length === 0 || nodes.length === 0 || links.length === 0 || modes.length === 0) {
    return [];
  }

  // === Build data structures ===

  // Node id → name
  const nodeName = new Map<string, string>();
  for (let i = 0; i < nodes.length; i++) {
    nodeName.set(nodes[i].id, nodes[i].name);
  }

  // Directed adjacency list (global graph)
  const adjacency = new Map<string, string[]>();
  // Inverse adjacency (to detect root nodes = no predecessors)
  const inverseAdj = new Map<string, string[]>();

  for (let i = 0; i < edges.length; i++) {
    const { source_node_id: src, target_node_id: tgt } = edges[i];
    if (!adjacency.has(src)) adjacency.set(src, []);
    adjacency.get(src)!.push(tgt);
    if (!inverseAdj.has(tgt)) inverseAdj.set(tgt, []);
    inverseAdj.get(tgt)!.push(src);
  }

  // failure_mode_id → Set<causal_node_id>  (to compute active nodes per system)
  const fmToNodes = new Map<string, string[]>();
  for (let i = 0; i < links.length; i++) {
    const { failure_mode_id: fmId, causal_node_id: nodeId } = links[i];
    if (!fmToNodes.has(fmId)) fmToNodes.set(fmId, []);
    fmToNodes.get(fmId)!.push(nodeId);
  }

  // system_id → Set<failure_mode_id>  (active/not-dismissed modes per system)
  const activeFmsBySystem = new Map<string, Set<string>>();
  for (let i = 0; i < modes.length; i++) {
    const { ai_system_id: sysId, failure_mode_id: fmId } = modes[i];
    if (!activeFmsBySystem.has(sysId)) activeFmsBySystem.set(sysId, new Set());
    activeFmsBySystem.get(sysId)!.add(fmId);
  }

  // System id → name
  const systemNameMap = new Map<string, string>();
  for (let i = 0; i < systems.length; i++) {
    systemNameMap.set(systems[i].id, systems[i].name);
  }

  // === For each system, find active chains ===

  const allChains: ActiveCausalChain[] = [];
  const systemIds = Array.from(activeFmsBySystem.keys());

  for (let s = 0; s < systemIds.length; s++) {
    const sysId = systemIds[s];
    const activeFms = activeFmsBySystem.get(sysId)!;

    // Compute set of active causal nodes for this system
    const activeNodeIds = new Set<string>();
    const fmArr = Array.from(activeFms);
    for (let f = 0; f < fmArr.length; f++) {
      const candidateNodes = fmToNodes.get(fmArr[f]) ?? [];
      for (let n = 0; n < candidateNodes.length; n++) {
        activeNodeIds.add(candidateNodes[n]);
      }
    }

    if (activeNodeIds.size < minLength) continue;

    // Find root nodes: active nodes with no active predecessor
    const activeArr = Array.from(activeNodeIds);
    const rootNodes: string[] = [];

    for (let n = 0; n < activeArr.length; n++) {
      const nodeId = activeArr[n];
      const predecessors = inverseAdj.get(nodeId) ?? [];
      let hasActivePredecessor = false;
      for (let p = 0; p < predecessors.length; p++) {
        if (activeNodeIds.has(predecessors[p])) {
          hasActivePredecessor = true;
          break;
        }
      }
      if (!hasActivePredecessor) {
        rootNodes.push(nodeId);
      }
    }

    // DFS from each root to collect maximal paths
    const systemChainPaths: string[][] = [];
    for (let r = 0; r < rootNodes.length; r++) {
      const root = rootNodes[r];
      const visited = new Set<string>([root]);
      dfs(root, [root], activeNodeIds, adjacency, visited, systemChainPaths);
    }

    // Convert paths → ActiveCausalChain, filter by minLength
    for (let p = 0; p < systemChainPaths.length; p++) {
      const path = systemChainPaths[p];
      if (path.length < minLength) continue;

      allChains.push({
        system_id: sysId,
        system_name: systemNameMap.get(sysId) ?? sysId,
        chain: path.map((nodeId) => ({
          node_id: nodeId,
          label: nodeName.get(nodeId) ?? nodeId,
        })),
        length: path.length,
      });
    }
  }

  // Sort: by system name asc (to group chains from the same system together),
  // then by length desc within the same system
  allChains.sort((a, b) => {
    const sysCompare = a.system_name.localeCompare(b.system_name);
    if (sysCompare !== 0) return sysCompare;
    return b.length - a.length;
  });

  // Dedup: group by (system_id, first_node, last_node) → keep longest per group.
  // This collapses the many parallel paths that share the same root cause and
  // the same final effect into a single representative chain.
  const groupKey = (c: ActiveCausalChain) =>
    `${c.system_id}::${c.chain[0]?.node_id ?? ''}::${c.chain[c.chain.length - 1]?.node_id ?? ''}`;

  const seenGroups = new Map<string, ActiveCausalChain>();
  for (let i = 0; i < allChains.length; i++) {
    const c = allChains[i];
    const key = groupKey(c);
    const existing = seenGroups.get(key);
    // Since sorted by length desc, first occurrence per group is always the longest
    if (!existing) seenGroups.set(key, c);
  }

  const dedupedByGroup = Array.from(seenGroups.values());

  // Cap at max 2 chains per system to ensure diversity
  const perSystemCount = new Map<string, number>();
  const dedupedChains: ActiveCausalChain[] = [];

  for (let i = 0; i < dedupedByGroup.length; i++) {
    const c = dedupedByGroup[i];
    const count = perSystemCount.get(c.system_id) ?? 0;
    if (count >= 2) continue;
    perSystemCount.set(c.system_id, count + 1);
    dedupedChains.push(c);
    if (dedupedChains.length >= limit) break;
  }

  return dedupedChains;
}
