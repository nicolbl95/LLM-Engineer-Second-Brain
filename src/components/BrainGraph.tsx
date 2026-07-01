import { memo, useCallback, useEffect, useMemo, useState } from "react";
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

import type { BrainNode, PillarId } from "../types/brain";
import { brainNodes, brainEdges } from "../data/graph";
import { useLanguage } from "../context/LanguageContext";
import { getNodeColor, nodeMatchesFilter } from "../utils/graphHelpers";
import { pick } from "../utils/i18n";

interface BrainGraphProps {
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  activePillar: PillarId | "all";
  onNodeClick: (nodeId: string, nodeData?: BrainNode | null) => void;
  focusNodeId: string | null;
  onFocusComplete: () => void;
  isReadOnly: boolean;
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
  isGroup?: boolean;
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

  return (
    <div
      className={`brain-node brain-node--${node.type} ${
        selected ? "brain-node--selected" : ""
      } ${isHighlighted ? "brain-node--highlighted" : ""} ${
        dimmed ? "brain-node--dimmed" : ""
      }`}
      style={{ "--node-color": color } as React.CSSProperties}
    >
      <Handle type="target" position={Position.Top} className="brain-handle" />

      <span className="brain-node__label">{label}</span>

      {node.type === "concept" && node.difficulty && (
        <span className="brain-node__diff">
          {node.difficulty.charAt(0).toUpperCase()}
        </span>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="brain-handle"
      />
    </div>
  );
}

/**
 * Simple background group shape.
 * This works like a visual container/circle/rectangle for concepts.
 * It is not a knowledge concept; it is only a visual grouping tool.
 */
function GroupNodeComponent({ data, selected }: NodeProps) {
  const flowData = data as FlowNodeData;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        border: selected
          ? "2px dashed rgba(129, 140, 248, 0.95)"
          : "2px dashed rgba(148, 163, 184, 0.45)",
        background: "rgba(30, 41, 59, 0.22)",
        borderRadius: 28,
        boxShadow: selected
          ? "0 0 28px rgba(129, 140, 248, 0.28)"
          : "0 0 20px rgba(15, 23, 42, 0.15)",
        color: "#cbd5e1",
        fontSize: 13,
        fontWeight: 700,
        padding: 14,
        pointerEvents: "all",
      }}
    >
      {flowData.label}
    </div>
  );
}

const nodeTypes = {
  brain: memo(BrainNodeComponent),
  group: memo(GroupNodeComponent),
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
      style: { stroke: color, strokeWidth: 1.6 },
      labelStyle: { fill: "#94a3b8", fontSize: 10 },
      data: {
        label: e.label,
        relationshipType: e.relationshipType,
      },
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

        if (flowNode.type === "group") {
          const title = data.title;
          return {
            ...flowNode,
            data: {
              ...data,
              label: title ? title[language] : data.label,
            },
            zIndex: -1,
          };
        }

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
          },
        };
      }),
    );
  }, [
    language,
    activePillar,
    highlightSet,
    hasHighlight,
    selectedNodeId,
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
      },
      selected: true,
      draggable: true,
      deletable: true,
    };

    setNodes((currentNodes) => [...currentNodes, newFlowNode]);
    onNodeClick(id, newBrainNode);
  }, [activePillar, isReadOnly, language, onNodeClick, screenToFlowPosition, setNodes]);

  /** Add a visual group shape behind nodes. */
  const addGroup = useCallback(() => {
    const position = screenToFlowPosition({
      x: window.innerWidth / 2 - 180,
      y: window.innerHeight / 2 - 120,
    });

    const id = `group-${Date.now()}`;

    const title = {
      fr: "Nouveau groupe",
      en: "New Group",
    };

    const groupNode: Node = {
      id,
      type: "group",
      position,
      data: {
        isGroup: true,
        title,
        label: title[language],
      },
      style: {
        width: 360,
        height: 240,
      },
      draggable: true,
      selectable: true,
      deletable: true,
      zIndex: -1,
    };

    setNodes((currentNodes) => [groupNode, ...currentNodes]);
  }, [language, screenToFlowPosition, setNodes]);

  /** Create a manual connection between two nodes. */
  const onConnect = useCallback(
    (connection: Connection) => {
      const label = {
        fr: "lié à",
        en: "related to",
      };

      const newEdge: Edge = {
        ...connection,
        id: `manual-edge-${Date.now()}`,
        label: label[language],
        animated: false,
        style: {
          stroke: "#818cf8",
          strokeWidth: 1.8,
        },
        labelStyle: {
          fill: "#cbd5e1",
          fontSize: 10,
        },
        data: {
          label,
          relationshipType: "related_to",
        },
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

  /** Delete a selected edge from the small edge panel. */
  const deleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    setEdges((currentEdges) =>
      currentEdges.filter((edge) => edge.id !== selectedEdgeId),
    );
    setSelectedEdgeId(null);
  }, [selectedEdgeId, setEdges]);

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

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
          onClick={addGroup}
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
          {language === "fr" ? "Ajouter un groupe" : "Add Group"}
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
          {language === "fr" ? "Centrer" : "Fit View"}
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
            width: 260,
            padding: 14,
            borderRadius: 18,
            border: "1px solid rgba(129, 140, 248, 0.35)",
            background: "rgba(15, 23, 42, 0.92)",
            color: "#e2e8f0",
            boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontWeight: 800, marginBottom: 8 }}>
            {language === "fr" ? "Connexion" : "Connection"}
          </div>

          <div style={{ color: "#94a3b8", fontSize: 12, marginBottom: 12 }}>
            {selectedEdge.label?.toString()}
          </div>

          {isEditing && (
            <button
              type="button"
              onClick={deleteSelectedEdge}
              style={{
                width: "100%",
                border: "1px solid rgba(248, 113, 113, 0.35)",
                background: "rgba(127, 29, 29, 0.22)",
                color: "#fecaca",
                borderRadius: 12,
                padding: "8px 10px",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              {language === "fr" ? "Supprimer la connexion" : "Delete Edge"}
            </button>
          )}
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

          if (node.type === "group") {
            return;
          }

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
          position="bottom-right"
          pannable
          zoomable
          className="brain-minimap"
          style={{
            width: 220,
            height: 140,
            background: "#0f172a",
            border: "1px solid rgba(148, 163, 184, 0.28)",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
          }}
          nodeColor={(n) => {
            if (n.type === "group") return "rgba(148, 163, 184, 0.4)";

            const bn = (n.data as FlowNodeData)?.node;
            return bn ? getNodeColor(bn) : "#475569";
          }}
          nodeStrokeColor={() => "#e2e8f0"}
          maskColor="rgba(15, 23, 42, 0.72)"
        />
      </ReactFlow>
    </div>
  );
}