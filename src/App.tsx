import { useCallback, useState } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { LanguageProvider } from "./context/LanguageContext";
import { TopBar } from "./components/TopBar";
import { BrainGraph } from "./components/BrainGraph";
import { ConceptDrawer } from "./components/ConceptDrawer";
import { CommandPanel, type CommandMode } from "./components/CommandPanel";
import type { BrainNode, PillarId, ProjectAnalysis, SearchResult } from "./types/brain";
import { getNodeById } from "./utils/graphHelpers";
import { searchBrain } from "./utils/search";
import { analyzeProject } from "./utils/graphHelpers";
import { useLanguage } from "./context/LanguageContext";
import "./styles.css";

/** Main app layout — graph, drawer, command panel. */
function AppContent() {
  const { language } = useLanguage();

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<BrainNode | null>(null);
  const [highlightedNodeIds, setHighlightedNodeIds] = useState<string[]>([]);
  const [activePillar, setActivePillar] = useState<PillarId | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [commandMode, setCommandMode] = useState<CommandMode>("askBrain");
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [projectAnalysis, setProjectAnalysis] =
    useState<ProjectAnalysis | null>(null);
  const [focusNodeId, setFocusNodeId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(true);
  const [updatedNode, setUpdatedNode] = useState<BrainNode | null>(null);
  const [deletedNodeId, setDeletedNodeId] = useState<string | null>(null);

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
    setFocusNodeId(null);
    setDeletedNodeId(nodeId);
  }, []);

  /** Select a node, open drawer, optionally highlight related nodes. */
  const selectNode = useCallback(
    (nodeId: string, highlight = true, nodeData?: BrainNode | null) => {
      setSelectedNodeId(nodeId);
      setFocusNodeId(nodeId);
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

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) runSearch(searchQuery.trim());
  };

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

  return (
    <div className="app">
      <TopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onSearchSubmit={handleSearchSubmit}
        activePillar={activePillar}
        onPillarChange={setActivePillar}
        isReadOnly={isReadOnly}
        onModeChange={setIsReadOnly}
      />

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
            focusNodeId={focusNodeId}
            onFocusComplete={() => setFocusNodeId(null)}
            isReadOnly={isReadOnly}
            updatedNode={updatedNode}
            deletedNodeId={deletedNodeId}
            onNodeUpdate={handleNodeUpdate}
            onNodeDelete={handleNodeDelete}
          />
        </ReactFlowProvider>

        <ConceptDrawer
          node={selectedNode}
          isReadOnly={isReadOnly}
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
