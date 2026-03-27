import { createAssumption } from "@/lib/normalization";
import type { GraphPlan, GraphPlanNode } from "@/lib/graph-plan";
import { detectPromptDirection } from "@/lib/diagram-type";
import { humanizeToken, slugify } from "@/lib/utils";

function place(pattern: RegExp, prompt: string) {
  const match = prompt.match(pattern);
  return match?.[1] ? humanizeToken(match[1]) : null;
}

function nights(pattern: RegExp, prompt: string) {
  const match = prompt.match(pattern);
  return match?.[1] ? Number(match[1]) : null;
}

function addNode(
  nodes: Map<string, GraphPlanNode>,
  label: string,
  kind: GraphPlanNode["kind"],
  notes?: string,
) {
  const id = slugify(label);
  if (nodes.has(id)) {
    return nodes.get(id)!;
  }

  const node: GraphPlanNode = { id, label, kind, notes };
  nodes.set(id, node);
  return node;
}

export async function planItinerary(prompt: string): Promise<GraphPlan> {
  const nodes = new Map<string, GraphPlanNode>();
  const edges: GraphPlan["edges"] = [];
  const assumptions = [];

  const start = place(/\bstarting from\s+([A-Za-z]+)\b/i, prompt) ?? "Origin";
  const firstMajorStop = place(/\bgoing to\s+([A-Za-z]+)\s+for\s+\d+\s+nights?\b/i, prompt);
  const firstMajorNights = nights(/\bgoing to\s+[A-Za-z]+\s+for\s+(\d+)\s+nights?\b/i, prompt);
  const stopover = place(/\bspend the night in\s+([A-Za-z]+)\b/i, prompt);
  const secondMajorStop = place(/\bgo in\s+([A-Za-z]+)\s+for\s+\d+\s+nights?\b/i, prompt);
  const secondMajorNights = nights(/\bgo in\s+[A-Za-z]+\s+for\s+(\d+)\s+nights?\b/i, prompt);
  const snowStop = place(/\bif it snows,\s*i will go to\s+([A-Za-z]+)\b/i, prompt);
  const snowStopNights = nights(
    /\bif it snows,\s*i will go to\s+[A-Za-z]+\s+for\s+(\d+)\s+nights?\b/i,
    prompt,
  );
  const otherwiseStop = place(/\botherwise in\s+([A-Za-z]+)\b/i, prompt);
  const returnStop = place(/\bgo through\s+([A-Za-z]+)\s+for a night\b/i, prompt);
  const suggestedStop = "Sibiu";

  addNode(nodes, `Start in ${start}`, "terminator");

  if (stopover) {
    addNode(nodes, `${stopover} (1 Night)`, "process");
  }

  if (firstMajorStop && firstMajorNights) {
    addNode(nodes, `${firstMajorStop} (${firstMajorNights} Nights)`, "process");
  }

  if (secondMajorStop && secondMajorNights) {
    addNode(nodes, `${secondMajorStop} (${secondMajorNights} Nights)`, "process");
  }

  addNode(nodes, "Snow?", "decision");

  if (snowStop && snowStopNights) {
    addNode(nodes, `${snowStop} (${snowStopNights} Nights)`, "process");
  }

  if (otherwiseStop) {
    addNode(nodes, `${otherwiseStop} (Alternative Stop)`, "process");
  }

  if (returnStop) {
    addNode(nodes, `${returnStop} (1 Night Return Stop)`, "process");
  }

  addNode(nodes, `${suggestedStop} (Suggested Stop)`, "process");
  addNode(nodes, `Return to ${start}`, "terminator");

  const chain = [
    `Start in ${start}`,
    stopover ? `${stopover} (1 Night)` : null,
    firstMajorStop && firstMajorNights ? `${firstMajorStop} (${firstMajorNights} Nights)` : null,
    secondMajorStop && secondMajorNights
      ? `${secondMajorStop} (${secondMajorNights} Nights)`
      : null,
    "Snow?",
  ].filter((value): value is string => Boolean(value));

  for (let index = 0; index < chain.length - 1; index += 1) {
    edges.push({
      source: slugify(chain[index]),
      target: slugify(chain[index + 1]),
      label: "travel",
    });
  }

  if (snowStop && snowStopNights) {
    edges.push({
      source: "snow",
      target: slugify(`${snowStop} (${snowStopNights} Nights)`),
      label: "if snow",
    });
  }

  if (otherwiseStop) {
    edges.push({
      source: "snow",
      target: slugify(`${otherwiseStop} (Alternative Stop)`),
      label: "otherwise",
    });
  }

  const branchMergeTarget = returnStop
    ? `${returnStop} (1 Night Return Stop)`
    : `${suggestedStop} (Suggested Stop)`;

  if (snowStop && snowStopNights) {
    edges.push({
      source: slugify(`${snowStop} (${snowStopNights} Nights)`),
      target: slugify(branchMergeTarget),
      label: "return route",
    });
  }

  if (otherwiseStop) {
    edges.push({
      source: slugify(`${otherwiseStop} (Alternative Stop)`),
      target: slugify(branchMergeTarget),
      label: "return route",
    });
  }

  if (returnStop) {
    edges.push({
      source: slugify(`${returnStop} (1 Night Return Stop)`),
      target: slugify(`${suggestedStop} (Suggested Stop)`),
      label: "maybe one more night",
      style: "dashed",
    });
  }

  edges.push({
    source: slugify(`${suggestedStop} (Suggested Stop)`),
    target: slugify(`Return to ${start}`),
    label: "head home",
  });

  assumptions.push(
    createAssumption(
      `Suggested ${suggestedStop} as the last stop because the prompt left the final overnight stop open-ended.`,
    ),
  );

  return {
    version: "1",
    diagramType: "itinerary",
    title: `${start} vacation itinerary`,
    direction: detectPromptDirection(prompt, "LR"),
    nodes: [...nodes.values()],
    edges,
    assumptions,
    clarificationQuestions: [],
  };
}
