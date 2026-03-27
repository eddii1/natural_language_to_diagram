import { z } from "zod";

import { edgeSemanticSchema, nodeKindSchema } from "@/lib/schema";

export const patternDomainSchema = z.enum([
  "generic",
  "llm",
  "data",
  "integration",
  "security",
  "application",
  "ml",
]);

export const patternStyleSchema = z.enum([
  "request_response",
  "pipeline",
  "router",
  "event_driven",
  "workflow",
  "hybrid",
]);

export const patternInteractionModeSchema = z.enum(["sync", "async"]);

export const architecturePatternNodeRoleSchema = z.enum([
  "ingress",
  "gateway",
  "presentation",
  "application",
  "orchestrator",
  "router",
  "classifier",
  "worker",
  "retriever",
  "reasoner",
  "tool",
  "guardrail",
  "auth",
  "identity_provider",
  "service",
  "producer",
  "consumer",
  "queue",
  "event_bus",
  "broker",
  "cache",
  "datastore",
  "knowledge_store",
  "search_index",
  "warehouse",
  "sink",
  "external_system",
  "human_approver",
  "formatter",
  "terminator",
]);

export const architecturePatternNodeSchema = z.object({
  label: z.string().min(1),
  kind: nodeKindSchema,
  role: architecturePatternNodeRoleSchema,
  description: z.string().min(1),
});

export const architecturePatternEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().min(1),
  semantic: edgeSemanticSchema,
  interactionMode: patternInteractionModeSchema,
  required: z.boolean().default(true),
});

export const architecturePatternInvariantSchema = z.object({
  rule: z.string().min(1),
  severity: z.enum(["warning", "error"]),
  rationale: z.string().min(1),
});

export const architecturePatternAliasSchema = z.object({
  canonical: z.string().min(1),
  terms: z.array(z.string().min(1)).min(1),
});

export const architecturePatternAntiPatternSchema = z.object({
  condition: z.string().min(1),
  rationale: z.string().min(1),
});

export const architecturePatternClarificationSchema = z.object({
  question: z.string().min(1),
  reason: z.string().min(1),
  blocking: z.boolean().default(false),
});

export const architecturePatternSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  domain: patternDomainSchema,
  style: patternStyleSchema,
  tags: z.array(z.string().min(1)).min(1),
  triggers: z.array(z.string().min(1)).min(1),
  aliases: z.array(architecturePatternAliasSchema).default([]),
  requiredNodes: z.array(architecturePatternNodeSchema).min(1),
  optionalNodes: z.array(architecturePatternNodeSchema).default([]),
  canonicalEdges: z.array(architecturePatternEdgeSchema).min(1),
  invariants: z.array(architecturePatternInvariantSchema).min(2).max(6),
  antiPatterns: z.array(architecturePatternAntiPatternSchema).default([]),
  clarifications: z.array(architecturePatternClarificationSchema).default([]),
});

export const architecturePatternArraySchema = z
  .array(architecturePatternSchema)
  .min(1);

export type PatternDomain = z.infer<typeof patternDomainSchema>;
export type PatternStyle = z.infer<typeof patternStyleSchema>;
export type PatternInteractionMode = z.infer<typeof patternInteractionModeSchema>;
export type ArchitecturePatternNodeRole = z.infer<
  typeof architecturePatternNodeRoleSchema
>;
export type ArchitecturePatternNode = z.infer<
  typeof architecturePatternNodeSchema
>;
export type ArchitecturePatternEdge = z.infer<
  typeof architecturePatternEdgeSchema
>;
export type ArchitecturePatternInvariant = z.infer<
  typeof architecturePatternInvariantSchema
>;
export type ArchitecturePatternAlias = z.infer<
  typeof architecturePatternAliasSchema
>;
export type ArchitecturePatternAntiPattern = z.infer<
  typeof architecturePatternAntiPatternSchema
>;
export type ArchitecturePatternClarification = z.infer<
  typeof architecturePatternClarificationSchema
>;
export type ArchitecturePattern = z.infer<typeof architecturePatternSchema>;
