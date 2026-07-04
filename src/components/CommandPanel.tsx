import { useState } from "react";
import { Trash2, BookOpen } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";

interface DefinitionResult {
  term: string;
  simpleDefinition: string;
  metaphor: string;
  whyItMatters: string;
  foundInGraph: boolean;
}

interface CommandPanelProps {
  definitionResult?: DefinitionResult | null;
  onDefine?: (term: string) => void;
  onClearDefinition?: () => void;
}

/**
 * Bottom panel - Definition only
 */
export function CommandPanel({
  definitionResult,
  onDefine,
  onClearDefinition,
}: CommandPanelProps) {
  const { language } = useLanguage();
  const [input, setInput] = useState("");

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onDefine?.(trimmed);
  };

  const handleClearDefinition = () => {
    if (onClearDefinition) {
      onClearDefinition();
      setInput("");
    }
  };

  return (
    <footer className="command-panel">
      <div className="command-panel__resize-handle" />

      <div className="command-panel__tabs">
        <button
          type="button"
          className="command-tab command-tab--active"
          aria-label={language === "fr" ? "Définition" : "Definition"}
        >
          <BookOpen size={16} />
          {language === "fr" ? "Définition" : "Definition"}
        </button>

        {onClearDefinition && definitionResult && (
          <button
            type="button"
            className="command-tab command-tab--clear"
            onClick={handleClearDefinition}
            aria-label={language === "fr" ? "Effacer l'historique des définitions" : "Clear definition history"}
            title={language === "fr" ? "Effacer l'historique des définitions" : "Clear definition history"}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="command-panel__body">
        <h3 className="command-panel__title">
          {language === "fr" ? "Définition" : "Definition"}
        </h3>

        <div className="command-panel__input-row">
          <textarea
            className="command-panel__textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              language === "fr"
                ? "Entre un terme technique (ex: embedding, RAG, fine-tuning...)"
                : "Enter a technical term (e.g.: embedding, RAG, fine-tuning...)"
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
            <BookOpen size={16} />
            {language === "fr" ? "Définir" : "Define"}
          </button>
        </div>

        {definitionResult && (
          <div className="command-panel__results command-panel__results--definition">
            <h4 className="result__heading">
              {language === "fr" ? "Définition" : "Definition"}
            </h4>

            <div className="definition-result">
              <div className="definition-section">
                <h5>
                  {language === "fr" ? "Définition simple" : "Simple definition"}
                </h5>
                <p>{definitionResult.simpleDefinition}</p>
              </div>

              <div className="definition-section">
                <h5>
                  {language === "fr" ? "Métaphore" : "Metaphor"}
                </h5>
                <p>{definitionResult.metaphor}</p>
              </div>

              <div className="definition-section">
                <h5>
                  {language === "fr" ? "Pourquoi c'est important" : "Why it matters"}
                </h5>
                <p>{definitionResult.whyItMatters}</p>
              </div>

              {definitionResult.foundInGraph && (
                <div className="definition-section definition-section--found">
                  <p>
                    {language === "fr"
                      ? "✓ Ce concept existe dans votre graphe de connaissances"
                      : "✓ This concept exists in your knowledge graph"}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}