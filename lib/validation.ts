import {
  type DiagramSpec,
  diagramSpecSchema,
  type ExplicitConstraints,
} from "@/lib/schema";
import type { GraphPlan } from "@/lib/graph-plan";
import { MAX_EDGES, MAX_NODES } from "@/lib/safety";
import { normalizeColor } from "@/lib/normalization";
import { normalizeText } from "@/lib/utils";

function matchNodeIdByLabel(diagram: DiagramSpec, label: string) {
  const normalizedLabel = normalizeText(label);

  return diagram.nodes.find(
    (node) =>
      normalizeText(node.label) === normalizedLabel ||
      normalizeText(node.kind) === normalizedLabel,
  )?.id;
}

export function validateDiagramSpec(input: unknown) {
  const parsed = diagramSpecSchema.safeParse(input);
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const diagram = parsed.data;

  if (diagram.nodes.length > MAX_NODES) {
    throw new Error(`Diagram exceeds the ${MAX_NODES} node cap.`);
  }

  if (diagram.edges.length > MAX_EDGES) {
    throw new Error(`Diagram exceeds the ${MAX_EDGES} edge cap.`);
  }

  const nodeIds = new Set<string>();
  for (const node of diagram.nodes) {
    if (nodeIds.has(node.id)) {
      throw new Error(`Duplicate node id "${node.id}" detected.`);
    }

    nodeIds.add(node.id);
  }

  const edgeIds = new Set<string>();
  for (const edge of diagram.edges) {
    if (edgeIds.has(edge.id)) {
      throw new Error(`Duplicate edge id "${edge.id}" detected.`);
    }

    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      throw new Error(`Edge "${edge.id}" references a missing node.`);
    }

    edgeIds.add(edge.id);
  }

  return diagram;
}

export function validateConstraintErrors(
  diagram: DiagramSpec,
  constraints: ExplicitConstraints,
) {
  const errors: string[] = [];
  const nodeLabels = diagram.nodes.map((node) => normalizeText(node.label));

  for (const component of constraints.components) {
    const target = normalizeText(component);
    if (!nodeLabels.includes(target)) {
      errors.push(`Missing requested component "${component}".`);
    }
  }

  for (const [label, expectedColor] of Object.entries(constraints.colorByLabel)) {
    const node = diagram.nodes.find(
      (candidate) => normalizeText(candidate.label) === normalizeText(label),
    );

    if (!node) {
      errors.push(`Missing color-target node "${label}".`);
      continue;
    }

    const actual = normalizeColor(node.color, node.color);
    const expected = normalizeColor(expectedColor, expectedColor);

    if (actual.toLowerCase() !== expected.toLowerCase()) {
      errors.push(`Node "${label}" should use color ${expectedColor}.`);
    }
  }

  for (const [kind, expectedColor] of Object.entries(constraints.colorByKind)) {
    const matchingNodes = diagram.nodes.filter(
      (node) => normalizeText(node.kind) === normalizeText(kind),
    );

    if (!matchingNodes.length) {
      errors.push(`No nodes found for requested kind color "${kind}".`);
      continue;
    }

    for (const node of matchingNodes) {
      const actual = normalizeColor(node.color, node.color);
      const expected = normalizeColor(expectedColor, expectedColor);

      if (actual.toLowerCase() !== expected.toLowerCase()) {
        errors.push(`All "${kind}" nodes should use color ${expectedColor}.`);
        break;
      }
    }
  }

  for (const relationship of constraints.relationships) {
    if (!relationship.source || !relationship.target) {
      continue;
    }

    const sourceId = matchNodeIdByLabel(diagram, relationship.source);
    const targetId = matchNodeIdByLabel(diagram, relationship.target);

    if (!sourceId || !targetId) {
      errors.push(`Relationship "${relationship.description}" could not be matched.`);
      continue;
    }

    const exists = diagram.edges.some((edge) => {
      return (
        edge.source === sourceId &&
        edge.target === targetId &&
        (!relationship.label ||
          normalizeText(edge.label ?? "") === normalizeText(relationship.label))
      );
    });

    if (!exists) {
      errors.push(`Missing relationship "${relationship.description}".`);
    }
  }

  return errors;
}

export function validateRevisionIntegrity(
  previous: DiagramSpec,
  next: DiagramSpec,
  prompt: string,
) {
  const destructiveIntent = /\b(remove|delete|replace|regenerate)\b/i.test(prompt);

  if (destructiveIntent) {
    return [];
  }

  const nextIds = new Set(next.nodes.map((node) => node.id));
  const removed = previous.nodes.filter((node) => !nextIds.has(node.id));

  return removed.map(
    (node) =>
      `Revision removed "${node.label}" even though the prompt did not request deletion.`,
  );
}

export function validateGraphPlan(plan: GraphPlan) {
  const errors: string[] = [];
  const nodeIds = new Set<string>();

  for (const node of plan.nodes) {
    if (nodeIds.has(node.id)) {
      errors.push(`Duplicate planned node id "${node.id}" detected.`);
    }

    nodeIds.add(node.id);
  }

  for (const edge of plan.edges) {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      errors.push(`Planned edge "${edge.source}" -> "${edge.target}" references a missing node.`);
    }
  }

  if (plan.diagramType === "itinerary") {
    const decisionNodes = plan.nodes.filter((node) => node.kind === "decision");
    for (const node of decisionNodes) {
      const outgoing = plan.edges.filter((edge) => edge.source === node.id);
      if (outgoing.length < 2) {
        errors.push(`Itinerary decision "${node.label}" should have at least two outgoing paths.`);
      }
    }
  }

  if (plan.diagramType === "reference_architecture") {
    const labels = plan.nodes.map((node) => normalizeText(node.label));
    if (!labels.some((label) => label.includes("encoder stack"))) {
      errors.push("Transformer reference diagram must include an encoder stack.");
    }

    if (!labels.some((label) => label.includes("decoder stack"))) {
      errors.push("Transformer reference diagram must include a decoder stack.");
    }
  }

  return errors;
}
