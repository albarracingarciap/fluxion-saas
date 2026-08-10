'use client';

import { useMemo, useState, useCallback } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
  type Node,
  type Edge,
  type NodeProps,
  type NodeTypes,
  type FitViewOptions,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { X, GitFork } from 'lucide-react';
import type { SystemCausalGraph, SystemGraphNode } from '@/lib/causal-graph/system-graph';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const NODE_W = 210;
const NODE_H = 82;

const FIT_VIEW_OPTS: FitViewOptions = { padding: 0.15, duration: 300 };

const DOMAIN_STYLE: Record<string, string> = {
  TEC: 'bg-cyan-dim text-brand-cyan border-cyan-border',
  GOV: 'bg-[rgba(124,92,255,0.12)] text-[#7c5cff] border-[#7c5cff40]',
  ETI: 'bg-grdim text-gr border-grb',
  LEG: 'bg-red-dim text-re border-reb',
  SOC: 'bg-ordim text-or border-orb',
};

function domainStyle(domain: string): string {
  return DOMAIN_STYLE[domain] ?? 'bg-ltbg text-lttm border-ltb';
}

function edgeColor(type: string): string {
  if (type === 'causes')    return '#ef4444';
  if (type === 'amplifies') return '#f59e0b';
  if (type === 'enables')   return '#64748b';
  return '#3b82f6'; // correlates
}

function edgeStyle(type: string): React.CSSProperties {
  const color = edgeColor(type);
  const base: React.CSSProperties = { stroke: color, strokeWidth: 1.5 };
  if (type === 'amplifies') return { ...base, strokeDasharray: '5 3' };
  if (type === 'correlates') return { ...base, strokeDasharray: '2 2' };
  return base;
}

// ---------------------------------------------------------------------------
// Dagre layout
// ---------------------------------------------------------------------------

function applyDagreLayout(rfNodes: Node[], rfEdges: Edge[]): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 55, ranksep: 80, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  rfNodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }));
  rfEdges.forEach((e) => g.setEdge(e.source, e.target));

  Dagre.layout(g);

  return {
    nodes: rfNodes.map((n) => {
      const pos = g.node(n.id);
      return { ...n, position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 } };
    }),
    edges: rfEdges,
  };
}

// ---------------------------------------------------------------------------
// React Flow node/edge conversion helpers
// ---------------------------------------------------------------------------

function toRFNodes(graphNodes: SystemGraphNode[]): Node[] {
  return graphNodes.map((n) => ({
    id: n.id,
    type: 'catalogNode',
    position: { x: 0, y: 0 },
    data: n,
    selectable: true,
  }));
}

function toRFEdges(graphEdges: SystemCausalGraph['edges'], nodeSet: Set<string>): Edge[] {
  return graphEdges
    .filter((e) => nodeSet.has(e.source) && nodeSet.has(e.target))
    .map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep',
      style: edgeStyle(e.type),
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: edgeColor(e.type),
        width: 16,
        height: 16,
      },
      animated: e.type === 'amplifies',
      label: e.activation_condition
        ? e.activation_condition.length > 35
          ? e.activation_condition.slice(0, 35) + '…'
          : e.activation_condition
        : undefined,
      labelStyle: { fontSize: 9, fill: '#64748b', fontFamily: 'var(--font-plex)' },
      labelBgStyle: { fill: 'var(--ltbg)', fillOpacity: 0.85 },
    }));
}

// ---------------------------------------------------------------------------
// Custom node component
// ---------------------------------------------------------------------------

type CatalogMapNodeData = SystemGraphNode & Record<string, unknown>;
type CatalogMapNodeProps = NodeProps<Node<CatalogMapNodeData>>;

function CatalogMapNodeComponent({ data, selected }: CatalogMapNodeProps) {
  const { domain, name } = data;

  const borderColor = '#1e293b';
  const shadowClass = '';
  const bgClass = 'bg-ltcard';

  const selectedRing = selected ? 'ring-2 ring-brand-cyan ring-offset-1 ring-offset-ltbg' : '';

  return (
    <div
      className={`rounded-[10px] border-2 ${bgClass} ${shadowClass} ${selectedRing} px-3 py-2 cursor-pointer transition-all flex flex-col justify-center`}
      style={{ width: NODE_W, minHeight: NODE_H, borderColor }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#334155', width: 8, height: 8, border: 'none' }} />

      {/* Header row: domain badge */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className={`font-plex text-[8.5px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${domainStyle(domain)}`}>
          {domain}
        </span>
      </div>

      {/* Node name */}
      <p className="font-sora text-[10.5px] font-medium text-ltt leading-[1.3] line-clamp-3">
        {name}
      </p>

      <Handle type="source" position={Position.Bottom} style={{ background: '#334155', width: 8, height: 8, border: 'none' }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  catalogNode: CatalogMapNodeComponent,
};

// ---------------------------------------------------------------------------
// Side panel
// ---------------------------------------------------------------------------

function NodeDetailPanel({
  node,
  onClose,
}: {
  node: SystemGraphNode;
  onClose: () => void;
}) {
  return (
    <div className="absolute right-2 top-2 bottom-2 w-72 bg-ltcard border border-ltb rounded-[12px] shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-20 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ltb shrink-0 bg-ltcard2">
        <div className="flex items-center gap-2">
           <GitFork size={13} className="text-brand-cyan" />
           <p className="font-plex text-[10.5px] font-medium uppercase tracking-[0.7px] text-lttm">Nodo del catálogo</p>
        </div>
        <button onClick={onClose} className="text-lttm hover:text-ltt transition-colors p-1 rounded-md hover:bg-ltbg">
          <X size={15} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-5">
        <div>
          <span className={`inline-flex font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 rounded-full border ${domainStyle(node.domain)} mb-2.5`}>
            Dominio {node.domain}
          </span>
          <p className="font-sora text-[13.5px] font-semibold text-ltt leading-snug">{node.name}</p>
        </div>

        <div className="rounded-[8px] border border-ltb bg-ltbg px-4 py-3">
          <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm mb-1">Información</p>
          <p className="font-sora text-[12px] text-ltt2 leading-relaxed">
            Este nodo forma parte de la taxonomía causal base. Su activación es determinada automáticamente a partir de los modos de fallo mapeados hacia él en la evaluación de cada sistema de IA.
          </p>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function CatalogCanvas({ graph, fullscreen }: { graph: SystemCausalGraph; fullscreen?: boolean }) {
  return (
    <ReactFlowProvider>
      <CatalogMapInner graph={graph} fullscreen={fullscreen} />
    </ReactFlowProvider>
  );
}

function CatalogMapInner({ graph, fullscreen }: { graph: SystemCausalGraph; fullscreen?: boolean }) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    const rfNodes = toRFNodes(graph.nodes);
    const nodeSet = new Set(rfNodes.map((n) => n.id));
    const rfEdges = toRFEdges(graph.edges, nodeSet);
    return applyDagreLayout(rfNodes, rfEdges);
  }, [graph]);

  const selectedNode = useMemo(
    () => (selectedNodeId ? graph.nodes.find((n) => n.id === selectedNodeId) ?? null : null),
    [selectedNodeId, graph.nodes]
  );

  const onNodeClick = useCallback((_evt: React.MouseEvent, node: Node) => {
    setSelectedNodeId((prev) => (prev === node.id ? null : node.id));
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  const totalCount = graph.nodes.length;

  return (
    <div className={`rounded-[12px] border border-ltb overflow-hidden relative shadow-sm ${fullscreen ? 'h-full w-full' : 'h-[660px]'}`}>
      {/* Controls bar */}
      <div className="absolute top-4 left-4 flex items-center gap-3 z-10 w-full max-w-[calc(100%-32px)]">
        <div className="bg-ltcard border border-ltb shadow-sm text-ltt font-sora font-medium text-[11px] px-3.5 py-1.5 rounded-full flex items-center gap-2 shrink-0">
          <GitFork size={13} className="text-lttm" />
          {totalCount} Nodos totales
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 bg-ltcard border border-ltb shadow-sm rounded-full px-4 py-1.5 overflow-x-auto">
          {[
            { label: 'Causa (fuerte)', color: '#ef4444' },
            { label: 'Amplifica (probabilidad)', color: '#f59e0b', dashed: true },
            { label: 'Habilita (condición)', color: '#64748b' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1.5 font-plex text-[9.5px] uppercase tracking-[0.5px] text-lttm whitespace-nowrap">
              <svg width="22" height="8">
                <line
                  x1="0" y1="4" x2="16" y2="4"
                  stroke={item.color}
                  strokeWidth="1.5"
                  strokeDasharray={item.dashed ? '4 2' : ''}
                />
                <polygon points="16,1 22,4 16,7" fill={item.color} />
              </svg>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <ReactFlow
        defaultNodes={initNodes}
        defaultEdges={initEdges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        fitView
        fitViewOptions={FIT_VIEW_OPTS}
        minZoom={0.1}
        maxZoom={2.5}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={true}
        nodesConnectable={false}
        elementsSelectable={true}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={22}
          size={1}
          color="rgba(100,116,139,0.2)"
          style={{ background: 'var(--ltbg)' }}
        />
        <Controls
          showInteractive={false}
          style={{
            background: 'var(--ltcard)',
            border: '1px solid var(--ltb)',
            borderRadius: 8,
          }}
        />
        <MiniMap
          nodeColor="#1e293b"
          maskColor="rgba(15,20,26,0.7)"
          style={{
            background: 'var(--ltcard)',
            border: '1px solid var(--ltb)',
            borderRadius: 8,
          }}
        />
      </ReactFlow>

      {/* Node detail side panel */}
      {selectedNode && (
        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNodeId(null)} />
      )}
    </div>
  );
}
