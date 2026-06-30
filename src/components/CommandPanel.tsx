import { useState, useEffect } from "react";
import { BookPlus, Brain, Hammer, Send } from "lucide-react";
import type {
  ProjectAnalysis,
  SavedNote,
  SearchResult,
} from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui, uiStrings } from "../data/uiStrings";
import { NodeCard } from "./NodeCard";
import { pick } from "../utils/i18n";

export type CommandMode = "addKnowledge" | "askBrain" | "buildProject";

interface CommandPanelProps {
  mode: CommandMode;
  onModeChange: (mode: CommandMode) => void;
  searchResult: SearchResult | null;
  projectAnalysis: ProjectAnalysis | null;
  onAskBrain: (query: string) => void;
  onBuildProject: (description: string) => void;
  onNodeSelect: (nodeId: string) => void;
}

const NOTES_KEY = "brain-notes";

function loadNotes(): SavedNote[] {
  try {
    const raw = localStorage.getItem(NOTES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/** Bottom panel: Add Knowledge, Ask Brain, Build Project. */
export function CommandPanel({
  mode,
  onModeChange,
  searchResult,
  projectAnalysis,
  onAskBrain,
  onBuildProject,
  onNodeSelect,
}: CommandPanelProps) {
  const { language, t } = useLanguage();
  const [input, setInput] = useState("");
  const [notes, setNotes] = useState<SavedNote[]>(loadNotes);

  useEffect(() => {
    localStorage.setItem(NOTES_KEY, JSON.stringify(notes));
  }, [notes]);

  const getModeLabel = (m: CommandMode) => {
    return uiStrings.commandModes[m][language];
  };

  const handleSubmit = () => {
    if (!input.trim()) return;
    if (mode === "addKnowledge") {
      const note: SavedNote = {
        id: crypto.randomUUID(),
        text: input.trim(),
        createdAt: new Date().toISOString(),
      };
      setNotes((prev) => [note, ...prev]);
      setInput("");
    } else if (mode === "askBrain") {
      onAskBrain(input.trim());
    } else {
      onBuildProject(input.trim());
    }
  };

  const placeholder =
    mode === "addKnowledge"
      ? ui("addKnowledgePlaceholder", language)
      : mode === "askBrain"
        ? ui("askBrainPlaceholder", language)
        : ui("buildProjectPlaceholder", language);

  const title =
    mode === "addKnowledge"
      ? ui("addKnowledgeTitle", language)
      : mode === "askBrain"
        ? ui("askBrainTitle", language)
        : ui("buildProjectTitle", language);

  const submitLabel =
    mode === "addKnowledge"
      ? ui("saveNote", language)
      : mode === "askBrain"
        ? ui("askBrainSubmit", language)
        : ui("buildProjectSubmit", language);

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
      <div className="command-panel__tabs">
        {(
          [
            { id: "addKnowledge" as const, icon: BookPlus },
            { id: "askBrain" as const, icon: Brain },
            { id: "buildProject" as const, icon: Hammer },
          ] as const
        ).map(({ id, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`command-tab ${mode === id ? "command-tab--active" : ""}`}
            onClick={() => onModeChange(id)}
          >
            <Icon size={16} />
            {getModeLabel(id)}
          </button>
        ))}
      </div>

      <div className="command-panel__body">
        <h3 className="command-panel__title">{title}</h3>

        <div className="command-panel__input-row">
          <textarea
            className="command-panel__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={placeholder}
            rows={mode === "addKnowledge" ? 4 : 2}
          />
          <button
            type="button"
            className="command-panel__submit"
            onClick={handleSubmit}
            disabled={!input.trim()}
          >
            <Send size={16} />
            {submitLabel}
          </button>
        </div>

        {mode === "addKnowledge" && (
          <div className="command-panel__results">
            <p className="command-panel__hint">
              {ui("addKnowledgeFuture", language)}
            </p>
            <h4>{ui("savedNotes", language)}</h4>
            {notes.length === 0 ? (
              <p className="command-panel__empty">
                {ui("noNotesYet", language)}
              </p>
            ) : (
              <ul className="notes-list">
                {notes.map((note) => (
                  <li key={note.id} className="notes-list__item">
                    <time>
                      {new Date(note.createdAt).toLocaleString(language)}
                    </time>
                    <p>{note.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {mode === "askBrain" && searchResult && searchResult.query && (
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

        {mode === "buildProject" && projectAnalysis && (
          <div className="command-panel__results">
            <div className="result__section">
              <h5>{ui("projectType", language)}</h5>
              <p className="result__highlight">
                {t(projectAnalysis.projectType)}
              </p>
            </div>

            {projectAnalysis.relevantNodes.length > 0 && (
              <div className="result__section">
                <h5>{ui("relevantConcepts", language)}</h5>
                <div className="result__cards">
                  {projectAnalysis.relevantNodes.map((n) => (
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

            {projectAnalysis.missingConcepts.length > 0 && (
              <div className="result__section">
                <h5>{ui("missingConcepts", language)}</h5>
                <ul className="drawer__list">
                  {projectAnalysis.missingConcepts.map((c) => (
                    <li key={c.fr}>{pick(c, language)}</li>
                  ))}
                </ul>
              </div>
            )}

            {projectAnalysis.learningPath.length > 0 && (
              <div className="result__section">
                <h5>{ui("learningPath", language)}</h5>
                <ol className="learning-path">
                  {projectAnalysis.learningPath.map((n, i) => (
                    <li key={n.id}>
                      <button
                        type="button"
                        className="learning-path__link"
                        onClick={() => onNodeSelect(n.id)}
                      >
                        {i + 1}. {t(n.title)}
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            <div className="result__section">
              <h5>{ui("roadmap", language)}</h5>
              <ul className="drawer__list">
                {projectAnalysis.roadmap.map((step) => (
                  <li key={step.fr}>{t(step)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}
