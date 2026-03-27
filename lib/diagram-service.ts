import { google } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";

import { classifyDiagramType } from "@/lib/diagram-type";
import type { GraphPlan } from "@/lib/graph-plan";
import { layoutDiagram, hasTopologyChanged } from "@/lib/layout";
import {
  createAssumption,
  createEdge,
  createNode,
  normalizeColor,
  normalizeDiagramSpec,
} from "@/lib/normalization";
import { compileGraphPlan, extractConstraintsFromPlan } from "@/lib/plan-to-diagram";
import { planArchitectureFlow } from "@/lib/planners/architecture-flow";
import { planFamilyTree } from "@/lib/planners/family-tree";
import { planGenericFlow } from "@/lib/planners/generic-flow";
import { planItinerary } from "@/lib/planners/itinerary";
import { planPipelineSystem } from "@/lib/planners/pipeline-system";
import { planTransformerReference } from "@/lib/planners/transformer-reference";
import { REVISE_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  type AnalyzeResponse,
  type DiagramAssumption,
  type DiagramSpec,
  diagramSpecSchema,
  type ExplicitConstraints,
} from "@/lib/schema";
import { checkPromptSafety } from "@/lib/safety";
import {
  validateDiagramSpec,
  validateGraphPlan,
  validateRevisionIntegrity,
} from "@/lib/validation";
import { humanizeToken, normalizeText } from "@/lib/utils";

type GenerateInput = {
  prompt: string;
  clarificationAnswers?: Record<string, string>;
};

type GenerateResult = {
  diagram: DiagramSpec;
  extracted: ExplicitConstraints;
};

function modelOrNull() {
  if (process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    return google(process.env.GOOGLE_MODEL ?? process.env.AI_MODEL ?? "gemini-2.5-pro");
  }

  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return openai(process.env.OPENAI_MODEL ?? process.env.AI_MODEL ?? "gpt-4.1");
}

function composePrompt(
  prompt: string,
  clarificationAnswers?: Record<string, string>,
) {
  const entries = Object.entries(clarificationAnswers ?? {}).filter(([, value]) =>
    value.trim(),
  );

  if (!entries.length) {
    return prompt;
  }

  const clarifications = entries
    .map(([key, value]) => `${humanizeToken(key)}: ${value}`)
    .join("\n");

  return `${prompt}\n\nClarifications:\n${clarifications}`;
}

async function planPrompt(prompt: string): Promise<GraphPlan> {
  const diagramType = classifyDiagramType(prompt);

  switch (diagramType) {
    case "architecture_flow":
      return planArchitectureFlow(prompt);
    case "family_tree":
      return planFamilyTree(prompt);
    case "itinerary":
      return planItinerary(prompt);
    case "reference_architecture":
      return planTransformerReference(prompt);
    case "pipeline_system":
      return planPipelineSystem(prompt);
    case "generic_flow":
    default:
      return planGenericFlow(prompt);
  }
}

function extractConstraintsFromDiagram(diagram: DiagramSpec): ExplicitConstraints {
  return {
    components: diagram.nodes.map((node) => node.label),
    colorByLabel: Object.fromEntries(
      diagram.nodes.map((node) => [node.label, node.color]),
    ),
    colorByKind: {},
    relationships: diagram.edges.map((edge) => ({
      source: diagram.nodes.find((node) => node.id === edge.source)?.label,
      target: diagram.nodes.find((node) => node.id === edge.target)?.label,
      label: edge.label,
      description:
        edge.label ??
        `${diagram.nodes.find((node) => node.id === edge.source)?.label ?? edge.source} to ${
          diagram.nodes.find((node) => node.id === edge.target)?.label ?? edge.target
        }`,
    })),
    edgeLabels: diagram.edges
      .map((edge) => edge.label)
      .filter((label): label is string => Boolean(label)),
    direction: diagram.direction,
  };
}

export async function analyzePrompt(prompt: string): Promise<AnalyzeResponse> {
  const safety = checkPromptSafety(prompt);
  if (!safety.ok) {
    return {
      status: "blocked",
      reason: safety.reason,
    };
  }

  const plan = await planPrompt(prompt);
  const extracted = extractConstraintsFromPlan(plan);

  if (plan.clarificationQuestions.length) {
    return {
      status: "needs_clarification",
      extracted,
      assumptionsPreview: plan.assumptions,
      questions: plan.clarificationQuestions,
    };
  }

  return {
    status: "ready",
    extracted,
    assumptionsPreview: plan.assumptions,
  };
}

export async function generateDiagram({
  prompt,
  clarificationAnswers,
}: GenerateInput): Promise<GenerateResult> {
  const safety = checkPromptSafety(prompt);
  if (!safety.ok) {
    throw new Error(safety.reason);
  }

  const composedPrompt = composePrompt(prompt, clarificationAnswers);
  const plan = await planPrompt(composedPrompt);
  const planErrors = validateGraphPlan(plan);

  if (planErrors.length) {
    throw new Error(planErrors.join(" "));
  }

  const extracted = extractConstraintsFromPlan(plan);
  const diagram = compileGraphPlan(plan);
  const validated = validateDiagramSpec(diagram);

  return {
    diagram: await layoutDiagram(validated),
    extracted,
  };
}

function findNodeByPromptLabel(diagram: DiagramSpec, fragment: string) {
  const target = normalizeText(fragment);
  return diagram.nodes.find((node) => normalizeText(node.label).includes(target));
}

function applyLocalRevision(prompt: string, currentDiagram: DiagramSpec) {
  const diagram = structuredClone(currentDiagram);
  const assumptions: DiagramAssumption[] = [...diagram.assumptions];
  let changed = false;

  const colorMatches = prompt.matchAll(
    /\bmake\s+([A-Za-z][A-Za-z0-9\s/-]{1,30}?)\s+(red|green|blue|amber|orange|yellow|teal|purple|pink|slate|gray|grey|black|navy|crimson|emerald)\b/gi,
  );

  for (const match of colorMatches) {
    const target = normalizeText(match[1]);
    const color = match[2];

    const node = findNodeByPromptLabel(diagram, target);
    if (node) {
      node.color = normalizeColor(color, node.color);
      changed = true;
    }
  }

  const renameMatch = prompt.match(
    /\brename\s+([A-Za-z][A-Za-z0-9\s/-]{1,40}?)\s+to\s+([A-Za-z][A-Za-z0-9\s/-]{1,40})/i,
  );

  if (renameMatch) {
    const node = findNodeByPromptLabel(diagram, renameMatch[1]);
    if (node) {
      node.label = humanizeToken(renameMatch[2]);
      changed = true;
    }
  }

  const betweenMatch = prompt.match(
    /\badd\s+([A-Za-z][A-Za-z0-9\s/-]{1,40}?)\s+between\s+([A-Za-z][A-Za-z0-9\s/-]{1,40}?)\s+and\s+([A-Za-z][A-Za-z0-9\s/-]{1,40})/i,
  );

  if (betweenMatch) {
    const label = humanizeToken(betweenMatch[1]);
    const source = findNodeByPromptLabel(diagram, betweenMatch[2]);
    const target = findNodeByPromptLabel(diagram, betweenMatch[3]);

    if (source && target) {
      const node = createNode(label);
      diagram.nodes.push(node);
      diagram.edges = diagram.edges.filter(
        (edge) => !(edge.source === source.id && edge.target === target.id),
      );
      diagram.edges.push(createEdge(source.id, node.id, { label: "next" }));
      diagram.edges.push(createEdge(node.id, target.id, { label: "next" }));
      assumptions.push(
        createAssumption(
          `Inserted ${label} between ${source.label} and ${target.label}.`,
          [source.id, node.id, target.id],
        ),
      );
      changed = true;
    }
  }

  const beforeMatch = prompt.match(
    /\badd\s+([A-Za-z][A-Za-z0-9\s/-]{1,40}?)\s+before\s+([A-Za-z][A-Za-z0-9\s/-]{1,40})/i,
  );

  if (beforeMatch) {
    const label = humanizeToken(beforeMatch[1]);
    const target = findNodeByPromptLabel(diagram, beforeMatch[2]);

    if (target) {
      const node = createNode(label);
      const incoming = diagram.edges.filter((edge) => edge.target === target.id);

      diagram.nodes.push(node);
      if (incoming.length) {
        diagram.edges = diagram.edges.filter((edge) => edge.target !== target.id);
        for (const edge of incoming) {
          diagram.edges.push(createEdge(edge.source, node.id, { label: edge.label }));
        }
      }

      diagram.edges.push(createEdge(node.id, target.id, { label: "next" }));
      assumptions.push(
        createAssumption(`Inserted ${label} before ${target.label}.`, [
          node.id,
          target.id,
        ]),
      );
      changed = true;
    }
  }

  const removeMatch = prompt.match(
    /\b(remove|delete)\s+([A-Za-z][A-Za-z0-9\s/-]{1,40})/i,
  );

  if (removeMatch) {
    const target = findNodeByPromptLabel(diagram, removeMatch[2]);
    if (target) {
      diagram.nodes = diagram.nodes.filter((node) => node.id !== target.id);
      diagram.edges = diagram.edges.filter(
        (edge) => edge.source !== target.id && edge.target !== target.id,
      );
      changed = true;
    }
  }

  diagram.assumptions = assumptions;
  return { diagram, changed };
}

export async function reviseDiagram(input: {
  prompt: string;
  currentDiagram: DiagramSpec;
}): Promise<GenerateResult> {
  const safety = checkPromptSafety(input.prompt);
  if (!safety.ok) {
    throw new Error(safety.reason);
  }

  const model = modelOrNull();
  const composedPrompt = input.prompt.trim();
  let nextDiagram: DiagramSpec | null = null;

  if (model) {
    try {
      const { output } = await generateText({
        model,
        temperature: 0.2,
        output: Output.object({ schema: diagramSpecSchema }),
        system: REVISE_SYSTEM_PROMPT,
        prompt: `Current diagram JSON:
${JSON.stringify(input.currentDiagram, null, 2)}

Revision request:
${composedPrompt}`,
      });
      nextDiagram = normalizeDiagramSpec(validateDiagramSpec(output));
    } catch {
      nextDiagram = null;
    }
  }

  if (!nextDiagram) {
    const local = applyLocalRevision(composedPrompt, input.currentDiagram);
    nextDiagram = normalizeDiagramSpec(local.diagram);

    if (!local.changed) {
      nextDiagram.assumptions = [
        ...nextDiagram.assumptions,
        createAssumption(
          "Revision did not match a local rule, so the existing diagram structure was preserved.",
        ),
      ];
    }
  }

  const revisionErrors = validateRevisionIntegrity(
    input.currentDiagram,
    nextDiagram,
    composedPrompt,
  );

  if (revisionErrors.length) {
    throw new Error(revisionErrors.join(" "));
  }

  const topologyChanged = hasTopologyChanged(input.currentDiagram, nextDiagram);

  return {
    diagram: topologyChanged
      ? await layoutDiagram(nextDiagram)
      : {
          ...nextDiagram,
          nodes: nextDiagram.nodes.map((node) => ({
            ...node,
            position:
              input.currentDiagram.nodes.find((current) => current.id === node.id)
                ?.position ?? node.position,
          })),
        },
    extracted: extractConstraintsFromDiagram(nextDiagram),
  };
}
