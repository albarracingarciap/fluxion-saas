import { Metadata } from 'next';
import { getFullCausalGraph } from '@/lib/causal-graph/system-graph';
import { CatalogClient } from './catalog-client';

export const metadata: Metadata = {
  title: 'Catálogo Causal | Fluxion',
  description: 'Grafo dinámico de todas las relaciones de causalidad en la taxonomía.',
};

export default async function CatalogPage() {
  const graph = await getFullCausalGraph();

  return <CatalogClient graph={graph} />;
}
