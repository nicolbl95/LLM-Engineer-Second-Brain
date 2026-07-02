import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { BrainNode } from "../types/brain";
import { brainNodes } from "../data/graph";
import { useLanguage } from "../context/LanguageContext";

interface SearchPanelProps {
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
}

interface SearchResult {
  nodeId: string;
  title: string;
  snippet: string;
  matchType: "title" | "explanation";
}

export function SearchPanel({ onClose, onNodeSelect }: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const { language } = useLanguage();

  // Build nodes list from static data
  const nodesList = useMemo(() => {
    return brainNodes.map((n) => ({
      id: n.id,
      node: n,
    }));
  }, []);

  const getSnippet = (text: string, searchTerm: string): string => {
    if (!text) return "";
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
    const seenIds = new Set<string>();
    const matches: SearchResult[] = [];

    nodesList.forEach((item) => {
      const brainNode = item.node as BrainNode;
      if (!brainNode) return;

      // Prevent duplicate node entries
      if (seenIds.has(brainNode.id)) return;

      const title = brainNode.title?.[language] || "";
      const explanation = brainNode.simpleExplanation?.[language] || "";

      const titleLower = title.toLowerCase();
      const explanationLower = explanation.toLowerCase();

      // Strict search: the search term must literally appear in title or explanation
      const titleMatch = titleLower.includes(searchTerm);
      const explanationMatch = explanationLower.includes(searchTerm);

      if (titleMatch) {
        seenIds.add(brainNode.id);
        // Only show snippet if the search term also appears in the explanation
        const snippet = getSnippet(explanation, searchTerm);
        matches.push({
          nodeId: brainNode.id,
          title: title,
          snippet: snippet || "",
          matchType: "title",
        });
      } else if (explanationMatch) {
        seenIds.add(brainNode.id);
        const snippet = getSnippet(explanation, searchTerm);
        matches.push({
          nodeId: brainNode.id,
          title: title,
          snippet: snippet,
          matchType: "explanation",
        });
      }
    });

    setResults(matches);
  }, [query, nodesList, language]);

  const handleResultClick = (nodeId: string) => {
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