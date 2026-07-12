import { useEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import type { BrainNode, LocalizedText } from "../types/brain";
import { useLanguage } from "../context/LanguageContext";
import { ui, uiNested } from "../data/uiStrings";
import { getNodeColor } from "../utils/graphHelpers";
import { brainNodes } from "../data/graph";
import { translateText } from "../utils/autoTranslate";

interface ConceptDrawerProps {
  node: BrainNode | null;
  onClose: () => void;
  onRelatedClick: (nodeId: string) => void;
  onSave: (node: BrainNode) => void;
  isReadOnly?: boolean;
}

/**
 * Safely extract a string from a value that might be:
 *   - a LocalizedText object { fr, en }
 *   - a plain string (from corrupted localStorage)
 *   - undefined / null
 */
function safePickLocalized(
  value: LocalizedText | string | null | undefined,
  language: "fr" | "en",
  fallback = "",
): string {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object") return fallback;

  const fr = typeof value.fr === "string" ? value.fr.trim() : "";
  const en = typeof value.en === "string" ? value.en.trim() : "";

  const preferred = language === "fr" ? fr : en;
  if (preferred && preferred !== "New Node") return preferred;

  if (fr && fr !== "New Node") return fr;
  if (en && en !== "New Node") return en;

  return fallback;
}

/**
 * Ensure a value is a valid LocalizedText object, never a plain string.
 */
function ensureLocalized(
  value: LocalizedText | string | null | undefined,
): LocalizedText {
  if (typeof value === "string") return { fr: value, en: "" };
  if (!value || typeof value !== "object") return { fr: "", en: "" };
  return {
    fr: typeof value.fr === "string" ? value.fr : "",
    en: typeof value.en === "string" ? value.en : "",
  };
}

/**
 * Merge missing English from the matching static node in brainNodes.
 * Only replaces .en when missing / empty / "New Node" / identical to French.
 * Returns the original node unchanged if no static match or nothing to merge.
 */
function mergeEnglishFromStatic(drawerNode: BrainNode): BrainNode {
  const staticNode = brainNodes.find((n) => n.id === drawerNode.id);
  if (!staticNode) return drawerNode;

  const fields: Array<"title" | "shortSummary" | "simpleExplanation" | "deepExplanation" | "whyItMatters" | "miniExplanation" | "summary"> = [
    "title",
    "shortSummary",
    "simpleExplanation",
    "deepExplanation",
    "whyItMatters",
    "miniExplanation",
    "summary",
  ];

  const merged = { ...drawerNode };

  for (const field of fields) {
    const dv = ensureLocalized(drawerNode[field] as LocalizedText | string | undefined);
    const sv = ensureLocalized(staticNode[field] as LocalizedText | string | undefined);
    if (!sv.en) continue;

    const drawerEn = dv.en.trim();
    const drawerFr = dv.fr.trim();
    const isBad =
      !drawerEn ||
      drawerEn === "New Node" ||
      (drawerEn === drawerFr && drawerFr.length > 0);

    if (isBad) {
      (merged as any)[field] = {
        fr: dv.fr || sv.fr || "",
        en: sv.en,
      };
    }
  }

  return merged;
}

/** Safe empty BrainNode used as fallback during render errors. */
const EMPTY_NODE: BrainNode = {
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
  summary: { fr: "", en: "" },
  summaryWidth: 520,
  summaryHeight: 120,
  summaryOffsetX: 0,
};

/** Right-side panel showing full concept details in the active language. */
export function ConceptDrawer({
  node,
  onClose,
  onSave,
  isReadOnly = false,
}: ConceptDrawerProps) {
  const { language, t } = useLanguage();
  const [draft, setDraft] = useState<BrainNode | null>(null);

  // When the incoming node changes, reset draft from the merged node.
  useEffect(() => {
    if (!node) {
      setDraft(null);
      return;
    }
    setDraft(mergeEnglishFromStatic(node));
  }, [node]);

  // ---- Auto-translation of missing English fields for custom nodes ----

  /** Track which node ids have already been auto-translated this session. */
  const translatedNodeIdsRef = useRef<Set<string>>(new Set());

  const [isTranslating, setIsTranslating] = useState(false);

  /**
   * Fields to auto-translate from French to English when the user
   * switches to English for a custom node that doesn't have a
   * graph.ts static entry.
   */
  const TRANSLATABLE_FIELDS: Array<{
    field: keyof BrainNode;
    displayName: string;
  }> = [
    { field: "title", displayName: "title" },
    { field: "simpleExplanation", displayName: "explanation" },
    { field: "deepExplanation", displayName: "deep explanation" },
    { field: "summary", displayName: "summary" },
    { field: "miniExplanation", displayName: "mini explanation" },
  ];

  useEffect(() => {
    // Only translate when language is English
    if (language !== "en") return;
    if (!node) return;
    if (isReadOnly) return;

    // Skip static/graph.ts nodes — mergeEnglishFromStatic already handled them
    const staticNode = brainNodes.find((n) => n.id === node.id);
    if (staticNode) return;

    // Avoid translating the same node twice in one session
    if (translatedNodeIdsRef.current.has(node.id)) return;

    // Check if there's actually anything to translate
    let needsTranslation = false;
    for (const { field } of TRANSLATABLE_FIELDS) {
      const val = node[field] as LocalizedText | string | undefined;
      const loc = ensureLocalized(val);
      const en = loc.en.trim();
      const fr = loc.fr.trim();
      if (fr && (!en || en === "New Node" || en === fr)) {
        needsTranslation = true;
        break;
      }
    }
    if (!needsTranslation) return;

    // Mark this node as processed before any async work to prevent re-entry
    translatedNodeIdsRef.current.add(node.id);

    const runTranslation = async () => {
      setIsTranslating(true);
      console.log("[ConceptDrawer] AUTO TRANSLATE START", node.id);

      // Capture the node id at the start so we can verify we're
      // still translating the same node at the end.
      const nodeId = node.id;

      // Clone the draft (or node) to build a translated BrainNode
      const base = (draft?.id === nodeId ? draft : node) ?? node;
      let updated: BrainNode = { ...base };

      for (const { field, displayName } of TRANSLATABLE_FIELDS) {
        const raw = updated[field] as LocalizedText | string | undefined;
        const loc = ensureLocalized(raw);
        const en = loc.en.trim();
        const fr = loc.fr.trim();

        if (!fr) continue; // nothing to translate from
        if (en && en !== "New Node" && en !== fr) continue; // already has real English

        console.log(`[ConceptDrawer] TRANSLATING FIELD "${displayName}" (node ${nodeId})`);
        try {
          const translated = await translateText(fr, "en");
          if (translated && translated !== fr) {
            (updated as any)[field] = {
              ...loc,
              en: translated,
            };
          }
        } catch (err) {
          console.warn(`[ConceptDrawer] AUTO TRANSLATE FAILED for "${displayName}"`, err);
        }
      }

      // Safety: only apply if we're still translating the same node
      // (user might have clicked away during translation)
      if (nodeId === node.id) {
        setDraft(updated);
        // Persist to the graph via onSave
        setTimeout(() => onSave(updated), 0);
        console.log("[ConceptDrawer] AUTO TRANSLATE DONE", nodeId);
      }

      setIsTranslating(false);
    };

    runTranslation();
  }, [language, node, isReadOnly, draft, onSave]);

  // Close the drawer if node becomes null.
  if (!node) return null;

  // ------ Safe display computation ------
  // Force recomputation when language changes by referencing it explicitly.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _lang = language;

  // current: the node to display — either user-edited draft (when IDs match)
  // or the incoming node directly (on first click / after language switch).
  let current: BrainNode;
  try {
    current =
      !isReadOnly && draft && draft.id === node.id
        ? mergeEnglishFromStatic(draft)
        : mergeEnglishFromStatic(node);
  } catch {
    current = EMPTY_NODE;
  }

  // Safely extract display strings — all guaranteed to be plain strings.
  const displayTitle = safePickLocalized(current.title, _lang, "New Node");
  const displayExplanation = safePickLocalized(current.simpleExplanation, _lang, "");
  const displaySummary = safePickLocalized(current.summary, _lang, "");

  // DEBUG: trace merge and display values
  if (language === "en") {
    console.log("[ConceptDrawer EN] node.id:", node.id);
    console.log("  node.title            :", JSON.stringify(node.title));
    console.log("  node.title.fr/type    :", typeof (node.title as any)?.fr, "/", (node.title as any)?.fr);
    console.log("  node.title.en/type    :", typeof (node.title as any)?.en, "/", (node.title as any)?.en);
    console.log("  node.simpleExplanation:", JSON.stringify(node.simpleExplanation));
    console.log("  node.summary          :", JSON.stringify(node.summary));
    console.log("  draft?.id             :", draft?.id);
    console.log("  draft?.title          :", JSON.stringify(draft?.title));
    console.log("  current.title         :", JSON.stringify(current.title));
    console.log("  displayTitle          :", displayTitle);
    console.log("  displayExplanation    :", displayExplanation);
    console.log("  displaySummary        :", displaySummary);
    // Also log the static node for comparison
    const sn = brainNodes.find((n) => n.id === node.id);
    if (sn) {
      console.log("  static.title          :", JSON.stringify(sn.title));
      console.log("  static.simpleExpl     :", JSON.stringify(sn.simpleExplanation));
      console.log("  static.summary        :", JSON.stringify(sn.summary));
    } else {
      console.log("  static: NOT FOUND in brainNodes");
    }
  }

  // Avoid accessing miniExplanation[language] directly on undefined.
  const miniExplanationText = current.miniExplanation
    ? safePickLocalized(current.miniExplanation, _lang, "")
    : "";

  // ------ Safe mutation helper ------
  const updateDraft = (
    field: keyof BrainNode,
    value: string,
  ) => {
    if (isReadOnly) return;

    setDraft((prev) => {
      const base = prev ?? current;
      const existing = ensureLocalized(base[field] as LocalizedText | string | undefined);

      const updated = {
        ...existing,
        [language]: value,
      };

      const next: BrainNode = { ...base, [field]: updated };
      return next;
    });
  };

  const handleSave = () => {
    if (isReadOnly) return;
    setDraft((prev) => {
      const toSave = prev ?? current;
      // Defer to avoid calling parent setState during render phase.
      setTimeout(() => onSave(toSave), 0);
      return toSave;
    });
  };

  const color = getNodeColor(current);

  return (
    <aside
      className="concept-drawer"
      style={{ "--drawer-accent": color } as React.CSSProperties}
    >
      <div className="concept-drawer__header">
        <div>
          <span className="concept-drawer__badge">
            {uiNested("nodeTypes", current.type, language)}
          </span>
          <h2 className="concept-drawer__title">{t(current.title)}</h2>
        </div>

        {isTranslating && (
          <span className="concept-drawer__translating">
            {language === "fr" ? "Traduction..." : "Translating..."}
          </span>
        )}

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
          {/* Title */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Titre" : "Title"}
            </label>
            <textarea
              className="drawer__textarea"
              value={displayTitle}
              readOnly={isReadOnly}
              onBlur={handleSave}
              onChange={(e) => updateDraft("title", e.target.value)}
            />
          </div>

          {/* Explanation (simpleExplanation) */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Explication" : "Explanation"}
            </label>
            <textarea
              className="drawer__textarea"
              value={displayExplanation}
              readOnly={isReadOnly}
              onBlur={handleSave}
              onChange={(e) => updateDraft("simpleExplanation", e.target.value)}
            />
          </div>

          {/* Summary */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Résumé" : "Summary"}
            </label>
            <textarea
              className="drawer__textarea"
              value={displaySummary}
              readOnly={isReadOnly}
              onBlur={handleSave}
              onChange={(e) => updateDraft("summary", e.target.value)}
            />
          </div>

          {/* Summary Width */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Largeur du résumé" : "Summary width"}
            </label>
            <input
              type="number"
              className="drawer__input"
              value={current.summaryWidth ?? 520}
              min={200}
              max={1200}
              readOnly={isReadOnly}
              onBlur={handleSave}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 200 && val <= 1200) {
                  setDraft((prev) => ({ ...(prev ?? current), summaryWidth: val }));
                }
              }}
            />
          </div>

          {/* Summary Height */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Hauteur du résumé" : "Summary height"}
            </label>
            <input
              type="number"
              className="drawer__input"
              value={current.summaryHeight ?? 120}
              min={60}
              max={600}
              readOnly={isReadOnly}
              onBlur={handleSave}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= 60 && val <= 600) {
                  setDraft((prev) => ({ ...(prev ?? current), summaryHeight: val }));
                }
              }}
            />
          </div>

          {/* Summary Offset X */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr"
                ? "Décalage horizontal du résumé"
                : "Summary horizontal offset"}
            </label>
            <input
              type="number"
              className="drawer__input"
              value={current.summaryOffsetX ?? 0}
              min={-400}
              max={400}
              readOnly={isReadOnly}
              onBlur={handleSave}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                if (!Number.isNaN(val) && val >= -400 && val <= 400) {
                  setDraft((prev) => ({
                    ...(prev ?? current),
                    summaryOffsetX: val,
                  }));
                }
              }}
            />
          </div>

          {/* Mini-explanation */}
          {miniExplanationText && (
            <div className="drawer__field-row">
              <label className="drawer__label">
                {language === "fr" ? "Mini-explication" : "Mini-explanation"}
              </label>
              <textarea
                className="drawer__textarea"
                value={miniExplanationText}
                readOnly={isReadOnly}
                onBlur={handleSave}
                onChange={(e) =>
                  updateDraft("miniExplanation", e.target.value)
                }
              />
            </div>
          )}

          {/* Font Size */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Taille de la police" : "Font size"}
            </label>
            <div className="drawer__font-size-control">
              <button
                type="button"
                className="drawer__font-size-btn"
                disabled={isReadOnly}
                onClick={() =>
                  setDraft((prev) => ({
                    ...(prev ?? current),
                    fontSize: Math.max(8, (prev?.fontSize ?? current.fontSize ?? 14) - 1),
                  }))
                }
                aria-label={language === "fr" ? "Diminuer" : "Decrease"}
              >
                −
              </button>

              <input
                type="number"
                className="drawer__font-size-input"
                value={current.fontSize ?? 14}
                min={8}
                max={72}
                readOnly={isReadOnly}
                onBlur={handleSave}
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10);
                  if (!Number.isNaN(val) && val >= 8 && val <= 72) {
                    setDraft((prev) => ({
                      ...(prev ?? current),
                      fontSize: val,
                    }));
                  }
                }}
              />

              <button
                type="button"
                className="drawer__font-size-btn"
                disabled={isReadOnly}
                onClick={() =>
                  setDraft((prev) => ({
                    ...(prev ?? current),
                    fontSize: Math.min(72, (prev?.fontSize ?? current.fontSize ?? 14) + 1),
                  }))
                }
                aria-label={language === "fr" ? "Augmenter" : "Increase"}
              >
                +
              </button>
            </div>
          </div>

          {/* Node Color */}
          <div className="drawer__field-row">
            <label className="drawer__label">
              {language === "fr" ? "Couleur du nœud" : "Node color"}
            </label>
            <input
              type="color"
              className="drawer__color-input"
              value={current.color ?? color}
              disabled={isReadOnly}
              onBlur={handleSave}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...(prev ?? current),
                  color: e.target.value,
                }))
              }
            />
          </div>
        </section>
      </div>
    </aside>
  );
}