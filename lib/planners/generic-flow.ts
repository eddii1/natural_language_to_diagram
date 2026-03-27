import { createAssumption } from "@/lib/normalization";
import type { GraphPlan } from "@/lib/graph-plan";
import { detectPromptDirection } from "@/lib/diagram-type";
import { humanizeToken, normalizeText, slugify } from "@/lib/utils";

function toStageLabel(segment: string) {
  return humanizeToken(
    segment
      .replace(/^(create|make|draw|give me|show|recreate)\s+/i, "")
      .replace(/\bdiagram\b/gi, "")
      .replace(/\bfor my\b/gi, "")
      .replace(/\bfor\b/gi, "")
      .trim(),
  );
}

export async function planGenericFlow(prompt: string): Promise<GraphPlan> {
  const segments = prompt
    .split(/\b(?:then|after that|followed by|finally)\b|->|→/i)
    .map((segment) => toStageLabel(segment))
    .filter((segment) => segment.length > 2)
    .slice(0, 6);

  const stages =
    segments.length >= 2
      ? segments
      : ["Input", "Main Process", "Result"];

  return {
    version: "1",
    diagramType: "generic_flow",
    title: normalizeText(prompt).slice(0, 40) || "Generic diagram",
    direction: detectPromptDirection(prompt, "TB"),
    nodes: stages.map((stage, index) => ({
      id: slugify(stage) || `stage-${index + 1}`,
      label: stage,
      kind:
        index === 0 || index === stages.length - 1
          ? "terminator"
          : "process",
    })),
    edges: stages.slice(0, -1).map((stage, index) => ({
      source: slugify(stage) || `stage-${index + 1}`,
      target:
        slugify(stages[index + 1]) || `stage-${index + 2}`,
      label: "next",
    })),
    assumptions: [
      createAssumption(
        "Used a generic flow fallback because the prompt did not clearly match a specialized diagram family.",
      ),
    ],
    clarificationQuestions: [],
  };
}
