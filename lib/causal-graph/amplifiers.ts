import { createComplianceClient } from '@/lib/supabase/compliance';

/**
 * A catalog-level failure mode that amplifies a given AI Act article.
 * The caller is responsible for filtering to modes active in a specific system.
 */
export type ArticleAmplifierEntry = {
  failure_mode_id: string;
};

/**
 * Extracts a normalized article code like "Art. 9" from any text
 * containing references like "art. 9", "Art.9", "Artículo 9", etc.
 * Used for both causal node names and obligation titles/codes.
 */
export function extractArticleCode(text: string): string | null {
  const match = text.match(/Art\.\s*(\d+[a-z]?)/i);
  if (!match) return null;
  return `Art. ${match[1]}`;
}

/**
 * Normalizes an obligation_code from system_obligations to a canonical form
 * comparable against extractArticleCode results.
 * e.g., "art. 9" → "Art. 9", "Artículo 14" → "Art. 14", "Art.9" → "Art. 9"
 */
export function normalizeObligationCode(code: string | null): string | null {
  if (!code) return null;
  const match = code.match(/(?:art(?:ículo|iculo)?\.?\s*)(\d+[a-z]?)/i);
  if (!match) return null;
  return `Art. ${match[1]}`;
}

/**
 * Builds a catalog-level map of which failure_mode_ids amplify which AI Act articles,
 * based on causal_relationships where the target node name references an article
 * and the source nodes are linked to failure modes via causal_node_failure_mode_links.
 *
 * This is NOT filtered to any specific system — the caller filters by active modes.
 *
 * @returns Map<article_code, failure_mode_id[]>
 *   e.g., "Art. 9" → ["uuid-A", "uuid-B"]
 */
export async function buildArticleToFailureModeMap(): Promise<Map<string, string[]>> {
  const result = new Map<string, string[]>();
  const compliance = createComplianceClient();

  // 1. Get all 'amplifies' relationships with the target node name
  const { data: rels, error: relsError } = await compliance
    .from('causal_relationships')
    .select(
      `source_node_id,
       target:causal_nodes!target_node_id(name)`
    )
    .eq('type', 'amplifies');

  if (relsError || !rels || rels.length === 0) return result;

  // 2. Group source_node_ids by the extracted article code from the target node name
  const articleToSourceNodes = new Map<string, Set<string>>();

  for (const rel of rels) {
    const targetName = (rel.target as unknown as { name: string } | null)?.name;
    if (!targetName) continue;

    const articleCode = extractArticleCode(targetName);
    if (!articleCode) continue;

    if (!articleToSourceNodes.has(articleCode)) {
      articleToSourceNodes.set(articleCode, new Set());
    }
    articleToSourceNodes.get(articleCode)!.add(rel.source_node_id);
  }

  if (articleToSourceNodes.size === 0) return result;

  // Flatten all source node ids
  const allSourceNodeIds: string[] = [];
  const articleEntries = Array.from(articleToSourceNodes.entries());
  for (let k = 0; k < articleEntries.length; k++) {
    const nodeSet = articleEntries[k][1];
    const arr = Array.from(nodeSet);
    for (let i = 0; i < arr.length; i++) {
      allSourceNodeIds.push(arr[i]);
    }
  }
  const uniqueNodeIds = Array.from(new Set(allSourceNodeIds));

  // 3. Get failure_mode mappings for those source nodes
  const { data: links, error: linksError } = await compliance
    .from('causal_node_failure_mode_links')
    .select('causal_node_id, failure_mode_id')
    .in('causal_node_id', uniqueNodeIds);

  if (linksError || !links || links.length === 0) return result;

  // Build node → failure_modes lookup
  const nodeToFms = new Map<string, string[]>();
  for (const link of links) {
    if (!nodeToFms.has(link.causal_node_id)) {
      nodeToFms.set(link.causal_node_id, []);
    }
    nodeToFms.get(link.causal_node_id)!.push(link.failure_mode_id);
  }

  // 4. Compose article → failure_modes map (unique, deduped)
  const articleEntries2 = Array.from(articleToSourceNodes.entries());
  for (let k = 0; k < articleEntries2.length; k++) {
    const articleCode = articleEntries2[k][0];
    const sourceNodes = articleEntries2[k][1];
    const fmIds = new Set<string>();
    const nodeArr = Array.from(sourceNodes);
    for (let i = 0; i < nodeArr.length; i++) {
      const fmList = nodeToFms.get(nodeArr[i]) ?? [];
      for (let j = 0; j < fmList.length; j++) {
        fmIds.add(fmList[j]);
      }
    }

    if (fmIds.size > 0) {
      result.set(articleCode, Array.from(fmIds));
    }
  }

  return result;
}
