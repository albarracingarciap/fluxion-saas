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
import { X, ZoomIn } from 'lucide-react';
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
      // pos is the center; React Flow expects top-left corner
      return { ...n, position: { x: (pos?.x ?? 0) - NODE_W / 2, y: (pos?.y ?? 0) - NODE_H / 2 } };
    }),
    edges: rfEdges,
  };
}

// ---------------------------------------------------------------------------
// React Flow node/edge conversion helpers
// ---------------------------------------------------------------------------

function toRFNodes(graphNodes: SystemGraphNode[], onlyActive: boolean): Node[] {
  const filtered = onlyActive ? graphNodes.filter((n) => n.active) : graphNodes;
  return filtered.map((n) => ({
    id: n.id,
    type: 'causalNode',
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

type CausalMapNodeData = SystemGraphNode & Record<string, unknown>;
type CausalMapNodeProps = NodeProps<Node<CausalMapNodeData>>;

function CausalMapNodeComponent({ data, selected }: CausalMapNodeProps) {
  const { active, max_s_actual, domain, name, active_failure_modes } = data;

  let borderColor = '#1e293b'; // ltb equivalent
  let shadowClass = '';
  let bgClass = 'bg-ltbg';
  let opacityClass = 'opacity-50';

  if (active) {
    opacityClass = '';
    bgClass = 'bg-ltcard';
    if ((max_s_actual ?? 0) >= 9) {
      borderColor = '#ef4444';
      shadowClass = 'shadow-[0_0_14px_rgba(239,68,68,0.45)]';
    } else if ((max_s_actual ?? 0) >= 7) {
      borderColor = '#f59e0b';
      shadowClass = 'shadow-[0_0_10px_rgba(245,158,11,0.4)]';
    } else {
      borderColor = '#00adec';
      shadowClass = 'shadow-[0_0_8px_rgba(0,173,236,0.25)]';
    }
  }

  const selectedRing = selected ? 'ring-2 ring-brand-cyan ring-offset-1 ring-offset-ltbg' : '';

  return (
    <div
      className={`rounded-[10px] border-2 ${bgClass} ${shadowClass} ${opacityClass} ${selectedRing} px-3 py-2 cursor-pointer transition-all`}
      style={{ width: NODE_W, minHeight: NODE_H, borderColor }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#334155', width: 8, height: 8, border: 'none' }} />

      {/* Header row: domain badge + S score */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className={`font-plex text-[8.5px] uppercase tracking-[0.5px] px-1.5 py-0.5 rounded-full border ${domainStyle(domain)}`}>
          {domain}
        </span>
        {active && max_s_actual !== null && (
          <span className={`font-plex text-[9px] font-bold ${max_s_actual >= 9 ? 'text-re' : 'text-or'}`}>
            S={max_s_actual}
          </span>
        )}
      </div>

      {/* Node name */}
      <p className="font-sora text-[10.5px] text-ltt leading-[1.3] line-clamp-2">
        {name}
      </p>

      {/* Active failure mode codes */}
      {active && active_failure_modes.length > 0 && (
        <p className="font-plex text-[9px] text-brand-cyan mt-1.5 truncate">
          {active_failure_modes[0].code}
          {active_failure_modes.length > 1 && (
            <span className="text-lttm"> +{active_failure_modes.length - 1}</span>
          )}
        </p>
      )}

      <Handle type="source" position={Position.Bottom} style={{ background: '#334155', width: 8, height: 8, border: 'none' }} />
    </div>
  );
}

const nodeTypes: NodeTypes = {
  causalNode: CausalMapNodeComponent,
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
    <div className="absolute right-2 top-2 bottom-2 w-60 bg-ltcard border border-ltb rounded-[12px] shadow-lg z-20 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-ltb shrink-0">
        <p className="font-plex text-[10px] uppercase tracking-[0.7px] text-lttm">Nodo causal</p>
        <button onClick={onClose} className="text-lttm hover:text-ltt transition-colors">
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {/* Domain badge */}
        <span className={`inline-flex font-plex text-[9px] uppercase tracking-[0.5px] px-2 py-0.5 rounded-full border ${domainStyle(node.domain)}`}>
          {node.domain}
        </span>

        {/* Name */}
        <p className="font-sora text-[12px] font-semibold text-ltt leading-[1.35]">{node.name}</p>

        {/* Active status */}
        {node.active ? (
          <div className="rounded-[8px] border border-orb bg-ordim px-3 py-2">
            <p className="font-plex text-[9.5px] uppercase tracking-[0.7px] text-or mb-1.5">
              {node.active_failure_modes.length} modo{node.active_failure_modes.length !== 1 ? 's' : ''} activo{node.active_failure_modes.length !== 1 ? 's' : ''}
            </p>
            <div className="space-y-1.5">
              {node.active_failure_modes.map((fm) => (
                <div key={fm.id} className="flex items-center justify-between">
                  <span className="font-plex text-[10px] text-ltt">{fm.code}</span>
                  {fm.s_actual !== null && (
                    <span className={`font-plex text-[10px] font-bold ${fm.s_actual >= 9 ? 'text-re' : 'text-or'}`}>
                      S={fm.s_actual}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-[8px] border border-ltb bg-ltbg px-3 py-2">
            <p className="font-plex text-[9.5px] uppercase tracking-[0.7px] text-lttm">Sin activación en este sistema</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main exported component
// ---------------------------------------------------------------------------

export function CausalMapCanvas({ graph, fullscreen }: { graph: SystemCausalGraph; fullscreen?: boolean }) {
  return (
    <ReactFlowProvider>
      <CausalMapInner graph={graph} fullscreen={fullscreen} />
    </ReactFlowProvider>
  );
}

function CausalMapInner({ graph, fullscreen }: { graph: SystemCausalGraph; fullscreen?: boolean }) {
  const [onlyActive, setOnlyActive] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { nodes: initNodes, edges: initEdges } = useMemo(() => {
    const rfNodes = toRFNodes(graph.nodes, onlyActive);
    const nodeSet = new Set(rfNodes.map((n) => n.id));
    const rfEdges = toRFEdges(graph.edges, nodeSet);
    return applyDagreLayout(rfNodes, rfEdges);
  }, [graph, onlyActive]);

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

  const activeCount = graph.nodes.filter((n) => n.active).length;
  const totalCount = graph.nodes.length;

  return (
    <div className={`rounded-[12px] border border-ltb overflow-hidden relative ${fullscreen ? 'h-full w-full' : 'h-[660px]'}`}>
      {/* Controls bar */}
      <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
        <button
          onClick={() => setOnlyActive((prev) => !prev)}
          className={`flex items-center gap-1.5 font-plex text-[10px] uppercase tracking-[0.7px] px-3 py-1.5 rounded-full border transition-all ${
            onlyActive
              ? 'bg-ordim border-orb text-or'
              : 'bg-ltcard border-ltb text-lttm hover:border-ltbl'
          }`}
        >
          {onlyActive ? `Solo activos (${activeCount})` : `Activos: ${activeCount} / ${totalCount}`}
        </button>

        {/* Legend */}
        <div className="flex items-center gap-3 bg-ltcard border border-ltb rounded-full px-3 py-1.5">
          {[
            { label: 'causa', color: '#ef4444' },
            { label: 'amplifica', color: '#f59e0b', dashed: true },
            { label: 'habilita', color: '#64748b' },
          ].map((item) => (
            <span key={item.label} className="flex items-center gap-1 font-plex text-[9px] uppercase tracking-[0.5px] text-lttm">
              <svg width="18" height="6">
                <line
                  x1="0" y1="3" x2="14" y2="3"
                  stroke={item.color}
                  strokeWidth="1.5"
                  strokeDasharray={item.dashed ? '4 2' : ''}
                />
                <polygon points="14,1 18,3 14,5" fill={item.color} />
              </svg>
              {item.label}
            </span>
          ))}
        </div>
      </div>

      <ReactFlow
        key={onlyActive ? 'active' : 'all'}
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
          nodeColor={(n) => {
            const d = n.data as SystemGraphNode;
            if (!d.active) return '#1e293b';
            if ((d.max_s_actual ?? 0) >= 9) return '#ef4444';
            if ((d.max_s_actual ?? 0) >= 7) return '#f59e0b';
            return '#00adec';
          }}
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

      {/* Empty state for "solo activos" when no active nodes */}
      {onlyActive && activeCount === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-ltcard border border-ltb rounded-[12px] px-6 py-5 text-center">
            <p className="font-sora text-[13px] font-semibold text-ltt">Sin modos activados</p>
            <p className="font-sora text-[12px] text-ltt2 mt-1.5">
              Este sistema no tiene modos de fallo activos en el catálogo causal.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
