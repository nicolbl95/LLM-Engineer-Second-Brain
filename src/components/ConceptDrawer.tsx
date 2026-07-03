import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { BrainNode } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui, uiNested } from "../data/uiStrings";
import { getNodeColor } from "../utils/graphHelpers";

interface ConceptDrawerProps {
  node: BrainNode | null;
  onClose: () => void;
  onRelatedClick: (nodeId: string) => void;
  onSave: (node: BrainNode) => void;
  onDelete: (nodeId: string) => void;
  isReadOnly?: boolean;
}

/** Right-side panel showing full concept details in the active language. */
export function ConceptDrawer({
  node,
  onClose,
  onSave,
  onDelete,
  isReadOnly = false,
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

  const currentDraft = isReadOnly ? node : (draft ?? node);

  const updateDraft = (updates: Partial<BrainNode>) => {
    setDraft((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...updates };
      // Autosave immediately
      onSave(next);
      return next;
    });
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
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onClose();
                }
              }}
            />
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Explication" : "Explanation"}</label>
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
          </div>

          {currentDraft.miniExplanation && (
            <div className="drawer__field-row">
              <label className="drawer__label">{language === "fr" ? "Mini-explication" : "Mini-explanation"}</label>
              <input
                className="drawer__input"
                value={currentDraft.miniExplanation[language]}
                onChange={(e) =>
                  updateDraft({
                    miniExplanation: {
                      fr: currentDraft.miniExplanation!.fr ?? "",
                      en: currentDraft.miniExplanation!.en ?? "",
                      [language]: e.target.value,
                    } as { fr: string; en: string },
                  })
                }
              />
            </div>
          )}

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Taille de la police" : "Font size"}</label>
            <div className="drawer__font-size-control">
              <button
                type="button"
                className="drawer__font-size-btn"
                onClick={() => updateDraft({ fontSize: Math.max(8, (currentDraft.fontSize ?? 14) - 1) })}
                aria-label={language === "fr" ? "Diminuer" : "Decrease"}
              >
                −
              </button>
              <input
                type="number"
                className="drawer__font-size-input"
                value={currentDraft.fontSize ?? 14}
                min={8}
                max={72}
                onChange={(e) => {
                  const value = parseInt(e.target.value, 10);
                  if (!isNaN(value) && value >= 8 && value <= 72) {
                    updateDraft({ fontSize: value });
                  }
                }}
              />
              <button
                type="button"
                className="drawer__font-size-btn"
                onClick={() => updateDraft({ fontSize: Math.min(72, (currentDraft.fontSize ?? 14) + 1) })}
                aria-label={language === "fr" ? "Augmenter" : "Increase"}
              >
                +
              </button>
            </div>
          </div>

          <div className="drawer__field-row">
            <label className="drawer__label">{language === "fr" ? "Couleur du nœud" : "Node color"}</label>
            <input
              type="color"
              className="drawer__color-input"
              value={currentDraft.color ?? color}
              onChange={(e) => updateDraft({ color: e.target.value })}
            />
          </div>
        </section>
      </div>
    </aside>
  );
}
