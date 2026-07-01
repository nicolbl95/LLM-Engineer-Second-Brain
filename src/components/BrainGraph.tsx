import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  useReactFlow,
  addEdge,
  reconnectEdge,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type NodeProps,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BrainEdge, BrainNode, PillarId, RelationshipType } from "../types/brain";
import { brainNodes, brainEdges } from "../data/graph";
import { useLanguage } from "../context/LanguageContext";
import { getNodeColor, nodeMatchesFilter } from "../utils/graphHelpers";
import { pick } from "../utils/i18n";
import { EdgeEditor } from "./EdgeEditor";

interface BrainGraphProps {
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  activePillar: PillarId | "all";
  onNodeClick: (nodeId: string, nodeData?: BrainNode | null) => void;
  focusNodeId: string | null;
  onFocusComplete: () => void;
  isReadOnly: boolean;
  updatedNode?: BrainNode | null;
  deletedNodeId?: string | null;
  onNodeUpdate?: (node: BrainNode) => void;
  onNodeDelete?: (nodeId: string) => void;
}

type LocalizedText = {
  fr: string;
  en: string;
};

type FlowNodeData = {
  node?: BrainNode;
  label: string;
  title?: LocalizedText;
  highlighted?: boolean;
  dimmed?: boolean;
  isEditing?: boolean;
};

const STORAGE_KEY = "llm-engineer-second-brain-canvas";

/**
 * Root node ids that should not be deleted.
 * This prevents the app from breaking if the user deletes the central brain node.
 */
const PROTECTED_NODE_IDS = new Set([
  "llm-engineer",
  "llm-engineer-root",
  "root",
]);

/** Custom React Flow node — label uses active language only. */
function BrainNodeComponent({ data, selected }: NodeProps) {
  const flowData = data as FlowNodeData;
  const node = flowData.node as BrainNode;
  const color = getNodeColor(node);
  const isHighlighted = flowData.highlighted as boolean;
  const label = flowData.label as string;
  const dimmed = flowData.dimmed as boolean;
  const isEditing = Boolean(flowData.isEditing);
  const pointerEvents = isEditing ? "auto" : "none";
  const handleStyle: CSSProperties = {
    opacity: isEditing ? 1 : 0,
    pointerEvents,
    background: color,
    border: "1px solid rgba(255,255,255,0.8)",
  };
  const handleClassName = isEditing ? "brain-handle brain-handle--visible" : "brain-handle";

  return (
    <div
      className={`brain-node brain-node--${node.type} ${
        selected ? "brain-node--selected" : ""
      } ${isHighlighted ? "brain-node--highlighted" : ""} ${
        dimmed ? "brain-node--dimmed" : ""
      }`}
      style={{ "--node-color": color } as React.CSSProperties}
    >
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />

      <span className="brain-node__label">{label}</span>

      {node.type === "concept" && node.difficulty && (
        <span className="brain-node__diff">
          {node.difficulty.charAt(0).toUpperCase()}
        </span>
      )}

      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        className={handleClassName}
        style={handleStyle}
        isConnectable={isEditing}
      />
    </div>
  );
}

const nodeTypes = {
  brain: memo(BrainNodeComponent),
};

/** Convert static brain data into editable React Flow nodes. */
function createInitialFlowNodes(language: "fr" | "en"): Node[] {
  return brainNodes.map((n) => ({
    id: n.id,
    type: "brain",
    position: n.position,
    data: {
      node: n,
      label: pick(n.title, language),
      highlighted: false,
      dimmed: false,
    },
    selected: false,
    draggable: true,
    deletable: !PROTECTED_NODE_IDS.has(n.id),
  }));
}

/** Convert static brain edges into editable React Flow edges. */
function createInitialFlowEdges(language: "fr" | "en"): Edge[] {
  return brainEdges.map((e) => {
    const sourceNode = brainNodes.find((n) => n.id === e.source);
    const color = sourceNode ? getNodeColor(sourceNode) : "#64748b";

    return {
      id: e.id,
      source: e.source,
      target: e.target,
      label: e.label ? pick(e.label, language) : undefined,
      animated: e.relationshipType === "uses",
      style: {
        stroke: e.color ?? color,
        strokeWidth: 1.6,
        strokeDasharray: e.lineStyle === "dashed" ? "8 6" : undefined,
      },
      labelStyle: { fill: "#94a3b8", fontSize: 10 },
      data: {
        label: e.label,
        relationshipType: e.relationshipType,
        color: e.color,
        lineStyle: e.lineStyle ?? "solid",
      },
      sourceHandle: e.sourceHandle ?? "bottom-source",
      targetHandle: e.targetHandle ?? "top-target",
      deletable: true,
    };
  });
}

/** Load saved canvas from localStorage if it exists. */
function loadSavedCanvas(language: "fr" | "en") {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        nodes: createInitialFlowNodes(language),
        edges: createInitialFlowEdges(language),
      };
    }

    const parsed = JSON.parse(raw) as {
      nodes?: Node[];
      edges?: Edge[];
    };

    if (!parsed.nodes || !parsed.edges) {
      return {
        nodes: createInitialFlowNodes(language),
        edges: createInitialFlowEdges(language),
      };
    }

    return {
      nodes: parsed.nodes,
      edges: parsed.edges,
    };
  } catch {
    return {
      nodes: createInitialFlowNodes(language),
      edges: createInitialFlowEdges(language),
    };
  }
}

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

    fitView({
      nodes: [{ id: focusNodeId }],
      padding: 0.5,
      duration: 600,
    });

    const timer = setTimeout(onComplete, 700);
    return () => clearTimeout(timer);
  }, [focusNodeId, fitView, onComplete]);

  return null;
}

/**
 * Editable interactive knowledge graph.
 *
 * New features in this version:
 * - edit mode
 * - add node manually
 * - add visual group manually
 * - drag nodes
 * - create edges manually
 * - reconnect edges
 * - delete selected nodes/edges
 * - reset layout
 * - real React Flow minimap
 */
export function BrainGraph({
  selectedNodeId,
  highlightedNodeIds,
  activePillar,
  onNodeClick,
  focusNodeId,
  onFocusComplete,
  isReadOnly,
  updatedNode,
  deletedNodeId,
  onNodeUpdate,
  onNodeDelete,
}: BrainGraphProps) {
  const { language } = useLanguage();
  const { fitView, screenToFlowPosition } = useReactFlow();

  const initialCanvas = useMemo(
    () => loadSavedCanvas(language),
    // We only want this to run once on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialCanvas.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialCanvas.edges);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const isEditing = !isReadOnly;

  const highlightSet = useMemo(
    () => new Set(highlightedNodeIds),
    [highlightedNodeIds],
  );

  const hasHighlight = highlightedNodeIds.length > 0;

  /**
   * Keep node labels, filter visibility, selected state and highlights synced.
   * This is what makes FR/EN switch work without showing both languages.
   */
  useEffect(() => {
    setNodes((currentNodes) =>
      currentNodes.map((flowNode) => {
        const data = flowNode.data as FlowNodeData;

        const brainNode = data.node;
        if (!brainNode) return flowNode;

        const visible = nodeMatchesFilter(brainNode, activePillar);
        const isHighlighted = highlightSet.has(flowNode.id);

        return {
          ...flowNode,
          hidden: !visible,
          selected: flowNode.id === selectedNodeId,
          deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
          data: {
            ...data,
            label: pick(brainNode.title, language),
            highlighted: isHighlighted,
            dimmed:
              hasHighlight &&
              !isHighlighted &&
              flowNode.id !== selectedNodeId,
            isEditing,
          },
          draggable: isEditing && !PROTECTED_NODE_IDS.has(flowNode.id),
        };
      }),
    );
  }, [
    language,
    activePillar,
    highlightSet,
    hasHighlight,
    selectedNodeId,
    isEditing,
    setNodes,
  ]);

  /** Keep edge labels synced with selected language. */
  useEffect(() => {
    setEdges((currentEdges) =>
      currentEdges.map((edge) => {
        const label = edge.data?.label as LocalizedText | undefined;

        return {
          ...edge,
          label: label ? label[language] : edge.label,
        };
      }),
    );
  }, [language, setEdges]);

  /** Persist editable canvas to localStorage. */
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        nodes,
        edges,
      }),
    );
  }, [nodes, edges]);

  useEffect(() => {
    if (!updatedNode) return;

    setNodes((currentNodes) =>
      currentNodes.map((flowNode) => {
        if (flowNode.id !== updatedNode.id) return flowNode;

        return {
          ...flowNode,
          data: {
            ...flowNode.data,
            node: updatedNode,
            label: pick(updatedNode.title, language),
            highlighted: true,
            dimmed: false,
          },
        };
      }),
    );
    onNodeUpdate?.(updatedNode);
  }, [language, onNodeUpdate, setNodes, updatedNode]);

  useEffect(() => {
    if (!deletedNodeId) return;

    setNodes((currentNodes) => currentNodes.filter((flowNode) => flowNode.id !== deletedNodeId));
    setEdges((currentEdges) => currentEdges.filter((edge) => edge.source !== deletedNodeId && edge.target !== deletedNodeId));
    onNodeDelete?.(deletedNodeId);
  }, [deletedNodeId, onNodeDelete, setEdges, setNodes]);

  /** Add a new concept node manually. */
  const addManualNode = useCallback(() => {
    if (isReadOnly) return;

    const position = screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });

    const id = `manual-node-${Date.now()}`;
    const defaultTitle = {
      fr: "Nouveau nœud",
      en: "New Node",
    };
    const defaultExplanation = {
      fr: "Ajoute ici l’explication de ce concept.",
      en: "Add the explanation of this concept here.",
    };

    const newBrainNode: BrainNode = {
      id,
      type: "concept",
      pillarId: activePillar !== "all" ? activePillar : "llm-fundamentals",
      position,
      title: defaultTitle,
      shortSummary: defaultExplanation,
      simpleExplanation: defaultExplanation,
      deepExplanation: {
        fr: "Ajoute ici une explication détaillée.",
        en: "Add a detailed explanation here.",
      },
      whyItMatters: {
        fr: "Explique pourquoi ce concept est important.",
        en: "Explain why this concept matters.",
      },
      prerequisites: { fr: [], en: [] },
      relatedConcepts: [],
      commonMistakes: { fr: [], en: [] },
      examples: { fr: [], en: [] },
    };

    const newFlowNode: Node = {
      id,
      type: "brain",
      position,
      data: {
        node: newBrainNode,
        label: pick(newBrainNode.title, language),
        highlighted: true,
        dimmed: false,
        isEditing: true,
      },
      selected: true,
      draggable: true,
      deletable: true,
    };

    setNodes((currentNodes) => [...currentNodes, newFlowNode]);
    onNodeClick(id, newBrainNode);
  }, [activePillar, isReadOnly, language, onNodeClick, screenToFlowPosition, setNodes]);

  /** Create a manual connection between two nodes. */
  const onConnect = useCallback(
    (connection: Connection) => {
      const label = {
        fr: "lié à",
        en: "related to",
      };
      const color = "#818cf8";

      const newEdge: Edge = {
        ...connection,
        id: `manual-edge-${Date.now()}`,
        label: label[language],
        animated: false,
        style: {
          stroke: color,
          strokeWidth: 1.8,
          strokeDasharray: undefined,
        },
        labelStyle: {
          fill: "#cbd5e1",
          fontSize: 10,
        },
        data: {
          label,
          relationshipType: "related",
          color,
          lineStyle: "solid",
        },
        sourceHandle: connection.sourceHandle ?? "bottom-source",
        targetHandle: connection.targetHandle ?? "top-target",
        deletable: true,
      } as Edge;

      setEdges((currentEdges) => addEdge(newEdge, currentEdges));
    },
    [language, setEdges],
  );

  /** Allow reconnecting existing edges in edit mode. */
  const onReconnect = useCallback(
    (oldEdge: Edge, newConnection: Connection) => {
      setEdges((currentEdges) =>
        reconnectEdge(oldEdge, newConnection, currentEdges),
      );
    },
    [setEdges],
  );

  const updateEdgeInGraph = useCallback(
    (updatedEdge: BrainEdge) => {
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          if (edge.id !== updatedEdge.id) return edge;

          const nextLabel = updatedEdge.label ? updatedEdge.label[language] : undefined;
          return {
            ...edge,
            label: nextLabel,
            style: {
              ...(edge.style ?? {}),
              stroke: updatedEdge.color ?? edge.style?.stroke ?? "#818cf8",
              strokeDasharray: updatedEdge.lineStyle === "dashed" ? "8 6" : undefined,
            },
            labelStyle: {
              ...(edge.labelStyle ?? {}),
              fill: "#cbd5e1",
            },
            data: {
              ...(edge.data ?? {}),
              label: updatedEdge.label,
              relationshipType: updatedEdge.relationshipType,
              color: updatedEdge.color,
              lineStyle: updatedEdge.lineStyle ?? "solid",
            },
            sourceHandle: updatedEdge.sourceHandle ?? edge.sourceHandle ?? "bottom-source",
            targetHandle: updatedEdge.targetHandle ?? edge.targetHandle ?? "top-target",
          };
        }),
      );
    },
    [language, setEdges],
  );

  const deleteEdgeFromGraph = useCallback(
    (edgeId: string) => {
      setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== edgeId));
      setSelectedEdgeId(null);
    },
    [setEdges],
  );

  /** Reset positions and remove manual additions. */
  const resetLayout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setNodes(createInitialFlowNodes(language));
    setEdges(createInitialFlowEdges(language));
    setSelectedEdgeId(null);
    window.setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 50);
  }, [fitView, language, setEdges, setNodes]);

  /** Fit all visible nodes in view. */
  const centerView = useCallback(() => {
    fitView({ padding: 0.25, duration: 500 });
  }, [fitView]);

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  const selectedBrainEdge = useMemo<BrainEdge | null>(() => {
    if (!selectedEdge) return null;

    return {
      id: selectedEdge.id,
      source: selectedEdge.source,
      target: selectedEdge.target,
      relationshipType: (selectedEdge.data?.relationshipType as RelationshipType | undefined) ?? "related",
      label: selectedEdge.data?.label as { fr: string; en: string } | undefined,
      color: (selectedEdge.style as { stroke?: string } | undefined)?.stroke ?? (selectedEdge.data?.color as string | undefined),
      lineStyle: (selectedEdge.data?.lineStyle as "solid" | "dashed" | undefined) ?? "solid",
      sourceHandle: selectedEdge.sourceHandle ?? undefined,
      targetHandle: selectedEdge.targetHandle ?? undefined,
    };
  }, [selectedEdge]);

  return (
    <div className="brain-graph">
      <div
        style={{
          position: "absolute",
          left: 18,
          top: 18,
          zIndex: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          background: "rgba(15, 23, 42, 0.86)",
          border: "1px solid rgba(148, 163, 184, 0.18)",
          borderRadius: 16,
          padding: 10,
          boxShadow: "0 16px 40px rgba(0,0,0,0.25)",
          backdropFilter: "blur(10px)",
        }}
      >
        <button
          type="button"
          onClick={addManualNode}
          disabled={!isEditing}
          style={{
            opacity: isEditing ? 1 : 0.45,
            border: "1px solid rgba(148, 163, 184, 0.24)",
            background: "rgba(30, 41, 59, 0.7)",
            color: "#e2e8f0",
            borderRadius: 12,
            padding: "8px 10px",
            cursor: isEditing ? "pointer" : "not-allowed",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {language === "fr" ? "Ajouter un nœud" : "Add Node"}
        </button>

        <button
          type="button"
          onClick={centerView}
          style={{
            border: "1px solid rgba(148, 163, 184, 0.24)",
            background: "rgba(30, 41, 59, 0.7)",
            color: "#e2e8f0",
            borderRadius: 12,
            padding: "8px 10px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {language === "fr" ? "Centrer la vue" : "Fit View"}
        </button>

        <button
          type="button"
          onClick={resetLayout}
          style={{
            border: "1px solid rgba(248, 113, 113, 0.35)",
            background: "rgba(127, 29, 29, 0.22)",
            color: "#fecaca",
            borderRadius: 12,
            padding: "8px 10px",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
          }}
        >
          {language === "fr" ? "Réinitialiser la carte" : "Reset Map"}
        </button>
      </div>

      {selectedEdge && (
        <div
          style={{
            position: "absolute",
            right: 22,
            bottom: 120,
            zIndex: 25,
            width: 270,
            padding: 14,
            borderRadius: 18,
            border: "1px solid rgba(129, 140, 248, 0.35)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#e2e8f0",
            boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          }}
        >
          <EdgeEditor
            edge={selectedBrainEdge}
            isReadOnly={isReadOnly}
            onChange={(updatedEdge) => {
              updateEdgeInGraph(updatedEdge);
            }}
            onDelete={(edgeId) => deleteEdgeFromGraph(edgeId)}
          />
        </div>
      )}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isEditing ? onConnect : undefined}
        onReconnect={isEditing ? onReconnect : undefined}
        onNodeClick={(_, node) => {
          setSelectedEdgeId(null);

          const flowNode = nodes.find((candidate) => candidate.id === node.id);
          const selectedNode = (flowNode?.data as FlowNodeData | undefined)?.node ?? null;
          onNodeClick(node.id, selectedNode);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
        }}
        onPaneClick={() => {
          setSelectedEdgeId(null);
        }}
        nodesDraggable={isEditing}
        nodesConnectable={isEditing}
        edgesReconnectable={isEditing}
        elementsSelectable
        deleteKeyCode={isEditing ? "Delete" : null}
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
          position="bottom-left"
          pannable
          zoomable
          className="brain-minimap"
          style={{
            width: 220,
            height: 140,
            background: "rgba(8, 15, 30, 0.96)",
            border: "1px solid rgba(129, 140, 248, 0.35)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          }}
          nodeColor={(n) => {
            const bn = (n.data as FlowNodeData)?.node;
            return bn ? getNodeColor(bn) : "#475569";
          }}
          nodeStrokeColor={() => "#e2e8f0"}
          maskColor="rgba(2, 6, 23, 0.78)"
        />
      </ReactFlow>
    </div>
  );
}