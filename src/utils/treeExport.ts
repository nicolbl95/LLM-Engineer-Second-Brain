import type { BrainNode, BrainEdge } from "../types/brain";

/**
 * Generate a tree-style text export of the brain graph.
 * Uses box-drawing characters to show hierarchy.
 */
export function generateTreeExport(
  nodes: BrainNode[],
  edges: BrainEdge[],
  language: "fr" | "en",
): string {
  const nodeMap = new Map<string, BrainNode>();
  const childrenMap = new Map<string, BrainNode[]>();

  // Build node map.
  nodes.forEach((node) => {
    nodeMap.set(node.id, node);
    childrenMap.set(node.id, []);
  });

  // Build parent-child relationships based on edges.
  edges.forEach((edge) => {
    const children = childrenMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);

    if (children && targetNode) {
      children.push(targetNode);
    }
  });

  // Find the central node/root.
  const centralNode = nodes.find((node) => node.type === "central");

  if (!centralNode) {
    return language === "fr"
      ? "Aucun nœud central trouvé"
      : "No central node found";
  }

  const lines: string[] = [];
  const visited = new Set<string>();

  function buildTreeNode(
    node: BrainNode,
    prefix: string,
    isLast: boolean,
    depth: number,
  ): void {
    // Prevent infinite loops from cycles.
    if (visited.has(node.id)) return;

    visited.add(node.id);

    const title = node.title[language] || node.title.fr || node.title.en;
    const connector = isLast ? "└── " : "├── ";

    if (depth === 0) {
      lines.push(
        `[${language === "fr" ? "NŒUD CENTRAL" : "CENTRAL NODE"}] : ${title}`,
      );
    } else if (node.type === "pillar") {
      lines.push(
        `${prefix}${connector}[${language === "fr" ? "BRANCHE" : "BRANCH"}] : ${title}`,
      );
    } else {
      lines.push(`${prefix}${connector}${title}`);
    }

    const children = childrenMap.get(node.id) || [];

    children.forEach((child, index) => {
      const isLastChild = index === children.length - 1;
      const nextPrefix = prefix + (isLast ? "    " : "│   ");

      buildTreeNode(child, nextPrefix, isLastChild, depth + 1);
    });
  }

  buildTreeNode(centralNode, "", true, 0);

  return lines.join("\n");
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