import { useCallback, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { BrainGraph } from "./components/BrainGraph";
import { ConceptDrawer } from "./components/ConceptDrawer";
import { CommandPanel } from "./components/CommandPanel";
import { SearchPanel } from "./components/SearchPanel";
import type { BrainNode, PillarId } from "./types/brain";
import { getNodeById } from "./utils/graphHelpers";
import { generateDefinition } from "./utils/definitions";
import { useHistory } from "./hooks/useHistory";
import "./styles.css";

type CanvasState = {
  nodes: any[];
  edges: any[];
};

/** Main app layout — graph, drawer, definition panel. */
function AppContent() {
  const { language, setLanguage } = useLanguage();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [activePillar] = useState<PillarId | "all">("all");

  const [definitionResult, setDefinitionResult] = useState<{
    term: string;
    simpleDefinition: string;
    metaphor: string;
    whyItMatters: string;
    foundInGraph: boolean;
  } | null>(null);

  const [updatedNode, setUpdatedNode] = useState<BrainNode | null>(null);
  const [deletedNodeId, setDeletedNodeId] = useState<string | null>(null);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);

  /**
   * History state is used when undo/redo restores a previous canvas.
   * Active canvas state is used by live features like Ctrl+F search.
   */
  const [historyState, setHistoryState] = useState<CanvasState>({
    nodes: [],
    edges: [],
  });

  const [activeCanvasState, setActiveCanvasState] = useState<CanvasState>({
    nodes: [],
    edges: [],
  });

  const { undo, redo, canUndo, canRedo, pushState } = useHistory({
    maxHistory: 50,
    onStateChange: (state) => {
      setHistoryState(state);
      setActiveCanvasState(state);

      // Trigger a re-render of BrainGraph with the restored state.
      setUpdatedNode(null);
      setDeletedNodeId("__restore__");
      setTimeout(() => setDeletedNodeId(null), 0);
    },
  });

  const handleCanvasStateChange = useCallback((state: { nodes: any[]; edges: any[] }) => {
    setActiveCanvasState(state);
    pushState(state);
  }, [pushState]);

  const getActiveNodeById = useCallback(
    (nodeId: string): BrainNode | null => {
      const activeNode = activeCanvasState.nodes.find((node) => node.id === nodeId);
      const nodeData = activeNode?.data?.node;

      return nodeData ?? getNodeById(nodeId) ?? null;
    },
    [activeCanvasState.nodes],
  );

  /**
   * When language changes while the drawer is open, refresh selectedNode
   * from the active canvas state, which already has merged English fields
   * from the BrainGraph useEffect.
   */
  useEffect(() => {
    if (!selectedNodeId) return;

    const activeNode = activeCanvasState.nodes.find(
      (n) => n.id === selectedNodeId,
    );
    const nodeData = activeNode?.data?.node as BrainNode | undefined;
    if (nodeData) {
      setSelectedNode(nodeData);
    }
  }, [language, selectedNodeId, activeCanvasState]);

  const handleNodeUpdate = useCallback((node: BrainNode) => {
    setSelectedNode(node);
    setSelectedNodeId(node.id);
    setHighlightedNodeIds([node.id]);
    setUpdatedNode(node);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setSelectedNodeId(null);
    setSelectedNode(null);
    setHighlightedNodeIds([]);
    setDeletedNodeId(nodeId);

    setActiveCanvasState((prev) => ({
      nodes: prev.nodes.filter((node) => node.id !== nodeId),
      edges: prev.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId,
      ),
    }));
  }, []);

  /** Select a node, open drawer, optionally highlight related nodes. */
  const selectNode = useCallback(
    (nodeId: string, highlight = true, nodeData?: BrainNode | null) => {
      setSelectedNodeId(nodeId);

      const node = nodeData ?? getActiveNodeById(nodeId);
      setSelectedNode(node);

      if (node && highlight) {
        const related = node.relatedConcepts ?? [];
        setHighlightedNodeIds([nodeId, ...related]);
      }
    },
    [getActiveNodeById],
  );

  const handleDefine = useCallback(
    (term: string) => {
      const result = generateDefinition(term, language);
      setDefinitionResult(result);
    },
    [language],
  );

  const clearDefinitionHistory = useCallback(() => {
    setDefinitionResult(null);
  }, []);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  const handleOpenSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  // Global keyboard shortcut for search.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }

      if (e.key === "Escape" && isSearchOpen) {
        setIsSearchOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSearchOpen]);

  return (
    <div className="app">
      <div className="app__floating-toolbar">
        <button
          type="button"
          className="history-button"
          onClick={handleUndo}
          disabled={!canUndo}
          aria-label={language === "fr" ? "Retour en arrière" : "Undo"}
          title={language === "fr" ? "Retour en arrière (Ctrl+Z)" : "Undo (Ctrl+Z)"}
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 14L4 9L9 4" />
            <path d="M4 9H16.5C18.99 9 21 11.01 21 13.5V13.5C21 15.99 18.99 18 16.5 18H15" />
          </svg>
        </button>

        <button
          type="button"
          className="history-button"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label={language === "fr" ? "Retour en avant" : "Redo"}
          title={
            language === "fr"
              ? "Retour en avant (Ctrl+Shift+Z)"
              : "Redo (Ctrl+Shift+Z)"
          }
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M15 14L20 9L15 4" />
            <path d="M20 9H7.5C5.01 9 3 11.01 3 13.5V13.5C3 15.99 5.01 18 7.5 18H9" />
          </svg>
        </button>

        <div className="lang-switcher">
          <button
            type="button"
            className={`lang-switcher__btn ${
              language === "fr" ? "lang-switcher__btn--active" : ""
            }`}
            onClick={() => setLanguage("fr")}
          >
            FR
          </button>

          <button
            type="button"
            className={`lang-switcher__btn ${
              language === "en" ? "lang-switcher__btn--active" : ""
            }`}
            onClick={() => setLanguage("en")}
          >
            EN
          </button>
        </div>
      </div>

      <main className="app__main">
        <ReactFlowProvider>
          <BrainGraph
            selectedNodeId={selectedNodeId}
            highlightedNodeIds={highlightedNodeIds}
            activePillar={activePillar}
            onNodeClick={(id, nodeData) => {
              setSelectedNodeId(id);

              const node = nodeData ?? getActiveNodeById(id);
              setSelectedNode(node);
              setHighlightedNodeIds([id]);
            }}
            onClearSelection={() => {
              setSelectedNodeId(null);
              setSelectedNode(null);
              setHighlightedNodeIds([]);
            }}
            updatedNode={updatedNode}
            deletedNodeId={deletedNodeId}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
            onHistoryStateChange={handleCanvasStateChange}
            restoreHistoryState={historyState}
            focusNodeId={focusNodeId}
            onOpenSearch={handleOpenSearch}
          />

          {isSearchOpen && (
            <SearchPanel
              onClose={() => setIsSearchOpen(false)}
              onNodeSelect={(nodeId) => {
                const node = getActiveNodeById(nodeId);

                setSelectedNodeId(nodeId);
                setSelectedNode(node);
                setHighlightedNodeIds([nodeId]);
                setIsSearchOpen(false);

                setFocusNodeId(nodeId);
                setTimeout(() => setFocusNodeId(null), 700);
              }}
              activeNodes={activeCanvasState.nodes}
            />
          )}
        </ReactFlowProvider>

        <ConceptDrawer
          node={selectedNode}
          onClose={() => {
            setSelectedNodeId(null);
            setSelectedNode(null);
            setHighlightedNodeIds([]);
          }}
          onRelatedClick={(id) => selectNode(id)}
          onSave={handleNodeUpdate}
        />
      </main>

      <CommandPanel
        definitionResult={definitionResult}
        onDefine={handleDefine}
        onClearDefinition={clearDefinitionHistory}
      />
    </div>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}