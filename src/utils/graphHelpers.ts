import type {
  BrainNode,
  Language,
  LocalizedText,
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
export function analyzeProject(description: string, language: Language): ProjectAnalysis {
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

  const matchedNodes = [...matchedIds]
    .map((id) => getNodeById(id))
    .filter((n): n is BrainNode => n !== undefined);

  // Determine project type
  let projectType = lt("Projet GenAI général", "General GenAI project");
  if (lower.includes("pdf") || lower.includes("document")) {
    projectType = lt("Chatbot RAG sur documents", "Document RAG chatbot");
  } else if (lower.includes("agent")) {
    projectType = lt("Agent IA autonome", "Autonomous AI agent");
  } else if (lower.includes("deploy") || lower.includes("déploi")) {
    projectType = lt("Déploiement d'application LLM", "LLM app deployment");
  }

  const isRagProject =
    lower.includes("pdf") ||
    lower.includes("document") ||
    lower.includes("rag") ||
    lower.includes("chatbot");

  const isAgentProject = lower.includes("agent");

  const idealRagStack = [
    "llm",
    "embeddings",
    "chunking",
    "vector-database",
    "retriever",
    "rag",
    "fastapi",
  ];

  const idealAgentStack = ["llm", "prompt-engineering", "tool-calling", "memory", "workflow", "agent", "langgraph"];

  // === Part 1: Existing graph elements with explanations ===

  const existingAnalysis: { nodeId: string; nodeTitle: LocalizedText; relevanceExplanation: LocalizedText }[] = [];

  let stackToCheck: string[] = [];
  if (isRagProject) stackToCheck = idealRagStack;
  else if (isAgentProject) stackToCheck = idealAgentStack;

  // Add matched nodes with explanations
  for (const node of matchedNodes) {
    // Build contextual explanation based on what the user described
    let explanationFr = "";
    let explanationEn = "";

    if (node.id === "rag" && isRagProject) {
      explanationFr = "Le RAG est le cœur de ce projet : il connecte la recherche documentaire à la génération.";
      explanationEn = "RAG is the core of this project: it connects document retrieval to generation.";
    } else if (node.id === "embeddings") {
      explanationFr = "Les embeddings transforment le texte en vecteurs pour la recherche sémantique.";
      explanationEn = "Embeddings transform text into vectors for semantic search.";
    } else if (node.id === "chunking") {
      explanationFr = "Le chunking découpe les documents pour les rendre indexables par le retriever.";
      explanationEn = "Chunking splits documents into indexable pieces for the retriever.";
    } else if (node.id === "vector-database" || node.id === "qdrant") {
      explanationFr = "Stocke et recherche les vecteurs d'embeddings à grande échelle.";
      explanationEn = "Stores and searches embedding vectors at scale.";
    } else if (node.id === "retriever") {
      explanationFr = "Le retriever récupère les passages pertinents pour alimenter le LLM.";
      explanationEn = "The retriever fetches relevant passages to feed the LLM.";
    } else if (node.id === "llm") {
      explanationFr = "Le LLM génère la réponse finale à partir du contexte fourni.";
      explanationEn = "The LLM generates the final answer from the provided context.";
    } else if (node.id === "fastapi") {
      explanationFr = "FastAPI expose ton pipeline RAG via une API REST.";
      explanationEn = "FastAPI exposes your RAG pipeline via a REST API.";
    } else if (node.id === "docker") {
      explanationFr = "Docker conteneurise l'application pour un déploiement reproductible.";
      explanationEn = "Docker containerizes the app for reproducible deployment.";
    } else if (node.id === "agent" || node.id === "workflow" || node.id === "langgraph") {
      explanationFr = "Gère la logique d'orchestration et les boucles de raisonnement de l'agent.";
      explanationEn = "Handles orchestration logic and agent reasoning loops.";
    } else if (node.id === "tool-calling") {
      explanationFr = "Permet à l'agent d'invoquer des outils externes (API, base de données).";
      explanationEn = "Enables the agent to invoke external tools (APIs, databases).";
    } else if (node.id === "memory") {
      explanationFr = "La mémoire permet à l'agent de conserver le contexte au fil des interactions.";
      explanationEn = "Memory lets the agent retain context across interactions.";
    } else if (node.id === "evaluation" || node.id === "ragas" || node.id === "langfuse") {
      explanationFr = "L'évaluation mesure la qualité du système et guide les améliorations.";
      explanationEn = "Evaluation measures system quality and guides improvements.";
    } else if (node.id === "fine-tuning" || node.id === "lora") {
      explanationFr = "Le fine-tuning adapte le modèle à un domaine spécifique si nécessaire.";
      explanationEn = "Fine-tuning adapts the model to a specific domain if needed.";
    } else if (node.id === "github-pages" || node.id === "huggingface-spaces" || node.id === "portfolio-project") {
      explanationFr = "Option de déploiement pour présenter le projet publiquement.";
      explanationEn = "Deployment option to showcase the project publicly.";
    } else if (node.id === "prompt-engineering") {
      explanationFr = "Le prompt engineering optimise les instructions données au LLM.";
      explanationEn = "Prompt engineering optimizes the instructions given to the LLM.";
    } else if (node.id === "llamaindex") {
      explanationFr = "LlamaIndex simplifie la connexion entre les données et le LLM.";
      explanationEn = "LlamaIndex simplifies connecting data to the LLM.";
    } else {
      explanationFr = `Concept clé lié au projet : ${pick(node.title, "fr")}.`;
      explanationEn = `Key concept related to the project: ${pick(node.title, "en")}.`;
    }

    existingAnalysis.push({
      nodeId: node.id,
      nodeTitle: node.title,
      relevanceExplanation: lt(explanationFr, explanationEn),
    });
  }

  // === Part 2: Recommendations for new elements ===

  const recommendedNewElements: { type: "node" | "connection"; title: LocalizedText; description: LocalizedText; suggestedPillar?: PillarId; suggestedConnections?: string[] }[] = [];

  const matchedNodeIds = new Set(matchedNodes.map((n) => n.id));

  // Suggest missing concepts from the ideal stack
  if (isRagProject) {
    for (const id of idealRagStack) {
      if (!matchedNodeIds.has(id)) {
        const node = getNodeById(id);
        if (node) {
          recommendedNewElements.push({
            type: "node",
            title: node.title,
            description: lt(
              `Ajouter le concept « ${pick(node.title, "fr")} » — essentiel pour un pipeline RAG complet.`,
              `Add the concept "${pick(node.title, "en")}" — essential for a complete RAG pipeline.`,
            ),
            suggestedPillar: node.pillarId,
            suggestedConnections: node.relatedConcepts,
          });
        }
      }
    }
  }
  if (isAgentProject) {
    for (const id of idealAgentStack) {
      if (!matchedNodeIds.has(id)) {
        const node = getNodeById(id);
        if (node) {
          recommendedNewElements.push({
            type: "node",
            title: node.title,
            description: lt(
              `Ajouter le concept « ${pick(node.title, "fr")} » — nécessaire pour un agent fonctionnel.`,
              `Add the concept "${pick(node.title, "en")}" — necessary for a functional agent.`,
            ),
            suggestedPillar: node.pillarId,
            suggestedConnections: node.relatedConcepts,
          });
        }
      }
    }
  }

  // Suggest concrete connections between existing & new nodes
  if (isRagProject && matchedNodeIds.has("rag")) {
    // If the user described a RAG project, suggest edges
    for (const id of idealRagStack) {
      if (matchedNodeIds.has(id) && id !== "rag") {
        recommendedNewElements.push({
          type: "connection",
          title: lt(`Lien ${pick(getNodeById("rag")?.title ?? { fr: "RAG", en: "RAG" }, language)} → ${pick(getNodeById(id)?.title ?? { fr: "", en: "" }, language)}`, `Edge: RAG → ${pick(getNodeById(id)?.title ?? { fr: "", en: "" }, language)}`),
          description: lt(
            `Connecter RAG à « ${pick(getNodeById(id)?.title ?? { fr: "", en: "" }, "fr")} » pour formaliser la dépendance dans le graphe.`,
            `Connect RAG to "${pick(getNodeById(id)?.title ?? { fr: "", en: "" }, "en")}" to formalize the dependency in the graph.`,
          ),
        });
      }
    }
  }

  return {
    projectType,
    existingAnalysis,
    recommendedNewElements,
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
