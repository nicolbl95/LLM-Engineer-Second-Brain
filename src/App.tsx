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

  // History state for undo/redo
  const [historyState, setHistoryState] = useState<{ nodes: any[]; edges: any[] }>({ nodes: [], edges: [] });
  
  const { undo, redo, canUndo, canRedo, pushState } = useHistory({
    maxHistory: 50,
    onStateChange: (state) => {
      setHistoryState(state);
      // Trigger a re-render of BrainGraph with the restored state
      setUpdatedNode(null);
      setDeletedNodeId("__restore__");
      setTimeout(() => setDeletedNodeId(null), 0);
    },
  });

  const handleNodeUpdate = useCallback((updatedNode: BrainNode) => {
    setSelectedNode(updatedNode);
    setSelectedNodeId(updatedNode.id);
    setHighlightedNodeIds([updatedNode.id]);
    setUpdatedNode(updatedNode);
  }, []);

  const handleNodeDelete = useCallback((nodeId: string) => {
    setSelectedNodeId(null);
    setSelectedNode(null);
    setHighlightedNodeIds([]);
    setDeletedNodeId(nodeId);
  }, []);

  /** Select a node, open drawer, optionally highlight related nodes. */
  const selectNode = useCallback(
    (nodeId: string, highlight = true, nodeData?: BrainNode | null) => {
      setSelectedNodeId(nodeId);
      const node = nodeData ?? getNodeById(nodeId) ?? null;
      setSelectedNode(node);
      if (node && highlight) {
        const related = node.relatedConcepts ?? [];
        setHighlightedNodeIds([nodeId, ...related]);
      }
    },
    [],
  );

  const handleDefine = useCallback((term: string) => {
    const result = generateDefinition(term, language);
    setDefinitionResult(result);
  }, [language]);

  const clearDefinitionHistory = useCallback(() => {
    setDefinitionResult(null);
  }, []);

  const handleUndo = useCallback(() => {
    undo();
  }, [undo]);

  const handleRedo = useCallback(() => {
    redo();
  }, [redo]);

  // Global keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modKey = isMac ? e.metaKey : e.ctrlKey;

      if (modKey && e.key === "f") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }

      // Escape to close search
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
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 14L4 9L9 4"></path>
            <path d="M4 9H16.5C18.99 9 21 11.01 21 13.5V13.5C21 15.99 18.99 18 16.5 18H15"></path>
          </svg>
        </button>
        <button
          type="button"
          className="history-button"
          onClick={handleRedo}
          disabled={!canRedo}
          aria-label={language === "fr" ? "Retour en avant" : "Redo"}
          title={language === "fr" ? "Retour en avant (Ctrl+Shift+Z)" : "Redo (Ctrl+Shift+Z)"}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 14L20 9L15 4"></path>
            <path d="M20 9H7.5C5.01 9 3 11.01 3 13.5V13.5C3 15.99 5.01 18 7.5 18H9"></path>
          </svg>
        </button>
        <div className="lang-switcher">
          <button
            type="button"
            className={`lang-switcher__btn ${language === "fr" ? "lang-switcher__btn--active" : ""}`}
            onClick={() => setLanguage("fr")}
          >
            FR
          </button>
          <button
            type="button"
            className={`lang-switcher__btn ${language === "en" ? "lang-switcher__btn--active" : ""}`}
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
              const node = nodeData ?? getNodeById(id) ?? null;
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
            onHistoryStateChange={(state) => pushState(state)}
            restoreHistoryState={historyState}
          />
          {isSearchOpen && (
            <SearchPanel
              onClose={() => setIsSearchOpen(false)}
              onNodeSelect={(nodeId) => {
                // Select only this node, don't highlight related nodes
                setSelectedNodeId(nodeId);
                const node = getNodeById(nodeId) ?? null;
                setSelectedNode(node);
                setHighlightedNodeIds([nodeId]);
                setIsSearchOpen(false);
              }}
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