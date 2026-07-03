import type { BrainNode, Language, SearchResult } from "../types/brain";
import { brainNodes, brainEdges } from "../data/graph";
import { pick } from "./i18n";
import { getRelatedNodes } from "./graphHelpers";
import { lt } from "./i18n";

type MaybeLocalizedText = {
  fr: string;
  en: string;
};

type ExtendedBrainNode = BrainNode & {
  miniExplanation?: MaybeLocalizedText;
  explanation?: MaybeLocalizedText;
};

function difficultyLabel(difficulty: BrainNode["difficulty"], language: Language) {
  if (language === "en") return difficulty;

  if (difficulty === "beginner") return "débutant";
  if (difficulty === "intermediate") return "intermédiaire";
  return "avancé";
}

function getNodeText(node: BrainNode, language: Language): string {
  const extended = node as ExtendedBrainNode;

  const parts = [
    pick(node.title, language),
    pick(node.shortSummary, language),
    pick(node.simpleExplanation, language),
    pick(node.deepExplanation, language),
    extended.miniExplanation ? pick(extended.miniExplanation, language) : "",
    extended.explanation ? pick(extended.explanation, language) : "",
    ...node.prerequisites[language],
    ...node.commonMistakes[language],
    ...node.examples[language],
  ];

  return parts.filter(Boolean).join(" ");
}

function getNodeTitleById(id: string, language: Language): string {
  const node = brainNodes.find((n) => n.id === id);
  return node ? pick(node.title, language) : id;
}

function getEdgeLabel(edge: (typeof brainEdges)[number], language: Language): string {
  if (!edge.label) return language === "fr" ? "lié à" : "related to";
  return pick(edge.label, language);
}

/**
 * Finds graph edges involving at least one matched node.
 * This is more useful than only showing edges where both source and target matched,
 * because it reveals how the matched concepts connect to the wider map.
 */
function getRelevantEdges(matches: BrainNode[]) {
  const matchedIds = new Set(matches.map((m) => m.id));

  return brainEdges.filter(
    (edge) => matchedIds.has(edge.source) || matchedIds.has(edge.target),
  );
}

function getMissingSuggestions(query: string, matches: BrainNode[]) {
  const lowerQuery = query.toLowerCase();
  const matchedIds = new Set(matches.map((m) => m.id));

  const domains = [
    {
      name: "RAG",
      keywords: [
        "rag",
        "retrieval",
        "document",
        "pdf",
        "search",
        "vector",
        "embedding",
        "embed",
        "chunk",
        "index",
        "retriever",
        "database",
        "graphrag",
      ],
      foundationalNodeIds: [
        "chunking",
        "embeddings",
        "vector-database",
        "retriever",
        "rag",
        "llamaindex",
        "qdrant",
      ],
      advancedSuggestions: [
        {
          node: {
            fr: "GraphRAG",
            en: "GraphRAG",
          },
          why: {
            fr: "Ajoute une couche graphe de connaissances au RAG pour mieux relier les entités, concepts et documents.",
            en: "Adds a knowledge graph layer to RAG to better connect entities, concepts, and documents.",
          },
        },
        {
          node: {
            fr: "Reranking",
            en: "Reranking",
          },
          why: {
            fr: "Réordonne les chunks récupérés avant de les envoyer au LLM pour améliorer la pertinence.",
            en: "Reorders retrieved chunks before sending them to the LLM to improve relevance.",
          },
        },
        {
          node: {
            fr: "Hybrid Search",
            en: "Hybrid Search",
          },
          why: {
            fr: "Combine recherche vectorielle et recherche keyword/BM25 pour améliorer la récupération.",
            en: "Combines vector search and keyword/BM25 search to improve retrieval.",
          },
        },
      ],
    },
    {
      name: "Agents & Workflows",
      keywords: [
        "agent",
        "workflow",
        "tool",
        "tools",
        "memory",
        "langgraph",
        "plan",
        "planning",
        "reason",
        "react",
        "feedback",
      ],
      foundationalNodeIds: [
        "workflow",
        "agent",
        "tool-calling",
        "memory",
        "feedback-loop",
        "langgraph",
      ],
      advancedSuggestions: [
        {
          node: {
            fr: "Orchestration multi-agents",
            en: "Multi-agent orchestration",
          },
          why: {
            fr: "Permet de coordonner plusieurs agents spécialisés dans un même système.",
            en: "Coordinates several specialized agents inside one system.",
          },
        },
        {
          node: {
            fr: "Human-in-the-loop",
            en: "Human-in-the-loop",
          },
          why: {
            fr: "Ajoute des points de validation humaine dans les workflows ou agents.",
            en: "Adds human validation points inside workflows or agents.",
          },
        },
      ],
    },
    {
      name: "Fine-tuning",
      keywords: [
        "fine",
        "fine-tuning",
        "finetuning",
        "tune",
        "tuning",
        "lora",
        "qlora",
        "peft",
        "train",
        "training",
        "adapt",
      ],
      foundationalNodeIds: ["fine-tuning", "lora"],
      advancedSuggestions: [
        {
          node: {
            fr: "QLoRA",
            en: "QLoRA",
          },
          why: {
            fr: "Permet de fine-tuner des modèles plus grands avec moins de mémoire GPU.",
            en: "Allows fine-tuning larger models with less GPU memory.",
          },
        },
        {
          node: {
            fr: "DPO",
            en: "DPO",
          },
          why: {
            fr: "Méthode d’alignement basée sur les préférences sans reward model complexe.",
            en: "Preference-based alignment method without a complex reward model.",
          },
        },
      ],
    },
    {
      name: "Evaluation",
      keywords: [
        "eval",
        "evaluation",
        "measure",
        "test",
        "benchmark",
        "score",
        "ragas",
        "langfuse",
        "feedback",
        "judge",
      ],
      foundationalNodeIds: ["evaluation", "ragas", "langfuse", "feedback-loop"],
      advancedSuggestions: [
        {
          node: {
            fr: "LLM-as-a-judge",
            en: "LLM-as-a-judge",
          },
          why: {
            fr: "Utilise un LLM comme évaluateur pour noter la qualité, fidélité ou pertinence des réponses.",
            en: "Uses an LLM as an evaluator to score answer quality, faithfulness, or relevance.",
          },
        },
      ],
    },
    {
      name: "Deployment",
      keywords: [
        "deploy",
        "deployment",
        "fastapi",
        "docker",
        "pages",
        "spaces",
        "api",
        "host",
        "hosting",
        "server",
      ],
      foundationalNodeIds: [
        "fastapi",
        "docker",
        "github-pages",
        "huggingface-spaces",
        "portfolio-project",
      ],
      advancedSuggestions: [
        {
          node: {
            fr: "CI/CD",
            en: "CI/CD",
          },
          why: {
            fr: "Automatise les tests, builds et déploiements du projet.",
            en: "Automates tests, builds, and deployments for the project.",
          },
        },
        {
          node: {
            fr: "Monitoring production",
            en: "Production monitoring",
          },
          why: {
            fr: "Surveille les erreurs, coûts, latence et comportements du système en production.",
            en: "Tracks errors, costs, latency, and system behavior in production.",
          },
        },
      ],
    },
  ];

  const activeDomain = domains.find((domain) =>
    domain.keywords.some((keyword) => lowerQuery.includes(keyword)),
  );

  if (!activeDomain) {
    return {
      domainName: null,
      missingExistingNodes: [] as BrainNode[],
      suggestedNewNodes: [
        {
          node: {
            fr: "Concept dédié",
            en: "Dedicated concept",
          },
          why: {
            fr: `Créer un nœud dédié pour « ${query} » si ce sujet devient important dans ton apprentissage.`,
            en: `Create a dedicated node for “${query}” if this topic becomes important in your learning.`,
          },
        },
        {
          node: {
            fr: "Exemple pratique",
            en: "Practical example",
          },
          why: {
            fr: "Ajouter un exemple concret aiderait à relier ce sujet à un projet portfolio.",
            en: "Adding a concrete example would connect this topic to a portfolio project.",
          },
        },
      ],
    };
  }

  const missingExistingNodes = activeDomain.foundationalNodeIds
    .filter((id) => !matchedIds.has(id))
    .map((id) => brainNodes.find((node) => node.id === id))
    .filter((node): node is BrainNode => Boolean(node));

  return {
    domainName: activeDomain.name,
    missingExistingNodes,
    suggestedNewNodes: activeDomain.advancedSuggestions,
  };
}

function generateGraphExpansionPlan(
  query: string,
  matches: BrainNode[],
  language: Language,
): string {
  const isEn = language === "en";
  const gaps = getMissingSuggestions(query, matches);
  const bestMatch = matches[0];

  let part3 =
    "\n\n## Part 3: Suggested new nodes and tree connections (Graph Expansion Plan)\n\n";

  const rootTitle = bestMatch
    ? pick(bestMatch.title, language)
    : isEn
      ? "New standalone branch"
      : "Nouvelle branche indépendante";

  const suggestedNodes = gaps.suggestedNewNodes.slice(0, 5);
  const missingExistingNodes = gaps.missingExistingNodes.slice(0, 4);

  if (suggestedNodes.length === 0 && missingExistingNodes.length === 0) {
    part3 += isEn
      ? "No clear expansion plan could be generated from the current graph.\n"
      : "Aucun plan d’expansion clair n’a pu être généré à partir du graphe actuel.\n";

    return part3;
  }

  part3 += `[ ${rootTitle} ]\n`;
  part3 += "   │\n";

  missingExistingNodes.forEach((node, index) => {
    const hasMoreSuggestions = suggestedNodes.length > 0;
    const isLast =
      index === missingExistingNodes.length - 1 && !hasMoreSuggestions;
    const connector = isLast ? "└──" : "├──";
    const title = pick(node.title, language);

    part3 += `   ${connector} [ ${title} ] (${
      isEn ? "existing node to connect better" : "nœud existant à mieux connecter"
    })\n`;
    part3 += `   │      └── ${
      isEn ? "Suggested connection" : "Connexion suggérée"
    }: ${rootTitle} → ${title}\n`;
  });

  suggestedNodes.forEach((suggestion, index) => {
    const isLast = index === suggestedNodes.length - 1;
    const connector = isLast ? "└──" : "├──";
    const title = pick(suggestion.node, language);
    const why = pick(suggestion.why, language);

    part3 += `   ${connector} [ ${title} ] (${
      isEn ? "new node" : "nouveau nœud"
    })\n`;
    part3 += `          ├── ${isEn ? "Why" : "Pourquoi"}: ${why}\n`;
    part3 += `          └── ${
      isEn ? "Suggested connection" : "Connexion suggérée"
    }: ${rootTitle} → ${title}\n`;
  });

  return part3;
}

/**
 * Generate a structured three-part markdown response based only on local graph data.
 *
 * Required output shape:
 * 1. Part 1: existing graph knowledge
 * 2. Part 2: missing graph knowledge / suggestions
 * 3. Part 3: suggested new nodes and tree connections
 */
function generateMarkdownResponse(
  query: string,
  matches: BrainNode[],
  language: Language,
): string {
  const isEn = language === "en";
  const relevantEdges = getRelevantEdges(matches);

  let part1 =
    "## Part 1: What the interface already explains (Existing Knowledge)\n\n";

  if (matches.length > 0) {
    part1 += isEn
      ? `The current graph contains **${matches.length}** node(s) related to “${query}”.\n\n`
      : `Le graphe actuel contient **${matches.length}** nœud(s) lié(s) à « ${query} ».\n\n`;

    part1 += isEn
      ? "**Existing related nodes:**\n\n"
      : "**Nœuds existants liés :**\n\n";

    for (const node of matches) {
      const title = pick(node.title, language);
      const summary = pick(node.shortSummary, language);
      const explanation = getNodeText(node, language);

      part1 += `- **${title}**`;
      part1 += ` — ${summary}`;

      if (explanation && explanation !== summary) {
        part1 += `\n  - ${
          isEn ? "Current explanation" : "Explication actuelle"
        }: ${explanation}`;
      }

      part1 += `\n  - ${isEn ? "Difficulty" : "Difficulté"}: ${difficultyLabel(
        node.difficulty,
        language,
      )}\n`;
    }

    part1 += "\n";

    if (relevantEdges.length > 0) {
      part1 += isEn
        ? "**Existing connections on the map:**\n\n"
        : "**Connexions existantes sur la carte :**\n\n";

      for (const edge of relevantEdges) {
        const sourceTitle = getNodeTitleById(edge.source, language);
        const targetTitle = getNodeTitleById(edge.target, language);
        const label = getEdgeLabel(edge, language);

        part1 += `- **${sourceTitle}** → **${targetTitle}**`;
        if (label) part1 += ` (${label})`;
        part1 += "\n";
      }
    } else {
      part1 += isEn
        ? "No direct existing connection involving these matched nodes was found on the map.\n"
        : "Aucune connexion directe impliquant ces nœuds correspondants n’a été trouvée sur la carte.\n";
    }
  } else {
    part1 += isEn
      ? `The current graph does not yet explain **“${query}”**. No existing node clearly matches this topic.\n`
      : `Le graphe actuel n’explique pas encore clairement **« ${query} »**. Aucun nœud existant ne correspond directement à ce sujet.\n`;
  }

  const gaps = getMissingSuggestions(query, matches);

  let part2 =
    "\n\n## Part 2: What is missing from the interface (Knowledge Gaps)\n\n";

  if (gaps.domainName) {
    part2 += isEn
      ? `This topic appears related to the **${gaps.domainName}** area.\n\n`
      : `Ce sujet semble lié au domaine **${gaps.domainName}**.\n\n`;
  }

  if (gaps.missingExistingNodes.length > 0) {
    part2 += isEn
      ? "**Existing nodes that should be connected or surfaced more clearly:**\n\n"
      : "**Nœuds déjà présents qui devraient être mieux connectés ou mis en avant :**\n\n";

    for (const node of gaps.missingExistingNodes) {
      part2 += `- **${pick(node.title, language)}** — ${pick(
        node.shortSummary,
        language,
      )}\n`;
    }

    part2 += "\n";
  }

  if (gaps.suggestedNewNodes.length > 0) {
    part2 += isEn
      ? "**Potential new nodes to add:**\n\n"
      : "**Nouveaux nœuds potentiels à ajouter :**\n\n";

    for (const suggestion of gaps.suggestedNewNodes) {
      part2 += `- **${pick(suggestion.node, language)}** — ${pick(
        suggestion.why,
        language,
      )}\n`;
    }

    part2 += "\n";
  }

  if (matches.length > 0) {
    part2 += isEn
      ? "**Potential new edges/connections:**\n\n"
      : "**Nouvelles connexions potentielles :**\n\n";

    const bestMatch = matches[0];
    const bestTitle = pick(bestMatch.title, language);

    if (gaps.missingExistingNodes.length > 0) {
      for (const missing of gaps.missingExistingNodes.slice(0, 4)) {
        part2 += `- **${bestTitle}** → **${pick(
          missing.title,
          language,
        )}** (${isEn ? "related to / depends on" : "lié à / dépend de"})\n`;
      }
    } else if (gaps.suggestedNewNodes.length > 0) {
      for (const suggestion of gaps.suggestedNewNodes.slice(0, 3)) {
        part2 += `- **${bestTitle}** → **${pick(
          suggestion.node,
          language,
        )}** (${isEn ? "could be extended with" : "pourrait être enrichi par"})\n`;
      }
    } else {
      part2 += isEn
        ? "- No obvious new edge was detected from the current query.\n"
        : "- Aucune nouvelle connexion évidente n’a été détectée à partir de cette requête.\n";
    }
  } else {
    part2 += isEn
      ? "**Suggested starting point:** Create a new dedicated node for this topic, then connect it to the closest existing pillar.\n"
      : "**Point de départ suggéré :** Créer un nouveau nœud dédié à ce sujet, puis le connecter au pilier existant le plus proche.\n";
  }

  part2 += "\n";

  part2 += isEn
    ? "**Why this improves the second brain:** These additions make the map more complete, reduce isolated concepts, and create clearer learning paths between ideas.\n"
    : "**Pourquoi cela améliore le second cerveau :** Ces ajouts rendent la carte plus complète, réduisent les concepts isolés et créent des chemins d’apprentissage plus clairs entre les idées.\n";

  const part3 = generateGraphExpansionPlan(query, matches, language);

  return `${part1}${part2}${part3}`;
}

/** Collect all searchable text for a node. */
function getSearchableTexts(node: BrainNode): string[] {
  const extended = node as ExtendedBrainNode;

  const texts: string[] = [
    node.title.fr,
    node.title.en,
    node.shortSummary.fr,
    node.shortSummary.en,
    node.simpleExplanation.fr,
    node.simpleExplanation.en,
    node.deepExplanation.fr,
    node.deepExplanation.en,
    extended.miniExplanation?.fr ?? "",
    extended.miniExplanation?.en ?? "",
    extended.explanation?.fr ?? "",
    extended.explanation?.en ?? "",
    ...node.prerequisites.fr,
    ...node.prerequisites.en,
    ...node.commonMistakes.fr,
    ...node.commonMistakes.en,
    ...node.examples.fr,
    ...node.examples.en,
  ];

  if (node.pillar) {
    texts.push(node.pillar.fr, node.pillar.en);
  }

  for (const relId of node.relatedConcepts) {
    const rel = brainNodes.find((n) => n.id === relId);
    if (rel) texts.push(rel.title.fr, rel.title.en);
  }

  return texts.filter(Boolean).map((t) => t.toLowerCase());
}

/** Score how well a node matches a query. */
function scoreNode(node: BrainNode, query: string): number {
  if (node.type === "central") return 0;

  const q = query.toLowerCase().trim();
  if (!q) return 0;

  let score = 0;
  const titleFr = node.title.fr.toLowerCase();
  const titleEn = node.title.en.toLowerCase();

  if (titleFr === q || titleEn === q) score += 100;
  if (titleFr.includes(q) || titleEn.includes(q)) score += 50;

  const tokens = q.split(/\s+/).filter(Boolean);

  for (const token of tokens) {
    if (titleFr.includes(token) || titleEn.includes(token)) score += 20;

    for (const text of getSearchableTexts(node)) {
      if (text.includes(token)) score += 5;
    }
  }

  if (q.includes("graphrag") || q.includes("brag")) {
    if (node.id === "rag" || titleEn.includes("rag")) score += 30;
  }

  if (q.includes("machine learning") || q === "ml") {
    if (node.pillarId === "ml-foundations" || node.id === "ml-foundations") {
      score += 25;
    }
  }

  return score;
}

/** Simple Levenshtein distance for fuzzy suggestions. */
function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }

  return dp[m][n];
}

/**
 * Search the knowledge graph across titles, summaries, explanations,
 * prerequisites, mistakes, examples, and pillar names.
 */
export function searchBrain(query: string, _language: Language): SearchResult {
  const trimmed = query.trim();

  if (!trimmed) {
    return {
      type: "none",
      query: trimmed,
      matches: [],
      relatedNodes: [],
      summary: lt("", ""),
      suggestions: [],
      markdownResponse: lt("", ""),
    };
  }

  const scored = brainNodes
    .filter((n) => n.type !== "central")
    .map((node) => ({ node, score: scoreNode(node, trimmed) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score);

  const matches = scored.map(({ node }) => node);
  const bestMatch = matches[0];
  const relatedNodes = bestMatch ? getRelatedNodes(bestMatch) : [];

  const allTitles = brainNodes
    .filter((n) => n.type === "concept")
    .flatMap((n) => [n.title.fr, n.title.en]);

  const suggestions = allTitles
    .filter((title) => {
      const t = title.toLowerCase();
      const q = trimmed.toLowerCase();
      return (
        t.includes(q.slice(0, 3)) ||
        q.includes(t.slice(0, 3)) ||
        levenshtein(t, q) <= 3
      );
    })
    .slice(0, 5);

  const markdownResponse = lt(
    generateMarkdownResponse(trimmed, matches, "fr"),
    generateMarkdownResponse(trimmed, matches, "en"),
  );

  if (bestMatch && scored[0].score >= 25) {
    return {
      type: "full",
      query: trimmed,
      bestMatch,
      matches,
      relatedNodes,
      summary: lt(
        `Le cerveau connaît « ${pick(bestMatch.title, "fr")} » : ${pick(
          bestMatch.shortSummary,
          "fr",
        )}`,
        `The brain knows “${pick(bestMatch.title, "en")}”: ${pick(
          bestMatch.shortSummary,
          "en",
        )}`,
      ),
      suggestions,
      markdownResponse,
    };
  }

  if (matches.length > 0) {
    const mentionFr = matches
      .slice(0, 3)
      .map((n) => pick(n.title, "fr"))
      .join(", ");

    const mentionEn = matches
      .slice(0, 3)
      .map((n) => pick(n.title, "en"))
      .join(", ");

    return {
      type: "partial",
      query: trimmed,
      bestMatch,
      matches,
      relatedNodes,
      summary: lt(
        `« ${trimmed} » est mentionné indirectement dans le graphe.`,
        `“${trimmed}” is indirectly mentioned in the graph.`,
      ),
      mentionDetails: lt(
        `Mentionné près de : ${mentionFr}. Crée un nœud dédié plus tard pour approfondir.`,
        `Mentioned near: ${mentionEn}. Create a dedicated node later to go deeper.`,
      ),
      suggestions,
      markdownResponse,
    };
  }

  return {
    type: "none",
    query: trimmed,
    matches: [],
    relatedNodes: [],
    summary: lt(
      `Aucune connaissance sur « ${trimmed} » n'existe encore dans ce cerveau.`,
      `No knowledge about “${trimmed}” exists in this brain yet.`,
    ),
    suggestions,
    markdownResponse,
  };
}