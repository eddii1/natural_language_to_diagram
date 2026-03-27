import { createEdge, createNode, normalizeDiagramSpec } from "@/lib/normalization";
import type { GraphPlan } from "@/lib/graph-plan";
import type { DiagramSpec, ExplicitConstraints } from "@/lib/schema";

export function compileGraphPlan(plan: GraphPlan): DiagramSpec {
  return normalizeDiagramSpec({
    version: "1",
    title: plan.title,
    direction: plan.direction,
    nodes: plan.nodes.map((node) =>
      createNode(node.label, {
        id: node.id,
        kind: node.kind,
        notes: node.notes,
        color: node.color,
      }),
    ),
    edges: plan.edges.map((edge) =>
      createEdge(edge.source, edge.target, {
        label: edge.label,
        semantic: edge.semantic,
        style: edge.style,
      }),
    ),
    assumptions: plan.assumptions,
  });
}

export function extractConstraintsFromPlan(plan: GraphPlan): ExplicitConstraints {
  return {
    components: plan.nodes.map((node) => node.label),
    colorByLabel: Object.fromEntries(
      plan.nodes
        .filter((node) => Boolean(node.color))
        .map((node) => [node.label, node.color ?? ""]),
    ),
    colorByKind: {},
    relationships: plan.edges.map((edge) => ({
      source: plan.nodes.find((node) => node.id === edge.source)?.label,
      target: plan.nodes.find((node) => node.id === edge.target)?.label,
      label: edge.label,
      description:
        edge.label ??
        `${plan.nodes.find((node) => node.id === edge.source)?.label ?? edge.source} to ${
          plan.nodes.find((node) => node.id === edge.target)?.label ?? edge.target
        }`,
    })),
    edgeLabels: plan.edges
      .map((edge) => edge.label)
      .filter((label): label is string => Boolean(label)),
    direction: plan.direction,
  };
}
