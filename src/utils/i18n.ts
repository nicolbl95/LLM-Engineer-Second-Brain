import type { BrainNode, Language, LocalizedList, LocalizedText } from "../types/brain";

/** Shorthand for creating bilingual strings. */
export function lt(fr: string, en: string): LocalizedText {
  return { fr, en };
}

/** Shorthand for creating bilingual string arrays. */
export function ll(fr: string[], en: string[]): LocalizedList {
  return { fr, en };
}

/**
 * Normalize a localized text value to ensure it has proper fr/en structure.
 * 
 * Handles multiple input types and cleans up bad data:
 * - Case A: Plain string → { fr: string, en: "" }
 * - Case B: LocalizedText object → cleaned object
 * - Case C: English is "New Node" but French has content → clear English
 * - Case D: English equals French (appears to be French text) → clear English
 * - Case E: Missing field → { fr: fallback, en: "" }
 * 
 * @param value - The localized text value (LocalizedText | string | null | undefined)
 * @param fallbackText - Fallback text for missing fields (default: "")
 * @returns Normalized LocalizedText object
 */
export function normalizeLocalizedText(
  value: LocalizedText | string | null | undefined,
  fallbackText: string = ""
): LocalizedText {
  // Case E: missing field
  if (!value) {
    return { fr: fallbackText, en: "" };
  }
  
  // Case A: value is a plain string
  if (typeof value === "string") {
    return { fr: value, en: "" };
  }
  
  // At this point, value should be a LocalizedText object
  const fr = value.fr || "";
  const en = value.en || "";
  
  // Case C: English is "New Node" but French has real content
  // Treat English as missing in this case
  if (en === "New Node" && fr && fr.trim() !== "") {
    return { fr, en: "" };
  }
  
  // Case B: Return cleaned object (do NOT clear English just because
  // it matches French — many terms like "LLM", "RAG", "Docker" are
  // identical across both languages)
  return { fr, en };
}

/**
 * Safely pick localized text with comprehensive fallback logic.
 * 
 * Handles multiple input types:
 * 1. LocalizedText objects: { fr: "...", en: "..." }
 * 2. Plain strings (for backward compatibility)
 * 3. null/undefined (returns fallback)
 * 
 * Fallback order for localized objects:
 * - Requested language (if exists, not empty, and not "New Node")
 * - French (if exists and not empty)
 * - English (if exists and not empty)
 * - Provided fallback parameter (default: "")
 * 
 * Special case: If requested language is "en" and value is "New Node" but French has content,
 * fallback to French instead of showing "New Node".
 * 
 * @param value - The localized text value (LocalizedText | string | null | undefined)
 * @param language - The target language ("fr" | "en")
 * @param fallback - Fallback string if no content found (default: "")
 * @returns The localized string, never undefined
 */
export function pick(value: LocalizedText | string | null | undefined, language: Language, fallback: string = ""): string {
  // Case 1: If value is a plain string, return it as-is
  if (typeof value === "string") {
    return value;
  }
  
  // Case 2: If value is null or undefined, return fallback
  if (!value || typeof value !== "object") {
    return fallback;
  }
  
  // Case 3: Value is a LocalizedText object
  // Try requested language first (with trim check for empty strings and "New Node" check)
  const requested = value[language];
  if (requested && typeof requested === "string" && requested.trim() !== "" && requested !== "New Node") {
    return requested;
  }
  
  // Special fallback: if requesting English and got "New Node" or empty, try French
  if (language === "en") {
    const french = value.fr;
    if (french && typeof french === "string" && french.trim() !== "" && french !== "New Node") {
      return french;
    }
  }
  
  // Fallback to French (with trim check)
  const french = value.fr;
  if (french && typeof french === "string" && french.trim() !== "") {
    return french;
  }
  
  // Fallback to English (with trim check)
  const english = value.en;
  if (english && typeof english === "string" && english.trim() !== "" && english !== "New Node") {
    return english;
  }
  
  // Final fallback
  return fallback;
}

/** Pick the active language from a LocalizedList object. */
export function pickList(list: LocalizedList, language: Language): string[] {
  return list[language];
}

/**
 * Normalize all localized fields in a BrainNode.
 * This cleans up bad saved data from localStorage.
 * 
 * @param node - The BrainNode to normalize
 * @returns Normalized BrainNode with cleaned localized fields
 */
export function normalizeBrainNode(node: BrainNode): BrainNode {
  const fieldsToNormalize: (keyof BrainNode)[] = [
    "title",
    "shortSummary",
    "simpleExplanation",
    "deepExplanation",
    "whyItMatters",
    "miniExplanation",
    "summary",
  ];
  
  const normalized = { ...node };
  
  for (const field of fieldsToNormalize) {
    const value = node[field];
    if (value && typeof value === "object" && "fr" in value && "en" in value) {
      // It's a LocalizedText field
      (normalized as any)[field] = normalizeLocalizedText(value as LocalizedText);
    }
  }
  
  return normalized;
}
