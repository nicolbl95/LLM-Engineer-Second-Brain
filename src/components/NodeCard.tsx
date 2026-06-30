import type { BrainNode } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { getNodeColor } from "../utils/graphHelpers";
import { uiNested } from "../data/uiStrings";

interface NodeCardProps {
  node: BrainNode;
  onClick?: () => void;
  compact?: boolean;
}

/** Reusable card for displaying a concept in lists and results. */
export function NodeCard({ node, onClick, compact = false }: NodeCardProps) {
  const { language, t } = useLanguage();
  const color = getNodeColor(node);

  return (
    <button
      type="button"
      className={`node-card ${compact ? "node-card--compact" : ""}`}
      onClick={onClick}
      style={{ "--pillar-color": color } as React.CSSProperties}
    >
      <span className="node-card__dot" />
      <div className="node-card__body">
        <span className="node-card__title">{t(node.title)}</span>
        {!compact && (
          <span className="node-card__meta">
            {uiNested("nodeTypes", node.type, language)}
            {node.difficulty &&
              ` · ${uiNested("difficulties", node.difficulty, language)}`}
          </span>
        )}
        {!compact && (
          <p className="node-card__summary">{t(node.shortSummary)}</p>
        )}
      </div>
    </button>
  );
}
