import type { Language, LocalizedList, LocalizedText } from "../types/brain";

/** Shorthand for creating bilingual strings. */
export function lt(fr: string, en: string): LocalizedText {
  return { fr, en };
}

/** Shorthand for creating bilingual string arrays. */
export function ll(fr: string[], en: string[]): LocalizedList {
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
 * - Requested language (if exists and not empty)
 * - French (if exists and not empty)
 * - English (if exists and not empty)
 * - Provided fallback parameter (default: "")
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
  // Try requested language first (with trim check for empty strings)
  const requested = value[language];
  if (requested && typeof requested === "string" && requested.trim() !== "") {
    return requested;
  }
  
  // Fallback to French (with trim check)
  const french = value.fr;
  if (french && typeof french === "string" && french.trim() !== "") {
    return french;
  }
  
  // Fallback to English (with trim check)
  const english = value.en;
  if (english && typeof english === "string" && english.trim() !== "") {
    return english;
  }
  
  // Final fallback
  return fallback;
}

/** Pick the active language from a LocalizedList object. */
export function pickList(list: LocalizedList, language: Language): string[] {
  return list[language];
}
