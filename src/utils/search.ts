import type { BrainNode, Language, SearchResult } from "../types/brain";
import { brainNodes, brainEdges } from "../data/graph";
import { pick } from "./i18n";
import { getRelatedNodes } from "./graphHelpers";
import { lt } from "./i18n";

/** Generate a structured two-part markdown response based on search matches and local graph data. */
function generateMarkdownResponse(
  query: string,
  matches: BrainNode[],
  language: Language
): string {
  const isEn = language === "en";
  const matchedIds = new Set(matches.map((m) => m.id));

  // Find edges connecting the matched nodes
  const connectedEdges = brainEdges.filter(
    (edge) => matchedIds.has(edge.source) && matchedIds.has(edge.target)
  );

  // SECTION 1: Existing Knowledge
  let part1 = "## Part 1: What the interface already explains (Existing Knowledge)\n\n";

  if (matches.length > 0) {
    if (isEn) {
      part1 += `The knowledge graph contains **${matches.length}** concept(s) matching your request:\n\n`;
    } else {
      part1 += `Le graphe de connaissances contient **${matches.length}** concept(s) correspondant à votre requête :\n\n`;
    }

    for (const node of matches) {
      const title = isEn ? node.title.en : node.title.fr;
      const summary = isEn ? node.shortSummary.en : node.shortSummary.fr;
      const explanation = isEn ? node.simpleExplanation.en : node.simpleExplanation.fr;
      const difficulty = isEn ? node.difficulty : (node.difficulty === "beginner" ? "débutant" : node.difficulty === "intermediate" ? "intermédiaire" : "avancé");
      
      part1 += `- **${title}** (Difficulty/Difficulté: *${difficulty}*): ${summary}\n  *Detail/Détail:* ${explanation}\n`;
    }

    part1 += "\n";

    if (connectedEdges.length > 0) {
      if (isEn) {
        part1 += "The following connections exist between these nodes in the graph:\n\n";
      } else {
        part1 += "Les connexions suivantes existent entre ces nœuds dans le graphe :\n\n";
      }

      for (const edge of connectedEdges) {
        const sourceNode = matches.find((n) => n.id === edge.source);
        const targetNode = matches.find((n) => n.id === edge.target);
        if (sourceNode && targetNode) {
          const sTitle = isEn ? sourceNode.title.en : sourceNode.title.fr;
          const tTitle = isEn ? targetNode.title.en : targetNode.title.fr;
          const label = edge.label ? (isEn ? edge.label.en : edge.label.fr) : "";
          const relStr = label ? ` (${label})` : "";
          
          if (isEn) {
            part1 += `- **${sTitle}** points to **${tTitle}**${relStr}.\n`;
          } else {
            part1 += `- **${sTitle}** pointe vers **${tTitle}**${relStr}.\n`;
          }
        }
      }
    } else {
      if (isEn) {
        part1 += "No direct connections were detected between these specific nodes on the map.\n";
      } else {
        part1 += "Aucune connexion directe n'a été détectée entre ces nœuds spécifiques sur la carte.\n";
      }
    }
  } else {
    if (isEn) {
      part1 += `The current graph does not yet explain the topic **"${query}"**.\n`;
    } else {
      part1 += `Le graphe de connaissances actuel n'explique pas encore le sujet **"${query}"**.\n`;
    }
  }

  // SECTION 2: Knowledge Gaps
  let part2 = "## Part 2: What is missing from the interface (Knowledge Gaps)\n\n";

  // Analyze domain gaps
  const lowerQuery = query.toLowerCase();
  
  // Domains definition
  const domains = [
    {
      name: "RAG (Retrieval-Augmented Generation)",
      keywords: ["rag", "retrieval", "document", "pdf", "search", "vector", "embed", "chunk", "index", "retriever", "database"],
      standardNodes: ["chunking", "embeddings", "vector-database", "retriever", "rag", "llamaindex", "qdrant"],
      advancedNodes: [
        {
          title: { fr: "GraphRAG / Knowledge Graphs", en: "GraphRAG / Knowledge Graphs" },
          desc: {
            fr: "Permet de structurer des informations sous forme de graphe d'entités pour des synthèses globales.",
            en: "Allows structuring information as an entity graph for global document synthesis.",
          },
        },
        {
          title: { fr: "Reranking (Cross-Encoder)", en: "Reranking (Cross-Encoder)" },
          desc: {
            fr: "Réordonne les chunks retournés par le retriever pour maximiser la pertinence du top-k.",
            en: "Reorders retrieved chunks to maximize relevance in the top-k context.",
          },
        },
      ],
    },
    {
      name: "Agents & Workflows",
      keywords: ["agent", "workflow", "tool", "memory", "langgraph", "plan", "reason", "react", "chat"],
      standardNodes: ["workflow", "agent", "tool-calling", "memory", "langgraph"],
      advancedNodes: [
        {
          title: { fr: "Orchestration multi-agents", en: "Multi-Agent Orchestration" },
          desc: {
            fr: "Coordonne plusieurs agents spécialisés travaillant ensemble sur une même tâche complexe.",
            en: "Coordinates multiple specialized agents collaborating on a complex task.",
          },
        },
        {
          title: { fr: "Auto-correction (Self-Reflection)", en: "Self-Reflection" },
          desc: {
            fr: "Permet à un agent de critiquer ses propres réponses et de corriger ses erreurs de façon autonome.",
            en: "Enables an agent to critique its own answers and fix mistakes autonomously.",
          },
        },
      ],
    },
    {
      name: "Fine-tuning",
      keywords: ["fine", "tune", "tuning", "lora", "qlora", "peft", "train", "adapt"],
      standardNodes: ["fine-tuning", "lora"],
      advancedNodes: [
        {
          title: { fr: "DPO (Direct Preference Optimization)", en: "DPO (Direct Preference Optimization)" },
          desc: {
            fr: "Méthode d'alignement direct sans modèle de récompense intermédiaire complexe.",
            en: "Direct alignment method without requiring a complex separate reward model.",
          },
        },
        {
          title: { fr: "Quantification de modèle", en: "Model Quantization" },
          desc: {
            fr: "Réduit l'empreinte mémoire d'un modèle (ex: de FP16 à INT4) pour l'exécuter sur GPU grand public.",
            en: "Reduces a model's memory footprint (e.g. FP16 to INT4) to run on consumer GPUs.",
          },
        },
      ],
    },
    {
      name: "Evaluation",
      keywords: ["eval", "measure", "test", "benchmark", "score", "ragas", "langfuse", "feedback"],
      standardNodes: ["evaluation", "ragas", "langfuse", "feedback-loop"],
      advancedNodes: [
        {
          title: { fr: "LLM-as-a-judge", en: "LLM-as-a-judge" },
          desc: {
            fr: "Utilise un LLM puissant comme évaluateur pour noter la fidélité et la pertinence des réponses.",
            en: "Uses a powerful LLM as an evaluator to score correctness and prompt alignment.",
          },
        },
      ],
    },
    {
      name: "Deployment",
      keywords: ["deploy", "fastapi", "docker", "pages", "spaces", "api", "host", "port"],
      standardNodes: ["fastapi", "docker", "github-pages", "huggingface-spaces", "portfolio-project"],
      advancedNodes: [
        {
          title: { fr: "Serving optimisé (vLLM / Ollama)", en: "Optimized Serving (vLLM / Ollama)" },
          desc: {
            fr: "Moteurs d'inférence haute performance avec continuous batching pour maximiser le débit.",
            en: "High-performance inference engines with continuous batching to maximize throughput.",
          },
        },
      ],
    },
  ];

  // Find relevant domain
  const activeDomain = domains.find((d) =>
    d.keywords.some((keyword) => lowerQuery.includes(keyword))
  );

  if (activeDomain) {
    const missingNodes = activeDomain.standardNodes.filter((id) => !matchedIds.has(id));
    
    if (missingNodes.length > 0) {
      if (isEn) {
        part2 += `Your query is related to **${activeDomain.name}**. The current graph has some missing foundational elements in this area:\n\n`;
      } else {
        part2 += `Votre requête concerne le domaine **${activeDomain.name}**. Le graphe présente quelques lacunes fondamentales dans cette zone :\n\n`;
      }

      for (const id of missingNodes) {
        const fullNode = brainNodes.find((n) => n.id === id);
        if (fullNode) {
          const title = isEn ? fullNode.title.en : fullNode.title.fr;
          const short = isEn ? fullNode.shortSummary.en : fullNode.shortSummary.fr;
          if (isEn) {
            part2 += `- **Suggested Node:** **${title}** — ${short}\n`;
          } else {
            part2 += `- **Nœud suggéré :** **${title}** — ${short}\n`;
          }
        }
      }

      part2 += "\n";
      
      // Suggest edges/connections
      if (isEn) {
        part2 += `**Suggested connections:**\n`;
      } else {
        part2 += `**Connexions suggérées :**\n`;
      }

      for (const id of missingNodes) {
        const fullNode = brainNodes.find((n) => n.id === id);
        if (fullNode) {
          const title = isEn ? fullNode.title.en : fullNode.title.fr;
          if (fullNode.relatedConcepts.length > 0) {
            const relNames = fullNode.relatedConcepts
              .map((rid) => brainNodes.find((n) => n.id === rid))
              .filter(Boolean)
              .map((n) => (isEn ? n!.title.en : n!.title.fr));
            
            if (relNames.length > 0) {
              if (isEn) {
                part2 += `- Connect **${title}** with existing nodes like: *${relNames.join(", ")}*.\n`;
              } else {
                part2 += `- Connecter **${title}** avec les nœuds existants comme : *${relNames.join(", ")}*.\n`;
              }
            }
          }
        }
      }
      
      if (isEn) {
        part2 += `\n**Why this improves the brain:** These additions will bridge your query with the rest of the learning roadmap and build a complete foundation.\n`;
      } else {
        part2 += `\n**Pourquoi cela améliore le cerveau :** Ces ajouts feront le lien entre votre requête et le reste de la feuille de route d'apprentissage pour bâtir une base solide.\n`;
      }

    } else {
      // No standard nodes are missing. Suggest advanced ones.
      if (isEn) {
        part2 += `You have fully covered the foundational elements of **${activeDomain.name}**! Here are some advanced gaps to expand your learning:\n\n`;
      } else {
        part2 += `Vous couvrez déjà l'ensemble des fondations de **${activeDomain.name}** ! Voici des concepts avancés à explorer pour enrichir votre second cerveau :\n\n`;
      }

      for (const adv of activeDomain.advancedNodes) {
        const title = isEn ? adv.title.en : adv.title.fr;
        const desc = isEn ? adv.desc.en : adv.desc.fr;
        if (isEn) {
          part2 += `- **Advanced Concept:** **${title}** — ${desc}\n`;
        } else {
          part2 += `- **Concept avancé :** **${title}** — ${desc}\n`;
        }
      }

      part2 += "\n";
      
      if (isEn) {
        part2 += `**Suggested connections:**\n- Connect these advanced concepts to the main **${activeDomain.name}** concepts already on your map.\n\n**Why this improves the brain:** It elevates your knowledge base to production-grade architectures.`;
      } else {
        part2 += `**Connexions suggérées :**\n- Relier ces concepts avancés aux concepts principaux de **${activeDomain.name}** déjà présents sur votre carte.\n\n**Pourquoi cela améliore le cerveau :** Cela élève votre base de connaissances vers des architectures adaptées à la production.`;
      }
    }
  } else {
    // No specific domain match
    if (isEn) {
      part2 += "No major gap was detected in specific pillars, but you can expand this general AI topic by considering these advanced areas:\n\n";
      part2 += "- **Guardrails / Safety Alignment:** Adding safety checks (like Llama Guard or NeMo Guardrails) between user prompts and the model.\n";
      part2 += "- **Multimodal Integration:** Incorporating Vision or Audio embeddings and models.\n\n";
      part2 += "**Why this improves the brain:** Adding guardrails or multimodal capabilities prepares your knowledge base for real-world enterprise applications.";
    } else {
      part2 += "Aucune lacune majeure n'a été détectée dans les piliers spécifiques, mais vous pouvez élargir ce sujet général d'IA en considérant ces domaines avancés :\n\n";
      part2 += "- **Guardrails / Alignement de sécurité :** Ajouter des contrôles de sécurité (comme Llama Guard ou NeMo Guardrails) entre les requêtes de l'utilisateur et le modèle.\n";
      part2 += "- **Intégration multimodale :** Prendre en charge des embeddings et modèles Vision ou Audio.\n\n";
      part2 += "**Pourquoi cela améliore le cerveau :** L'ajout de guardrails ou de capacités multimodales prépare votre base de connaissances pour des applications d'entreprise concrètes.";
    }
  }

  return `${part1}\n\n${part2}`;
}

/** Collect all searchable text for a node. */
function getSearchableTexts(node: BrainNode): string[] {
  const texts: string[] = [
    node.title.fr,
    node.title.en,
    node.shortSummary.fr,
    node.shortSummary.en,
    node.simpleExplanation.fr,
    node.simpleExplanation.en,
    node.deepExplanation.fr,
    node.deepExplanation.en,
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
  return texts.map((t) => t.toLowerCase());
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

  // Partial topic aliases (GraphRAG, BRAG → RAG)
  if (q.includes("graphrag") || q.includes("brag")) {
    if (node.id === "rag" || titleEn.includes("rag")) score += 30;
  }
  if (q.includes("machine learning") || q.includes("ml")) {
    if (node.pillarId === "ml-foundations" || node.id === "ml-foundations")
      score += 25;
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

  const markdownResponse = {
    fr: generateMarkdownResponse(trimmed, matches, "fr"),
    en: generateMarkdownResponse(trimmed, matches, "en"),
  };

  if (bestMatch && scored[0].score >= 25) {
    return {
      type: "full",
      query: trimmed,
      bestMatch,
      matches,
      relatedNodes,
      summary: lt(
        `Le cerveau connaît « ${pick(bestMatch.title, "fr")} » : ${pick(bestMatch.shortSummary, "fr")}`,
        `The brain knows « ${pick(bestMatch.title, "en")} »: ${pick(bestMatch.shortSummary, "en")}`,
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
        `« ${trimmed} » is indirectly mentioned in the graph.`,
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
      `No knowledge about « ${trimmed} » exists in this brain yet.`,
    ),
    suggestions,
    markdownResponse,
  };
}
