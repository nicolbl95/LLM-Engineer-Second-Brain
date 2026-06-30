import type { Language, LocalizedList, LocalizedText } from "../types/brain";

/** Shorthand for creating bilingual strings. */
export function lt(fr: string, en: string): LocalizedText {
  return { fr, en };
}

/** Shorthand for creating bilingual string arrays. */
export function ll(fr: string[], en: string[]): LocalizedList {
  return { fr, en };
}

/** Pick the active language from a LocalizedText object. */
export function pick(text: LocalizedText, language: Language): string {
  return text[language];
}

/** Pick the active language from a LocalizedList object. */
export function pickList(list: LocalizedList, language: Language): string[] {
  return list[language];
}
