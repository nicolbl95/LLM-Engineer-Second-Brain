import { X, ImagePlus } from "lucide-react";
import type { BrainNode } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui, uiNested } from "../data/uiStrings";
import { getNodeColor, getNodeById } from "../utils/graphHelpers";
import { pickList } from "../utils/i18n";

interface ConceptDrawerProps {
  node: BrainNode | null;
  onClose: () => void;
  onRelatedClick: (nodeId: string) => void;
}

/** Right-side panel showing full concept details in the active language. */
export function ConceptDrawer({
  node,
  onClose,
  onRelatedClick,
}: ConceptDrawerProps) {
  const { language, t } = useLanguage();

  if (!node) return null;

  const color = getNodeColor(node);

  const renderList = (items: string[], emptyFallback?: string) => {
    if (items.length === 0) {
      return emptyFallback ? (
        <p className="drawer__empty">{emptyFallback}</p>
      ) : null;
    }
    return (
      <ul className="drawer__list">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    );
  };

  const section = (title: string, content: React.ReactNode) => (
    <section className="drawer__section">
      <h3 className="drawer__section-title">{title}</h3>
      {content}
    </section>
  );

  return (
    <aside
      className="concept-drawer"
      style={{ "--drawer-accent": color } as React.CSSProperties}
    >
      <div className="concept-drawer__header">
        <div>
          <span className="concept-drawer__badge">
            {uiNested("nodeTypes", node.type, language)}
          </span>
          <h2 className="concept-drawer__title">{t(node.title)}</h2>
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
        {node.pillar && (
          <span className="meta-tag">
            {ui("pillar", language)}: {t(node.pillar)}
          </span>
        )}
        {node.difficulty && (
          <span className="meta-tag">
            {ui("difficulty", language)}:{" "}
            {uiNested("difficulties", node.difficulty, language)}
          </span>
        )}
        {node.status && (
          <span className="meta-tag">
            {ui("status", language)}:{" "}
            {uiNested("statuses", node.status, language)}
          </span>
        )}
      </div>

      <div className="concept-drawer__content">
        {section(
          ui("shortSummary", language),
          <p className="drawer__text">{t(node.shortSummary)}</p>,
        )}
        {section(
          ui("simpleExplanation", language),
          <p className="drawer__text">{t(node.simpleExplanation)}</p>,
        )}
        {section(
          ui("deepExplanation", language),
          <p className="drawer__text">{t(node.deepExplanation)}</p>,
        )}
        {section(
          ui("whyItMatters", language),
          <p className="drawer__text">{t(node.whyItMatters)}</p>,
        )}
        {section(
          ui("prerequisites", language),
          renderList(pickList(node.prerequisites, language)),
        )}
        {section(
          ui("relatedConcepts", language),
          <div className="drawer__related">
            {node.relatedConcepts.map((id) => {
              const rel = getNodeById(id);
              if (!rel) return null;
              return (
                <button
                  key={id}
                  type="button"
                  className="related-chip"
                  onClick={() => onRelatedClick(id)}
                >
                  {t(rel.title)}
                </button>
              );
            })}
          </div>,
        )}
        {section(
          ui("commonMistakes", language),
          renderList(pickList(node.commonMistakes, language)),
        )}
        {section(
          ui("examples", language),
          renderList(pickList(node.examples, language)),
        )}

        {/* Screenshot placeholder — manual attachment only, no AI/OCR */}
        <section className="drawer__section drawer__screenshots">
          <h3 className="drawer__section-title">
            {ui("screenshots", language)}
          </h3>
          <p className="drawer__hint">{ui("screenshotSoon", language)}</p>
          <button type="button" className="screenshot-btn" disabled>
            <ImagePlus size={16} />
            {ui("addScreenshot", language)}
          </button>
        </section>
      </div>
    </aside>
  );
}
