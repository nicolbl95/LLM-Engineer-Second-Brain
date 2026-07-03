import { memo, useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
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
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import type { BrainEdge, BrainNode, PillarId, RelationshipType } from "../types/brain";
import { brainNodes, brainEdges } from "../data/graph";
import { useLanguage } from "../context/LanguageContext";
import { getNodeColor, nodeMatchesFilter } from "../utils/graphHelpers";
import { pick } from "../utils/i18n";
import { EdgeEditor } from "./EdgeEditor";
import { generateTreeExport, copyToClipboard } from "../utils/treeExport";

interface ResizeState {
  nodeId: string;
  handle: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startMiniWidth: number;
  startMiniHeight: number;
  isResizing: boolean;
}

interface BrainGraphProps {
  selectedNodeId: string | null;
  highlightedNodeIds: string[];
  activePillar: PillarId | "all";
  onNodeClick: (nodeId: string, nodeData?: BrainNode | null) => void;
  onClearSelection: () => void;
  updatedNode?: BrainNode | null;
  deletedNodeId?: string | null;
  onNodeUpdate?: (node: BrainNode) => void;
  onNodeDelete?: (nodeId: string) => void;
  onHistoryStateChange?: (state: { nodes: any[]; edges: any[] }) => void;
  restoreHistoryState?: { nodes: any[]; edges: any[] } | null;
}

type LocalizedText = {
  fr: string;
  en: string;
};

type FlowNodeData = {
  node?: BrainNode;
  label: string;
  miniExplanation?: string;
  nodeWidth?: number;
  nodeHeight?: number;
  miniExplanationWidth?: number;
  miniExplanationHeight?: number;
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
function BrainNodeComponent({ data, selected, onResizeStart }: NodeProps & { onResizeStart?: (e: React.PointerEvent | React.MouseEvent, nodeId: string, handle: string, nodeWidth: number, nodeHeight: number, miniWidth: number, miniHeight: number) => void }) {
  const flowData = data as FlowNodeData;
  const node = flowData.node as BrainNode;
  const color = getNodeColor(node);
  const isHighlighted = flowData.highlighted as boolean;
  const label = flowData.label as string;
  const dimmed = flowData.dimmed as boolean;
  const isEditing = Boolean(flowData.isEditing);
  const showHandles = selected && isEditing; // Only show handles when node is selected
  const pointerEvents = showHandles ? "auto" : "none";
  const handleStyle: CSSProperties = {
    opacity: showHandles ? 1 : 0,
    pointerEvents,
    background: color,
    border: "1px solid rgba(255,255,255,0.8)",
  };
  const handleClassName = showHandles ? "brain-handle brain-handle--visible" : "brain-handle";
  const miniText = flowData.miniExplanation as string | undefined;
  const miniWidth = flowData.miniExplanationWidth ?? 180;
  const miniHeight = flowData.miniExplanationHeight ?? 60;
  const nodeWidth = flowData.nodeWidth ?? 180;
  const nodeHeight = flowData.nodeHeight ?? 64;
  const fontSize = flowData.node?.fontSize ?? 14;

  // Resize handle props
  const showResizeHandles = selected && isEditing;
  const resizeHandleStyle: CSSProperties = {
    position: "absolute",
    width: "12px",
    height: "12px",
    backgroundColor: "#ffffff",
    border: "2px solid rgba(99, 102, 241, 0.8)",
    borderRadius: "50%",
    cursor: "nwse-resize",
    zIndex: 10,
    boxShadow: "0 0 8px rgba(99, 102, 241, 0.5)",
  };

  return (
    <div
      className={`brain-node brain-node--${node.type} ${
        selected ? "brain-node--selected" : ""
      } ${isHighlighted ? "brain-node--highlighted" : ""} ${
        dimmed ? "brain-node--dimmed" : ""
      }`}
      style={
        {
          "--node-color": color,
          "--node-width": `${nodeWidth}px`,
          "--node-height": `${nodeHeight}px`,
          "--mini-width": `${miniWidth}px`,
          "--mini-height": `${miniHeight}px`,
        } as React.CSSProperties
      }
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

      <span className="brain-node__label" style={{ fontSize: `${fontSize}px` }}>{label}</span>

      {miniText && (
        <div className="brain-node__mini">{miniText}</div>
      )}

      {/* Resize handles - only visible when selected and in edit mode */}
      {showResizeHandles && onResizeStart && (
        <>
          <div
            className="resize-handle resize-handle--nw"
            style={{ ...resizeHandleStyle, top: "-6px", left: "-6px", cursor: "nwse-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "nw", nodeWidth, nodeHeight, miniWidth, miniHeight)}
            onPointerDown={(e) => onResizeStart(e, node.id, "nw", nodeWidth, nodeHeight, miniWidth, miniHeight)}
          />
          <div
            className="resize-handle resize-handle--ne"
            style={{ ...resizeHandleStyle, top: "-6px", right: "-6px", cursor: "nesw-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "ne", nodeWidth, nodeHeight, miniWidth, miniHeight)}
            onPointerDown={(e) => onResizeStart(e, node.id, "ne", nodeWidth, nodeHeight, miniWidth, miniHeight)}
          />
          <div
            className="resize-handle resize-handle--sw"
            style={{ ...resizeHandleStyle, bottom: "-6px", left: "-6px", cursor: "nesw-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "sw", nodeWidth, nodeHeight, miniWidth, miniHeight)}
            onPointerDown={(e) => onResizeStart(e, node.id, "sw", nodeWidth, nodeHeight, miniWidth, miniHeight)}
          />
          <div
            className="resize-handle resize-handle--se"
            style={{ ...resizeHandleStyle, bottom: "-6px", right: "-6px", cursor: "nwse-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "se", nodeWidth, nodeHeight, miniWidth, miniHeight)}
            onPointerDown={(e) => onResizeStart(e, node.id, "se", nodeWidth, nodeHeight, miniWidth, miniHeight)}
          />
        </>
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

// nodeTypes will be defined inside the component to access handleResizeStart

/** Convert static brain data into editable React Flow nodes. */
function createInitialFlowNodes(language: "fr" | "en"): Node[] {
  return brainNodes.map((n) => ({
    id: n.id,
    type: "brain",
    position: n.position,
    data: {
      node: n,
      label: pick(n.title, language),
      miniExplanation: n.miniExplanation ? n.miniExplanation[language] : "",
      nodeWidth: n.nodeWidth ?? 180,
      nodeHeight: n.nodeHeight ?? 64,
      miniExplanationWidth: n.miniExplanationWidth ?? 180,
      miniExplanationHeight: n.miniExplanationHeight ?? 60,
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

  const edgeColor = e.color ?? color;
  
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label ? pick(e.label, language) : undefined,
    animated: e.relationshipType === "uses",
    style: {
      stroke: edgeColor,
      strokeWidth: 1.6,
      strokeDasharray: e.lineStyle === "dashed" ? "8 6" : undefined,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: edgeColor,
      width: 16,
      height: 16,
    },
    labelStyle: { fill: e.labelColor ?? "#ffffff", fontSize: 11, textShadow: "0 0 8px rgba(255,255,255,0.2)" },
    labelBgStyle: { fill: "transparent" },
    labelBgPadding: [0, 0],
    data: {
      label: e.label,
      relationshipType: e.relationshipType,
      color: e.color,
      lineStyle: e.lineStyle ?? "solid",
      labelColor: e.labelColor ?? "#ffffff",
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
  onClearSelection,
  updatedNode,
  deletedNodeId,
  onNodeUpdate,
  onNodeDelete,
  onHistoryStateChange,
  restoreHistoryState,
}: BrainGraphProps) {
  const { language } = useLanguage();
  const { fitView, zoomIn, zoomOut, screenToFlowPosition } = useReactFlow();

  const initialCanvas = useMemo(
    () => loadSavedCanvas(language),
    // We only want this to run once on first render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(initialCanvas.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialCanvas.edges);

  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [resizeState, setResizeState] = useState<ResizeState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionSource, setConnectionSource] = useState<string | null>(null);
  const [, setMousePosition] = useState<{ x: number; y: number } | null>(null);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const isEditing = true; // Always in edit mode

  /** Generate a unique node ID */
  const generateNodeId = useCallback(() => {
    return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

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
            miniExplanation: brainNode.miniExplanation
              ? pick(brainNode.miniExplanation, language)
              : "",
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
        const labelColor = edge.data?.labelColor as string | undefined;

        return {
          ...edge,
          label: label ? label[language] : edge.label,
          labelStyle: {
            ...(edge.labelStyle ?? {}),
            fill: labelColor ?? "#ffffff",
            textShadow: "0 0 10px rgba(255,255,255,0.18)",
          },
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

  /** Notify parent of state changes for history tracking - with debounce */
  const lastNotifiedStateRef = useRef<string>("");
  useEffect(() => {
    if (!onHistoryStateChange) return;
    
    const stateString = JSON.stringify({ nodes, edges });
    if (stateString !== lastNotifiedStateRef.current) {
      lastNotifiedStateRef.current = stateString;
      // Use setTimeout to avoid pushing state during React Flow's internal updates
      const timeoutId = setTimeout(() => {
        onHistoryStateChange({ nodes, edges });
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, onHistoryStateChange]);


  /** Restore state from history */
  useEffect(() => {
    if (restoreHistoryState && restoreHistoryState.nodes.length > 0) {
      setNodes(restoreHistoryState.nodes);
      setEdges(restoreHistoryState.edges);
    }
  }, [restoreHistoryState, setNodes, setEdges]);

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
            miniExplanation: updatedNode.miniExplanation
              ? pick(updatedNode.miniExplanation, language)
              : "",
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


  /** Create a manual connection between two nodes. */
  const onConnect = useCallback(
    (connection: Connection) => {
      const label = {
        fr: "",
        en: "",
      };
      const color = "#94a3b8";

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
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: color,
          width: 16,
          height: 16,
        },
        labelStyle: {
          fill: "#ffffff",
          fontSize: 10,
          textShadow: "0 0 8px rgba(255,255,255,0.2)",
        },
        labelBgStyle: { fill: "transparent" },
        labelBgPadding: [0, 0],
        data: {
          label,
          relationshipType: "related",
          color,
          lineStyle: "solid",
          labelColor: "#ffffff",
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
          const updatedColor = updatedEdge.color ?? edge.style?.stroke ?? "#818cf8";
          
          return {
            ...edge,
            label: nextLabel,
            style: {
              ...(edge.style ?? {}),
              stroke: updatedColor,
              strokeDasharray: updatedEdge.lineStyle === "dashed" ? "8 6" : undefined,
            },
            markerEnd: {
              type: MarkerType.ArrowClosed,
              color: updatedColor,
              width: 16,
              height: 16,
            },
            labelStyle: {
              ...(edge.labelStyle ?? {}),
              fill: updatedEdge.labelColor ?? (edge.data as any)?.labelColor ?? "#ffffff",
              textShadow: "0 0 8px rgba(255,255,255,0.2)",
            },
            labelBgStyle: {
              fill: "transparent",
            },
            labelBgPadding: [0, 0],
            data: {
              ...(edge.data ?? {}),
              label: updatedEdge.label,
              relationshipType: updatedEdge.relationshipType,
              color: updatedEdge.color,
              lineStyle: updatedEdge.lineStyle ?? "solid",
              labelColor: updatedEdge.labelColor ?? (edge.data as any)?.labelColor ?? "#ffffff",
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

  /** Add a new node at the center of the current viewport */
  const handleAddNode = useCallback(() => {
    const newNodeId = generateNodeId();
    
    // Get the React Flow container element
    const container = document.querySelector('.react-flow') as HTMLElement;
    if (!container) {
      // Fallback to default position if container not found
      const centerX = 400;
      const centerY = 320;
      
      const newNode: Node = {
        id: newNodeId,
        type: "brain",
        position: { x: centerX - 90, y: centerY - 32 },
        data: {
          node: {
            id: newNodeId,
            type: "concept",
            position: { x: centerX - 90, y: centerY - 32 },
            title: { fr: "Nouveau Nœud", en: "New Node" },
            shortSummary: { fr: "", en: "" },
            simpleExplanation: { fr: "", en: "" },
            deepExplanation: { fr: "", en: "" },
            whyItMatters: { fr: "", en: "" },
            prerequisites: { fr: [], en: [] },
            relatedConcepts: [],
            commonMistakes: { fr: [], en: [] },
            examples: { fr: [], en: [] },
          } as BrainNode,
          label: language === "fr" ? "Nouveau Nœud" : "New Node",
          nodeWidth: 180,
          nodeHeight: 64,
          highlighted: false,
          dimmed: false,
        },
        selected: true,
        draggable: true,
        deletable: true,
      };

      setNodes((currentNodes) => [...currentNodes, newNode]);
      
      // Notify parent to open the drawer for editing
      setTimeout(() => {
        onNodeClick(newNodeId, newNode.data.node as BrainNode);
      }, 100);
      return;
    }

    // Calculate the center of the viewport in screen coordinates
    const rect = container.getBoundingClientRect();
    const screenCenterX = rect.left + rect.width / 2;
    const screenCenterY = rect.top + rect.height / 2;

    // Convert screen coordinates to flow coordinates
    const flowPosition = screenToFlowPosition({ x: screenCenterX, y: screenCenterY });

    const newNode: Node = {
      id: newNodeId,
      type: "brain",
      position: { x: flowPosition.x - 90, y: flowPosition.y - 32 },
      data: {
        node: {
          id: newNodeId,
          type: "concept",
          position: { x: flowPosition.x - 90, y: flowPosition.y - 32 },
          title: { fr: "Nouveau Nœud", en: "New Node" },
          shortSummary: { fr: "", en: "" },
          simpleExplanation: { fr: "", en: "" },
          deepExplanation: { fr: "", en: "" },
          whyItMatters: { fr: "", en: "" },
          prerequisites: { fr: [], en: [] },
          relatedConcepts: [],
          commonMistakes: { fr: [], en: [] },
          examples: { fr: [], en: [] },
        } as BrainNode,
        label: language === "fr" ? "Nouveau Nœud" : "New Node",
        nodeWidth: 180,
        nodeHeight: 64,
        highlighted: false,
        dimmed: false,
      },
      selected: true,
      draggable: true,
      deletable: true,
    };

    setNodes((currentNodes) => [...currentNodes, newNode]);
    
    // Notify parent to open the drawer for editing
    setTimeout(() => {
      onNodeClick(newNodeId, newNode.data.node as BrainNode);
    }, 100);
  }, [generateNodeId, language, setNodes, onNodeClick, screenToFlowPosition]);


  /** Handle node click during connection creation */
  const handleConnectionNodeClick = useCallback((nodeId: string) => {
    if (!isConnecting) return;

    if (!connectionSource) {
      // First node clicked - set as source
      setConnectionSource(nodeId);
    } else {
      // Second node clicked - create connection
      if (connectionSource !== nodeId) {
        const newEdge: Edge = {
          id: `edge-${Date.now()}`,
          source: connectionSource,
          target: nodeId,
          label: language === "fr" ? "" : "",
          animated: false,
          style: {
            stroke: "#94a3b8",
            strokeWidth: 1.8,
          },
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#94a3b8",
            width: 16,
            height: 16,
          },
          labelStyle: {
            fill: "#ffffff",
            fontSize: 10,
            textShadow: "0 0 8px rgba(255,255,255,0.2)",
          },
          labelBgStyle: { fill: "transparent" },
          labelBgPadding: [0, 0],
          data: {
            label: { fr: "", en: "" },
            relationshipType: "related",
            color: "#94a3b8",
            lineStyle: "solid",
            labelColor: "#ffffff",
          },
          sourceHandle: "bottom-source",
          targetHandle: "top-target",
          deletable: true,
        };
        setEdges((currentEdges) => addEdge(newEdge, currentEdges));
      }
      // Reset connection mode
      setIsConnecting(false);
      setConnectionSource(null);
      setMousePosition(null);
    }
  }, [isConnecting, connectionSource, language, setEdges]);

  /** Cancel connection creation */
  const cancelConnection = useCallback(() => {
    setIsConnecting(false);
    setConnectionSource(null);
    setMousePosition(null);
  }, []);

  /** Fit all visible nodes in view. */
  const centerView = useCallback(() => {
    fitView({ padding: 0.25, duration: 500 });
  }, [fitView]);

  /** Export graph as tree and copy to clipboard */
  const handleExportTree = useCallback(async () => {
    // Extract BrainNodes from React Flow nodes
    const brainNodes = nodes
      .map((node) => (node.data as FlowNodeData)?.node)
      .filter((node): node is BrainNode => node !== undefined);
    
    // Extract BrainEdges from React Flow edges
    const brainEdges: BrainEdge[] = edges
      .filter((edge) => edge.data?.label)
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle ?? undefined,
        targetHandle: edge.targetHandle ?? undefined,
        relationshipType: (edge.data?.relationshipType as BrainEdge['relationshipType']) ?? "related",
        label: edge.data?.label as { fr: string; en: string },
        color: edge.data?.color as string | undefined,
        labelColor: edge.data?.labelColor as string | undefined,
        lineStyle: edge.data?.lineStyle as "solid" | "dashed" | undefined,
      }));
    
    const treeText = generateTreeExport(brainNodes, brainEdges, language);
    const success = await copyToClipboard(treeText);
    
    if (success) {
      setCopyFeedback(true);
      setTimeout(() => setCopyFeedback(false), 2000);
    }
  }, [nodes, edges, language]);

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) ?? null,
    [edges, selectedEdgeId],
  );

  /** Handle resize start from a corner handle */
  const handleResizeStart = useCallback((
    e: React.PointerEvent | React.MouseEvent,
    nodeId: string,
    handle: string,
    nodeWidth: number,
    nodeHeight: number,
    miniWidth: number,
    miniHeight: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizeState({
      nodeId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: nodeWidth,
      startHeight: nodeHeight,
      startMiniWidth: miniWidth,
      startMiniHeight: miniHeight,
      isResizing: true,
    });
  }, []);

  /** Handle resize move */
  const handleResizeMove = useCallback((e: PointerEvent | MouseEvent) => {
    if (!resizeState || !resizeState.isResizing) return;

    const deltaX = e.clientX - resizeState.startX;
    const deltaY = e.clientY - resizeState.startY;

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== resizeState.nodeId) return node;

        const data = node.data as FlowNodeData;
        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;
        let newMiniWidth = resizeState.startMiniWidth;
        let newMiniHeight = resizeState.startMiniHeight;

        // Calculate new dimensions based on which handle is being dragged
        if (resizeState.handle.includes('e') || resizeState.handle.includes('se') || resizeState.handle.includes('ne')) {
          // East handles - increase width
          newWidth = Math.max(100, resizeState.startWidth + deltaX);
        }
        if (resizeState.handle.includes('w') || resizeState.handle.includes('sw') || resizeState.handle.includes('nw')) {
          // West handles - decrease width
          newWidth = Math.max(100, resizeState.startWidth - deltaX);
        }
        if (resizeState.handle.includes('s') || resizeState.handle.includes('se') || resizeState.handle.includes('sw')) {
          // South handles - increase height
          newHeight = Math.max(40, resizeState.startHeight + deltaY);
        }
        if (resizeState.handle.includes('n') || resizeState.handle.includes('ne') || resizeState.handle.includes('nw')) {
          // North handles - decrease height
          newHeight = Math.max(40, resizeState.startHeight - deltaY);
        }

        // Mini explanation resizes proportionally or independently
        if (resizeState.handle === 'se' || resizeState.handle === 'sw') {
          newMiniWidth = Math.max(100, resizeState.startMiniWidth + deltaX);
          newMiniHeight = Math.max(30, resizeState.startMiniHeight + deltaY);
        } else if (resizeState.handle === 'ne' || resizeState.handle === 'nw') {
          newMiniWidth = Math.max(100, resizeState.startMiniWidth + deltaX);
          newMiniHeight = Math.max(30, resizeState.startMiniHeight - deltaY);
        }

        return {
          ...node,
          data: {
            ...data,
            nodeWidth: newWidth,
            nodeHeight: newHeight,
            miniExplanationWidth: newMiniWidth,
            miniExplanationHeight: newMiniHeight,
          },
        };
      })
    );
  }, [resizeState, setNodes]);

  /** Handle resize end */
  const handleResizeEnd = useCallback(() => {
    if (!resizeState) return;

    // Find the updated node and call onNodeUpdate if available
    const updatedNode = nodes.find((n) => n.id === resizeState.nodeId);
    if (updatedNode && onNodeUpdate) {
      const data = updatedNode.data as FlowNodeData;
      if (data.node) {
        onNodeUpdate({
          ...data.node,
          nodeWidth: data.nodeWidth,
          nodeHeight: data.nodeHeight,
          miniExplanationWidth: data.miniExplanationWidth,
          miniExplanationHeight: data.miniExplanationHeight,
        });
      }
    }

    setResizeState(null);
  }, [resizeState, nodes, onNodeUpdate]);

  /** Add global pointer event listeners for resizing */
  useEffect(() => {
    if (resizeState?.isResizing) {
      window.addEventListener('pointermove', handleResizeMove);
      window.addEventListener('pointerup', handleResizeEnd);
      return () => {
        window.removeEventListener('pointermove', handleResizeMove);
        window.removeEventListener('pointerup', handleResizeEnd);
      };
    }
  }, [resizeState?.isResizing, handleResizeMove, handleResizeEnd]);

  /** Add keyboard event listeners for connection mode */
  useEffect(() => {
    if (!isConnecting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelConnection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isConnecting, cancelConnection]);

  const nodeTypes = useMemo(() => ({
    brain: memo((props: NodeProps) => <BrainNodeComponent {...props} onResizeStart={handleResizeStart} />),
  }), [handleResizeStart]);

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
    <div className={`brain-graph ${isConnecting ? "is-connecting" : ""}`}>
      <div className="brain-graph__zoom-panel">
        {isEditing && (
          <button
            type="button"
            onClick={handleAddNode}
            className="zoom-button"
            aria-label={language === "fr" ? "Ajouter un nœud" : "Add a node"}
            title={language === "fr" ? "Ajouter un nœud" : "Add a node"}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="12" y1="8" x2="12" y2="16"></line>
              <line x1="8" y1="12" x2="16" y2="12"></line>
            </svg>
          </button>
        )}
        <button
          type="button"
          onClick={() => zoomIn()}
          className="zoom-button"
          aria-label={language === "fr" ? "Zoomer" : "Zoom in"}
        >
          +
        </button>
        <button
          type="button"
          onClick={() => zoomOut()}
          className="zoom-button"
          aria-label={language === "fr" ? "Dézoomer" : "Zoom out"}
        >
          −
        </button>
        <button
          type="button"
          onClick={centerView}
          className="zoom-button zoom-button--fit"
        >
          {language === "fr" ? "Centrer" : "Fit"}
        </button>
      </div>

      {/* Export button - bottom right, opposite minimap */}
      <button
        type="button"
        onClick={handleExportTree}
        className="export-button"
        aria-label={language === "fr" ? "Exporter en arborescence" : "Export as tree"}
        title={language === "fr" ? "Copier l'arborescence dans le presse-papiers" : "Copy tree structure to clipboard"}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
        {copyFeedback && (
          <span className="export-button__feedback">
            {language === "fr" ? "Copié !" : "Copied!"}
          </span>
        )}
      </button>

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
            isReadOnly={false}
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
          // Handle connection mode
          if (isConnecting) {
            handleConnectionNodeClick(node.id);
            return;
          }

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
          onClearSelection();
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