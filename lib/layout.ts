import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs/lib/elk-api";

import { type DiagramNode, type DiagramSpec } from "@/lib/schema";

const elk = new ELK();

function getNodeDimensions(node: DiagramNode) {
  const width = Math.max(150, Math.min(260, node.label.length * 9 + 74));

  switch (node.shape) {
    case "pill":
      return { width, height: 58 };
    case "cylinder":
      return { width: Math.max(width, 170), height: 104 };
    case "diamond":
      return { width: 140, height: 140 };
    case "group":
      return { width: Math.max(width, 240), height: 130 };
    default:
      return { width, height: 74 };
  }
}

export async function layoutDiagram(diagram: DiagramSpec) {
  const graph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": diagram.direction === "TB" ? "DOWN" : "RIGHT",
      "elk.spacing.nodeNode": "80",
      "elk.layered.spacing.nodeNodeBetweenLayers": "120",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.layered.nodePlacement.bk.fixedAlignment": "BALANCED",
    },
    children: diagram.nodes.map((node) => {
      const { width, height } = getNodeDimensions(node);

      return {
        id: node.id,
        width,
        height,
      };
    }),
    edges: diagram.edges.map((edge) => ({
      id: edge.id,
      sources: [edge.source],
      targets: [edge.target],
    })),
  };

  const result = await elk.layout(graph);
  const positioned = new Map(
    result.children?.map((child) => [
      child.id,
      {
        x: child.x ?? 0,
        y: child.y ?? 0,
      },
    ]) ?? [],
  );

  return {
    ...diagram,
    nodes: diagram.nodes.map((node) => ({
      ...node,
      position: positioned.get(node.id) ?? node.position ?? { x: 0, y: 0 },
    })),
  };
}

export function hasTopologyChanged(previous: DiagramSpec, next: DiagramSpec) {
  const prevNodes = previous.nodes.map((node) => node.id).sort().join("|");
  const nextNodes = next.nodes.map((node) => node.id).sort().join("|");
  const prevEdges = previous.edges
    .map((edge) => `${edge.source}:${edge.target}:${edge.label ?? ""}`)
    .sort()
    .join("|");
  const nextEdges = next.edges
    .map((edge) => `${edge.source}:${edge.target}:${edge.label ?? ""}`)
    .sort()
    .join("|");

  return prevNodes !== nextNodes || prevEdges !== nextEdges;
}
