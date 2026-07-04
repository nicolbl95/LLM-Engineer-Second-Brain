import type {
  BrainEdge,
  BrainNode,
  Difficulty,
  LearningStatus,
  PillarId,
} from "../types/brain";
import { lt, ll } from "../utils/i18n";

/** Metadata for each pillar (title + color reference). */
export const pillarMeta: Record<
  PillarId,
  { title: { fr: string; en: string }; color: string }
> = {
  "ml-foundations": {
    title: lt("Fondations Machine Learning", "Machine Learning Foundations"),
    color: "#6366f1",
  },
  "llm-fundamentals": {
    title: lt("Fondamentaux des LLMs", "LLM Fundamentals"),
    color: "#8b5cf6",
  },
  "rag-systems": {
    title: lt("Systèmes RAG", "RAG Systems"),
    color: "#06b6d4",
  },
  "agents-workflows": {
    title: lt("Agents & Workflows", "Agents & Workflows"),
    color: "#10b981",
  },
  "fine-tuning": {
    title: lt("Fine-tuning", "Fine-tuning"),
    color: "#f59e0b",
  },
  evaluation: {
    title: lt("Évaluation", "Evaluation"),
    color: "#ec4899",
  },
  deployment: {
    title: lt("Déploiement", "Deployment"),
    color: "#3b82f6",
  },
  "portfolio-projects": {
    title: lt("Projets Portfolio", "Portfolio Projects"),
    color: "#f97316",
  },
};

type ConceptInput = {
  id: string;
  pillarId: PillarId;
  pos: { x: number; y: number };
  title: { fr: string; en: string };
  difficulty: Difficulty;
  status?: LearningStatus;
  short: { fr: string; en: string };
  simple: { fr: string; en: string };
  deep: { fr: string; en: string };
  why: { fr: string; en: string };
  prereq: { fr: string[]; en: string[] };
  related: string[];
  mistakes: { fr: string[]; en: string[] };
  examples: { fr: string[]; en: string[] };
  fontSize?: number;
  summary?: { fr: string; en: string };
  summaryWidth?: number;
  summaryHeight?: number;
  summaryOffsetX?: number;
};

/** Build a full BrainNode from compact concept input. */
function concept(c: ConceptInput): BrainNode {
  const pillar = pillarMeta[c.pillarId].title;
  return {
    id: c.id,
    type: "concept",
    pillarId: c.pillarId,
    position: c.pos,
    title: c.title,
    pillar,
    difficulty: c.difficulty,
    status: c.status ?? "not_started",
    shortSummary: c.short,
    simpleExplanation: c.simple,
    deepExplanation: c.deep,
    whyItMatters: c.why,
    prerequisites: c.prereq,
    relatedConcepts: c.related,
    commonMistakes: c.mistakes,
    examples: c.examples,
    miniExplanation: c.short,
    fontSize: c.fontSize,
    summary: c.summary,
    summaryWidth: c.summaryWidth,
    summaryHeight: c.summaryHeight,
    summaryOffsetX: c.summaryOffsetX,
  };
}

/** All concept definitions — compact but complete bilingual content. */
const concepts: BrainNode[] = [
  concept({
    id: "llm",
    pillarId: "llm-fundamentals",
    pos: { x: 520, y: 80 },
    title: lt("LLM", "LLM"),
    difficulty: "beginner",
    short: lt(
      "Modèle de langage large entraîné sur d'immenses corpus textuels.",
      "Large language model trained on massive text corpora.",
    ),
    simple: lt(
      "Un LLM prédit le prochain token à partir du contexte. ChatGPT, Llama et Mistral en sont des exemples.",
      "An LLM predicts the next token from context. ChatGPT, Llama, and Mistral are examples.",
    ),
    deep: lt(
      "Les LLMs utilisent l'architecture Transformer avec attention. Ils capturent des patterns statistiques du langage, du code et du raisonnement, mais peuvent halluciner sans sources externes.",
      "LLMs use the Transformer architecture with attention. They capture statistical patterns in language, code, and reasoning, but can hallucinate without external sources.",
    ),
    why: lt(
      "C'est le moteur central de presque toute application GenAI moderne.",
      "It is the central engine of almost every modern GenAI application.",
    ),
    prereq: ll(["Notions de ML de base"], ["Basic ML notions"]),
    related: ["prompt-engineering", "embeddings", "rag"],
    mistakes: ll(
      ["Croire qu'un LLM « sait » toujours la vérité"],
      ["Believing an LLM always « knows » the truth"],
    ),
    examples: ll(
      ["GPT-4, Llama 3, Mistral"],
      ["GPT-4, Llama 3, Mistral"],
    ),
  }),
  concept({
    id: "prompt-engineering",
    pillarId: "llm-fundamentals",
    pos: { x: 620, y: 140 },
    title: lt("Prompt Engineering", "Prompt Engineering"),
    difficulty: "beginner",
    short: lt(
      "Art de formuler des instructions efficaces pour guider un LLM.",
      "Art of crafting effective instructions to guide an LLM.",
    ),
    simple: lt(
      "Tu écris un prompt clair avec rôle, contexte, format de sortie et exemples few-shot.",
      "You write a clear prompt with role, context, output format, and few-shot examples.",
    ),
    deep: lt(
      "Techniques : zero-shot, few-shot, chain-of-thought, system prompts. Le prompt engineering compense les limites du modèle sans réentraînement.",
      "Techniques: zero-shot, few-shot, chain-of-thought, system prompts. Prompt engineering compensates for model limits without retraining.",
    ),
    why: lt(
      "Améliore la qualité des réponses sans coût d'entraînement.",
      "Improves answer quality without training cost.",
    ),
    prereq: ll(["LLM"], ["LLM"]),
    related: ["llm", "rag", "agent"],
    mistakes: ll(
      ["Prompts trop vagues ou contradictoires"],
      ["Prompts that are too vague or contradictory"],
    ),
    examples: ll(
      ["« Tu es un expert RAG. Réponds en JSON… »"],
      ["« You are a RAG expert. Reply in JSON… »"],
    ),
  }),
  concept({
    id: "embeddings",
    pillarId: "rag-systems",
    pos: { x: 720, y: 200 },
    title: lt("Embeddings", "Embeddings"),
    difficulty: "intermediate",
    short: lt(
      "Représentations vectorielles du sens du texte.",
      "Vector representations of text meaning.",
    ),
    simple: lt(
      "Un modèle transforme une phrase en liste de nombres. Les textes similaires ont des vecteurs proches.",
      "A model turns a sentence into a list of numbers. Similar texts have close vectors.",
    ),
    deep: lt(
      "Modèles comme text-embedding-3-small ou bge-small produisent des vecteurs de 384–1536 dimensions. La similarité cosinus mesure la proximité sémantique.",
      "Models like text-embedding-3-small or bge-small produce 384–1536 dimension vectors. Cosine similarity measures semantic proximity.",
    ),
    why: lt(
      "Base de la recherche sémantique et du RAG.",
      "Foundation of semantic search and RAG.",
    ),
    prereq: ll(["LLM", "Fondations ML"], ["LLM", "ML foundations"]),
    related: ["vector-database", "chunking", "retriever"],
    mistakes: ll(
      ["Mélanger modèles d'embedding différents"],
      ["Mixing different embedding models"],
    ),
    examples: ll(
      ["OpenAI embeddings, Sentence Transformers"],
      ["OpenAI embeddings, Sentence Transformers"],
    ),
  }),
  concept({
    id: "vector-database",
    pillarId: "rag-systems",
    pos: { x: 820, y: 260 },
    title: lt("Base vectorielle", "Vector Database"),
    difficulty: "intermediate",
    short: lt(
      "Base de données optimisée pour stocker et rechercher des vecteurs.",
      "Database optimized to store and search vectors.",
    ),
    simple: lt(
      "Tu indexes des embeddings et tu retrouves les plus proches d'une requête en millisecondes.",
      "You index embeddings and retrieve the closest ones to a query in milliseconds.",
    ),
    deep: lt(
      "Utilise des index ANN (HNSW, IVF). Qdrant, Pinecone et Chroma sont populaires. Choix selon volume, filtres metadata et self-hosting.",
      "Uses ANN indexes (HNSW, IVF). Qdrant, Pinecone, and Chroma are popular. Choose based on volume, metadata filters, and self-hosting.",
    ),
    why: lt(
      "Permet le retrieval à grande échelle dans un pipeline RAG.",
      "Enables large-scale retrieval in a RAG pipeline.",
    ),
    prereq: ll(["Embeddings"], ["Embeddings"]),
    related: ["embeddings", "qdrant", "retriever"],
    mistakes: ll(
      ["Oublier les filtres metadata"],
      ["Forgetting metadata filters"],
    ),
    examples: ll(["Qdrant, Chroma, pgvector"], ["Qdrant, Chroma, pgvector"]),
  }),
  concept({
    id: "chunking",
    pillarId: "rag-systems",
    pos: { x: 700, y: 320 },
    title: lt("Chunking", "Chunking"),
    difficulty: "beginner",
    short: lt(
      "Découpage de documents en morceaux indexables.",
      "Splitting documents into indexable pieces.",
    ),
    simple: lt(
      "Un PDF est coupé en paragraphes ou fenêtres de tokens avant embedding.",
      "A PDF is split into paragraphs or token windows before embedding.",
    ),
    deep: lt(
      "Stratégies : fixed-size, recursive, semantic chunking. Taille typique 256–512 tokens avec overlap 10–20 % pour préserver le contexte.",
      "Strategies: fixed-size, recursive, semantic chunking. Typical size 256–512 tokens with 10–20% overlap to preserve context.",
    ),
    why: lt(
      "La qualité du chunking impacte directement la pertinence du RAG.",
      "Chunking quality directly impacts RAG relevance.",
    ),
    prereq: ll(["Embeddings"], ["Embeddings"]),
    related: ["embeddings", "retriever", "rag"],
    mistakes: ll(
      ["Chunks trop grands ou sans overlap"],
      ["Chunks too large or without overlap"],
    ),
    examples: ll(
      ["LangChain RecursiveCharacterTextSplitter"],
      ["LangChain RecursiveCharacterTextSplitter"],
    ),
  }),
  concept({
    id: "retriever",
    pillarId: "rag-systems",
    pos: { x: 780, y: 380 },
    title: lt("Retriever", "Retriever"),
    difficulty: "intermediate",
    short: lt(
      "Composant qui récupère les passages pertinents pour une requête.",
      "Component that fetches relevant passages for a query.",
    ),
    simple: lt(
      "La question utilisateur est embeddée, puis les top-k chunks similaires sont retournés.",
      "The user question is embedded, then the top-k similar chunks are returned.",
    ),
    deep: lt(
      "Variantes : dense retrieval, sparse (BM25), hybrid search, reranking avec cross-encoder. Le retriever alimente le contexte du LLM.",
      "Variants: dense retrieval, sparse (BM25), hybrid search, reranking with cross-encoder. The retriever feeds LLM context.",
    ),
    why: lt(
      "C'est le cœur de la précision d'un système RAG.",
      "It is the heart of RAG system accuracy.",
    ),
    prereq: ll(["Embeddings", "Base vectorielle"], ["Embeddings", "Vector Database"]),
    related: ["embeddings", "vector-database", "rag"],
    mistakes: ll(
      ["Top-k trop petit ou trop grand"],
      ["Top-k too small or too large"],
    ),
    examples: ll(["Similarity search top-5"], ["Similarity search top-5"]),
  }),
  concept({
    id: "rag",
    pillarId: "rag-systems",
    pos: { x: 680, y: 440 },
    title: lt("RAG", "RAG"),
    difficulty: "intermediate",
    short: lt(
      "Retrieval-Augmented Generation : LLM + recherche documentaire.",
      "Retrieval-Augmented Generation: LLM + document search.",
    ),
    simple: lt(
      "Retrieve des chunks pertinents, injecte-les dans le prompt, puis le LLM génère une réponse grounded.",
      "Retrieve relevant chunks, inject them into the prompt, then the LLM generates a grounded answer.",
    ),
    deep: lt(
      "Pipeline : ingest → chunk → embed → index → retrieve → augment prompt → generate. GraphRAG et BRAG étendent l'idée avec des graphes de connaissances.",
      "Pipeline: ingest → chunk → embed → index → retrieve → augment prompt → generate. GraphRAG and BRAG extend the idea with knowledge graphs.",
    ),
    why: lt(
      "Réduit les hallucinations et ancre les réponses sur tes données.",
      "Reduces hallucinations and grounds answers in your data.",
    ),
    prereq: ll(["LLM", "Retriever", "Chunking"], ["LLM", "Retriever", "Chunking"]),
    related: ["llamaindex", "retriever", "evaluation"],
    mistakes: ll(
      ["Ignorer l'évaluation du retrieval"],
      ["Ignoring retrieval evaluation"],
    ),
    examples: ll(
      ["Chatbot PDF d'entreprise"],
      ["Enterprise PDF chatbot"],
    ),
  }),
  concept({
    id: "workflow",
    pillarId: "agents-workflows",
    pos: { x: 560, y: 480 },
    title: lt("Workflow", "Workflow"),
    difficulty: "intermediate",
    short: lt(
      "Enchaînement structuré d'étapes LLM et outils.",
      "Structured sequence of LLM and tool steps.",
    ),
    simple: lt(
      "Un workflow définit l'ordre : récupérer docs → résumer → répondre.",
      "A workflow defines the order: fetch docs → summarize → answer.",
    ),
    deep: lt(
      "Peut être linéaire, conditionnel ou cyclique. LangGraph modélise les workflows comme des graphes d'états.",
      "Can be linear, conditional, or cyclic. LangGraph models workflows as state graphs.",
    ),
    why: lt(
      "Structure la complexité au-delà d'un simple prompt.",
      "Structures complexity beyond a simple prompt.",
    ),
    prereq: ll(["LLM", "Prompt Engineering"], ["LLM", "Prompt Engineering"]),
    related: ["agent", "langgraph", "tool-calling"],
    mistakes: ll(
      ["Workflows trop rigides sans branchement"],
      ["Workflows too rigid without branching"],
    ),
    examples: ll(
      ["Pipeline ingest → QA"],
      ["Ingest → QA pipeline"],
    ),
  }),
  concept({
    id: "agent",
    pillarId: "agents-workflows",
    pos: { x: 480, y: 540 },
    title: lt("Agent", "Agent"),
    difficulty: "advanced",
    short: lt(
      "Système LLM autonome qui planifie et agit via des outils.",
      "Autonomous LLM system that plans and acts via tools.",
    ),
    simple: lt(
      "L'agent reçoit un objectif, choisit des actions (search, API call) et itère jusqu'à la réponse.",
      "The agent receives a goal, chooses actions (search, API call), and iterates until done.",
    ),
    deep: lt(
      "Boucle ReAct : Reason → Act → Observe. Combine LLM, memory, tool calling et guardrails.",
      "ReAct loop: Reason → Act → Observe. Combines LLM, memory, tool calling, and guardrails.",
    ),
    why: lt(
      "Permet d'automatiser des tâches multi-étapes complexes.",
      "Enables automating complex multi-step tasks.",
    ),
    prereq: ll(["Workflow", "Tool Calling"], ["Workflow", "Tool Calling"]),
    related: ["langgraph", "memory", "tool-calling"],
    mistakes: ll(
      ["Agents sans limites de boucles"],
      ["Agents without loop limits"],
    ),
    examples: ll(
      ["Agent recherche web + calcul"],
      ["Web search + calculator agent"],
    ),
  }),
  concept({
    id: "tool-calling",
    pillarId: "agents-workflows",
    pos: { x: 400, y: 480 },
    title: lt("Tool Calling", "Tool Calling"),
    difficulty: "intermediate",
    short: lt(
      "Capacité du LLM à invoquer des fonctions externes.",
      "LLM ability to invoke external functions.",
    ),
    simple: lt(
      "Le modèle retourne un JSON structuré ; ton code exécute la fonction et renvoie le résultat.",
      "The model returns structured JSON; your code runs the function and returns the result.",
    ),
    deep: lt(
      "OpenAI function calling, LangChain tools, MCP. Le schéma JSON doit être précis pour éviter les erreurs.",
      "OpenAI function calling, LangChain tools, MCP. JSON schema must be precise to avoid errors.",
    ),
    why: lt(
      "Connecte le LLM au monde réel (APIs, DB, fichiers).",
      "Connects the LLM to the real world (APIs, DB, files).",
    ),
    prereq: ll(["LLM", "Prompt Engineering"], ["LLM", "Prompt Engineering"]),
    related: ["agent", "workflow"],
    mistakes: ll(
      ["Schémas d'outils mal documentés"],
      ["Poorly documented tool schemas"],
    ),
    examples: ll(
      ["search_web(query), send_email(to, body)"],
      ["search_web(query), send_email(to, body)"],
    ),
  }),
  concept({
    id: "memory",
    pillarId: "agents-workflows",
    pos: { x: 320, y: 540 },
    title: lt("Mémoire", "Memory"),
    difficulty: "intermediate",
    short: lt(
      "Stockage du contexte conversationnel et des faits.",
      "Storage of conversational context and facts.",
    ),
    simple: lt(
      "Buffer window garde les N derniers messages ; summary memory compresse l'historique.",
      "Buffer window keeps last N messages; summary memory compresses history.",
    ),
    deep: lt(
      "Types : short-term (buffer), long-term (vector store), entity memory. Essentiel pour chatbots multi-tours cohérents.",
      "Types: short-term (buffer), long-term (vector store), entity memory. Essential for coherent multi-turn chatbots.",
    ),
    why: lt(
      "Sans mémoire, chaque requête est isolée.",
      "Without memory, each request is isolated.",
    ),
    prereq: ll(["LLM"], ["LLM"]),
    related: ["agent", "vector-database"],
    mistakes: ll(
      ["Contexte trop long → coût et bruit"],
      ["Context too long → cost and noise"],
    ),
    examples: ll(
      ["ConversationBufferMemory"],
      ["ConversationBufferMemory"],
    ),
  }),
  concept({
    id: "feedback-loop",
    pillarId: "evaluation",
    pos: { x: 180, y: 480 },
    title: lt("Boucle de feedback", "Feedback Loop"),
    difficulty: "intermediate",
    short: lt(
      "Cycle d'amélioration basé sur retours utilisateurs et métriques.",
      "Improvement cycle based on user feedback and metrics.",
    ),
    simple: lt(
      "Collecte thumbs up/down, logs et traces pour affiner prompts et retrieval.",
      "Collect thumbs up/down, logs, and traces to refine prompts and retrieval.",
    ),
    deep: lt(
      "Intègre Langfuse traces, evals automatiques et revue humaine. Ferme la boucle produit → mesure → amélioration.",
      "Integrates Langfuse traces, automatic evals, and human review. Closes the product → measure → improve loop.",
    ),
    why: lt(
      "Un système LLM sans feedback stagne rapidement.",
      "An LLM system without feedback stagnates quickly.",
    ),
    prereq: ll(["Évaluation"], ["Evaluation"]),
    related: ["langfuse", "evaluation", "ragas"],
    mistakes: ll(
      ["Optimiser sans données représentatives"],
      ["Optimizing without representative data"],
    ),
    examples: ll(
      ["A/B test de prompts"],
      ["A/B testing prompts"],
    ),
  }),
  concept({
    id: "langgraph",
    pillarId: "agents-workflows",
    pos: { x: 440, y: 600 },
    title: lt("LangGraph", "LangGraph"),
    difficulty: "advanced",
    short: lt(
      "Framework pour construire des agents et workflows en graphe d'états.",
      "Framework to build agents and workflows as state graphs.",
    ),
    simple: lt(
      "Tu définis des nœuds (étapes) et des arêtes (transitions) avec état partagé.",
      "You define nodes (steps) and edges (transitions) with shared state.",
    ),
    deep: lt(
      "Supporte cycles, checkpoints, human-in-the-loop. Idéal pour agents robustes en production.",
      "Supports cycles, checkpoints, human-in-the-loop. Ideal for robust production agents.",
    ),
    why: lt(
      "Standard de facto pour agents complexes en Python.",
      "De facto standard for complex Python agents.",
    ),
    prereq: ll(["Agent", "Workflow"], ["Agent", "Workflow"]),
    related: ["agent", "workflow"],
    mistakes: ll(
      ["Graphes trop complexes sans tests"],
      ["Overly complex graphs without tests"],
    ),
    examples: ll(
      ["Agent multi-outils avec routing"],
      ["Multi-tool agent with routing"],
    ),
  }),
  concept({
    id: "llamaindex",
    pillarId: "rag-systems",
    pos: { x: 860, y: 440 },
    title: lt("LlamaIndex", "LlamaIndex"),
    difficulty: "intermediate",
    short: lt(
      "Framework data-centric pour applications LLM et RAG.",
      "Data-centric framework for LLM and RAG applications.",
    ),
    simple: lt(
      "LlamaIndex connecte tes données (PDF, APIs) à un LLM via index et query engines.",
      "LlamaIndex connects your data (PDFs, APIs) to an LLM via indexes and query engines.",
    ),
    deep: lt(
      "Abstractions : documents, nodes, indices (vector, tree, keyword). Query engines orchestrate retrieval + synthesis.",
      "Abstractions: documents, nodes, indices (vector, tree, keyword). Query engines orchestrate retrieval + synthesis.",
    ),
    why: lt(
      "Accélère le prototypage RAG avec des patterns éprouvés.",
      "Speeds up RAG prototyping with proven patterns.",
    ),
    prereq: ll(["RAG", "Embeddings"], ["RAG", "Embeddings"]),
    related: ["rag", "embeddings"],
    mistakes: ll(
      ["Utiliser le mauvais type d'index"],
      ["Using the wrong index type"],
    ),
    examples: ll(
      ["VectorStoreIndex sur PDFs"],
      ["VectorStoreIndex on PDFs"],
    ),
  }),
  concept({
    id: "qdrant",
    pillarId: "rag-systems",
    pos: { x: 900, y: 320 },
    title: lt("Qdrant", "Qdrant"),
    difficulty: "intermediate",
    short: lt(
      "Base vectorielle open-source performante.",
      "High-performance open-source vector database.",
    ),
    simple: lt(
      "Qdrant stocke des vecteurs avec filtres payload et recherche rapide.",
      "Qdrant stores vectors with payload filters and fast search.",
    ),
    deep: lt(
      "Self-hostable via Docker, API REST/gRPC, supporte quantization et multi-tenant. Populaire en RAG self-hosted.",
      "Self-hostable via Docker, REST/gRPC API, supports quantization and multi-tenant. Popular in self-hosted RAG.",
    ),
    why: lt(
      "Excellent choix open-source pour projets portfolio.",
      "Excellent open-source choice for portfolio projects.",
    ),
    prereq: ll(["Base vectorielle"], ["Vector Database"]),
    related: ["vector-database", "docker"],
    mistakes: ll(
      ["Mauvaise config HNSW pour petits jeux de données"],
      ["Wrong HNSW config for small datasets"],
    ),
    examples: ll(
      ["Qdrant + FastAPI RAG API"],
      ["Qdrant + FastAPI RAG API"],
    ),
  }),
  concept({
    id: "fine-tuning",
    pillarId: "fine-tuning",
    pos: { x: 400, y: 620 },
    title: lt("Fine-tuning", "Fine-tuning"),
    difficulty: "advanced",
    short: lt(
      "Réentraînement partiel d'un LLM sur des données spécifiques.",
      "Partial retraining of an LLM on specific data.",
    ),
    simple: lt(
      "Tu adaptes un modèle pré-entraîné à ton domaine (support client, juridique).",
      "You adapt a pretrained model to your domain (support, legal).",
    ),
    deep: lt(
      "Full fine-tuning vs PEFT (LoRA, QLoRA). Nécessite dataset curé, GPU et eval rigoureuse pour éviter le catastrophic forgetting.",
      "Full fine-tuning vs PEFT (LoRA, QLoRA). Requires curated dataset, GPU, and rigorous eval to avoid catastrophic forgetting.",
    ),
    why: lt(
      "Personnalise le comportement quand le prompt seul ne suffit pas.",
      "Personalizes behavior when prompting alone is not enough.",
    ),
    prereq: ll(["LLM", "Fondations ML"], ["LLM", "ML foundations"]),
    related: ["lora", "evaluation"],
    mistakes: ll(
      ["Fine-tuner sans eval set"],
      ["Fine-tuning without an eval set"],
    ),
    examples: ll(
      ["Adapter un Llama au ton de marque"],
      ["Adapt Llama to brand tone"],
    ),
  }),
  concept({
    id: "lora",
    pillarId: "fine-tuning",
    pos: { x: 300, y: 620 },
    title: lt("LoRA", "LoRA"),
    difficulty: "advanced",
    short: lt(
      "Low-Rank Adaptation : fine-tuning léger et efficace.",
      "Low-Rank Adaptation: lightweight efficient fine-tuning.",
    ),
    simple: lt(
      "Seules de petites matrices adaptatives sont entraînées, pas tout le modèle.",
      "Only small adapter matrices are trained, not the full model.",
    ),
    deep: lt(
      "LoRA injecte des matrices bas-rang dans les couches attention. QLoRA quantize le modèle base pour GPU consumer.",
      "LoRA injects low-rank matrices into attention layers. QLoRA quantizes the base model for consumer GPUs.",
    ),
    why: lt(
      "Rend le fine-tuning accessible sans cluster GPU.",
      "Makes fine-tuning accessible without a GPU cluster.",
    ),
    prereq: ll(["Fine-tuning"], ["Fine-tuning"]),
    related: ["fine-tuning"],
    mistakes: ll(
      ["Rank LoRA mal choisi"],
      ["Poorly chosen LoRA rank"],
    ),
    examples: ll(
      ["PEFT + Hugging Face Trainer"],
      ["PEFT + Hugging Face Trainer"],
    ),
  }),
  concept({
    id: "evaluation",
    pillarId: "evaluation",
    pos: { x: 120, y: 400 },
    title: lt("Évaluation", "Evaluation"),
    difficulty: "intermediate",
    short: lt(
      "Mesure objective de la qualité d'un système LLM.",
      "Objective measurement of LLM system quality.",
    ),
    simple: lt(
      "Tu définis des métriques (exactitude, faithfulness) sur un jeu de test.",
      "You define metrics (accuracy, faithfulness) on a test set.",
    ),
    deep: lt(
      "Niveaux : unit tests prompts, evals retrieval, evals end-to-end, evals humaines. Sans eval, tu navigues à l'aveugle.",
      "Levels: prompt unit tests, retrieval evals, end-to-end evals, human evals. Without eval, you fly blind.",
    ),
    why: lt(
      "Indispensable avant mise en production.",
      "Essential before production deployment.",
    ),
    prereq: ll(["RAG ou Agent"], ["RAG or Agent"]),
    related: ["ragas", "langfuse", "feedback-loop"],
    mistakes: ll(
      ["Eval sur 3 exemples seulement"],
      ["Eval on only 3 examples"],
    ),
    examples: ll(
      ["Golden set de 50 questions"],
      ["Golden set of 50 questions"],
    ),
  }),
  concept({
    id: "ragas",
    pillarId: "evaluation",
    pos: { x: 60, y: 340 },
    title: lt("RAGAS", "RAGAS"),
    difficulty: "intermediate",
    short: lt(
      "Framework d'évaluation automatique pour pipelines RAG.",
      "Automatic evaluation framework for RAG pipelines.",
    ),
    simple: lt(
      "RAGAS score faithfulness, answer relevance et context precision.",
      "RAGAS scores faithfulness, answer relevance, and context precision.",
    ),
    deep: lt(
      "Utilise un LLM juge pour métriques sans labels parfaits. Intégrable en CI pour regression testing RAG.",
      "Uses an LLM judge for metrics without perfect labels. Integrable in CI for RAG regression testing.",
    ),
    why: lt(
      "Standard open-source pour eval RAG reproductible.",
      "Open-source standard for reproducible RAG eval.",
    ),
    prereq: ll(["RAG", "Évaluation"], ["RAG", "Evaluation"]),
    related: ["evaluation", "rag"],
    mistakes: ll(
      ["Faire confiance aveuglément au LLM juge"],
      ["Blindly trusting the LLM judge"],
    ),
    examples: ll(
      ["ragas.evaluate(dataset)"],
      ["ragas.evaluate(dataset)"],
    ),
  }),
  concept({
    id: "langfuse",
    pillarId: "evaluation",
    pos: { x: 60, y: 260 },
    title: lt("Langfuse", "Langfuse"),
    difficulty: "intermediate",
    short: lt(
      "Observabilité et tracing pour applications LLM.",
      "Observability and tracing for LLM applications.",
    ),
    simple: lt(
      "Langfuse enregistre prompts, latences, coûts et scores par requête.",
      "Langfuse logs prompts, latencies, costs, and scores per request.",
    ),
    deep: lt(
      "Traces hiérarchiques (span par étape RAG), datasets eval, prompt management. Self-hostable.",
      "Hierarchical traces (span per RAG step), eval datasets, prompt management. Self-hostable.",
    ),
    why: lt(
      "Debug et amélioration continue en production.",
      "Debug and continuous improvement in production.",
    ),
    prereq: ll(["RAG ou Agent"], ["RAG or Agent"]),
    related: ["feedback-loop", "evaluation"],
    mistakes: ll(
      ["Ne pas tracer le retrieval séparément"],
      ["Not tracing retrieval separately"],
    ),
    examples: ll(
      ["Trace ingest → retrieve → generate"],
      ["Trace ingest → retrieve → generate"],
    ),
  }),
  concept({
    id: "fastapi",
    pillarId: "deployment",
    pos: { x: 120, y: 180 },
    title: lt("FastAPI", "FastAPI"),
    difficulty: "beginner",
    short: lt(
      "Framework Python rapide pour exposer des APIs LLM.",
      "Fast Python framework to expose LLM APIs.",
    ),
    simple: lt(
      "Tu crées un endpoint /chat qui appelle ton pipeline RAG.",
      "You create a /chat endpoint that calls your RAG pipeline.",
    ),
    deep: lt(
      "Async, validation Pydantic, OpenAPI auto. Pattern standard : API → service layer → vector store + LLM.",
      "Async, Pydantic validation, auto OpenAPI. Standard pattern: API → service layer → vector store + LLM.",
    ),
    why: lt(
      "Pont entre frontend et backend LLM.",
      "Bridge between frontend and LLM backend.",
    ),
    prereq: ll(["Python de base"], ["Basic Python"]),
    related: ["docker", "rag"],
    mistakes: ll(
      ["Logique métier directement dans la route"],
      ["Business logic directly in the route"],
    ),
    examples: ll(
      ["POST /query { question }"],
      ["POST /query { question }"],
    ),
  }),
  concept({
    id: "docker",
    pillarId: "deployment",
    pos: { x: 220, y: 120 },
    title: lt("Docker", "Docker"),
    difficulty: "beginner",
    short: lt(
      "Conteneurisation pour déployer des apps LLM de façon reproductible.",
      "Containerization to deploy LLM apps reproducibly.",
    ),
    simple: lt(
      "Tu empaquettes app + dépendances dans une image Docker.",
      "You package app + dependencies in a Docker image.",
    ),
    deep: lt(
      "Docker Compose orchestre API + Qdrant + worker. Essentiel pour dev/prod parity.",
      "Docker Compose orchestrates API + Qdrant + worker. Essential for dev/prod parity.",
    ),
    why: lt(
      "Simplifie le déploiement et le partage de projets.",
      "Simplifies deployment and project sharing.",
    ),
    prereq: ll(["FastAPI"], ["FastAPI"]),
    related: ["fastapi", "qdrant"],
    mistakes: ll(
      ["Images trop lourdes sans multi-stage build"],
      ["Images too heavy without multi-stage build"],
    ),
    examples: ll(
      ["docker compose up pour stack RAG"],
      ["docker compose up for RAG stack"],
    ),
  }),
  concept({
    id: "github-pages",
    pillarId: "deployment",
    pos: { x: 60, y: 120 },
    title: lt("GitHub Pages", "GitHub Pages"),
    difficulty: "beginner",
    short: lt(
      "Hébergement statique gratuit pour frontends et portfolios.",
      "Free static hosting for frontends and portfolios.",
    ),
    simple: lt(
      "Tu déploies ton UI React/Vite via GitHub Actions sur Pages.",
      "You deploy your React/Vite UI via GitHub Actions to Pages.",
    ),
    deep: lt(
      "Idéal pour demos frontend. L'API LLM reste sur Render, HF Spaces ou VPS séparé.",
      "Ideal for frontend demos. The LLM API stays on Render, HF Spaces, or a separate VPS.",
    ),
    why: lt(
      "Portfolio visible publiquement sans coût.",
      "Publicly visible portfolio at no cost.",
    ),
    prereq: ll(["Git"], ["Git"]),
    related: ["portfolio-project", "huggingface-spaces"],
    mistakes: ll(
      ["Exposer des clés API dans le frontend"],
      ["Exposing API keys in the frontend"],
    ),
    examples: ll(
      ["Site portfolio + lien vers demo API"],
      ["Portfolio site + link to API demo"],
    ),
  }),
  concept({
    id: "huggingface-spaces",
    pillarId: "deployment",
    pos: { x: 60, y: 60 },
    title: lt("Hugging Face Spaces", "Hugging Face Spaces"),
    difficulty: "beginner",
    short: lt(
      "Plateforme pour héberger des demos ML/LLM interactives.",
      "Platform to host interactive ML/LLM demos.",
    ),
    simple: lt(
      "Tu pousses un repo Gradio ou Streamlit ; HF fournit le GPU optionnel.",
      "You push a Gradio or Streamlit repo; HF provides optional GPU.",
    ),
    deep: lt(
      "Gratuit tier CPU, GPU payant. Excellent pour demos RAG et fine-tuning showcase.",
      "Free CPU tier, paid GPU. Excellent for RAG demos and fine-tuning showcase.",
    ),
    why: lt(
      "Visibilité communauté ML + hébergement simple.",
      "ML community visibility + simple hosting.",
    ),
    prereq: ll(["Python"], ["Python"]),
    related: ["portfolio-project", "docker"],
    mistakes: ll(
      ["Space timeout sur requêtes longues"],
      ["Space timeout on long requests"],
    ),
    examples: ll(
      ["Gradio chatbot RAG"],
      ["Gradio RAG chatbot"],
    ),
  }),
  concept({
    id: "portfolio-project",
    pillarId: "portfolio-projects",
    pos: { x: 200, y: 60 },
    title: lt("Projet Portfolio", "Portfolio Project"),
    difficulty: "intermediate",
    short: lt(
      "Projet démontrable combinant plusieurs compétences LLM.",
      "Demonstrable project combining multiple LLM skills.",
    ),
    simple: lt(
      "Ex : chatbot RAG PDF avec eval, API FastAPI, demo en ligne et README soigné.",
      "E.g. PDF RAG chatbot with eval, FastAPI, live demo, and polished README.",
    ),
    deep: lt(
      "Un bon portfolio montre : problème, archi, stack, métriques eval, limites connues et prochaines étapes.",
      "A good portfolio shows: problem, architecture, stack, eval metrics, known limits, and next steps.",
    ),
    why: lt(
      "Preuve concrète pour recruteurs et clients.",
      "Concrete proof for recruiters and clients.",
    ),
    prereq: ll(["RAG", "Déploiement"], ["RAG", "Deployment"]),
    related: ["rag", "github-pages", "huggingface-spaces", "evaluation"],
    mistakes: ll(
      ["Projet sans README ni demo"],
      ["Project without README or demo"],
    ),
    examples: ll(
      ["Assistant docs interne RAG"],
      ["Internal docs RAG assistant"],
    ),
  }),
];

/** Central hub node. */
const centralNode: BrainNode = {
  id: "central",
  type: "central",
  position: { x: 400, y: 320 },
  title: lt("Ingénieur LLM", "LLM Engineer"),
  shortSummary: lt(
    "Centre du second cerveau — parcours d'apprentissage GenAI.",
    "Center of the second brain — GenAI learning journey.",
  ),
  simpleExplanation: lt(
    "Point de départ pour explorer les piliers du LLM engineering.",
    "Starting point to explore LLM engineering pillars.",
  ),
  deepExplanation: lt(
    "Ce nœud connecte les 8 piliers : ML, LLMs, RAG, Agents, Fine-tuning, Eval, Deploy, Portfolio.",
    "This node connects 8 pillars: ML, LLMs, RAG, Agents, Fine-tuning, Eval, Deploy, Portfolio.",
  ),
  whyItMatters: lt(
    "Structure visuelle de ton parcours d'apprentissage.",
    "Visual structure of your learning path.",
  ),
  prerequisites: ll([], []),
  relatedConcepts: [],
  commonMistakes: ll([], []),
  examples: ll([], []),
  miniExplanation: lt(
    "Centre du graphe — parcours GenAI structuré.",
    "Graph center — structured GenAI journey.",
  ),
  summary: lt(
    "Ce graphe représente ton parcours complet pour devenir ingénieur LLM.",
    "This graph represents your complete journey to become an LLM engineer.",
  ),
  summaryWidth: 520,
  summaryHeight: 120,
  summaryOffsetX: 0,
};

/** Eight pillar nodes arranged around the center. */
const pillarNodes: BrainNode[] = (
  [
    ["ml-foundations", { x: 400, y: 120 }],
    ["llm-fundamentals", { x: 560, y: 180 }],
    ["rag-systems", { x: 620, y: 320 }],
    ["agents-workflows", { x: 560, y: 460 }],
    ["fine-tuning", { x: 400, y: 520 }],
    ["evaluation", { x: 240, y: 460 }],
    ["deployment", { x: 180, y: 320 }],
    ["portfolio-projects", { x: 240, y: 180 }],
  ] as [PillarId, { x: number; y: number }][]
).map(([id, pos]) => ({
  id,
  type: "pillar" as const,
  pillarId: id,
  position: pos,
  title: pillarMeta[id].title,
  shortSummary: lt(
    `Pilier : ${pillarMeta[id].title.fr}`,
    `Pillar: ${pillarMeta[id].title.en}`,
  ),
  simpleExplanation: lt(
    `Explore les concepts du pilier ${pillarMeta[id].title.fr}.`,
    `Explore concepts in the ${pillarMeta[id].title.en} pillar.`,
  ),
  deepExplanation: lt(
    `Ce pilier regroupe les connaissances essentielles en ${pillarMeta[id].title.fr}.`,
    `This pillar groups essential knowledge in ${pillarMeta[id].title.en}.`,
  ),
  whyItMatters: lt(
    "Organise le graphe par domaine d'expertise.",
    "Organizes the graph by expertise domain.",
  ),
  prerequisites: ll([], []),
  relatedConcepts: [],
  commonMistakes: ll([], []),
  examples: ll([], []),
  miniExplanation: lt(
    `Pilier : ${pillarMeta[id].title.fr}`,
    `Pillar: ${pillarMeta[id].title.en}`,
  ),
}));

export const brainNodes: BrainNode[] = [
  centralNode,
  ...pillarNodes,
  ...concepts,
];

/** Graph edges — central to pillars, pillars to concepts, concept relationships. */
export const brainEdges: BrainEdge[] = [
  // Central → pillars
  ...pillarNodes.map((p) => ({
    id: `e-central-${p.id}`,
    source: "central",
    target: p.id,
    relationshipType: "part_of" as const,
    label: lt("pilier", "pillar"),
  })),
  // Pillars → their concepts
  ...concepts.map((c) => ({
    id: `e-${c.pillarId}-${c.id}`,
    source: c.pillarId!,
    target: c.id,
    relationshipType: "belongs_to" as const,
    label: lt("concept", "concept"),
  })),
  // Key concept relationships
  { id: "e-llm-pe", source: "llm", target: "prompt-engineering", relationshipType: "related", label: lt("utilise", "uses") },
  { id: "e-emb-vdb", source: "embeddings", target: "vector-database", relationshipType: "uses", label: lt("stocké dans", "stored in") },
  { id: "e-chunk-rag", source: "chunking", target: "rag", relationshipType: "prerequisite", label: lt("étape", "step") },
  { id: "e-ret-rag", source: "retriever", target: "rag", relationshipType: "prerequisite", label: lt("alimente", "feeds") },
  { id: "e-rag-llama", source: "rag", target: "llamaindex", relationshipType: "related", label: lt("framework", "framework") },
  { id: "e-agent-lg", source: "agent", target: "langgraph", relationshipType: "uses", label: lt("implémenté avec", "built with") },
  { id: "e-agent-tool", source: "agent", target: "tool-calling", relationshipType: "uses", label: lt("utilise", "uses") },
  { id: "e-ft-lora", source: "fine-tuning", target: "lora", relationshipType: "related", label: lt("technique", "technique") },
  { id: "e-eval-ragas", source: "evaluation", target: "ragas", relationshipType: "uses", label: lt("outil", "tool") },
  { id: "e-eval-lf", source: "evaluation", target: "langfuse", relationshipType: "uses", label: lt("observabilité", "observability") },
  { id: "e-api-docker", source: "fastapi", target: "docker", relationshipType: "related", label: lt("déployé via", "deployed via") },
  { id: "e-portfolio-rag", source: "portfolio-project", target: "rag", relationshipType: "uses", label: lt("démontre", "showcases") },
  { id: "e-vdb-qdrant", source: "vector-database", target: "qdrant", relationshipType: "related", label: lt("exemple", "example") },
];
