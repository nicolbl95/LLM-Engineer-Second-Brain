import { useEffect, useMemo, useState } from "react";
import { X, ImagePlus } from "lucide-react";
import type { BrainNode, Difficulty, PillarId } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui, uiNested } from "../data/uiStrings";
import { getNodeColor } from "../utils/graphHelpers";
import { pillarMeta } from "../data/graph";

interface ConceptDrawerProps {
  node: BrainNode | null;
  isReadOnly: boolean;
  onClose: () => void;
  onRelatedClick: (nodeId: string) => void;
  onSave: (node: BrainNode) => void;
  onDelete: (nodeId: string) => void;
}

/** Right-side panel showing full concept details in the active language. */
export function ConceptDrawer({
  node,
  isReadOnly,
  onClose,
  onSave,
  onDelete,
}: ConceptDrawerProps) {
  const { language, t } = useLanguage();
  const [draft, setDraft] = useState<BrainNode | null>(null);

  const isProtected = useMemo(() => {
    return node ? ["llm-engineer", "llm-engineer-root", "root"].includes(node.id) : false;
  }, [node]);

  const color = getNodeColor(node ?? { id: "", type: "concept", position: { x: 0, y: 0 }, title: { fr: "", en: "" }, shortSummary: { fr: "", en: "" }, simpleExplanation: { fr: "", en: "" }, deepExplanation: { fr: "", en: "" }, whyItMatters: { fr: "", en: "" }, prerequisites: { fr: [], en: [] }, relatedConcepts: [], commonMistakes: { fr: [], en: [] }, examples: { fr: [], en: [] } });

  if (!node) return null;

  useEffect(() => {
    setDraft(node);
  }, [node]);

  const currentDraft = draft ?? node;

  const updateDraft = (updates: Partial<BrainNode>) => {
    setDraft((prev) => (prev ? { ...prev, ...updates } : prev));
  };

  const handleSave = () => {
    if (!draft) return;
    onSave(draft);
  };

  const handleCancel = () => {
    setDraft(node);
  };

  const handleDelete = () => {
    if (isProtected) return;
    onDelete(node.id);
  };

  return (
    <aside
      className="concept-drawer"
      style={{ "--drawer-accent": color } as React.CSSProperties}
    >
      <div className="concept-drawer__header">
        <div>
          <span className="concept-drawer__badge">
            {uiNested("nodeTypes", currentDraft.type, language)}
          </span>
          <h2 className="concept-drawer__title">{t(currentDraft.title)}</h2>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onClose}
          aria-label={ui("close", language)}
        >
          <X size={20} />
        </button>
      </div>

      <div className="concept-drawer__meta">
        {currentDraft.pillar && (
          <span className="meta-tag">
            {ui("pillar", language)}: {t(currentDraft.pillar)}
          </span>
        )}
        {currentDraft.difficulty && (
          <span className="meta-tag">
            {ui("difficulty", language)}: {uiNested("difficulties", currentDraft.difficulty, language)}
          </span>
        )}
      </div>

      <div className="concept-drawer__content">
        <section className="drawer__section">
          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Titre" : "Title"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.title[language]}</p>
            ) : (
              <input
                className="drawer__input"
                value={currentDraft.title[language]}
                onChange={(e) =>
                  updateDraft({
                    title: {
                      ...currentDraft.title,
                      [language]: e.target.value,
                    },
                  })
                }
              />
            )}
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Explication" : "Explanation"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.simpleExplanation[language]}</p>
            ) : (
              <textarea
                className="drawer__textarea"
                value={currentDraft.simpleExplanation[language]}
                onChange={(e) =>
                  updateDraft({
                    simpleExplanation: {
                      ...currentDraft.simpleExplanation,
                      [language]: e.target.value,
                    },
                    shortSummary: {
                      ...currentDraft.shortSummary,
                      [language]: e.target.value,
                    },
                    deepExplanation: {
                      ...currentDraft.deepExplanation,
                      [language]: e.target.value,
                    },
                  })
                }
              />
            )}
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Couleur du nœud" : "Node color"}</label>
            {isReadOnly ? (
              <div className="drawer__color-preview" style={{ backgroundColor: currentDraft.color ?? color }} />
            ) : (
              <input
                type="color"
                className="drawer__color-input"
                value={currentDraft.color ?? color}
                onChange={(e) => updateDraft({ color: e.target.value })}
              />
            )}
          </div>

          {currentDraft.pillarId && (
            <div className="drawer__field-row">
              <label className="drawer__label">{ui("pillar", language)}</label>
              {isReadOnly ? (
                <p className="drawer__text">{t(currentDraft.pillar ?? { fr: currentDraft.pillarId, en: currentDraft.pillarId })}</p>
              ) : (
                <select
                  className="drawer__select"
                  value={currentDraft.pillarId}
                  onChange={(e) => updateDraft({ pillarId: e.target.value as PillarId })}
                >
                  {Object.entries(pillarMeta).map(([id, meta]) => (
                    <option key={id} value={id}>
                      {meta.title[language]}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {currentDraft.difficulty && (
            <div className="drawer__field-row">
              <label className="drawer__label">{ui("difficulty", language)}</label>
              {isReadOnly ? (
                <p className="drawer__text">{uiNested("difficulties", currentDraft.difficulty, language)}</p>
              ) : (
                <select
                  className="drawer__select"
                  value={currentDraft.difficulty}
                  onChange={(e) => updateDraft({ difficulty: e.target.value as Difficulty })}
                >
                  {(["beginner", "intermediate", "advanced"] as Difficulty[]).map((value) => (
                    <option key={value} value={value}>
                      {uiNested("difficulties", value, language)}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
        </section>

        <section className="drawer__section drawer__screenshots">
          <h3 className="drawer__section-title">{ui("screenshots", language)}</h3>
          <p className="drawer__hint">{ui("screenshotSoon", language)}</p>
          <button type="button" className="screenshot-btn" disabled>
            <ImagePlus size={16} />
            {ui("addScreenshot", language)}
          </button>
        </section>

        {!isReadOnly && (
          <div className="drawer__actions">
            <button type="button" className="drawer__action-btn drawer__action-btn--primary" onClick={handleSave}>
              {language === "fr" ? "Enregistrer" : "Save"}
            </button>
            <button type="button" className="drawer__action-btn" onClick={handleCancel}>
              {language === "fr" ? "Annuler" : "Cancel"}
            </button>
            <button type="button" className={`drawer__action-btn drawer__action-btn--danger ${isProtected ? "is-disabled" : ""}`} onClick={handleDelete} disabled={isProtected}>
              {language === "fr" ? "Supprimer le nœud" : "Delete Node"}
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}
