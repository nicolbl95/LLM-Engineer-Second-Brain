import type { Language } from "../types/brain";

/** All UI chrome strings — never mixed; one language at a time. */
export const uiStrings = {
  appTitle: { fr: "Second Cerveau LLM", en: "LLM Second Brain" },
  searchPlaceholder: {
    fr: "Rechercher un concept…",
    en: "Search a concept…",
  },
  filters: { fr: "Filtres", en: "Filters" },
  allPillars: { fr: "Tous les piliers", en: "All pillars" },
  close: { fr: "Fermer", en: "Close" },
  type: { fr: "Type", en: "Type" },
  pillar: { fr: "Pilier", en: "Pillar" },
  difficulty: { fr: "Difficulté", en: "Difficulty" },
  status: { fr: "Statut", en: "Status" },
  shortSummary: { fr: "Résumé", en: "Summary" },
  simpleExplanation: { fr: "Explication simple", en: "Simple explanation" },
  deepExplanation: { fr: "Explication approfondie", en: "Deep explanation" },
  whyItMatters: { fr: "Pourquoi c'est important", en: "Why it matters" },
  prerequisites: { fr: "Prérequis", en: "Prerequisites" },
  relatedConcepts: { fr: "Concepts liés", en: "Related concepts" },
  commonMistakes: { fr: "Erreurs courantes", en: "Common mistakes" },
  examples: { fr: "Exemples", en: "Examples" },
  screenshots: { fr: "Captures d'écran attachées", en: "Attached Screenshots" },
  addScreenshot: { fr: "Ajouter une capture", en: "Add Screenshot" },
  screenshotSoon: {
    fr: "L'ajout manuel de captures sera ajouté dans la prochaine étape.",
    en: "Manual screenshot attachment will be added in the next step.",
  },
  nodeTypes: {
    central: { fr: "Centre", en: "Central" },
    pillar: { fr: "Pilier", en: "Pillar" },
    concept: { fr: "Concept", en: "Concept" },
  },
  difficulties: {
    beginner: { fr: "Débutant", en: "Beginner" },
    intermediate: { fr: "Intermédiaire", en: "Intermediate" },
    advanced: { fr: "Avancé", en: "Advanced" },
  },
  statuses: {
    not_started: { fr: "Non commencé", en: "Not started" },
    in_progress: { fr: "En cours", en: "In progress" },
    learned: { fr: "Appris", en: "Learned" },
    needs_review: { fr: "À revoir", en: "Needs review" },
  },
  commandModes: {
    addKnowledge: { fr: "Ajouter", en: "Add Knowledge" },
    askBrain: { fr: "Demander", en: "Ask Brain" },
    buildProject: { fr: "Construire", en: "Build Project" },
  },
  addKnowledgeTitle: {
    fr: "Nourrir le second cerveau",
    en: "Feed the second brain",
  },
  addKnowledgePlaceholder: {
    fr: "Colle ici une note détaillée pour nourrir ton second cerveau.",
    en: "Paste a detailed note here to feed your second brain.",
  },
  saveNote: { fr: "Enregistrer la note", en: "Save note" },
  savedNotes: { fr: "Notes enregistrées", en: "Saved notes" },
  addKnowledgeFuture: {
    fr: "L'extraction IA et la validation humaine seront ajoutées plus tard. Pour l'instant, tes notes sont sauvegardées localement.",
    en: "AI extraction and human validation will be added later. For now, your notes are saved locally.",
  },
  askBrainTitle: { fr: "Demander au cerveau", en: "Ask the brain" },
  askBrainPlaceholder: {
    fr: "Pose une question sur un sujet (ex: RAG, agent, embeddings)…",
    en: "Ask about a topic (e.g. RAG, agent, embeddings)…",
  },
  askBrainSubmit: { fr: "Rechercher", en: "Search" },
  buildProjectTitle: { fr: "Construire un projet", en: "Build a project" },
  buildProjectPlaceholder: {
    fr: "Décris ton idée de projet (ex: chatbot PDF)…",
    en: "Describe your project idea (e.g. PDF chatbot)…",
  },
  buildProjectSubmit: { fr: "Analyser", en: "Analyze" },
  knowledgeFound: { fr: "Connaissance trouvée", en: "Knowledge found" },
  partialKnowledge: {
    fr: "Connaissance partielle trouvée",
    en: "Partial knowledge found",
  },
  noKnowledge: {
    fr: "Aucune connaissance trouvée",
    en: "No knowledge found",
  },
  mainMatch: { fr: "Meilleure correspondance", en: "Best match" },
  relatedNodes: { fr: "Nœuds liés", en: "Related nodes" },
  suggestAddKnowledge: {
    fr: "Utilise « Ajouter » pour enrichir le cerveau sur ce sujet.",
    en: "Use « Add Knowledge » to enrich the brain on this topic.",
  },
  similarTerms: { fr: "Termes proches", en: "Similar terms" },
  projectType: { fr: "Type de projet", en: "Project type" },
  existingAnalysis: { fr: "Analyse du graphe existant", en: "Existing Graph Analysis" },
  whyRelevant: { fr: "Pourquoi c'est lié", en: "Why it's relevant" },
  recommendations: { fr: "Recommandations d'expansion", en: "Recommendations for Expansion" },
  newNodes: { fr: "Nouveaux nœuds proposés", en: "Suggested new nodes" },
  newConnections: { fr: "Nouvelles connexions proposées", en: "Suggested new connections" },
  noNotesYet: { fr: "Aucune note pour l'instant.", en: "No notes yet." },
} as const;

export type UIStrings = typeof uiStrings;

/** Get a UI string in the active language. */
export function ui(key: keyof UIStrings, language: Language): string {
  const value = uiStrings[key];
  if (typeof value === "object" && "fr" in value && "en" in value) {
    return value[language];
  }
  return "";
}

/** Nested UI lookup for nodeTypes, difficulties, statuses. */
export function uiNested(
  group: "nodeTypes" | "difficulties" | "statuses",
  key: string,
  language: Language,
): string {
  const map = uiStrings[group] as Record<string, { fr: string; en: string }>;
  return map[key]?.[language] ?? key;
}
