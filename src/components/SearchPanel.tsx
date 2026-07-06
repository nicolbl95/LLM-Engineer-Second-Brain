import { useState, useEffect, useMemo } from "react";
import { Search, X } from "lucide-react";
import type { BrainNode } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";

type ActiveFlowNode = {
  id: string;
  hidden?: boolean;
  data?: {
    node?: BrainNode;
    brainNode?: BrainNode;
    label?: string;
    title?: BrainNode["title"];
    shortSummary?: BrainNode["shortSummary"];
    simpleExplanation?: BrainNode["simpleExplanation"];
    deepExplanation?: BrainNode["deepExplanation"];
    summary?: { fr: string; en: string };
    miniExplanation?: { fr: string; en: string };
    explanation?: { fr: string; en: string };
    [key: string]: unknown;
  };
};

interface SearchPanelProps {
  onClose: () => void;
  onNodeSelect: (nodeId: string) => void;
  activeNodes?: ActiveFlowNode[];
}

interface SearchResult {
  nodeId: string;
  title: string;
  snippet: string;
  matchType: "title" | "explanation";
}

type SearchableBrainNode = BrainNode & {
  summary?: { fr: string; en: string };
  miniExplanation?: { fr: string; en: string };
  explanation?: { fr: string; en: string };
};

function isBrainNode(value: unknown): value is BrainNode {
  if (!value || typeof value !== "object") return false;

  const possibleNode = value as Partial<BrainNode>;

  return Boolean(
    possibleNode.id &&
      possibleNode.title &&
      typeof possibleNode.title === "object" &&
      "fr" in possibleNode.title &&
      "en" in possibleNode.title,
  );
}

/**
 * Extract the real BrainNode from a React Flow node.
 *
 * Depending on how BrainGraph/App passes the active canvas nodes,
 * the node data may be stored as:
 * - data.node
 * - data.brainNode
 * - data itself
 *
 * This keeps Ctrl+F search connected to the CURRENT canvas state.
 */
function extractBrainNode(item: ActiveFlowNode): BrainNode | null {
  if (!item.data) return null;

  if (isBrainNode(item.data.node)) {
    return item.data.node;
  }

  if (isBrainNode(item.data.brainNode)) {
    return item.data.brainNode;
  }

  if (isBrainNode(item.data)) {
    return item.data;
  }

  return null;
}

function getSearchableText(node: BrainNode, language: "fr" | "en"): string {
  const extendedNode = node as SearchableBrainNode;

  return [
    node.title?.[language],
    node.shortSummary?.[language],
    node.simpleExplanation?.[language],
    node.deepExplanation?.[language],
    extendedNode.summary?.[language],
    extendedNode.miniExplanation?.[language],
    extendedNode.explanation?.[language],
  ]
    .filter(Boolean)
    .join(" ");
}

export function SearchPanel({
  onClose,
  onNodeSelect,
  activeNodes = [],
}: SearchPanelProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const { language } = useLanguage();

  /**
   * IMPORTANT:
   * Search uses ONLY active canvas nodes.
   *
   * No fallback to static graph.ts / brainNodes.
   * That prevents deleted/stale nodes from appearing in Ctrl+F results.
   */
  const nodesList = useMemo(() => {
    return activeNodes
      .filter((item) => !item.hidden)
      .map((item) => {
        const brainNode = extractBrainNode(item);

        if (!brainNode) return null;

        return {
          id: item.id,
          node: brainNode,
        };
      })
      .filter(
        (item): item is { id: string; node: BrainNode } => item !== null,
      );
  }, [activeNodes]);

  const getSnippet = (text: string, searchTerm: string): string => {
    if (!text) return "";

    const lowerText = text.toLowerCase();
    const index = lowerText.indexOf(searchTerm);

    if (index === -1) return "";

    const start = Math.max(0, index - 40);
    const end = Math.min(text.length, index + searchTerm.length + 40);

    let snippet = text.substring(start, end);

    if (start > 0) snippet = `...${snippet}`;
    if (end < text.length) snippet = `${snippet}...`;

    return snippet;
  };

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const searchTerm = query.toLowerCase().trim();
    const seenIds = new Set<string>();
    const matches: SearchResult[] = [];

    nodesList.forEach((item) => {
      const brainNode = item.node;
      const nodeId = item.id || brainNode.id;

      if (!brainNode) return;
      if (seenIds.has(nodeId)) return;

      const title = brainNode.title?.[language] || "";
      const searchableText = getSearchableText(brainNode, language);

      const titleLower = title.toLowerCase();
      const searchableLower = searchableText.toLowerCase();

      const titleMatch = titleLower.includes(searchTerm);
      const explanationMatch = searchableLower.includes(searchTerm);

      if (titleMatch) {
        seenIds.add(nodeId);

        matches.push({
          nodeId,
          title,
          snippet: getSnippet(searchableText, searchTerm),
          matchType: "title",
        });

        return;
      }

      if (explanationMatch) {
        seenIds.add(nodeId);

        matches.push({
          nodeId,
          title,
          snippet: getSnippet(searchableText, searchTerm),
          matchType: "explanation",
        });
      }
    });

    setResults(matches);
  }, [query, nodesList, language]);

  const handleResultClick = (nodeId: string) => {
    onNodeSelect(nodeId);
    onClose();
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
              aria-label={
                language === "fr" ? "Effacer la recherche" : "Clear search"
              }
            >
              <X size={14} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="search-panel__close"
          onClick={onClose}
          aria-label={
            language === "fr" ? "Fermer la recherche" : "Close search"
          }
        >
          <X size={18} />
        </button>
      </div>

      <div className="search-panel__results">
        {query && (
          <div className="search-panel__results-header">
            <span className="search-panel__results-count">
              {results.length}{" "}
              {results.length === 1
                ? language === "fr"
                  ? "résultat"
                  : "result"
                : language === "fr"
                  ? "résultats"
                  : "results"}
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
                <div className="search-panel__result-snippet">
                  {result.snippet}
                </div>
              )}

              <div className="search-panel__result-type">
                {result.matchType === "title"
                  ? language === "fr"
                    ? "Titre"
                    : "Title"
                  : language === "fr"
                    ? "Explication"
                    : "Explanation"}
              </div>
            </button>
          ))}

          {query && results.length === 0 && (
            <div className="search-panel__no-results">
              {language === "fr" ? "Aucun résultat trouvé" : "No results found"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}