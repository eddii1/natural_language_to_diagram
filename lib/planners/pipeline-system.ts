import { createAssumption } from "@/lib/normalization";
import type { GraphPlan, GraphPlanNode } from "@/lib/graph-plan";
import { detectPromptDirection } from "@/lib/diagram-type";
import { normalizeText, slugify } from "@/lib/utils";

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

export async function planPipelineSystem(prompt: string): Promise<GraphPlan> {
  const nodes = new Map<string, GraphPlanNode>();
  const edges: GraphPlan["edges"] = [];
  const assumptions = [];
  const normalized = normalizeText(prompt);

  const stageMatchers = [
    {
      label: "Request Parsing",
      notes: "Normalizes and structures the inbound request.",
      patterns: [/\brequest parsing\b/],
    },
    {
      label: "Prompt Planning",
      notes: "Builds the generation strategy and intermediate instructions.",
      patterns: [/\bprompt planning\b/],
    },
    {
      label: "JSON Spec Generation",
      notes: /\bfallback mechanism\b/.test(normalized)
        ? "Primary generation stage with fallback mechanism."
        : "Generates the JSON diagram spec.",
      patterns: [/\bjson spec generation\b/, /\bllm based json spec generation\b/],
    },
    {
      label: "Schema Validation & Auto-Repair",
      notes: "Repairs invalid JSON until it satisfies the schema.",
      patterns: [/\bschema validation\b/, /\bauto repair\b/],
    },
    {
      label: "vis.js Rendering",
      notes: "Converts the validated spec into vis.js graph format.",
      patterns: [/\bvis js\b/, /\brendering to vis js\b/],
    },
    {
      label: "Style Postprocessing",
      notes: "Applies visual cleanup and theme adjustments.",
      patterns: [/\bstyle postprocessing\b/],
    },
    {
      label: "Export JSON / SVG / PNG",
      notes: "Exports the final diagram to supported file formats.",
      patterns: [/\bexport to json\b/, /\bexport to json svg png\b/, /\bexport\b/],
      kind: "terminator" as const,
    },
  ];

  const orderedStages = stageMatchers.filter((matcher) =>
    matcher.patterns.some((pattern) => pattern.test(normalized)),
  );

  const stages =
    orderedStages.length > 0
      ? orderedStages
      : stageMatchers.map((matcher) => ({
          ...matcher,
          patterns: [],
        }));

  const ui = addNode(nodes, "Streamlit UI", "process");
  const chatPanel = /\bchat panel\b/.test(normalized)
    ? addNode(nodes, "Chat Panel", "process")
    : null;
  const settingsSidebar = /\bsettings sidebar\b/.test(normalized)
    ? addNode(nodes, "Settings Sidebar", "process")
    : null;
  const interactiveCanvas = /\binteractive canvas\b/.test(normalized)
    ? addNode(nodes, "Interactive Canvas", "process")
    : null;
  const nodeEditing = /\bediting nodes edges\b|\bediting nodes\/edges\b|\bnodes edges\b/.test(
    normalized,
  )
    ? addNode(nodes, "Node / Edge Editing", "process")
    : null;

  for (const stage of stages) {
    addNode(nodes, stage.label, stage.kind ?? "process", stage.notes);
  }

  if (chatPanel) {
    edges.push({ source: ui.id, target: chatPanel.id, label: "contains" });
    edges.push({
      source: chatPanel.id,
      target: "request-parsing",
      label: "user input",
      semantic: "request",
    });
  }

  if (settingsSidebar) {
    edges.push({ source: ui.id, target: settingsSidebar.id, label: "contains" });
  }

  if (interactiveCanvas) {
    edges.push({ source: ui.id, target: interactiveCanvas.id, label: "contains" });
    edges.push({
      source: "vis-js-rendering",
      target: interactiveCanvas.id,
      label: "renders graph",
      semantic: "response",
    });
  }

  if (settingsSidebar && interactiveCanvas) {
    edges.push({
      source: settingsSidebar.id,
      target: interactiveCanvas.id,
      label: "configures",
    });
  }

  if (nodeEditing && settingsSidebar) {
    edges.push({
      source: settingsSidebar.id,
      target: nodeEditing.id,
      label: "controls",
    });
  }

  if (nodeEditing && interactiveCanvas) {
    edges.push({
      source: nodeEditing.id,
      target: interactiveCanvas.id,
      label: "edits graph",
    });
  }

  for (let index = 0; index < stages.length - 1; index += 1) {
    edges.push({
      source: slugify(stages[index].label),
      target: slugify(stages[index + 1].label),
      label: "next stage",
    });
  }

  edges.push({
    source: ui.id,
    target: slugify(stages[0].label),
    label: chatPanel ? "hosts pipeline" : "submits request",
    semantic: "request",
  });

  if (!interactiveCanvas) {
    assumptions.push(
      createAssumption(
        "Kept the UI minimal and omitted an interactive canvas because it was not explicitly requested.",
      ),
    );
  }

  return {
    version: "1",
    diagramType: "pipeline_system",
    title: "Modular pipeline diagram",
    direction: detectPromptDirection(prompt, "LR"),
    nodes: [...nodes.values()],
    edges,
    assumptions,
    clarificationQuestions: [],
  };
}
