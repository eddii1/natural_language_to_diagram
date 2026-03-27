import { z } from "zod";

import type { Direction } from "@/lib/schema";
import { normalizeText } from "@/lib/utils";

export const diagramTypeSchema = z.enum([
  "architecture_flow",
  "family_tree",
  "itinerary",
  "reference_architecture",
  "pipeline_system",
  "generic_flow",
]);

export type DiagramType = z.infer<typeof diagramTypeSchema>;

export function classifyDiagramType(prompt: string): DiagramType {
  const normalized = normalizeText(prompt);

  if (/\btransformer\b|\battention is all you need\b|\bencoder\b|\bdecoder\b/.test(normalized)) {
    return "reference_architecture";
  }

  if (
    /\bfamily tree\b|\bmom\b|\bmother\b|\bfather\b|\bbrother\b|\bsister\b|\baunt\b|\buncle\b|\bmarried\b|\bsister in law\b|\bparent\b|\bson\b|\bdaughter\b/.test(
      normalized,
    )
  ) {
    return "family_tree";
  }

  if (
    /\bstarting from\b|\bgoing to\b|\bon the way\b|\bnight\b|\bnights\b|\bitinerary\b|\bif it snows\b|\bon my way back\b/.test(
      normalized,
    )
  ) {
    return "itinerary";
  }

  if (
    /\bpipeline\b|\bstage\b|\bstreamlit\b|\bchat panel\b|\bsettings sidebar\b|\bvis js\b|\bexport to\b|\bfirst goes through\b|\bfollowed by\b/.test(
      normalized,
    )
  ) {
    return "pipeline_system";
  }

  if (
    /\bguardrail\b|\bgateway\b|\bllm\b|\bapi call\b|\btool\b|\bclassifier\b|\borchestrator\b|\bdatabase\b|\bservice\b/.test(
      normalized,
    )
  ) {
    return "architecture_flow";
  }

  return "generic_flow";
}

export function detectPromptDirection(prompt: string, fallback: Direction): Direction {
  const normalized = normalizeText(prompt);

  if (/\bleft to right\b|\bhorizontal\b|\bhorizontally\b/.test(normalized)) {
    return "LR";
  }

  if (/\btop to bottom\b|\bvertical\b|\bvertically\b/.test(normalized)) {
    return "TB";
  }

  return fallback;
}
