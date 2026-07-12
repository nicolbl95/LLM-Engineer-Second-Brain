import type { CustomDefinition, LocalizedText } from "../types/brain";

const STORAGE_KEY = "custom-definitions";

/**
 * Migrate old definitions where `term` was a plain string
 * to the new bilingual format `{ fr, en }`.
 */
function migrateTerm(def: { term: string | LocalizedText }): LocalizedText {
  if (typeof def.term === "string") {
    return { fr: def.term, en: "" };
  }
  return def.term;
}

/**
 * Load all custom definitions from localStorage,
 * migrating old plain-string terms to bilingual objects.
 */
export function loadCustomDefinitions(): CustomDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
    return parsed
      .map((item) => ({
        ...item,
        term: migrateTerm(item as { term: string | LocalizedText }),
      })) as CustomDefinition[];
  } catch {
    return [];
  }
}

/**
 * Save custom definitions array to localStorage.
 */
export function saveCustomDefinitions(definitions: CustomDefinition[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(definitions));
  } catch (error) {
    console.error("Failed to save custom definitions:", error);
  }
}

/**
 * Find a custom definition by term (case-insensitive, normalized),
 * searching both French and English fields.
 */
export function findCustomDefinition(
  term: string,
  definitions: CustomDefinition[]
): CustomDefinition | undefined {
  const normalizedSearch = normalizeTerm(term);
  if (!normalizedSearch) return undefined;

  return definitions.find((def) => {
    const normalizedFr = normalizeTerm(def.term.fr);
    const normalizedEn = normalizeTerm(def.term.en);
    return normalizedFr === normalizedSearch || normalizedEn === normalizedSearch;
  });
}

/**
 * Add a new custom definition to the list and persist.
 */
export function addCustomDefinition(
  definition: Omit<CustomDefinition, "id" | "createdAt"> & {
    createdAt?: string;
  }
): CustomDefinition {
  const newDefinition: CustomDefinition = {
    ...definition,
    id: crypto.randomUUID(),
    createdAt: definition.createdAt || new Date().toISOString(),
  };

  const existing = loadCustomDefinitions();
  const updated = [...existing, newDefinition];
  saveCustomDefinitions(updated);

  return newDefinition;
}

/**
 * Delete custom definitions by their IDs and persist.
 */
export function deleteCustomDefinitions(ids: string[]): void {
  const existing = loadCustomDefinitions();
  const filtered = existing.filter((def) => !ids.includes(def.id));
  saveCustomDefinitions(filtered);
}

/**
 * Normalize a term for comparison (lowercase, trim).
 */
function normalizeTerm(term: string): string {
  return term.toLowerCase().trim();
}
