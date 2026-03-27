import {
  type DiagramAssumption,
  type DiagramEdge,
  type DiagramNode,
  type DiagramNodeKind,
  type DiagramNodeShape,
  type DiagramSpec,
  type EdgeSemantic,
} from "@/lib/schema";
import { humanizeToken, normalizeText, slugify } from "@/lib/utils";

export const COLOR_NAME_TO_HEX: Record<string, string> = {
  red: "#b91c1c",
  crimson: "#b91c1c",
  green: "#16a34a",
  emerald: "#16a34a",
  blue: "#2563eb",
  navy: "#1d4ed8",
  amber: "#d97706",
  orange: "#ea580c",
  yellow: "#eab308",
  slate: "#334155",
  gray: "#475569",
  grey: "#475569",
  black: "#111827",
  purple: "#7c3aed",
  pink: "#db2777",
  teal: "#0f766e",
};

export const ICON_OPTIONS = [
  "none",
  "user",
  "bot",
  "shield",
  "brain",
  "wrench",
  "database",
  "route",
  "sparkles",
  "send",
  "file-output",
] as const;

export function normalizeColor(color: string | undefined, fallback: string) {
  if (!color) {
    return fallback;
  }

  const normalized = normalizeText(color).replace(/\s+/g, "");
  if (normalized.startsWith("#")) {
    return color;
  }

  return COLOR_NAME_TO_HEX[normalized] ?? fallback;
}

export function getDefaultColor(kind: DiagramNodeKind) {
  switch (kind) {
    case "actor":
    case "terminator":
      return "#1d4ed8";
    case "guardrail":
      return "#d97706";
    case "classifier":
      return "#16a34a";
    case "tool":
      return "#b91c1c";
    case "datastore":
      return "#1f2937";
    case "decision":
      return "#7c3aed";
    case "group":
      return "#94a3b8";
    case "process":
    default:
      return "#0f4c81";
  }
}

export function inferIcon(kind: DiagramNodeKind, icon?: string) {
  if (icon && ICON_OPTIONS.includes(icon as (typeof ICON_OPTIONS)[number])) {
    return icon;
  }

  switch (kind) {
    case "actor":
      return "user";
    case "guardrail":
      return "shield";
    case "classifier":
      return "brain";
    case "tool":
      return "wrench";
    case "datastore":
      return "database";
    case "decision":
      return "route";
    case "terminator":
      return "send";
    default:
      return "sparkles";
  }
}

export function inferKindFromLabel(
  label: string,
  preferredKind?: DiagramNodeKind,
): DiagramNodeKind {
  if (preferredKind) {
    return preferredKind;
  }

  const normalized = normalizeText(label);

  if (/^(user|client|agent|caller|customer)$/.test(normalized)) {
    return "actor";
  }

  if (
    normalized.includes("response") ||
    normalized.includes("request blocked") ||
    normalized.includes("blocked") ||
    normalized.includes("start") ||
    normalized.includes("end")
  ) {
    return "terminator";
  }

  if (
    normalized.includes("database") ||
    normalized.includes("datastore") ||
    normalized.includes("history") ||
    normalized.includes("memory") ||
    normalized.includes("store") ||
    normalized.includes("cache")
  ) {
    return "datastore";
  }

  if (normalized.includes("guardrail") || normalized.includes("policy")) {
    return "guardrail";
  }

  if (normalized.includes("classifier") || normalized.includes("classificator")) {
    return "classifier";
  }

  if (normalized.includes("decision") || normalized.includes("router")) {
    return "decision";
  }

  if (normalized.includes("tool")) {
    return "tool";
  }

  return "process";
}

export function inferShapeForKind(kind: DiagramNodeKind): DiagramNodeShape {
  switch (kind) {
    case "actor":
    case "terminator":
      return "pill";
    case "datastore":
      return "cylinder";
    case "decision":
      return "diamond";
    case "group":
      return "group";
    default:
      return "roundedRect";
  }
}

export function inferEdgeSemantic(label?: string): EdgeSemantic {
  const normalized = normalizeText(label ?? "");

  if (!normalized) {
    return "generic";
  }

  if (normalized.includes("approved")) {
    return "approval";
  }

  if (
    normalized.includes("blocked") ||
    normalized.includes("violation") ||
    normalized.includes("error")
  ) {
    return "error";
  }

  if (
    normalized.includes("history") ||
    normalized.includes("store") ||
    normalized.includes("fetch") ||
    normalized.includes("result")
  ) {
    return "data";
  }

  if (normalized.includes("response")) {
    return "response";
  }

  if (normalized.includes("query") || normalized.includes("request")) {
    return "request";
  }

  return "generic";
}

function normalizeNodeLabel(label: string) {
  return humanizeToken(
    label
      .replace(/\bclassificator\b/i, "classifier")
      .replace(/\bguard rails\b/i, "guardrails")
      .trim(),
  );
}

function ensureUniqueIds<T extends { id: string }>(items: T[]) {
  const seen = new Map<string, number>();

  return items.map((item) => {
    const count = seen.get(item.id) ?? 0;
    seen.set(item.id, count + 1);

    if (count === 0) {
      return item;
    }

    return { ...item, id: `${item.id}-${count + 1}` };
  });
}

function dedupeAssumptions(assumptions: DiagramAssumption[]) {
  const seen = new Set<string>();

  return assumptions.filter((assumption) => {
    const key = `${assumption.severity}:${normalizeText(assumption.text)}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function normalizeDiagramSpec(diagram: DiagramSpec): DiagramSpec {
  const normalizedNodes = ensureUniqueIds(
    diagram.nodes.map((node) => {
      const kind = inferKindFromLabel(node.label, node.kind);
      const label = normalizeNodeLabel(node.label);
      const color = normalizeColor(node.color, getDefaultColor(kind));

      return {
        ...node,
        id: slugify(node.id || label) || `node-${crypto.randomUUID()}`,
        label,
        kind,
        shape: inferShapeForKind(kind),
        color,
        icon: inferIcon(kind, node.icon),
      };
    }),
  );

  const normalizedEdges = ensureUniqueIds(
    diagram.edges.map((edge) => {
      const source = slugify(edge.source) || edge.source;
      const target = slugify(edge.target) || edge.target;

      return {
        ...edge,
        id:
          slugify(edge.id) ||
          `${slugify(source)}-${slugify(target)}-${crypto.randomUUID().slice(0, 6)}`,
        source,
        target,
        semantic: edge.semantic ?? inferEdgeSemantic(edge.label),
        style: edge.style ?? "solid",
        color: edge.color ?? "#334155",
      };
    }),
  );

  return {
    ...diagram,
    title: diagram.title.trim() || "Generated architecture",
    direction: diagram.direction,
    nodes: normalizedNodes,
    edges: normalizedEdges,
    assumptions: dedupeAssumptions(diagram.assumptions),
  };
}

export function createAssumption(
  text: string,
  affectedIds: string[] = [],
  severity: DiagramAssumption["severity"] = "info",
): DiagramAssumption {
  return {
    id: slugify(text) || crypto.randomUUID(),
    text,
    severity,
    affectedIds,
  };
}

export function createNode(
  label: string,
  options: Partial<DiagramNode> = {},
): DiagramNode {
  const kind = inferKindFromLabel(label, options.kind);

  return {
    id: slugify(options.id ?? label) || crypto.randomUUID(),
    label: normalizeNodeLabel(label),
    kind,
    shape: inferShapeForKind(kind),
    color: normalizeColor(options.color, getDefaultColor(kind)),
    icon: inferIcon(kind, options.icon),
    notes: options.notes,
    position: options.position,
  };
}

export function createEdge(
  source: string,
  target: string,
  options: Partial<DiagramEdge> = {},
): DiagramEdge {
  return {
    id:
      slugify(options.id ?? `${source}-${target}-${options.label ?? "edge"}`) ||
      crypto.randomUUID(),
    source: slugify(source) || source,
    target: slugify(target) || target,
    sourceHandle: options.sourceHandle,
    targetHandle: options.targetHandle,
    label: options.label,
    semantic: options.semantic ?? inferEdgeSemantic(options.label),
    style: options.style ?? "solid",
    color: options.color ?? "#334155",
  };
}
