import { createAssumption } from "@/lib/normalization";
import type { GraphPlan, GraphPlanNode } from "@/lib/graph-plan";
import { detectPromptDirection } from "@/lib/diagram-type";
import { humanizeToken, normalizeText, slugify } from "@/lib/utils";

function extractListedTools(prompt: string) {
  const match = prompt.match(/(?:from|among|using|between)\s+(.+?)\s+tools?\b/i);

  if (!match) {
    return [];
  }

  return match[1]
    .split(/\s*(?:,|;|\bor\b|\band\b)\s*/i)
    .map((item) =>
      normalizeText(item)
        .replace(/^(a|an|the)\s+/, "")
        .replace(/\btools?\b/g, "")
        .trim(),
    )
    .filter(Boolean)
    .map((token) => `${humanizeToken(token.replace(/s$/, ""))} Tool`);
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

export async function planArchitectureFlow(prompt: string): Promise<GraphPlan> {
  const nodes = new Map<string, GraphPlanNode>();
  const edges: GraphPlan["edges"] = [];
  const assumptions = [];
  const normalized = normalizeText(prompt);
  const tools = extractListedTools(prompt);

  const addLinearEdge = (source: string, target: string, label?: string) => {
    edges.push({
      source: slugify(source),
      target: slugify(target),
      label,
    });
  };

  const chainCandidates = [
    {
      label: "User",
      kind: "actor" as const,
      patterns: [/\buser\b/, /\bclient\b/, /\bcaller\b/],
      fallback: true,
    },
    {
      label: "Orchestrator",
      kind: "process" as const,
      patterns: [/\borchestrator\b/],
    },
    {
      label: "Append History",
      kind: "process" as const,
      patterns: [/\bappend(?:s)? history\b/],
    },
    {
      label: normalized.includes("azure guardrail") ? "Azure Guardrails" : "Prompt Guardrail",
      kind: "guardrail" as const,
      patterns: [/\bprompt guardrail\b/, /\binput guardrail\b/, /\bazure guardrails?\b/],
    },
    {
      label: "LLM Gateway",
      kind: "process" as const,
      patterns: [/\bgateway\b/],
    },
    {
      label: "LLM API",
      kind: "process" as const,
      patterns: [/\bllm api\b/, /\bllm\b/, /\bmodel api\b/, /\bapi call\b/],
    },
    {
      label: "Intent Classifier",
      kind: "classifier" as const,
      patterns: [/\bclassifier\b/, /\bdecides?\b/, /\broutes?\b/],
    },
    {
      label: "Output Guardrail",
      kind: "guardrail" as const,
      patterns: [/\boutput guardrail\b/, /\bresponse guardrail\b/],
    },
    {
      label: "Response Formatter",
      kind: "process" as const,
      patterns: [/\bresponse formatter\b/],
    },
    {
      label: "User Response",
      kind: "terminator" as const,
      patterns: [/\buser response\b/, /\bto the user\b/, /\breturn(?:ed)? to the user\b/],
    },
  ];

  const orderedChain = chainCandidates.filter(
    (candidate) =>
      candidate.fallback ||
      candidate.patterns.some((pattern) => pattern.test(prompt.toLowerCase())),
  );

  if (!orderedChain.some((candidate) => candidate.label === "User")) {
    orderedChain.unshift({
      label: "User",
      kind: "actor",
      patterns: [],
      fallback: true,
    });
    assumptions.push(
      createAssumption("Added a generic user entrypoint for the described flow."),
    );
  }

  if (orderedChain.some((candidate) => candidate.label === "LLM API") &&
      !orderedChain.some((candidate) => candidate.label === "User Response")) {
    orderedChain.push({
      label: "User Response",
      kind: "terminator",
      patterns: [],
    });
    assumptions.push(
      createAssumption("Added a user response node to terminate the architecture flow."),
    );
  }

  if (tools.length && !orderedChain.some((candidate) => candidate.label === "Response Formatter")) {
    orderedChain.push({
      label: "Response Formatter",
      kind: "process",
      patterns: [],
    });
    orderedChain.push({
      label: "User Response",
      kind: "terminator",
      patterns: [],
    });
  }

  const dedupedChain = orderedChain.filter(
    (candidate, index, all) =>
      all.findIndex((entry) => entry.label === candidate.label) === index,
  );

  for (const candidate of dedupedChain) {
    addNode(nodes, candidate.label, candidate.kind);
  }

  if (nodes.has("append-history")) {
    addNode(
      nodes,
      "Conversation History",
      "datastore",
      "Datastore used to enrich requests with prior context.",
    );
    edges.push({
      source: "conversation-history",
      target: "append-history",
      label: "fetch history",
      semantic: "data",
      style: "dashed",
    });
  }

  if (
    dedupedChain.some((candidate) => candidate.label.includes("Guardrail")) &&
    !normalized.includes("successful")
  ) {
    addNode(nodes, "Request Blocked", "terminator");
    const guardrail =
      nodes.get("prompt-guardrail") ??
      nodes.get("azure-guardrails") ??
      nodes.get("output-guardrail");

    if (guardrail) {
      edges.push({
        source: guardrail.id,
        target: "request-blocked",
        label: "blocked",
        semantic: "error",
      });
    }
  }

  if (tools.length) {
    for (const tool of tools) {
      addNode(nodes, tool, "tool");
    }
  }

  for (let index = 0; index < dedupedChain.length - 1; index += 1) {
    const source = dedupedChain[index].label;
    const target = dedupedChain[index + 1].label;
    const pair = `${source}->${target}`;
    const label =
      pair === "User->Prompt Guardrail"
        ? "user query"
        : pair === "Prompt Guardrail->LLM Gateway"
          ? "approved prompt"
          : pair === "Azure Guardrails->Intent Classifier"
            ? "approved"
            : pair === "LLM Gateway->LLM API"
              ? "api call"
              : pair === "LLM API->Output Guardrail"
                ? "model output"
                : pair === "Output Guardrail->User Response"
                  ? "approved response"
                  : pair === "Response Formatter->User Response"
                    ? "formatted response"
                    : "next";

    addLinearEdge(source, target, label);
  }

  const classifier = nodes.get("intent-classifier");
  const orchestrator = nodes.get("orchestrator");
  const formatter = nodes.get("response-formatter");

  if (tools.length) {
    const branchSource = classifier?.id ?? orchestrator?.id ?? "user";
    for (const tool of tools) {
      edges.push({
        source: branchSource,
        target: slugify(tool),
        label: `${normalizeText(tool).replace(/\s+tool$/, "")} intent`,
      });

      if (formatter) {
        edges.push({
          source: slugify(tool),
          target: formatter.id,
          label: "result",
          semantic: "data",
        });
      }
    }
  }

  return {
    version: "1",
    diagramType: "architecture_flow",
    title: normalized.includes("llm")
      ? "LLM architecture flow"
      : "Architecture flow",
    direction: detectPromptDirection(prompt, "TB"),
    nodes: [...nodes.values()],
    edges,
    assumptions,
    clarificationQuestions: [],
  };
}
