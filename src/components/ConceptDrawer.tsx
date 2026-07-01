import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { BrainNode } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui, uiNested } from "../data/uiStrings";
import { getNodeColor } from "../utils/graphHelpers";

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
  const [draft, setDraft] = useState<BrainNode | null>(node);

  const fallbackNode = useMemo<BrainNode>(() => ({
    id: "",
    type: "concept",
    position: { x: 0, y: 0 },
    title: { fr: "", en: "" },
    shortSummary: { fr: "", en: "" },
    simpleExplanation: { fr: "", en: "" },
    deepExplanation: { fr: "", en: "" },
    whyItMatters: { fr: "", en: "" },
    prerequisites: { fr: [], en: [] },
    relatedConcepts: [],
    commonMistakes: { fr: [], en: [] },
    examples: { fr: [], en: [] },
  }), []);

  const isProtected = useMemo(() => {
    return node ? ["llm-engineer", "llm-engineer-root", "root"].includes(node.id) : false;
  }, [node]);

  const color = getNodeColor(node ?? fallbackNode);

  useEffect(() => {
    setDraft(node);
  }, [node]);

  if (!node) return null;

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
            <label className="drawer__label">{language === "fr" ? "Mini-explication" : "Short explanation"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.miniExplanation?.[language] ?? currentDraft.shortSummary[language]}</p>
            ) : (
              <textarea
                className="drawer__textarea"
                value={currentDraft.miniExplanation?.[language] ?? currentDraft.shortSummary[language]}
                onChange={(e) =>
                  updateDraft({
                    miniExplanation: {
                      ...(currentDraft.miniExplanation ?? currentDraft.shortSummary),
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

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Largeur du nœud" : "Node width"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.nodeWidth ?? 180}px</p>
            ) : (
              <input
                type="number"
                className="drawer__input"
                min={100}
                value={currentDraft.nodeWidth ?? 180}
                onChange={(e) => updateDraft({ nodeWidth: Number(e.target.value) })}
              />
            )}
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Hauteur du nœud" : "Node height"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.nodeHeight ?? 64}px</p>
            ) : (
              <input
                type="number"
                className="drawer__input"
                min={40}
                value={currentDraft.nodeHeight ?? 64}
                onChange={(e) => updateDraft({ nodeHeight: Number(e.target.value) })}
              />
            )}
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Largeur mini-explication" : "Short explanation width"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.miniExplanationWidth ?? 180}px</p>
            ) : (
              <input
                type="number"
                className="drawer__input"
                min={100}
                value={currentDraft.miniExplanationWidth ?? 180}
                onChange={(e) => updateDraft({ miniExplanationWidth: Number(e.target.value) })}
              />
            )}
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Hauteur mini-explication" : "Short explanation height"}</label>
            {isReadOnly ? (
              <p className="drawer__text">{currentDraft.miniExplanationHeight ?? 60}px</p>
            ) : (
              <input
                type="number"
                className="drawer__input"
                min={30}
                value={currentDraft.miniExplanationHeight ?? 60}
                onChange={(e) => updateDraft({ miniExplanationHeight: Number(e.target.value) })}
              />
            )}
          </div>

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
