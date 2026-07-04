import type { BrainNode, BrainEdge } from "../types/brain";

/**
 * Generate a flexible plaintext export of the brain graph.
 *
 * This version does NOT require a single central/root node.
 * It supports:
 * - isolated nodes
 * - multiple disconnected trees
 * - parent-child connections from any source node
 */
export function generateTreeExport(
  nodes: BrainNode[],
  edges: BrainEdge[],
  language: "fr" | "en",
): string {
  if (nodes.length === 0) {
    return language === "fr"
      ? "Aucun nœud trouvé"
      : "No nodes found";
  }

  const nodeMap = new Map<string, BrainNode>();
  const childrenMap = new Map<string, BrainNode[]>();
  const hasParent = new Set<string>();

  // Register every node.
  for (const node of nodes) {
    nodeMap.set(node.id, node);
    childrenMap.set(node.id, []);
  }

  // Build parent -> children relationships from edges.
  for (const edge of edges) {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (!sourceNode || !targetNode) continue;

    childrenMap.get(edge.source)?.push(targetNode);
    hasParent.add(edge.target);
  }

  const getTitle = (node: BrainNode): string => {
    return node.title[language] || node.title.fr || node.title.en || node.id;
  };

  const getExplanation = (node: BrainNode): string => {
    // Priority order: simpleExplanation > shortSummary > empty string
    const simpleExplanation = node.simpleExplanation?.[language] || node.simpleExplanation?.fr || node.simpleExplanation?.en;
    if (simpleExplanation) return simpleExplanation;
    
    const shortSummary = node.shortSummary?.[language] || node.shortSummary?.fr || node.shortSummary?.en;
    if (shortSummary) return shortSummary;
    
    return "";
  };

  const isIsolated = (node: BrainNode): boolean => {
    const children = childrenMap.get(node.id) ?? [];
    return !hasParent.has(node.id) && children.length === 0;
  };

  const isolatedNodes = nodes.filter(isIsolated);

  // A root is any node that has children but no parent.
  // This allows multiple independent trees.
  const rootNodes = nodes.filter((node) => {
    const children = childrenMap.get(node.id) ?? [];
    return !hasParent.has(node.id) && children.length > 0;
  });

  // Fallback for cycles or unusual graphs:
  // if every connected node has a parent, pick nodes with children as roots.
  const fallbackRoots =
    rootNodes.length > 0
      ? rootNodes
      : nodes.filter((node) => (childrenMap.get(node.id) ?? []).length > 0);

  const lines: string[] = [];
  const globallyVisited = new Set<string>();

  function buildTree(
    node: BrainNode,
    prefix: string,
    isLast: boolean,
    depth: number,
    localVisited: Set<string>,
  ) {
    if (localVisited.has(node.id)) {
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}[ ${getTitle(node)} ] (cycle)`);
      return;
    }

    localVisited.add(node.id);
    globallyVisited.add(node.id);

    const explanation = getExplanation(node);
    const titleWithExplanation = explanation 
      ? `[ ${getTitle(node)} ]: ${explanation}`
      : `[ ${getTitle(node)} ]`;

    if (depth === 0) {
      lines.push(titleWithExplanation);
    } else {
      const connector = isLast ? "└── " : "├── ";
      lines.push(`${prefix}${connector}${titleWithExplanation}`);
    }

    const children = childrenMap.get(node.id) ?? [];
    const nextPrefix = depth === 0
      ? "   "
      : prefix + (isLast ? "    " : "│   ");

    if (children.length > 0 && depth === 0) {
      lines.push("   │");
    }

    children.forEach((child, index) => {
      const isLastChild = index === children.length - 1;
      buildTree(
        child,
        nextPrefix,
        isLastChild,
        depth + 1,
        new Set(localVisited),
      );
    });
  }

  // First export isolated nodes.
  for (const node of isolatedNodes) {
    const explanation = getExplanation(node);
    const titleWithExplanation = explanation 
      ? `[ ${getTitle(node)} ]: ${explanation}`
      : `[ ${getTitle(node)} ]`;
    lines.push(`${titleWithExplanation} (${language === "fr" ? "Isolé à gauche" : "Isolated on the left"})`);
    lines.push("");
    globallyVisited.add(node.id);
  }

  // Then export all disconnected trees.
  fallbackRoots.forEach((root, index) => {
    if (globallyVisited.has(root.id) && isIsolated(root)) return;

    buildTree(root, "", true, 0, new Set());

    if (index < fallbackRoots.length - 1) {
      lines.push("");
    }
  });

  // Finally, export any connected nodes not reached because of cycles/weird graph structure.
  const unvisited = nodes.filter((node) => !globallyVisited.has(node.id));

  if (unvisited.length > 0) {
    if (lines.length > 0) lines.push("");

    for (const node of unvisited) {
      const explanation = getExplanation(node);
      const titleWithExplanation = explanation 
        ? `[ ${getTitle(node)} ]: ${explanation}`
        : `[ ${getTitle(node)} ]`;
      lines.push(`${titleWithExplanation} (${language === "fr" ? "Non connecté / cycle" : "Unconnected / cycle"})`);
    }
  }

  return lines.join("\n").trim();
}

/**
 * Copy text to clipboard and return whether it succeeded.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error("Failed to copy to clipboard:", error);
    return false;
  }
}