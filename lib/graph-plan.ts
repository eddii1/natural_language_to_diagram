import { z } from "zod";

import { diagramTypeSchema } from "@/lib/diagram-type";
import {
  clarificationQuestionSchema,
  diagramAssumptionSchema,
  directionSchema,
  edgeSemanticSchema,
  edgeStyleSchema,
  nodeKindSchema,
} from "@/lib/schema";

export const graphPlanNodeSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  kind: nodeKindSchema,
  notes: z.string().optional(),
  color: z.string().optional(),
});

export const graphPlanEdgeSchema = z.object({
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  semantic: edgeSemanticSchema.optional(),
  style: edgeStyleSchema.optional(),
});

export const graphPlanSchema = z.object({
  version: z.literal("1"),
  diagramType: diagramTypeSchema,
  title: z.string().min(1),
  direction: directionSchema,
  nodes: z.array(graphPlanNodeSchema).max(30),
  edges: z.array(graphPlanEdgeSchema).max(60),
  assumptions: z.array(diagramAssumptionSchema).default([]),
  clarificationQuestions: z.array(clarificationQuestionSchema).default([]),
});

export type GraphPlanNode = z.infer<typeof graphPlanNodeSchema>;
export type GraphPlanEdge = z.infer<typeof graphPlanEdgeSchema>;
export type GraphPlan = z.infer<typeof graphPlanSchema>;
