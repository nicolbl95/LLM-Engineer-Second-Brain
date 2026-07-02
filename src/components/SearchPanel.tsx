import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { BrainNode } from "../types/brain";
import { useReactFlow } from "@xyflow/react";
import { useLanguage } from "../context/LanguageContext";

interface SearchPanelProps {
  nodes: any[];
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
  onPanToNode?: (nodeId: string) => void;
}

interface SearchResult {
  nodeId: string;
  title: string;
  snippet: string;
  matchType: "title" | "explanation";
}

export function SearchPanel({ nodes, onClose, onNodeSelect, onPanToNode }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const { language } = useLanguage();
  const { setCenter } = useReactFlow();

  const getSnippet = (text: string, searchTerm: string): string => {
    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(searchTerm);
    if (index === -1) return "";

    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + searchTerm.length + 40);
    let snippet = text.substring(start, end);

    if (start > 0) snippet = "..." + snippet;
    if (end < text.length) snippet = snippet + "...";

    return snippet;
  };

  // Search logic
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const matches: SearchResult[] = [];

    console.log("Searching for:", searchTerm, "in", nodes.length, "nodes");

    nodes.forEach((node) => {
      // Extract BrainNode from React Flow node structure
      const flowData = node.data as any;
      const brainNode = flowData?.node as BrainNode | undefined;
      
      if (!brainNode) {
        console.log("No brainNode found for node:", node.id);
        return;
      }

      const title = brainNode.title?.[language]?.toLowerCase() || "";
      const explanation = brainNode.simpleExplanation?.[language]?.toLowerCase() || "";

      console.log("Checking node:", brainNode.title, "- title:", title, "- explanation:", explanation);

      // Search in title
      if (title.includes(searchTerm)) {
        const snippet = getSnippet(brainNode.simpleExplanation?.[language] || "", searchTerm);
        matches.push({
          nodeId: brainNode.id,
          title: brainNode.title[language],
          snippet: snippet || brainNode.simpleExplanation?.[language]?.substring(0, 100) || "",
          matchType: "title",
        });
      }
      // Search in explanation
      else if (explanation.includes(searchTerm)) {
        const snippet = getSnippet(brainNode.simpleExplanation?.[language] || "", searchTerm);
        matches.push({
          nodeId: brainNode.id,
          title: brainNode.title[language],
          snippet: snippet,
          matchType: "explanation",
        });
      }
    });

    console.log("Found", matches.length, "matches");
    setResults(matches);
  }, [query, nodes, language]);

  const handleResultClick = (nodeId: string) => {
    // Find the node position and pan to it
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setCenter(node.position.x + (node.width || 180) / 2, node.position.y + (node.height || 64) / 2, {
        zoom: 1.2,
        duration: 400,
      });
    }

    // Notify parent to select the node
    onNodeSelect(nodeId);
  };

  return (
    <div className="search-panel">
      <div className="search-panel__header">
        <div className="search-panel__input-wrapper">
          <Search size={16} className="search-panel__icon" />
          <input
            type="text"
            className="search-panel__input"
            placeholder={language === "fr" ? "Rechercher..." : "Search..."}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          {query && (
            <button
              type="button"
              className="search-panel__clear"
              onClick={() => setQuery("")}
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        <button
          type="button"
          className="search-panel__close"
          onClick={onClose}
          aria-label="Close search"
        >
          <X size={18} />
        </button>
      </div>

      <div className="search-panel__results">
        {query && (
          <div className="search-panel__results-header">
            <span className="search-panel__results-count">
              {results.length} {results.length === 1 
                ? (language === "fr" ? "résultat" : "result") 
                : (language === "fr" ? "résultats" : "results")}
            </span>
          </div>
        )}

        <div className="search-panel__results-list">
          {results.map((result) => (
            <button
              key={result.nodeId}
              type="button"
              className="search-panel__result-item"
              onClick={() => handleResultClick(result.nodeId)}
            >
              <div className="search-panel__result-title">{result.title}</div>
              {result.snippet && (
                <div className="search-panel__result-snippet">{result.snippet}</div>
              )}
              <div className="search-panel__result-type">
                {result.matchType === "title" 
                  ? (language === "fr" ? "Titre" : "Title")
                  : (language === "fr" ? "Explication" : "Explanation")}
              </div>
            </button>
          ))}

          {query && results.length === 0 && (
            <div className="search-panel__no-results">
              {language === "fr" 
                ? "Aucun résultat trouvé" 
                : "No results found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}