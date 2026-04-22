import { createComplianceClient } from '@/lib/supabase/compliance';

export type CausalDegrees = {
  inDegree: number;
  outDegree: number;
};

export type CausalDegreeMap = Map<string, CausalDegrees>;

/**
 * Computes causal in-degree and out-degree for each active failure mode of a system.
 *
 * - out-degree: number of other active failure modes this FM can affect via causal relationships
 * - in-degree: number of other active failure modes that can affect this FM
 *
 * Only `causes` and `amplifies` relationships are counted (not `correlates` or `enables`).
 *
 * @param activeFailureModeIds - The failure_mode_ids (from compliance.failure_modes) active in the system
 * @returns A Map from failure_mode_id to { inDegree, outDegree }. FMs with both = 0 are omitted.
 */
export async function computeCausalDegrees(activeFailureModeIds: string[]): Promise<CausalDegreeMap> {
  const result: CausalDegreeMap = new Map();

  if (activeFailureModeIds.length === 0) return result;

  const compliance = createComplianceClient();

  // 1. Get all causal node links for the active failure modes
  const { data: links, error: linksError } = await compliance
    .from('causal_node_failure_mode_links')
    .select('causal_node_id, failure_mode_id')
    .in('failure_mode_id', activeFailureModeIds);

  if (linksError) {
    return result;
  }

  if (!links || links.length === 0) return result;

  // 2. Build bidirectional maps: node → FMs and FM → nodes
  const nodeToFms = new Map<string, Set<string>>();
  const allNodeIds = new Set<string>();

  for (const link of links) {
    allNodeIds.add(link.causal_node_id);

    if (!nodeToFms.has(link.causal_node_id)) {
      nodeToFms.set(link.causal_node_id, new Set());
    }
    nodeToFms.get(link.causal_node_id)!.add(link.failure_mode_id);
  }

  const nodeIdArray = Array.from(allNodeIds);

  // 3. Get causal relationships where both source and target are mapped to active FMs
  //    and the relationship type is directional (causes / amplifies)
  const { data: relationships, error: relError } = await compliance
    .from('causal_relationships')
    .select('source_node_id, target_node_id, type')
    .in('source_node_id', nodeIdArray)
    .in('target_node_id', nodeIdArray)
    .in('type', ['causes', 'amplifies']);

  if (relError) {
    return result;
  }

  if (!relationships || relationships.length === 0) return result;

  // 4. Compute unique FM-to-FM connections via causal graph
  //    outConnections[fm] = set of other FMs this FM can affect
  //    inConnections[fm]  = set of other FMs that can affect this FM
  const outConnections = new Map<string, Set<string>>();
  const inConnections = new Map<string, Set<string>>();

  for (const rel of relationships) {
    const sourceFms = nodeToFms.get(rel.source_node_id);
    const targetFms = nodeToFms.get(rel.target_node_id);

    if (!sourceFms || !targetFms) continue;

    const sourceFmArray = Array.from(sourceFms);
    const targetFmArray = Array.from(targetFms);

    for (let si = 0; si < sourceFmArray.length; si++) {
      const sourceFm = sourceFmArray[si];
      for (let ti = 0; ti < targetFmArray.length; ti++) {
        const targetFm = targetFmArray[ti];
        // Skip self-references (same FM on both sides)
        if (sourceFm === targetFm) continue;

        if (!outConnections.has(sourceFm)) {
          outConnections.set(sourceFm, new Set());
        }
        outConnections.get(sourceFm)!.add(targetFm);

        if (!inConnections.has(targetFm)) {
          inConnections.set(targetFm, new Set());
        }
        inConnections.get(targetFm)!.add(sourceFm);
      }
    }
  }

  // 5. Build result map — only include FMs with at least one connection
  for (let i = 0; i < activeFailureModeIds.length; i++) {
    const fmId = activeFailureModeIds[i];
    const outDegree = outConnections.get(fmId)?.size ?? 0;
    const inDegree = inConnections.get(fmId)?.size ?? 0;

    if (outDegree > 0 || inDegree > 0) {
      result.set(fmId, { inDegree, outDegree });
    }
  }

  return result;
}
