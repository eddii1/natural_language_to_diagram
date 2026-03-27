import { openai } from "@ai-sdk/openai";
import { generateText, Output } from "ai";

import { SAMPLE_DIAGRAM } from "@/lib/demo-data";
import {
  createAssumption,
  createEdge,
  createNode,
  getDefaultColor,
  inferKindFromLabel,
  normalizeColor,
  normalizeDiagramSpec,
} from "@/lib/normalization";
import { layoutDiagram, hasTopologyChanged } from "@/lib/layout";
import { GENERATE_SYSTEM_PROMPT, REVISE_SYSTEM_PROMPT } from "@/lib/prompts";
import {
  type AnalyzeResponse,
  type ClarificationQuestion,
  type DiagramAssumption,
  type DiagramNodeKind,
  type DiagramSpec,
  diagramSpecSchema,
  type ExplicitConstraints,
} from "@/lib/schema";
import { checkPromptSafety } from "@/lib/safety";
import {
  validateConstraintErrors,
  validateDiagramSpec,
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

const COLOR_PATTERN =
  /\b(red|green|blue|amber|orange|yellow|teal|purple|pink|slate|gray|grey|black|navy|crimson|emerald)\b/i;
const TOOL_SPLIT_PATTERN = /\s*(?:,|;|\bor\b|\band\b)\s*/i;

function modelOrNull() {
  if (!process.env.OPENAI_API_KEY) {
    return null;
  }

  return openai(process.env.OPENAI_MODEL ?? "gpt-4.1");
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

function extractColorHints(prompt: string) {
  const colorByLabel: Record<string, string> = {};
  const colorByKind: Partial<Record<DiagramNodeKind, string>> = {};
  const lower = prompt.toLowerCase();

  const kindAliases: Array<[RegExp, DiagramNodeKind]> = [
    [/\btools?\b/, "tool"],
    [/\bclassifier\b|\bclassificator\b/, "classifier"],
    [/\bguardrails?\b/, "guardrail"],
    [/\bdatastores?\b|\bdatabases?\b|\bcaches?\b/, "datastore"],
  ];

  for (const [pattern, kind] of kindAliases) {
    const colorMatch = lower.match(
      new RegExp(`${pattern.source}[^.\\n]{0,40}\\b(?:in|be|colored|colour)\\s+(\\w+)`, "i"),
    );

    if (colorMatch && COLOR_PATTERN.test(colorMatch[1])) {
      colorByKind[kind] = colorMatch[1];
    }
  }

  const specificMatches = prompt.matchAll(
    /\b([A-Za-z][A-Za-z0-9\s-]{1,30}?)\s+(?:should\s+be|to\s+be|in|colored|colour)\s+(red|green|blue|amber|orange|yellow|teal|purple|pink|slate|gray|grey|black|navy|crimson|emerald)\b/gi,
  );

  for (const match of specificMatches) {
    const label = humanizeToken(match[1]);

    if (/tools?/i.test(label) || /classifier|classificator/i.test(label)) {
      continue;
    }

    colorByLabel[label] = match[2];
  }

  return { colorByLabel, colorByKind };
}

function detectDirection(prompt: string) {
  if (/\b(left to right|horizontal|horizontally)\b/i.test(prompt)) {
    return "LR" as const;
  }

  if (/\b(top to bottom|vertical|vertically)\b/i.test(prompt)) {
    return "TB" as const;
  }

  return undefined;
}

function extractListedTools(prompt: string) {
  const match = prompt.match(
    /(?:from|among|using|between)\s+(.+?)\s+tools?\b/i,
  );

  if (!match) {
    return [];
  }

  return match[1]
    .split(TOOL_SPLIT_PATTERN)
    .map((item) =>
      normalizeText(item)
        .replace(/^(a|an|the)\s+/, "")
        .replace(/\btools?\b/g, "")
        .trim(),
    )
    .filter(Boolean)
    .map((token) => {
      const singular = token.replace(/\bsummaries\b/g, "summary").replace(/s$/, "");

      if (singular.includes("sentiment")) {
        return "Sentiment Analysis Tool";
      }

      if (singular.includes("summary") || singular.includes("summarization")) {
        return "Summarization Tool";
      }

      if (singular.includes("draw")) {
        return "Drawing Tool";
      }

      return `${humanizeToken(singular)} Tool`;
    });
}

function extractRequestedComponents(prompt: string) {
  const candidates = new Map<string, string>();
  const add = (label: string) => {
    candidates.set(normalizeText(label), humanizeToken(label));
  };

  const knownPatterns: Array<[RegExp, string]> = [
    [/\buser response\b/i, "User Response"],
    [/\bresponse formatter\b/i, "Response Formatter"],
    [/\brequest blocked\b/i, "Request Blocked"],
    [/\bappend history\b/i, "Append History"],
    [/\bconversation history\b/i, "Conversation History"],
    [/\bazure guardrails?\b/i, "Azure Guardrails"],
    [/\bintent classifier\b/i, "Intent Classifier"],
    [/\borchestrator\b/i, "Orchestrator"],
    [/\buser\b/i, "User"],
  ];

  for (const [pattern, label] of knownPatterns) {
    if (pattern.test(prompt)) {
      add(label);
    }
  }

  const dynamicMatches = prompt.matchAll(
    /\b([A-Za-z][A-Za-z0-9\s-]{1,30}?)\s+(tool|service|router|classifier|database|cache|store|formatter)\b/gi,
  );

  for (const match of dynamicMatches) {
    add(`${humanizeToken(match[1])} ${humanizeToken(match[2])}`);
  }

  for (const tool of extractListedTools(prompt)) {
    add(tool);
  }

  return [...candidates.values()];
}

function extractExplicitConstraints(prompt: string): ExplicitConstraints {
  const components = extractRequestedComponents(prompt);
  const { colorByKind, colorByLabel } = extractColorHints(prompt);
  const relationships: ExplicitConstraints["relationships"] = [];

  if (/receives?\s+(?:a\s+)?user query/i.test(prompt)) {
    relationships.push({
      source: "User",
      target: "Orchestrator",
      label: "sends-query",
      description: "User sends a query to the orchestrator",
    });
  }

  if (/append(?:s)? history/i.test(prompt)) {
    relationships.push({
      source: "Orchestrator",
      target: "Append History",
      label: "forward-query",
      description: "Orchestrator forwards the query for history enrichment",
    });
  }

  if (/guardrails?/i.test(prompt)) {
    relationships.push({
      source: "Append History",
      target: "Azure Guardrails",
      label: "enriched-query",
      description: "The enriched query is checked by guardrails",
    });
  }

  if (/decides?|classifier|route/i.test(prompt)) {
    relationships.push({
      source: "Azure Guardrails",
      target: "Intent Classifier",
      label: "approved",
      description: "Approved traffic goes to the classifier",
    });
  }

  return {
    components,
    colorByLabel,
    colorByKind,
    relationships,
    edgeLabels: relationships
      .map((relationship) => relationship.label)
      .filter((label): label is string => Boolean(label)),
    direction: detectDirection(prompt),
  };
}

function buildClarificationQuestions(
  prompt: string,
  constraints: ExplicitConstraints,
) {
  const questions: ClarificationQuestion[] = [];

  if (!constraints.components.length) {
    questions.push({
      id: "primary_components",
      question:
        "Which named components must appear in the diagram besides the entrypoint and response?",
      reason: "The prompt does not identify enough concrete blocks to build an architecture graph.",
    });
  }

  if (/decides?|routes?|classifier/i.test(prompt) && extractListedTools(prompt).length < 2) {
    questions.push({
      id: "routing_targets",
      question: "Which downstream tools or services should the classifier route to?",
      reason: "Routing behavior is mentioned, but the branch targets are underspecified.",
    });
  }

  if (!/\b(user|client|caller)\b/i.test(prompt)) {
    questions.push({
      id: "entrypoint",
      question: "What should the entrypoint actor be called?",
      reason: "The request flow does not name the actor or upstream source explicitly.",
    });
  }

  return questions.slice(0, 3);
}

function applyColorConstraints(
  nodes: ReturnType<typeof createNode>[],
  constraints: ExplicitConstraints,
) {
  return nodes.map((node) => {
    const explicitColor =
      constraints.colorByLabel[node.label] ?? constraints.colorByKind[node.kind];

    if (!explicitColor) {
      return node;
    }

    return {
      ...node,
      color: normalizeColor(explicitColor, getDefaultColor(node.kind)),
    };
  });
}

function ensureCoreFlow(
  prompt: string,
  constraints: ExplicitConstraints,
): DiagramSpec {
  const assumptions: DiagramAssumption[] = [];
  const nodeMap = new Map<string, ReturnType<typeof createNode>>();

  const ensureNode = (label: string, kind?: DiagramNodeKind) => {
    const node = nodeMap.get(normalizeText(label));
    if (node) {
      return node;
    }

    const created = createNode(label, { kind });
    nodeMap.set(normalizeText(label), created);
    return created;
  };

  const addAssumption = (text: string, affectedIds: string[] = []) => {
    assumptions.push(createAssumption(text, affectedIds));
  };

  if (/\b(user|client|caller)\b/i.test(prompt)) {
    ensureNode("User", "actor");
  } else {
    const user = ensureNode("User", "actor");
    addAssumption("Added a generic user actor as the diagram entrypoint.", [user.id]);
  }

  if (/orchestrator/i.test(prompt)) {
    ensureNode("Orchestrator", "process");
  } else {
    const orchestrator = ensureNode("Orchestrator", "process");
    addAssumption("Added an orchestrator block to coordinate the described flow.", [
      orchestrator.id,
    ]);
  }

  if (/append(?:s)? history/i.test(prompt)) {
    ensureNode("Append History", "process");
  }

  if (/guardrails?/i.test(prompt)) {
    ensureNode("Azure Guardrails", "guardrail");
    const blocked = ensureNode("Request Blocked", "terminator");
    addAssumption("Added a blocked-request terminator for guardrail violations.", [
      blocked.id,
    ]);
  }

  const listedTools = extractListedTools(prompt);
  const needsRouting = /decides?|classifier|route/i.test(prompt) || listedTools.length > 1;

  if (needsRouting) {
    const classifier = ensureNode("Intent Classifier", "classifier");

    if (!/classifier|classificator/i.test(prompt)) {
      addAssumption(
        "Added an intent classifier to represent routing logic implied by the prompt.",
        [classifier.id],
      );
    }
  }

  for (const component of constraints.components) {
    ensureNode(component, inferKindFromLabel(component));
  }

  for (const tool of listedTools) {
    ensureNode(tool, "tool");
  }

  const tools = [...nodeMap.values()].filter((node) => node.kind === "tool");
  if (tools.length && !nodeMap.has(normalizeText("Response Formatter"))) {
    const formatter = ensureNode("Response Formatter", "process");
    const response = ensureNode("User Response", "terminator");
    addAssumption(
      "Added a response formatter and user response terminator to collect tool results.",
      [formatter.id, response.id],
    );
  }

  if (
    [...nodeMap.values()].some((node) => /history/i.test(node.label)) &&
    !nodeMap.has(normalizeText("Conversation History"))
  ) {
    const history = ensureNode("Conversation History", "datastore");
    addAssumption(
      "Added a conversation history datastore to support the history-enrichment step.",
      [history.id],
    );
  }

  const nodes = applyColorConstraints([...nodeMap.values()], constraints);
  const idsByLabel = new Map(nodes.map((node) => [normalizeText(node.label), node.id]));
  const findId = (label: string) => idsByLabel.get(normalizeText(label));
  const edges = new Map<string, ReturnType<typeof createEdge>>();

  const addEdge = (
    source: string,
    target: string,
    label: string,
    options: Partial<ReturnType<typeof createEdge>> = {},
  ) => {
    const sourceId = findId(source);
    const targetId = findId(target);

    if (!sourceId || !targetId) {
      return;
    }

    const edge = createEdge(sourceId, targetId, { label, ...options });
    edges.set(edge.id, edge);
  };

  if (findId("User") && findId("Orchestrator")) {
    addEdge("User", "Orchestrator", "sends-query");
  }

  if (findId("Append History")) {
    addEdge("Orchestrator", "Append History", "forward-query");
  }

  if (findId("Azure Guardrails")) {
    addEdge("Append History", "Azure Guardrails", "enriched-query");
    if (findId("Request Blocked")) {
      addEdge("Azure Guardrails", "Request Blocked", "policy violation", {
        color: "#991b1b",
        semantic: "error",
      });
    }
  }

  if (findId("Intent Classifier")) {
    const classifierSource = findId("Azure Guardrails")
      ? "Azure Guardrails"
      : "Orchestrator";
    addEdge(classifierSource, "Intent Classifier", "approved", {
      color: "#15803d",
      semantic: "approval",
    });
  }

  if (findId("Conversation History") && findId("Append History")) {
    addEdge("Conversation History", "Append History", "fetch-history", {
      style: "dashed",
    });
  }

  const toolNodes = nodes.filter((node) => node.kind === "tool");
  for (const tool of toolNodes) {
    if (findId("Intent Classifier")) {
      const edgeLabel = `${normalizeText(tool.label).replace(/\s+tool$/, "")}-intent`;
      addEdge("Intent Classifier", tool.label, edgeLabel);
    } else {
      addEdge("Orchestrator", tool.label, "dispatch");
    }

    if (findId("Response Formatter")) {
      addEdge(tool.label, "Response Formatter", "result");
    }
  }

  if (findId("Response Formatter") && findId("Conversation History")) {
    addEdge("Response Formatter", "Conversation History", "store-interaction", {
      style: "dashed",
    });
  }

  if (findId("Response Formatter") && findId("User Response")) {
    addEdge("Response Formatter", "User Response", "formatted-response");
  }

  const title = constraints.components[0]
    ? `${constraints.components[0]} architecture`
    : SAMPLE_DIAGRAM.title;

  return {
    version: "1",
    title,
    direction: constraints.direction ?? "TB",
    nodes,
    edges: [...edges.values()],
    assumptions,
  };
}

async function generateWithModel(
  prompt: string,
  constraints: ExplicitConstraints,
) {
  const model = modelOrNull();
  if (!model) {
    return null;
  }

  const { output } = await generateText({
    model,
    temperature: 0.2,
    output: Output.object({ schema: diagramSpecSchema }),
    system: GENERATE_SYSTEM_PROMPT,
    prompt,
  });

  let candidate = normalizeDiagramSpec(validateDiagramSpec(output));
  let errors = validateConstraintErrors(candidate, constraints);

  if (errors.length) {
    const repair = await generateText({
      model,
      temperature: 0,
      output: Output.object({ schema: diagramSpecSchema }),
      system: GENERATE_SYSTEM_PROMPT,
      prompt: `${prompt}

Previous candidate JSON:
${JSON.stringify(candidate, null, 2)}

Validation errors:
${errors.map((error) => `- ${error}`).join("\n")}

Return corrected JSON only.`,
    });

    candidate = normalizeDiagramSpec(validateDiagramSpec(repair.output));
    errors = validateConstraintErrors(candidate, constraints);
  }

  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  return candidate;
}

async function heuristicGenerate(prompt: string, constraints: ExplicitConstraints) {
  return normalizeDiagramSpec(ensureCoreFlow(prompt, constraints));
}

export async function analyzePrompt(prompt: string): Promise<AnalyzeResponse> {
  const safety = checkPromptSafety(prompt);
  if (!safety.ok) {
    return {
      status: "blocked",
      reason: safety.reason,
    };
  }

  const extracted = extractExplicitConstraints(prompt);
  const assumptionsPreview: DiagramAssumption[] = [];

  if (/decides?|routes?/i.test(prompt) && !/classifier|classificator/i.test(prompt)) {
    assumptionsPreview.push(
      createAssumption(
        "The system may need a classifier or decision block to route traffic.",
      ),
    );
  }

  if (/append(?:s)? history/i.test(prompt) && !/conversation history|datastore|database/i.test(prompt)) {
    assumptionsPreview.push(
      createAssumption(
        "A conversation-history datastore may be required to support the history step.",
      ),
    );
  }

  const questions = buildClarificationQuestions(prompt, extracted);

  if (questions.length) {
    return {
      status: "needs_clarification",
      extracted,
      assumptionsPreview,
      questions,
    };
  }

  return {
    status: "ready",
    extracted,
    assumptionsPreview,
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
  const extracted = extractExplicitConstraints(composedPrompt);
  let diagram: DiagramSpec | null = null;

  try {
    diagram = await generateWithModel(composedPrompt, extracted);
  } catch {
    diagram = null;
  }

  const baseDiagram = diagram ?? (await heuristicGenerate(composedPrompt, extracted));
  const validated = validateDiagramSpec(baseDiagram);
  const normalized = normalizeDiagramSpec(validated);
  const errors = validateConstraintErrors(normalized, extracted);

  if (errors.length) {
    throw new Error(errors.join(" "));
  }

  return {
    diagram: await layoutDiagram(normalized),
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
    /\bmake\s+([A-Za-z][A-Za-z0-9\s-]{1,30}?)\s+(red|green|blue|amber|orange|yellow|teal|purple|pink|slate|gray|grey|black|navy|crimson|emerald)\b/gi,
  );

  for (const match of colorMatches) {
    const target = normalizeText(match[1]);
    const color = match[2];

    if (/tools?/.test(target)) {
      diagram.nodes = diagram.nodes.map((node) =>
        node.kind === "tool"
          ? { ...node, color: normalizeColor(color, node.color) }
          : node,
      );
      changed = true;
      continue;
    }

    if (/classifier|classificator/.test(target)) {
      diagram.nodes = diagram.nodes.map((node) =>
        node.kind === "classifier"
          ? { ...node, color: normalizeColor(color, node.color) }
          : node,
      );
      changed = true;
      continue;
    }

    const node = findNodeByPromptLabel(diagram, target);
    if (node) {
      node.color = normalizeColor(color, node.color);
      changed = true;
    }
  }

  const betweenMatch = prompt.match(
    /\badd\s+([A-Za-z][A-Za-z0-9\s-]{1,40}?)\s+between\s+([A-Za-z][A-Za-z0-9\s-]{1,40}?)\s+and\s+([A-Za-z][A-Za-z0-9\s-]{1,40})/i,
  );

  if (betweenMatch) {
    const label = humanizeToken(betweenMatch[1]);
    const source = findNodeByPromptLabel(diagram, betweenMatch[2]);
    const target = findNodeByPromptLabel(diagram, betweenMatch[3]);

    if (source && target) {
      const node = createNode(label, { kind: inferKindFromLabel(label) });
      diagram.nodes.push(node);
      diagram.edges = diagram.edges.filter(
        (edge) => !(edge.source === source.id && edge.target === target.id),
      );
      diagram.edges.push(createEdge(source.id, node.id, { label: "forward" }));
      diagram.edges.push(createEdge(node.id, target.id, { label: "forward" }));
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
    /\badd\s+([A-Za-z][A-Za-z0-9\s-]{1,40}?)\s+before\s+([A-Za-z][A-Za-z0-9\s-]{1,40})/i,
  );

  if (beforeMatch) {
    const label = humanizeToken(beforeMatch[1]);
    const target = findNodeByPromptLabel(diagram, beforeMatch[2]);

    if (target) {
      const node = createNode(label, { kind: inferKindFromLabel(label) });
      const incoming = diagram.edges.filter((edge) => edge.target === target.id);

      diagram.nodes.push(node);
      if (incoming.length) {
        diagram.edges = diagram.edges.filter((edge) => edge.target !== target.id);
        for (const edge of incoming) {
          diagram.edges.push(createEdge(edge.source, node.id, { label: edge.label }));
        }
      }

      diagram.edges.push(createEdge(node.id, target.id, { label: "forward" }));
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
    /\b(remove|delete)\s+([A-Za-z][A-Za-z0-9\s-]{1,40})/i,
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
          "Revision did not match a local rule, so the existing architecture was preserved.",
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

  const extracted = extractExplicitConstraints(composedPrompt);
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
    extracted,
  };
}
