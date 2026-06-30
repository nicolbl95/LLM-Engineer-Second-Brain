import type { BrainNode, Language, SearchResult } from "../types/brain";
import { brainNodes } from "../data/graph";
import { pick } from "./i18n";
import { getRelatedNodes } from "./graphHelpers";
import { lt } from "./i18n";

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
  };
}
