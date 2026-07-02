import { useCallback, useEffect, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { BrainGraph } from "./components/BrainGraph";
import { ConceptDrawer } from "./components/ConceptDrawer";
import { CommandPanel, type CommandMode } from "./components/CommandPanel";
import { SearchPanel } from "./components/SearchPanel";
import type { BrainNode, PillarId, ProjectAnalysis, SearchResult } from "./types/brain";
import { getNodeById } from "./utils/graphHelpers";
import { searchBrain } from "./utils/search";
import { analyzeProject } from "./utils/graphHelpers";
import { useHistory, type HistoryState } from "./hooks/useHistory";
import "./styles.css";

/** Main app layout — graph, drawer, command panel. */
function AppContent() {
  const { language, setLanguage } = useLanguage();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [activePillar] = useState<PillarId | "all">("all");
  const [commandMode, setCommandMode] = useState<CommandMode>("askBrain");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [projectAnalysis, setProjectAnalysis] =
    useState<ProjectAnalysis | null>(null);
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

  /** Run search from top bar — opens Ask Brain results and best match. */
  const runSearch = useCallback(
    (query: string) => {
      const result = searchBrain(query, language);
      setSearchResult(result);
      setCommandMode("askBrain");

      const ids = result.matches.map((n) => n.id);
      if (result.bestMatch) {
        selectNode(result.bestMatch.id, false);
        setHighlightedNodeIds(ids.length > 0 ? ids : [result.bestMatch.id]);
      } else {
        setHighlightedNodeIds(ids);
      }
    },
    [language, selectNode],
  );

  const handleAskBrain = (query: string) => {
    runSearch(query);
  };

  const handleBuildProject = (description: string) => {
    const analysis = analyzeProject(description, language);
    setProjectAnalysis(analysis);
    const ids = analysis.relevantNodes.map((n) => n.id);
    setHighlightedNodeIds(ids);
    if (analysis.relevantNodes[0]) {
      selectNode(analysis.relevantNodes[0].id, true, analysis.relevantNodes[0]);
    }
  };

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
            <path d="M3 7v6h6"></path>
            <path d="M21 17a9.9 9.9 0 0 0-9.3-15.3 9.9 9.9 0 0 0-9.3 15.3"></path>
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
            <path d="M21 7v6h-6"></path>
            <path d="M3 17a9.9 9.9 0 0 1 9.3-15.3 9.9 9.9 0 0 1 9.3 15.3"></path>
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
              selectNode(id, true, nodeData);
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
            onNodesUpdate={(nodes) => {
              // Update search panel with latest nodes
              if (isSearchOpen) {
                // Force re-render of search panel by updating a dummy state
                setHistoryState(prev => ({ ...prev, nodes }));
              }
            }}
            restoreHistoryState={historyState}
          />
        </ReactFlowProvider>
        {isSearchOpen && (
          <SearchPanel
            nodes={historyState.nodes || []}
            onClose={() => setIsSearchOpen(false)}
            onNodeSelect={(nodeId) => {
              selectNode(nodeId);
              setIsSearchOpen(false);
            }}
          />
        )}

        <ConceptDrawer
          node={selectedNode}
          onClose={() => {
            setSelectedNodeId(null);
            setSelectedNode(null);
            setHighlightedNodeIds([]);
          }}
          onRelatedClick={(id) => selectNode(id)}
          onSave={handleNodeUpdate}
          onDelete={handleNodeDelete}
        />
      </main>

      <CommandPanel
        mode={commandMode}
        onModeChange={setCommandMode}
        searchResult={searchResult}
        projectAnalysis={projectAnalysis}
        onAskBrain={handleAskBrain}
        onBuildProject={handleBuildProject}
        onNodeSelect={(id) => selectNode(id)}
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
