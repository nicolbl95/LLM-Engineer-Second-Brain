import { memo, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { BrainNode, PillarId } from "../types/brain";
import { brainNodes, brainEdges } from "../data/graph";
import { useLanguage } from "../context/LanguageContext";
import {
  getNodeColor,
  nodeMatchesFilter,
} from "../utils/graphHelpers";
import { pick } from "../utils/i18n";

interface BrainGraphProps {
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  activePillar: PillarId | "all";
  onNodeClick: (nodeId: string) => void;
  focusNodeId: string | null;
  onFocusComplete: () => void;
}

/** Custom React Flow node — label uses active language only. */
function BrainNodeComponent({ data, selected }: NodeProps) {
  const node = data.node as BrainNode;
  const color = getNodeColor(node);
  const isHighlighted = data.highlighted as boolean;
  const label = data.label as string;
  const dimmed = data.dimmed as boolean;

  return (
    <div
      className={`brain-node brain-node--${node.type} ${selected ? "brain-node--selected" : ""} ${isHighlighted ? "brain-node--highlighted" : ""} ${dimmed ? "brain-node--dimmed" : ""}`}
      style={{ "--node-color": color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="brain-handle" />
      <span className="brain-node__label">{label}</span>
      {node.type === "concept" && node.difficulty && (
        <span className="brain-node__diff">
          {node.difficulty.charAt(0).toUpperCase()}
        </span>
      )}
      <Handle type="source" position={Position.Bottom} className="brain-handle" />
    </div>
  );
}

const nodeTypes = { brain: memo(BrainNodeComponent) };

/** Pan/zoom to a node when search or project analysis selects one. */
function GraphFocus({
  focusNodeId,
  onComplete,
}: {
  focusNodeId: string | null;
  onComplete: () => void;
}) {
  const { fitView } = useReactFlow();

  useEffect(() => {
    if (!focusNodeId) return;
    fitView({ nodes: [{ id: focusNodeId }], padding: 0.5, duration: 600 });
    const timer = setTimeout(onComplete, 700);
    return () => clearTimeout(timer);
  }, [focusNodeId, fitView, onComplete]);

  return null;
}

/** Interactive knowledge graph with pillar colors and highlighting. */
export function BrainGraph({
  selectedNodeId,
  highlightedNodeIds,
  activePillar,
  onNodeClick,
  focusNodeId,
  onFocusComplete,
}: BrainGraphProps) {
  const { language } = useLanguage();

  const highlightSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds],
  );

  const hasHighlight = highlightedNodeIds.length > 0;

  const flowNodes: Node[] = useMemo(
    () =>
      brainNodes
        .filter((n) => nodeMatchesFilter(n, activePillar))
        .map((n) => ({
          id: n.id,
          type: "brain",
          position: n.position,
          data: {
            node: n,
            label: pick(n.title, language),
            highlighted: highlightSet.has(n.id),
            dimmed: hasHighlight && !highlightSet.has(n.id) && n.id !== selectedNodeId,
          },
          selected: n.id === selectedNodeId,
        })),
    [
      language,
      activePillar,
      highlightSet,
      hasHighlight,
      selectedNodeId,
    ],
  );

  const visibleIds = useMemo(
    () => new Set(flowNodes.map((n) => n.id)),
    [flowNodes],
  );

  const flowEdges: Edge[] = useMemo(
    () =>
      brainEdges
        .filter((e) => visibleIds.has(e.source) && visibleIds.has(e.target))
        .map((e) => {
          const sourceNode = brainNodes.find((n) => n.id === e.source);
          const color = sourceNode ? getNodeColor(sourceNode) : "#64748b";
          return {
            id: e.id,
            source: e.source,
            target: e.target,
            label: e.label ? pick(e.label, language) : undefined,
            animated: e.relationshipType === "uses",
            style: { stroke: color, strokeWidth: 1.5 },
            labelStyle: { fill: "#94a3b8", fontSize: 10 },
          };
        }),
    [language, visibleIds],
  );

  return (
    <div className="brain-graph">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodeClick={(_, node) => onNodeClick(node.id)}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.3}
        maxZoom={1.8}
        proOptions={{ hideAttribution: true }}
      >
        <GraphFocus focusNodeId={focusNodeId} onComplete={onFocusComplete} />
        <Background gap={20} size={1} color="#1e293b" />
        <Controls className="brain-controls" showInteractive={false} />
        <MiniMap
          className="brain-minimap"
          nodeColor={(n) => {
            const bn = (n.data as { node?: BrainNode })?.node;
            return bn ? getNodeColor(bn) : "#475569";
          }}
          maskColor="rgba(15, 23, 42, 0.75)"
        />
      </ReactFlow>
    </div>
  );
}
