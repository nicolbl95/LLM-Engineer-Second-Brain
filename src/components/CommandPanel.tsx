import { useState, useEffect } from "react";
import { Trash2, BookOpen, Plus, Database, Clipboard } from "lucide-react";
import { useLanguage } from "../context/LanguageContext";
import type { CustomDefinition } from "../types/brain";
import {
  addCustomDefinition,
  loadCustomDefinitions,
} from "../utils/customDefinitions";

interface DefinitionResult {
  term: string;
  simpleDefinition: string;
  metaphor: string;
  whyItMatters: string;
  foundInGraph: boolean;
  notFound?: boolean;
  suggestions?: string[];
}

interface CommandPanelProps {
  definitionResult?: DefinitionResult | null;
  onDefine?: (term: string) => void;
  onClearDefinition?: () => void;
}

type DefinitionTab = "define" | "add" | "saved";

/**
 * Bottom panel - Definition and custom definition management.
 */
export function CommandPanel({
  definitionResult,
  onDefine,
  onClearDefinition,
}: CommandPanelProps) {
  const { language } = useLanguage();

  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<DefinitionTab>("define");

  const [formTerm, setFormTerm] = useState("");
  const [formDefinition, setFormDefinition] = useState("");
  const [formMetaphor, setFormMetaphor] = useState("");
  const [formWhyItMatters, setFormWhyItMatters] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedDefinitions, setSavedDefinitions] = useState<CustomDefinition[]>(
    [],
  );
  const [copySuccess, setCopySuccess] = useState(false);

  useEffect(() => {
    setSavedDefinitions(loadCustomDefinitions());
  }, [saveSuccess]);

  const handleSubmit = () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    onDefine?.(trimmed);
  };

  const handleClearDefinition = () => {
    onClearDefinition?.();
    setInput("");
  };

  const handleSaveCustomDefinition = () => {
    const trimmedTerm = formTerm.trim();
    if (!trimmedTerm) return;

    addCustomDefinition({
      term: trimmedTerm,
      definition: {
        fr: language === "fr" ? formDefinition : "",
        en: language === "en" ? formDefinition : "",
      },
      metaphor: {
        fr: language === "fr" ? formMetaphor : "",
        en: language === "en" ? formMetaphor : "",
      },
      whyItMatters: {
        fr: language === "fr" ? formWhyItMatters : "",
        en: language === "en" ? formWhyItMatters : "",
      },
    });

    setFormTerm("");
    setFormDefinition("");
    setFormMetaphor("");
    setFormWhyItMatters("");
    setSavedDefinitions(loadCustomDefinitions());
    setSaveSuccess(true);

    window.setTimeout(() => setSaveSuccess(false), 3000);
  };

  const openSavedDefinition = (term: string) => {
    setActiveTab("define");
    setInput(term);
    onDefine?.(term);
  };

  const copyAllDefinitions = async () => {
    if (savedDefinitions.length === 0) {
      const message = language === "fr" ? "Aucune définition à copier." : "No definitions to copy.";
      alert(message);
      return;
    }

    const isFr = language === "fr";
    const placeholder = isFr ? "Non renseigné." : "Not provided.";
    const separator = "---";

    const text = savedDefinitions
      .map((def) => {
        const termLabel = isFr ? "Mot ou expression" : "Word or expression";
        const defLabel = isFr ? "Définition simple" : "Simple definition";
        const metaphorLabel = isFr ? "Métaphore" : "Metaphor";
        const whyLabel = isFr ? "Pourquoi c'est important" : "Why it matters";

        const definition = def.definition[language] || placeholder;
        const metaphor = def.metaphor[language] || placeholder;
        const whyItMatters = def.whyItMatters[language] || placeholder;

        return `${termLabel} : ${def.term}

${defLabel} :
${definition}

${metaphorLabel} :
${metaphor}

${whyLabel} :
${whyItMatters}`;
      })
      .join(`\n${separator}\n\n`);

    try {
      await navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <footer className="command-panel">
      <div className="command-panel__resize-handle" />

      <div className="command-panel__tabs">
        <button
          type="button"
          className={`command-tab ${
            activeTab === "define" ? "command-tab--active" : ""
          }`}
          onClick={() => setActiveTab("define")}
          aria-label={language === "fr" ? "Définition" : "Definition"}
        >
          <BookOpen size={16} />
          {language === "fr" ? "Définition" : "Definition"}
        </button>

        <button
          type="button"
          className={`command-tab ${
            activeTab === "add" ? "command-tab--active" : ""
          }`}
          onClick={() => setActiveTab("add")}
          aria-label={
            language === "fr" ? "Ajouter une définition" : "Add definition"
          }
        >
          <Plus size={16} />
          {language === "fr" ? "Ajouter une définition" : "Add definition"}
        </button>

        <button
          type="button"
          className={`command-tab ${
            activeTab === "saved" ? "command-tab--active" : ""
          }`}
          onClick={() => setActiveTab("saved")}
          aria-label={
            language === "fr"
              ? `Définitions enregistrées (${savedDefinitions.length})`
              : `Saved definitions (${savedDefinitions.length})`
          }
        >
          <Database size={16} />
          {language === "fr" ? "Définitions enregistrées" : "Saved definitions"}
          <span className="saved-count">{savedDefinitions.length}</span>
        </button>

        {activeTab === "define" && onClearDefinition && definitionResult && (
          <button
            type="button"
            className="command-tab command-tab--clear"
            onClick={handleClearDefinition}
            aria-label={
              language === "fr"
                ? "Effacer l'historique des définitions"
                : "Clear definition history"
            }
            title={
              language === "fr"
                ? "Effacer l'historique des définitions"
                : "Clear definition history"
            }
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="command-panel__body">
        {activeTab === "define" && (
          <>
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
                  if (e.key === "Enter" && !e.shiftKey) {
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
                {definitionResult.notFound ? (
                  <div className="definition-not-found">
                    <p className="definition-not-found__message">
                      {language === "fr"
                        ? "Ce mot ou cette expression n'est pas encore défini."
                        : "This word or expression is not defined yet."}
                    </p>

                    {definitionResult.suggestions &&
                      definitionResult.suggestions.length > 0 && (
                        <div className="definition-suggestions">
                          <span className="definition-suggestions__label">
                            {language === "fr"
                              ? "Suggestions proches :"
                              : "Close suggestions:"}
                          </span>

                          <div className="definition-suggestions__list">
                            {definitionResult.suggestions.map((suggestion) => (
                              <button
                                key={suggestion}
                                type="button"
                                className="definition-suggestion-chip"
                                onClick={() => openSavedDefinition(suggestion)}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="definition-result">
                    <div className="definition-section">
                      <h5>
                        {language === "fr"
                          ? "Définition simple"
                          : "Simple definition"}
                      </h5>
                      <p>{definitionResult.simpleDefinition}</p>
                    </div>

                    <div className="definition-section">
                      <h5>{language === "fr" ? "Métaphore" : "Metaphor"}</h5>
                      <p>{definitionResult.metaphor}</p>
                    </div>

                    <div className="definition-section">
                      <h5>
                        {language === "fr"
                          ? "Pourquoi c'est important"
                          : "Why it matters"}
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
                )}
              </div>
            )}
          </>
        )}

        {activeTab === "add" && (
          <>
            <h3 className="command-panel__title">
              {language === "fr" ? "Ajouter une définition" : "Add definition"}
            </h3>

            {saveSuccess && (
              <div className="command-panel__success-message">
                {language === "fr"
                  ? "✓ Définition enregistrée avec succès !"
                  : "✓ Definition saved successfully!"}
              </div>
            )}

            <div className="command-panel__form">
              <div className="form-group">
                <label htmlFor="form-term">
                  {language === "fr" ? "Mot ou expression" : "Word or expression"}
                </label>
                <input
                  id="form-term"
                  type="text"
                  className="command-panel__input"
                  value={formTerm}
                  onChange={(e) => setFormTerm(e.target.value)}
                  placeholder={
                    language === "fr"
                      ? "ex: embedding, RAG, fine-tuning..."
                      : "e.g.: embedding, RAG, fine-tuning..."
                  }
                />
              </div>

              <div className="form-group">
                <label htmlFor="form-definition">
                  {language === "fr"
                    ? "Définition simple"
                    : "Simple definition"}
                </label>
                <textarea
                  id="form-definition"
                  className="command-panel__textarea"
                  value={formDefinition}
                  onChange={(e) => setFormDefinition(e.target.value)}
                  placeholder={
                    language === "fr"
                      ? "Expliquez ce terme de manière simple..."
                      : "Explain this term in a simple way..."
                  }
                  rows={4}
                />
              </div>

              <div className="form-group">
                <label htmlFor="form-metaphor">
                  {language === "fr" ? "Métaphore" : "Metaphor"}
                </label>
                <textarea
                  id="form-metaphor"
                  className="command-panel__textarea"
                  value={formMetaphor}
                  onChange={(e) => setFormMetaphor(e.target.value)}
                  placeholder={
                    language === "fr"
                      ? "Utilisez une analogie pour illustrer ce concept..."
                      : "Use an analogy to illustrate this concept..."
                  }
                  rows={3}
                />
              </div>

              <div className="form-group">
                <label htmlFor="form-why">
                  {language === "fr"
                    ? "Pourquoi c'est important"
                    : "Why it matters"}
                </label>
                <textarea
                  id="form-why"
                  className="command-panel__textarea"
                  value={formWhyItMatters}
                  onChange={(e) => setFormWhyItMatters(e.target.value)}
                  placeholder={
                    language === "fr"
                      ? "Expliquez l'importance de ce concept..."
                      : "Explain the importance of this concept..."
                  }
                  rows={3}
                />
              </div>

              <button
                type="button"
                className="command-panel__submit command-panel__submit--full"
                onClick={handleSaveCustomDefinition}
                disabled={!formTerm.trim()}
              >
                {language === "fr"
                  ? "Enregistrer la définition"
                  : "Save definition"}
              </button>
            </div>
          </>
        )}

        {activeTab === "saved" && (
          <>
            <div className="saved-definitions__header">
              <h3 className="command-panel__title">
                {language === "fr"
                  ? "Définitions enregistrées"
                  : "Saved definitions"}
              </h3>

              <button
                type="button"
                className="saved-definitions__copy-btn"
                onClick={copyAllDefinitions}
                disabled={savedDefinitions.length === 0}
                aria-label={
                  language === "fr"
                    ? "Copier toutes les définitions"
                    : "Copy all definitions"
                }
                title={
                  language === "fr"
                    ? "Copier toutes les définitions"
                    : "Copy all definitions"
                }
              >
                <Clipboard size={16} />
                {copySuccess && (
                  <span className="copy-success-text">
                    {language === "fr"
                      ? "Copié !"
                      : "Copied!"}
                  </span>
                )}
              </button>
            </div>

            {copySuccess && (
              <div className="command-panel__success-message">
                {language === "fr"
                  ? "Définitions copiées dans le presse-papier."
                  : "Definitions copied to clipboard."}
              </div>
            )}

            {savedDefinitions.length === 0 ? (
              <div className="saved-definitions-empty">
                {language === "fr"
                  ? "Aucune définition enregistrée."
                  : "No saved definitions."}
              </div>
            ) : (
              <div className="saved-definitions-list">
                {savedDefinitions.map((def) => (
                  <button
                    key={def.id}
                    type="button"
                    className="saved-definition-chip"
                    onClick={() => openSavedDefinition(def.term)}
                  >
                    {def.term}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </footer>
  );
}