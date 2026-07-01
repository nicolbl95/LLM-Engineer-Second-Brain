/** Supported UI languages — only one is shown at a time. */
export type Language = "fr" | "en";

/** Bilingual text stored in data; UI picks one field via `text[language]`. */
export type LocalizedText = { fr: string; en: string };

/** Bilingual list of strings (prerequisites, mistakes, examples). */
export type LocalizedList = { fr: string[]; en: string[] };

export type BrainNodeType = "central" | "pillar" | "concept";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type LearningStatus =
  | "not_started"
  | "in_progress"
  | "learned"
  | "needs_review";

export type RelationshipType =
  | "belongs_to"
  | "prerequisite"
  | "related"
  | "uses"
  | "part_of";

/** Unique identifier for each learning pillar. */
export type PillarId =
  | "ml-foundations"
  | "llm-fundamentals"
  | "rag-systems"
  | "agents-workflows"
  | "fine-tuning"
  | "evaluation"
  | "deployment"
  | "portfolio-projects";

/** Core knowledge node — central, pillar, or concept. */
export interface BrainNode {
  id: string;
  type: BrainNodeType;
  /** Parent pillar for concept nodes. */
  pillarId?: PillarId;
  /** Optional override color for the node. */
  color?: string;
  position: { x: number; y: number };
  title: LocalizedText;
  /** Human-readable pillar name (concepts only). */
  pillar?: LocalizedText;
  difficulty?: Difficulty;
  status?: LearningStatus;
  shortSummary: LocalizedText;
  simpleExplanation: LocalizedText;
  deepExplanation: LocalizedText;
  whyItMatters: LocalizedText;
  prerequisites: LocalizedList;
  /** IDs of related concept nodes. */
  relatedConcepts: string[];
  commonMistakes: LocalizedList;
  examples: LocalizedList;
}

/** Connection between two nodes in the graph. */
export interface BrainEdge {
  id: string;
  source: string;
  target: string;
  relationshipType: RelationshipType;
  label?: LocalizedText;
}

/** Result of searching / asking the brain. */
export type SearchResultType = "full" | "partial" | "none";

export interface SearchResult {
  type: SearchResultType;
  query: string;
  bestMatch?: BrainNode;
  matches: BrainNode[];
  relatedNodes: BrainNode[];
  summary: LocalizedText;
  /** Where partial matches were found (partial only). */
  mentionDetails?: LocalizedText;
  /** Close term suggestions when nothing matches. */
  suggestions: string[];
}

/** Saved user note (Add Knowledge MVP). */
export interface SavedNote {
  id: string;
  text: string;
  createdAt: string;
}

/** Build Project analysis result. */
export interface ProjectAnalysis {
  projectType: LocalizedText;
  relevantNodes: BrainNode[];
  missingConcepts: LocalizedText[];
  learningPath: BrainNode[];
  roadmap: LocalizedText[];
}
