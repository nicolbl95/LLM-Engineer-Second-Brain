import type {
  BrainNode,
  Language,
  PillarId,
  ProjectAnalysis,
} from "../types/brain";
import { brainNodes } from "../data/graph";
import { lt, pick } from "./i18n";

/** Pillar accent colors for nodes and edges. */
export const PILLAR_COLORS: Record<PillarId, string> = {
  "ml-foundations": "#6366f1",
  "llm-fundamentals": "#8b5cf6",
  "rag-systems": "#06b6d4",
  "agents-workflows": "#10b981",
  "fine-tuning": "#f59e0b",
  evaluation: "#ec4899",
  deployment: "#3b82f6",
  "portfolio-projects": "#f97316",
};

export const CENTRAL_COLOR = "#e2e8f0";

/** Resolve display color for any node. */
export function getNodeColor(node: BrainNode): string {
  if (node.color) return node.color;
  if (node.type === "central") return CENTRAL_COLOR;
  if (node.pillarId) return PILLAR_COLORS[node.pillarId];
  return "#94a3b8";
}

/** Find a node by id. */
export function getNodeById(id: string): BrainNode | undefined {
  return brainNodes.find((n) => n.id === id);
}

/** All concept nodes linked to a pillar. */
export function getConceptsByPillar(pillarId: PillarId): BrainNode[] {
  return brainNodes.filter(
    (n) => n.type === "concept" && n.pillarId === pillarId,
  );
}

/** Related concept nodes for a given node. */
export function getRelatedNodes(node: BrainNode): BrainNode[] {
  return node.relatedConcepts
    .map((id) => getNodeById(id))
    .filter((n): n is BrainNode => n !== undefined);
}

/** Pillar list for filter chips. */
export function getPillarNodes(): BrainNode[] {
  return brainNodes.filter((n) => n.type === "pillar");
}

/** Keyword → concept id mapping for Build Project. */
const PROJECT_KEYWORDS: Record<string, string[]> = {
  pdf: ["chunking", "embeddings", "vector-database", "retriever", "rag", "llm"],
  chatbot: ["llm", "prompt-engineering", "rag", "memory", "fastapi"],
  document: ["chunking", "embeddings", "retriever", "rag"],
  rag: ["rag", "embeddings", "vector-database", "chunking", "retriever"],
  agent: ["agent", "tool-calling", "memory", "workflow", "langgraph"],
  workflow: ["workflow", "agent", "langgraph", "tool-calling"],
  deploy: ["docker", "fastapi", "github-pages", "huggingface-spaces"],
  fine: ["fine-tuning", "lora"],
  evaluate: ["evaluation", "ragas", "langfuse", "feedback-loop"],
  portfolio: ["portfolio-project", "github-pages", "huggingface-spaces"],
  api: ["fastapi", "docker"],
  vector: ["vector-database", "embeddings", "qdrant"],
  index: ["llamaindex", "rag", "embeddings"],
};

/** Analyze a project description against the knowledge graph. */
export function analyzeProject(description: string, _language: Language): ProjectAnalysis {
  const lower = description.toLowerCase();
  const matchedIds = new Set<string>();

  for (const [keyword, ids] of Object.entries(PROJECT_KEYWORDS)) {
    if (lower.includes(keyword)) {
      ids.forEach((id) => matchedIds.add(id));
    }
  }

  const extraMap: [string, string][] = [
    ["chatbot", "chatbot"],
    ["pdf", "pdf"],
    ["documents", "document"],
    ["agent", "agent"],
    ["déploi", "deploy"],
    ["évalu", "evaluate"],
    ["portefeuille", "portfolio"],
    ["base vectorielle", "vector"],
    ["embedding", "vector"],
  ];
  for (const [needle, key] of extraMap) {
    if (lower.includes(needle) && PROJECT_KEYWORDS[key]) {
      PROJECT_KEYWORDS[key].forEach((id) => matchedIds.add(id));
    }
  }

  const relevantNodes = [...matchedIds]
    .map((id) => getNodeById(id))
    .filter((n): n is BrainNode => n !== undefined);

  let projectType = lt("Projet GenAI général", "General GenAI project");
  if (lower.includes("pdf") || lower.includes("document")) {
    projectType = lt("Chatbot RAG sur documents", "Document RAG chatbot");
  } else if (lower.includes("agent")) {
    projectType = lt("Agent IA autonome", "Autonomous AI agent");
  } else if (lower.includes("deploy") || lower.includes("déploi")) {
    projectType = lt("Déploiement d'application LLM", "LLM app deployment");
  }

  const allRelevantIds = new Set(relevantNodes.map((n) => n.id));
  const idealRagStack = [
    "llm",
    "embeddings",
    "chunking",
    "vector-database",
    "retriever",
    "rag",
    "fastapi",
  ];
  const isRagProject =
    lower.includes("pdf") ||
    lower.includes("document") ||
    lower.includes("rag") ||
    lower.includes("chatbot");

  const missingConcepts: { fr: string; en: string }[] = [];
  if (isRagProject) {
    for (const id of idealRagStack) {
      if (!allRelevantIds.has(id)) {
        const node = getNodeById(id);
        if (node) missingConcepts.push(node.title);
      }
    }
  }

  const learningPath = isRagProject
    ? idealRagStack
        .map((id) => getNodeById(id))
        .filter((n): n is BrainNode => n !== undefined)
    : relevantNodes.slice(0, 6);

  const roadmapSteps = [
    lt(
      "1. Comprendre les concepts fondamentaux listés ci-dessus",
      "1. Understand the foundational concepts listed above",
    ),
    lt(
      "2. Prototyper un pipeline minimal (chunk → embed → retrieve → generate)",
      "2. Prototype a minimal pipeline (chunk → embed → retrieve → generate)",
    ),
    lt(
      "3. Ajouter une API FastAPI et tester avec des PDFs",
      "3. Add a FastAPI layer and test with PDFs",
    ),
    lt(
      "4. Évaluer la qualité avec RAGAS ou Langfuse",
      "4. Evaluate quality with RAGAS or Langfuse",
    ),
    lt(
      "5. Dockeriser et déployer (GitHub Pages ou Hugging Face Spaces)",
      "5. Dockerize and deploy (GitHub Pages or Hugging Face Spaces)",
    ),
  ];

  return {
    projectType,
    relevantNodes,
    missingConcepts,
    learningPath,
    roadmap: roadmapSteps,
  };
}

/** Check if a node passes the active pillar filter. */
export function nodeMatchesFilter(
  node: BrainNode,
  activePillar: PillarId | "all",
): boolean {
  if (activePillar === "all") return true;
  if (node.type === "central") return true;
  if (node.type === "pillar") return node.id === activePillar;
  return node.pillarId === activePillar;
}

/** Localized node title helper. */
export function nodeTitle(node: BrainNode, language: Language): string {
  return pick(node.title, language);
}
