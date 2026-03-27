import { z } from "zod";

export const directionSchema = z.enum(["TB", "LR"]);
export const nodeKindSchema = z.enum([
  "actor",
  "process",
  "tool",
  "guardrail",
  "classifier",
  "datastore",
  "decision",
  "terminator",
  "group",
]);
export const nodeShapeSchema = z.enum([
  "pill",
  "roundedRect",
  "cylinder",
  "diamond",
  "group",
]);
export const edgeSemanticSchema = z.enum([
  "request",
  "response",
  "data",
  "approval",
  "error",
  "generic",
]);
export const edgeStyleSchema = z.enum(["solid", "dashed"]);
export const assumptionSeveritySchema = z.enum(["info", "warning"]);

export const positionSchema = z.object({
  x: z.number(),
  y: z.number(),
});

export const diagramNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: nodeKindSchema,
  shape: nodeShapeSchema,
  color: z.string().min(1),
  icon: z.string().optional(),
  notes: z.string().optional(),
  position: positionSchema.optional(),
});

export const diagramEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().optional(),
  targetHandle: z.string().optional(),
  label: z.string().optional(),
  semantic: edgeSemanticSchema,
  style: edgeStyleSchema,
  color: z.string().optional(),
});

export const diagramAssumptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1),
  severity: assumptionSeveritySchema,
  affectedIds: z.array(z.string()).default([]),
});

export const clarificationQuestionSchema = z.object({
  id: z.string().min(1),
  question: z.string().min(1),
  reason: z.string().min(1),
  options: z.array(z.string()).optional(),
});

export const explicitRelationshipSchema = z.object({
  source: z.string().optional(),
  target: z.string().optional(),
  label: z.string().optional(),
  description: z.string().min(1),
});

const colorByKindSchema = z
  .object({
    actor: z.string().optional(),
    process: z.string().optional(),
    tool: z.string().optional(),
    guardrail: z.string().optional(),
    classifier: z.string().optional(),
    datastore: z.string().optional(),
    decision: z.string().optional(),
    terminator: z.string().optional(),
    group: z.string().optional(),
  })
  .default({});

export const explicitConstraintsSchema = z.object({
  components: z.array(z.string()).default([]),
  colorByLabel: z.record(z.string(), z.string()).default({}),
  colorByKind: colorByKindSchema,
  relationships: z.array(explicitRelationshipSchema).default([]),
  edgeLabels: z.array(z.string()).default([]),
  direction: directionSchema.optional(),
});

export const diagramSpecSchema = z.object({
  version: z.literal("1"),
  title: z.string().min(1),
  direction: directionSchema,
  nodes: z.array(diagramNodeSchema).max(30),
  edges: z.array(diagramEdgeSchema).max(60),
  assumptions: z.array(diagramAssumptionSchema).default([]),
});

export const analyzeResponseSchema = z.union([
  z.object({
    status: z.literal("ready"),
    extracted: explicitConstraintsSchema,
    assumptionsPreview: z.array(diagramAssumptionSchema),
  }),
  z.object({
    status: z.literal("needs_clarification"),
    extracted: explicitConstraintsSchema,
    assumptionsPreview: z.array(diagramAssumptionSchema),
    questions: z.array(clarificationQuestionSchema).min(1).max(3),
  }),
  z.object({
    status: z.literal("blocked"),
    reason: z.string().min(1),
  }),
]);

export type Direction = z.infer<typeof directionSchema>;
export type DiagramNodeKind = z.infer<typeof nodeKindSchema>;
export type DiagramNodeShape = z.infer<typeof nodeShapeSchema>;
export type EdgeSemantic = z.infer<typeof edgeSemanticSchema>;
export type EdgeStyle = z.infer<typeof edgeStyleSchema>;
export type DiagramNode = z.infer<typeof diagramNodeSchema>;
export type DiagramEdge = z.infer<typeof diagramEdgeSchema>;
export type DiagramAssumption = z.infer<typeof diagramAssumptionSchema>;
export type ClarificationQuestion = z.infer<typeof clarificationQuestionSchema>;
export type ExplicitConstraints = z.infer<typeof explicitConstraintsSchema>;
export type DiagramSpec = z.infer<typeof diagramSpecSchema>;
export type AnalyzeResponse = z.infer<typeof analyzeResponseSchema>;
