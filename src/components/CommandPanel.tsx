import { useState } from "react";
import { Brain, Send } from "lucide-react";
import type {
  ProjectAnalysis,
  SearchResult,
} from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui } from "../data/uiStrings";
import { NodeCard } from "./NodeCard";

export type CommandMode = "askBrain";

interface CommandPanelProps {
  mode?: CommandMode;
  onModeChange?: (mode: CommandMode) => void;
  searchResult: SearchResult | null;
  projectAnalysis?: ProjectAnalysis | null;
  onAskBrain: (query: string) => void;
  onBuildProject?: (description: string) => void;
  onNodeSelect: (nodeId: string) => void;
}

/**
 * Bottom panel.
 *
 * This panel is now simplified:
 * - no Add Knowledge mode
 * - no Build Project mode
 * - only Ask Brain / Demander mode
 */
export function CommandPanel({
  searchResult,
  onAskBrain,
  onNodeSelect,
}: CommandPanelProps) {
  const { language, t } = useLanguage();
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    onAskBrain(trimmed);
  };

  const resultTitle =
    searchResult?.type === "full"
      ? ui("knowledgeFound", language)
      : searchResult?.type === "partial"
        ? ui("partialKnowledge", language)
        : searchResult?.type === "none"
          ? ui("noKnowledge", language)
          : null;

  return (
    <footer className="command-panel">
      <div className="command-panel__resize-handle" />

      <div className="command-panel__tabs">
        <button
          type="button"
          className="command-tab command-tab--active"
          aria-label={language === "fr" ? "Demander au cerveau" : "Ask the brain"}
        >
          <Brain size={16} />
          {language === "fr" ? "Demander" : "Ask"}
        </button>
      </div>

      <div className="command-panel__body">
        <h3 className="command-panel__title">
          {language === "fr" ? "Demander au cerveau" : "Ask the Brain"}
        </h3>

        <div className="command-panel__input-row">
          <textarea
            className="command-panel__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === "fr"
                ? "Pose une question ou colle des concepts à analyser dans ton second cerveau."
                : "Ask a question or paste concepts to analyze in your second brain."
            }
            rows={2}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
          />

          <button
            type="button"
            className="command-panel__submit"
            onClick={handleSubmit}
            disabled={!input.trim()}
          >
            <Send size={16} />
            {language === "fr" ? "Demander" : "Ask"}
          </button>
        </div>

        {searchResult && searchResult.query && (
          <div className={`command-panel__results result--${searchResult.type}`}>
            {resultTitle && (
              <h4 className="result__heading">{resultTitle}</h4>
            )}

            <p className="result__summary">{t(searchResult.summary)}</p>

            {searchResult.mentionDetails && (
              <p className="result__detail">
                {t(searchResult.mentionDetails)}
              </p>
            )}

            {searchResult.bestMatch && (
              <div className="result__section">
                <h5>{ui("mainMatch", language)}</h5>
                <NodeCard
                  node={searchResult.bestMatch}
                  onClick={() => onNodeSelect(searchResult.bestMatch!.id)}
                />
              </div>
            )}

            {searchResult.relatedNodes.length > 0 && (
              <div className="result__section">
                <h5>{ui("relatedNodes", language)}</h5>
                <div className="result__cards">
                  {searchResult.relatedNodes.map((n) => (
                    <NodeCard
                      key={n.id}
                      node={n}
                      compact
                      onClick={() => onNodeSelect(n.id)}
                    />
                  ))}
                </div>
              </div>
            )}

            {searchResult.type === "none" && (
              <p className="result__suggest">
                {ui("suggestAddKnowledge", language)}
              </p>
            )}

            {searchResult.suggestions.length > 0 && (
              <div className="result__section">
                <h5>{ui("similarTerms", language)}</h5>
                <div className="similar-terms">
                  {searchResult.suggestions.map((s) => (
                    <span key={s} className="similar-terms__chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </footer>
  );
}