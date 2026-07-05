import type { CustomDefinition } from "../types/brain";

const STORAGE_KEY = "custom-definitions";

/**
 * Load all custom definitions from localStorage.
 */
export function loadCustomDefinitions(): CustomDefinition[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CustomDefinition[];
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
 * Find a custom definition by term (case-insensitive, normalized).
 * Returns the definition if found, or undefined.
 */
export function findCustomDefinition(
  term: string,
  definitions: CustomDefinition[]
): CustomDefinition | undefined {
  const normalizedSearch = normalizeTerm(term);
  if (!normalizedSearch) return undefined;

  return definitions.find((def) => {
    const normalizedDef = normalizeTerm(def.term);
    return normalizedDef === normalizedSearch;
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
