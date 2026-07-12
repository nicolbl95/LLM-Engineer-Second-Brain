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
import { pick, normalizeBrainNode } from "../utils/i18n";
import { EdgeEditor } from "./EdgeEditor";
import { generateTreeExport, generateTreeTitleOnlyExport, copyToClipboard } from "../utils/treeExport";

interface ResizeState {
  nodeId: string;
  handle: string;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  startMiniWidth: number;
  startMiniHeight: number;
  startSummaryWidth: number;
  startSummaryHeight: number;
  startSummaryOffsetX: number;
  isResizing: boolean;
  mode: "node" | "summary" | "summary-drag" | "image";
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
  focusNodeId?: string | null;
  onOpenSearch?: () => void;
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
  summary?: string;
  summaryWidth?: number;
  summaryHeight?: number;
  summaryOffsetX?: number;
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

/**
 * Localized text fields on BrainNode that should be checked
 * when recovering English content from static graph.ts nodes.
 */
const LOCALIZED_TEXT_FIELDS: (keyof BrainNode)[] = [
  "title",
  "shortSummary",
  "simpleExplanation",
  "deepExplanation",
  "whyItMatters",
  "miniExplanation",
  "summary",
];

/**
 * Check whether the English field of a saved node is effectively missing
 * and should be recovered from the static graph.ts definition.
 *
 * Returns true when the English field is:
 * - undefined / empty string
 * - exactly "New Node"
 * - identical to the French field (likely a copy-paste of French text)
 */
function englishIsMissing(node: BrainNode, field: keyof BrainNode): boolean {
  const value = node[field] as LocalizedText | undefined;
  if (!value || typeof value !== "object") return true;
  const en = (value.en ?? "").trim();
  const fr = (value.fr ?? "").trim();
  if (!en) return true;
  if (en === "New Node") return true;
  // If English equals French AND both are non-empty,
  // this looks like French text copied into the English slot.
  // Exception: acronyms / proper nouns that are legitimately the same
  // in both languages (e.g. "LLM", "RAG", "Docker").
  // For those, the static node will have identical fr/en too, so
  // merging will produce the same result — no harm.
  if (en === fr && fr.length > 0) return true;
  return false;
}

/**
 * Recover missing English content from the matching static graph.ts node.
 *
 * Only repairs English fields that appear to be missing (empty, "New Node",
 * or identical to the French text). Preserves user-edited English fields.
 *
 * @param savedNode - The node loaded from localStorage
 * @returns A new BrainNode with English fields merged from static definitions
 */
function mergeStaticEnglish(savedNode: BrainNode): BrainNode {
  const staticNode = brainNodes.find((n) => n.id === savedNode.id);
  if (!staticNode) return savedNode;

  const merged = { ...savedNode };

  // DEBUG: log merge for a known default node
  if (savedNode.id === "vector-database") {
    const svTitle = savedNode.title as LocalizedText | undefined;
    const stTitle = staticNode.title as LocalizedText | undefined;
    console.log("[mergeStaticEnglish] node:", savedNode.id);
    console.log("  saved title.fr:", svTitle?.fr);
    console.log("  saved title.en before merge:", svTitle?.en);
    console.log("  static title.en:", stTitle?.en);
  }

  for (const field of LOCALIZED_TEXT_FIELDS) {
    if (englishIsMissing(savedNode, field)) {
      const staticValue = staticNode[field] as LocalizedText | undefined;
      const savedValue = savedNode[field] as LocalizedText | undefined;
      if (staticValue?.en) {
        (merged as any)[field] = {
          fr: savedValue?.fr ?? staticValue.fr ?? "",
          en: staticValue.en,
        };
      }
    }
  }

  // DEBUG: log result after merge
  if (savedNode.id === "vector-database") {
    const mTitle = merged.title as LocalizedText;
    console.log("  final title.en after merge:", mTitle.en);
  }

  return merged;
}

/** Custom React Flow node — label uses active language only. */
function BrainNodeComponent({ 
  data, 
  selected, 
  onResizeStart,
  onSummaryDragStart,
  onSummaryResizeStart 
}: NodeProps & { 
  onResizeStart?: (e: React.PointerEvent | React.MouseEvent, nodeId: string, handle: string, nodeWidth: number, nodeHeight: number, miniWidth: number, miniHeight: number, summaryWidth: number, summaryHeight: number, summaryOffsetX: number) => void;
  onSummaryDragStart?: (e: React.PointerEvent | React.MouseEvent, nodeId: string, startX: number, startSummaryOffsetX: number) => void;
  onSummaryResizeStart?: (e: React.PointerEvent | React.MouseEvent, nodeId: string, handle: string, summaryWidth: number, summaryHeight: number, summaryOffsetX: number) => void;
}) {
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
  const summaryText = flowData.summary as string | undefined;
  const summaryWidth = flowData.summaryWidth ?? 520;
  const summaryHeight = flowData.summaryHeight ?? 120;
  const summaryOffsetX = flowData.summaryOffsetX ?? 0;

  // Resize handle props - shared style for both node and summary
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
          "--summary-offset": `${summaryOffsetX}px`,
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

      {/* Summary sub-node - rendered as part of the main node */}
      {summaryText && (
        <div
          className="brain-node__summary"
          style={{
            width: `${summaryWidth}px`,
            height: `${summaryHeight}px`,
            transform: `translateX(${summaryOffsetX}px)`,
          }}
        >
          {/* Horizontal drag handle for summary */}
          {selected && onSummaryDragStart && (
            <div
              className="summary-drag-handle"
              onMouseDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSummaryDragStart(e, node.id, e.clientX, summaryOffsetX);
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onSummaryDragStart(e, node.id, e.clientX, summaryOffsetX);
              }}
            />
          )}
          
          <div className="brain-node__summary-content">{summaryText}</div>
          
          {/* Summary resize handles - using same class as main node for identical appearance */}
          {showResizeHandles && onSummaryResizeStart && (
            <>
              <div
                className="resize-handle resize-handle--nw"
                style={{ zIndex: 12 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "nw", summaryWidth, summaryHeight, summaryOffsetX);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "nw", summaryWidth, summaryHeight, summaryOffsetX);
                }}
              />
              <div
                className="resize-handle resize-handle--ne"
                style={{ zIndex: 12 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "ne", summaryWidth, summaryHeight, summaryOffsetX);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "ne", summaryWidth, summaryHeight, summaryOffsetX);
                }}
              />
              <div
                className="resize-handle resize-handle--sw"
                style={{ zIndex: 12 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "sw", summaryWidth, summaryHeight, summaryOffsetX);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "sw", summaryWidth, summaryHeight, summaryOffsetX);
                }}
              />
              <div
                className="resize-handle resize-handle--se"
                style={{ zIndex: 12 }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "se", summaryWidth, summaryHeight, summaryOffsetX);
                }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  onSummaryResizeStart(e, node.id, "se", summaryWidth, summaryHeight, summaryOffsetX);
                }}
              />
            </>
          )}
        </div>
      )}

      {/* Resize handles - only visible when selected and in edit mode */}
      {showResizeHandles && onResizeStart && (
        <>
          <div
            className="resize-handle resize-handle--nw"
            style={{ ...resizeHandleStyle, top: "-6px", left: "-6px", cursor: "nwse-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "nw", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
            onPointerDown={(e) => onResizeStart(e, node.id, "nw", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
          />
          <div
            className="resize-handle resize-handle--ne"
            style={{ ...resizeHandleStyle, top: "-6px", right: "-6px", cursor: "nesw-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "ne", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
            onPointerDown={(e) => onResizeStart(e, node.id, "ne", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
          />
          <div
            className="resize-handle resize-handle--sw"
            style={{ ...resizeHandleStyle, bottom: "-6px", left: "-6px", cursor: "nesw-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "sw", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
            onPointerDown={(e) => onResizeStart(e, node.id, "sw", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
          />
          <div
            className="resize-handle resize-handle--se"
            style={{ ...resizeHandleStyle, bottom: "-6px", right: "-6px", cursor: "nwse-resize" }}
            onMouseDown={(e) => onResizeStart(e, node.id, "se", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
            onPointerDown={(e) => onResizeStart(e, node.id, "se", nodeWidth, nodeHeight, miniWidth, miniHeight, summaryWidth, summaryHeight, summaryOffsetX)}
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

  /** Image node component for pasted screenshots/images */
  function ImageNodeComponent({ id, data, selected, onResizeStart }: NodeProps & { onResizeStart?: (e: React.PointerEvent | React.MouseEvent, nodeId: string, handle: string, width: number, height: number) => void }) {
    const imageData = data as {
      imageUrl?: string;
      imageName?: string;
      imageWidth?: number;
      imageHeight?: number;
      isEditing?: boolean;
    };

    const { imageUrl, imageName, imageWidth, imageHeight } = imageData;
    
    // Safe numeric defaults with fallbacks
    const safeImageWidth = Number(imageWidth) || 320;
    const safeImageHeight = Number(imageHeight) || 220;

    // If imageUrl is missing or invalid, render a placeholder
    if (!imageUrl || typeof imageUrl !== 'string' || !imageUrl.startsWith('data:image/')) {
      console.warn(`ImageNodeComponent: Invalid or missing imageUrl for node ${id}`);
      return (
        <div
          className={`image-node ${selected ? "image-node--selected" : ""}`}
          style={{
            width: `${safeImageWidth}px`,
            height: `${safeImageHeight}px`,
          }}
        >
          <Handle
            id="top-target"
            type="target"
            position={Position.Top}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="top-source"
            type="source"
            position={Position.Top}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="right-target"
            type="target"
            position={Position.Right}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="right-source"
            type="source"
            position={Position.Right}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="bottom-target"
            type="target"
            position={Position.Bottom}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="bottom-source"
            type="source"
            position={Position.Bottom}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="left-target"
            type="target"
            position={Position.Left}
            className="image-handle"
            isConnectable={true}
          />
          <Handle
            id="left-source"
            type="source"
            position={Position.Left}
            className="image-handle"
            isConnectable={true}
          />
          <div className="image-node__container" style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#1e293b',
            border: '2px dashed #64748b',
            borderRadius: '8px',
            height: '100%',
            color: '#94a3b8',
            fontSize: '14px',
            textAlign: 'center',
            padding: '20px'
          }}>
            Image unavailable
          </div>
        </div>
      );
    }

    return (
      <div
        className={`image-node ${selected ? "image-node--selected" : ""}`}
        style={{
          width: `${safeImageWidth}px`,
          height: `${safeImageHeight}px`,
        }}
      >
      <Handle
        id="top-target"
        type="target"
        position={Position.Top}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="top-source"
        type="source"
        position={Position.Top}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="right-target"
        type="target"
        position={Position.Right}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="right-source"
        type="source"
        position={Position.Right}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="bottom-target"
        type="target"
        position={Position.Bottom}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="bottom-source"
        type="source"
        position={Position.Bottom}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="left-target"
        type="target"
        position={Position.Left}
        className="image-handle"
        isConnectable={true}
      />
      <Handle
        id="left-source"
        type="source"
        position={Position.Left}
        className="image-handle"
        isConnectable={true}
      />
      
      {/* Resize handles - only visible when selected */}
      {selected && onResizeStart && (
        <>
          <div
            className="resize-handle resize-handle--nw nodrag nopan"
            style={{ 
              position: "absolute",
              top: "-6px", 
              left: "-6px", 
              cursor: "nwse-resize",
              zIndex: 20 
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "nw", safeImageWidth, safeImageHeight);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "nw", safeImageWidth, safeImageHeight);
            }}
          />
          <div
            className="resize-handle resize-handle--ne nodrag nopan"
            style={{ 
              position: "absolute",
              top: "-6px", 
              right: "-6px", 
              cursor: "nesw-resize",
              zIndex: 20 
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "ne", safeImageWidth, safeImageHeight);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "ne", safeImageWidth, safeImageHeight);
            }}
          />
          <div
            className="resize-handle resize-handle--sw nodrag nopan"
            style={{ 
              position: "absolute",
              bottom: "-6px", 
              left: "-6px", 
              cursor: "nesw-resize",
              zIndex: 20 
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "sw", safeImageWidth, safeImageHeight);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "sw", safeImageWidth, safeImageHeight);
            }}
          />
          <div
            className="resize-handle resize-handle--se nodrag nopan"
            style={{ 
              position: "absolute",
              bottom: "-6px", 
              right: "-6px", 
              cursor: "nwse-resize",
              zIndex: 20 
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "se", safeImageWidth, safeImageHeight);
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onResizeStart(e, id, "se", safeImageWidth, safeImageHeight);
            }}
          />
        </>
      )}
      
      <div className="image-node__container">
        <img
          src={imageUrl}
          alt={imageName || "Pasted image"}
          className="image-node__img"
          draggable={false}
        />
      </div>
    </div>
  );
}

  /** Convert static brain data into editable React Flow nodes. */
  function createInitialFlowNodes(language: "fr" | "en"): Node[] {
    return brainNodes.map((n) => ({
      id: n.id,
      type: "brain",
      position: n.position,
      data: {
        node: n,
        label: pick(n.title, language, "New Node"),
        miniExplanation: n.miniExplanation ? pick(n.miniExplanation, language, "") : "",
        nodeWidth: n.nodeWidth ?? 180,
        nodeHeight: n.nodeHeight ?? 64,
        miniExplanationWidth: n.miniExplanationWidth ?? 180,
        miniExplanationHeight: n.miniExplanationHeight ?? 60,
        summary: n.summary ? pick(n.summary, language, "") : "",
        summaryWidth: n.summaryWidth ?? 520,
        summaryHeight: n.summaryHeight ?? 120,
        summaryOffsetX: n.summaryOffsetX ?? 0,
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
      nodes: parsed.nodes.map((node) => normalizeLoadedFlowNode(node, language)),
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
 * Normalize a loaded React Flow node to ensure it has valid data.
 * This ensures nodes loaded from localStorage are functional.
 */
function normalizeLoadedFlowNode(flowNode: Node, language: "fr" | "en"): Node {
  // Preserve image nodes as-is
  if (flowNode.type === "image") {
    return {
      ...flowNode,
      type: "image",
      selected: false,
      draggable: true,
      deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
    };
  }

  // If node already has valid data.node, preserve it and update language-dependent fields
  if (flowNode.data?.node) {
    const brainNode = flowNode.data.node as BrainNode;
    
    // Normalize the brain node to clean up bad saved data
    const normalizedNode = normalizeBrainNode(brainNode);
    
    // Recover missing English fields from static graph.ts definitions
    const mergedNode = mergeStaticEnglish(normalizedNode);
    
    return {
      ...flowNode,
      type: "brain",
      data: {
        ...flowNode.data,
        node: mergedNode,
        label: pick(mergedNode.title, language, "New Node"),
        miniExplanation: mergedNode.miniExplanation
          ? pick(mergedNode.miniExplanation, language)
          : "",
        nodeWidth: flowNode.data.nodeWidth ?? mergedNode.nodeWidth ?? 180,
        nodeHeight: flowNode.data.nodeHeight ?? mergedNode.nodeHeight ?? 64,
        miniExplanationWidth: flowNode.data.miniExplanationWidth ?? mergedNode.miniExplanationWidth ?? 180,
        miniExplanationHeight: flowNode.data.miniExplanationHeight ?? mergedNode.miniExplanationHeight ?? 60,
        summary: mergedNode.summary ? pick(mergedNode.summary, language, "") : "",
        summaryWidth: flowNode.data.summaryWidth ?? mergedNode.summaryWidth ?? 520,
        summaryHeight: flowNode.data.summaryHeight ?? mergedNode.summaryHeight ?? 120,
        summaryOffsetX: flowNode.data.summaryOffsetX ?? mergedNode.summaryOffsetX ?? 0,
        highlighted: false,
        dimmed: false,
      },
      selected: false,
      draggable: true,
      deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
    };
  }

  // If data.node is missing, try to recover from static brainNodes
  const staticNode = brainNodes.find((n) => n.id === flowNode.id);
  if (staticNode) {
    // Normalize the static node as well
    const normalizedStaticNode = normalizeBrainNode(staticNode);
    
    return {
      ...flowNode,
      type: "brain",
      data: {
        node: normalizedStaticNode,
        label: pick(normalizedStaticNode.title, language, "New Node"),
        miniExplanation: normalizedStaticNode.miniExplanation
          ? pick(normalizedStaticNode.miniExplanation, language, "")
          : "",
        nodeWidth: flowNode.data?.nodeWidth ?? normalizedStaticNode.nodeWidth ?? 180,
        nodeHeight: flowNode.data?.nodeHeight ?? normalizedStaticNode.nodeHeight ?? 64,
        miniExplanationWidth: flowNode.data?.miniExplanationWidth ?? normalizedStaticNode.miniExplanationWidth ?? 180,
        miniExplanationHeight: flowNode.data?.miniExplanationHeight ?? normalizedStaticNode.miniExplanationHeight ?? 60,
        summary: normalizedStaticNode.summary ? pick(normalizedStaticNode.summary, language, "") : "",
        summaryWidth: flowNode.data?.summaryWidth ?? normalizedStaticNode.summaryWidth ?? 520,
        summaryHeight: flowNode.data?.summaryHeight ?? normalizedStaticNode.summaryHeight ?? 120,
        summaryOffsetX: flowNode.data?.summaryOffsetX ?? normalizedStaticNode.summaryOffsetX ?? 0,
        highlighted: false,
        dimmed: false,
      },
      selected: false,
      draggable: true,
      deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
    };
  }

  // Fallback: create a minimal BrainNode from available data
  const fallbackTitle = (flowNode.data?.label as string | undefined) || flowNode.id;
  const fallbackNode: BrainNode = {
    id: flowNode.id,
    type: "concept",
    position: flowNode.position || { x: 0, y: 0 },
    title: { fr: fallbackTitle as string, en: fallbackTitle as string },
    shortSummary: { fr: "", en: "" },
    simpleExplanation: { fr: "", en: "" },
    deepExplanation: { fr: "", en: "" },
    whyItMatters: { fr: "", en: "" },
    prerequisites: { fr: [], en: [] },
    relatedConcepts: [],
    commonMistakes: { fr: [], en: [] },
    examples: { fr: [], en: [] },
  };

  return {
    ...flowNode,
    type: "brain",
    data: {
      node: fallbackNode,
      label: fallbackTitle,
      miniExplanation: "",
      nodeWidth: flowNode.data?.nodeWidth ?? 180,
      nodeHeight: flowNode.data?.nodeHeight ?? 64,
      miniExplanationWidth: flowNode.data?.miniExplanationWidth ?? 180,
      miniExplanationHeight: flowNode.data?.miniExplanationHeight ?? 60,
      summary: "",
      summaryWidth: flowNode.data?.summaryWidth ?? 520,
      summaryHeight: flowNode.data?.summaryHeight ?? 120,
      summaryOffsetX: flowNode.data?.summaryOffsetX ?? 0,
      highlighted: false,
      dimmed: false,
    },
    selected: false,
    draggable: true,
    deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
  };
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
 * - paste images from clipboard
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
  focusNodeId,
  onOpenSearch,
}: BrainGraphProps) {
  const { language } = useLanguage();
  const { fitView, zoomIn, zoomOut, screenToFlowPosition, getNode } = useReactFlow();

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
        // Skip image nodes - they don't have BrainNode data
        if (flowNode.type === "image") {
          return {
            ...flowNode,
            selected: flowNode.id === selectedNodeId,
            deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
            draggable: isEditing && !PROTECTED_NODE_IDS.has(flowNode.id),
          };
        }

        const data = flowNode.data as FlowNodeData;

        const brainNode = data.node;
        if (!brainNode) return flowNode;

        // Recover missing English from static graph.ts definitions
        // on every language change (not just initial load).
        // If mergeStaticEnglish already ran during loadSavedCanvas,
        // this is a no-op because englishIsMissing returns false
        // for correctly-set English fields.
        const mergedNode = mergeStaticEnglish(brainNode);

        const visible = nodeMatchesFilter(mergedNode, activePillar);
        const isHighlighted = highlightSet.has(flowNode.id);

        return {
          ...flowNode,
          hidden: !visible,
          selected: flowNode.id === selectedNodeId,
          deletable: !PROTECTED_NODE_IDS.has(flowNode.id),
          data: {
          ...data,
          node: mergedNode,
          label: pick(mergedNode.title, language, "New Node"),
          miniExplanation: mergedNode.miniExplanation
            ? pick(mergedNode.miniExplanation, language, "")
            : "",
          summary: mergedNode.summary
            ? pick(mergedNode.summary, language, "")
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
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          nodes,
          edges,
        }),
      );
    } catch (error) {
      console.warn("LOCAL STORAGE SAVE FAILED:", error);
      // If quota exceeded, try to save without image data URLs
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn("localStorage quota exceeded - attempting to save without image data");
        try {
          const nodesWithoutImages = nodes.map(node => {
            if (node.type === 'image') {
              const { imageUrl, ...rest } = node.data;
              return {
                ...node,
                data: {
                  ...rest,
                  imageUrl: undefined, // Remove large image data
                }
              };
            }
            return node;
          });
          
          localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
              nodes: nodesWithoutImages,
              edges,
            }),
          );
          console.warn("Saved canvas without image data to prevent quota exceeded error");
        } catch (retryError) {
          console.error("Failed to save even without images:", retryError);
        }
      }
    }
  }, [nodes, edges]);

  /** Immediately notify parent of state changes for search and history tracking */
  const onHistoryStateChangeRef = useRef(onHistoryStateChange);
  useEffect(() => {
    onHistoryStateChangeRef.current = onHistoryStateChange;
  }, [onHistoryStateChange]);

  useEffect(() => {
    if (onHistoryStateChangeRef.current) {
      onHistoryStateChangeRef.current({ nodes, edges });
    }
  }, [nodes, edges]);


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
        
        // Skip image nodes
        if (flowNode.type === "image") return flowNode;

        return {
          ...flowNode,
          data: {
            ...flowNode.data,
            node: updatedNode,
            label: pick(updatedNode.title, language, "New Node"),
            miniExplanation: updatedNode.miniExplanation
              ? pick(updatedNode.miniExplanation, language, "")
              : "",
            summary: updatedNode.summary
              ? pick(updatedNode.summary, language, "")
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
            summary: { fr: "", en: "" },
            summaryWidth: 520,
            summaryHeight: 120,
            summaryOffsetX: 0,
          } as BrainNode,
          label: pick({ fr: "Nouveau Nœud", en: "New Node" }, language, "New Node"),
          nodeWidth: 180,
          nodeHeight: 64,
          summaryWidth: 520,
          summaryHeight: 120,
          summaryOffsetX: 0,
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
          summary: { fr: "", en: "" },
          summaryWidth: 520,
          summaryHeight: 120,
          summaryOffsetX: 0,
        } as BrainNode,
        label: pick({ fr: "Nouveau Nœud", en: "New Node" }, language, "New Node"),
        nodeWidth: 180,
        nodeHeight: 64,
        summaryWidth: 520,
        summaryHeight: 120,
        summaryOffsetX: 0,
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

  /** Center the view on a specific node. */
  const focusNode = useCallback((nodeId: string) => {
    const node = getNode(nodeId);
    if (node) {
      // Use fitView with padding to show the node and its context
      fitView({
        padding: 0.3,
        duration: 600,
        nodes: [node],
      });
    }
  }, [fitView, getNode]);

  /** Effect to focus on a node when focusNodeId changes */
  useEffect(() => {
    if (focusNodeId) {
      // Small delay to ensure the node is rendered and selected
      setTimeout(() => {
        focusNode(focusNodeId);
      }, 100);
    }
  }, [focusNodeId, focusNode]);

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

  /** Export graph as tree with titles only and copy to clipboard */
  const handleExportTitleOnlyTree = useCallback(async () => {
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
    
    const treeText = generateTreeTitleOnlyExport(brainNodes, brainEdges, language);
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
    miniHeight: number,
    summaryWidth: number,
    summaryHeight: number,
    summaryOffsetX: number
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
      startSummaryWidth: summaryWidth,
      startSummaryHeight: summaryHeight,
      startSummaryOffsetX: summaryOffsetX,
      isResizing: true,
      mode: "node",
    });
  }, []);

  /** Handle image resize start from a corner handle */
  const handleImageResizeStart = useCallback((
    e: React.PointerEvent | React.MouseEvent,
    nodeId: string,
    handle: string,
    width: number,
    height: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizeState({
      nodeId,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: width,
      startHeight: height,
      startMiniWidth: 0,
      startMiniHeight: 0,
      startSummaryWidth: 0,
      startSummaryHeight: 0,
      startSummaryOffsetX: 0,
      isResizing: true,
      mode: "image",
    });
  }, []);


  /** Handle resize move - unified handler for both node and summary */
  const handleResizeMove = useCallback((e: PointerEvent | MouseEvent) => {
    if (!resizeState || !resizeState.isResizing) return;

    const deltaX = e.clientX - resizeState.startX;
    const deltaY = e.clientY - resizeState.startY;

    setNodes((currentNodes) =>
      currentNodes.map((node) => {
        if (node.id !== resizeState.nodeId) return node;

        // Image resize mode
        if (resizeState.mode === "image") {
          let newWidth = resizeState.startWidth;
          let newHeight = resizeState.startHeight;

          if (resizeState.handle.includes('e')) {
            newWidth = Math.max(80, resizeState.startWidth + deltaX);
          }
          if (resizeState.handle.includes('w')) {
            newWidth = Math.max(80, resizeState.startWidth - deltaX);
          }
          if (resizeState.handle.includes('s')) {
            newHeight = Math.max(60, resizeState.startHeight + deltaY);
          }
          if (resizeState.handle.includes('n')) {
            newHeight = Math.max(60, resizeState.startHeight - deltaY);
          }

          return {
            ...node,
            data: {
              ...node.data,
              imageWidth: newWidth,
              imageHeight: newHeight,
            },
          };
        }

        // Normal node/summary resize mode
        const data = node.data as FlowNodeData;
        let newWidth = resizeState.startWidth;
        let newHeight = resizeState.startHeight;
        let newMiniWidth = resizeState.startMiniWidth;
        let newMiniHeight = resizeState.startMiniHeight;
        let newSummaryWidth = resizeState.startSummaryWidth;
        let newSummaryHeight = resizeState.startSummaryHeight;
        let newSummaryOffsetX = resizeState.startSummaryOffsetX;

        // Summary drag mode - only update offset
        if (resizeState.handle === 'summary-drag') {
          newSummaryOffsetX = resizeState.startSummaryOffsetX + deltaX;
          return {
            ...node,
            data: {
              ...data,
              summaryOffsetX: newSummaryOffsetX,
            },
          };
        }

        // Summary resize mode - only update summary dimensions
        if (resizeState.handle.startsWith('summary-')) {
          const summaryHandle = resizeState.handle.replace('summary-', '');
          newSummaryWidth = Math.max(200, resizeState.startSummaryWidth + (summaryHandle.includes('e') ? deltaX : summaryHandle.includes('w') ? -deltaX : 0));
          newSummaryHeight = Math.max(60, resizeState.startSummaryHeight + (summaryHandle.includes('s') ? deltaY : summaryHandle.includes('n') ? -deltaY : 0));
          return {
            ...node,
            data: {
              ...data,
              summaryWidth: newSummaryWidth,
              summaryHeight: newSummaryHeight,
            },
          };
        }

        // Main node resize mode - only update main node dimensions
        if (resizeState.handle.includes('e')) {
          newWidth = Math.max(100, resizeState.startWidth + deltaX);
        }
        if (resizeState.handle.includes('w')) {
          newWidth = Math.max(100, resizeState.startWidth - deltaX);
        }
        if (resizeState.handle.includes('s')) {
          newHeight = Math.max(40, resizeState.startHeight + deltaY);
        }
        if (resizeState.handle.includes('n')) {
          newHeight = Math.max(40, resizeState.startHeight - deltaY);
        }

        // Mini explanation resizes with main node
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
          summaryWidth: data.summaryWidth,
          summaryHeight: data.summaryHeight,
          summaryOffsetX: data.summaryOffsetX,
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

  /** Handle summary drag start */
  const handleSummaryDragStart = useCallback((
    e: React.PointerEvent | React.MouseEvent,
    nodeId: string,
    startX: number,
    summaryOffsetX: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizeState({
      nodeId,
      handle: 'summary-drag',
      startX,
      startY: 0,
      startWidth: 0,
      startHeight: 0,
      startMiniWidth: 0,
      startMiniHeight: 0,
      startSummaryWidth: 0,
      startSummaryHeight: 0,
      startSummaryOffsetX: summaryOffsetX,
      isResizing: true,
      mode: "summary-drag",
    });
  }, []);

  /** Handle summary resize start */
  const handleSummaryResizeStart = useCallback((
    e: React.PointerEvent | React.MouseEvent,
    nodeId: string,
    handle: string,
    summaryWidth: number,
    summaryHeight: number,
    summaryOffsetX: number
  ) => {
    e.stopPropagation();
    e.preventDefault();

    setResizeState({
      nodeId,
      handle: `summary-${handle}`,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: 0,
      startHeight: 0,
      startMiniWidth: 0,
      startMiniHeight: 0,
      startSummaryWidth: summaryWidth,
      startSummaryHeight: summaryHeight,
      startSummaryOffsetX: summaryOffsetX,
      isResizing: true,
      mode: "summary",
    });
  }, []);

  /** Add global pointer event listeners for resizing and summary dragging */
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

  /** Handle paste event to add image nodes */
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      console.log("PASTE EVENT DETECTED");
      
      // Check if clipboardData exists
      if (!e.clipboardData) {
        console.warn("PASTE: clipboardData is null/undefined");
        return;
      }

      // Check if the paste is happening in an input/textarea/contenteditable
      const target = e.target as HTMLElement;
      const tagName = target.tagName.toLowerCase();
      const isEditable = target.isContentEditable || 
                         tagName === 'input' || 
                         tagName === 'textarea' ||
                         tagName === 'select' ||
                         target.closest('input') ||
                         target.closest('textarea') ||
                         target.closest('select') ||
                         target.closest('[contenteditable="true"]');

      if (isEditable) {
        console.log("PASTE: Ignoring paste in editable element");
        return; // Let the default paste behavior happen in editable elements
      }

      const items = e.clipboardData?.items;
      if (!items || items.length === 0) {
        console.log("PASTE: No clipboard items found");
        return;
      }

      // Find image in clipboard
      const imageItem = Array.from(items).find(item => 
        item.type.startsWith('image/') && item.kind === 'file'
      );
      
      if (!imageItem) {
        console.log("PASTE: No image item found in clipboard");
        return;
      }

      console.log("IMAGE FILE FOUND:", imageItem.type);

      // Prevent default paste behavior
      e.preventDefault();

      // Read the image file
      const file = imageItem.getAsFile();
      if (!file) {
        console.warn("PASTE: getAsFile() returned null");
        return;
      }

      console.log("PASTE: Reading file with FileReader");

      const reader = new FileReader();
      
      reader.onload = (event) => {
        console.log("FILE READER LOADED");
        
        // Validate that result is a string
        const result = event.target?.result;
        if (typeof result !== 'string') {
          console.error("PASTE: FileReader result is not a string:", typeof result);
          return;
        }
        
        const imageUrl = result;
        
        // Get the center of the current viewport
        const container = document.querySelector('.react-flow') as HTMLElement;
        if (!container) {
          console.warn("PASTE: React flow container not found");
          return;
        }

        const rect = container.getBoundingClientRect();
        const screenCenterX = rect.left + rect.width / 2;
        const screenCenterY = rect.top + rect.height / 2;

        // Convert screen coordinates to flow coordinates
        const flowPosition = screenToFlowPosition({ x: screenCenterX, y: screenCenterY });

        // Create image node with safe defaults
        const newNodeId = `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const defaultWidth = 320;
        const defaultHeight = 220;

        const newNode: Node = {
          id: newNodeId,
          type: "image",
          position: { 
            x: flowPosition.x - defaultWidth / 2, 
            y: flowPosition.y - defaultHeight / 2 
          },
          data: {
            imageUrl,
            imageName: file.name || `Image ${new Date().toLocaleTimeString()}`,
            imageWidth: defaultWidth,
            imageHeight: defaultHeight,
            isEditing: true,
          },
          selected: true,
          draggable: true,
          deletable: true,
        };

        console.log("IMAGE NODE CREATED:", newNodeId);
        setNodes((currentNodes) => [...currentNodes, newNode]);
      };

      reader.onerror = (error) => {
        console.error("PASTE: FileReader error:", error);
      };

      reader.readAsDataURL(file);
    };

    window.addEventListener('paste', handlePaste);
    document.addEventListener('paste', handlePaste);
    
    return () => {
      window.removeEventListener('paste', handlePaste);
      document.removeEventListener('paste', handlePaste);
    };
  }, [setNodes, screenToFlowPosition]);

  const nodeTypes = useMemo(() => ({
    brain: memo((props: NodeProps) => <BrainNodeComponent 
      {...props} 
      onResizeStart={handleResizeStart}
      onSummaryDragStart={handleSummaryDragStart}
      onSummaryResizeStart={handleSummaryResizeStart}
    />),
    image: memo((props: NodeProps) => <ImageNodeComponent 
      {...props} 
      onResizeStart={handleImageResizeStart}
    />),
  }), [handleResizeStart, handleSummaryDragStart, handleSummaryResizeStart, handleImageResizeStart]);

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
          <>
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
          </>
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

        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            className="zoom-button zoom-button--fit"
            aria-label={language === "fr" ? "Rechercher (Ctrl+F)" : "Search (Ctrl+F)"}
            title={language === "fr" ? "Rechercher (Ctrl+F)" : "Search (Ctrl+F)"}
          >
            Ctrl + F
          </button>
        )}
      </div>

      {/* Export button with titles only - bottom right, opposite minimap */}
      <button
        type="button"
        onClick={handleExportTitleOnlyTree}
        className="export-button export-button--summary"
        aria-label={language === "fr" ? "Exporter les titres" : "Export titles"}
        title={language === "fr" ? "Copier l'arborescence avec les titres uniquement" : "Copy tree structure with titles only"}
      >
        <span className="export-button__letter">T</span>
        {copyFeedback && (
          <span className="export-button__feedback">
            {language === "fr" ? "Copié !" : "Copied!"}
          </span>
        )}
      </button>

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
          // For image nodes, pass null as BrainNode since they don't have one
          const selectedNode = flowNode?.type === "image" 
            ? null 
            : (flowNode?.data as FlowNodeData | undefined)?.node ?? null;
          onNodeClick(node.id, selectedNode);
        }}
        onEdgeClick={(_, edge) => {
          setSelectedEdgeId(edge.id);
        }}
        onPaneClick={() => {
          setSelectedEdgeId(null);
          onClearSelection();
        }}
        onPaneContextMenu={(e) => {
          // Prevent context menu on canvas to enable right-click panning
          e.preventDefault();
        }}
        nodesDraggable={isEditing}
        nodesConnectable={isEditing}
        edgesReconnectable={isEditing}
        elementsSelectable
        deleteKeyCode={isEditing ? "Delete" : null}
        // Miro-style navigation: right-click (mouse button 2) for panning
        panOnDrag={[2]}
        // Left-click drag on empty canvas creates selection rectangle
        selectionOnDrag
        fitView
        fitViewOptions={{ padding: 0.2 }}
        // Allow zooming out dramatically for an almost infinite workspace feel
        minZoom={0.01}
        maxZoom={2}
        // Extend the panning workspace to a huge area (almost infinite)
        translateExtent={[[-100000, -100000], [100000, 100000]]}
        // Allow nodes to be placed very far apart
        nodeExtent={[[-100000, -100000], [100000, 100000]]}
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
            // Image nodes get a special color in minimap
            if (n.type === "image") {
              return "#6366f1";
            }
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