import { createAssumption, createEdge, createNode } from "@/lib/normalization";
import { type DiagramSpec } from "@/lib/schema";

export const SAMPLE_PROMPT =
  "I want an orchestrator tool that receives a user query, appends history, applies Azure guardrails, and then decides which component to use from a sentiment, summarization, or drawing tool. Make the tools red and the classifier green.";

export const SAMPLE_DIAGRAM: DiagramSpec = {
  version: "1",
  title: "Guarded orchestration flow",
  direction: "TB",
  nodes: [
    createNode("User", {
      kind: "actor",
      color: "#1d4ed8",
      position: { x: 460, y: 24 },
    }),
    createNode("Append History", {
      kind: "process",
      color: "#0f4c81",
      position: { x: 40, y: 164 },
    }),
    createNode("Orchestrator", {
      kind: "process",
      color: "#0f4c81",
      position: { x: 352, y: 160 },
    }),
    createNode("Azure Guardrails", {
      kind: "guardrail",
      color: "#d97706",
      position: { x: 388, y: 312 },
    }),
    createNode("Request Blocked", {
      kind: "terminator",
      color: "#374151",
      position: { x: 840, y: 340 },
    }),
    createNode("Intent Classifier", {
      kind: "classifier",
      color: "#16a34a",
      position: { x: 416, y: 498 },
    }),
    createNode("Conversation History", {
      kind: "datastore",
      color: "#1f2937",
      position: { x: 40, y: 420 },
    }),
    createNode("Sentiment Analysis Tool", {
      kind: "tool",
      color: "#b91c1c",
      position: { x: 120, y: 692 },
    }),
    createNode("Summarization Tool", {
      kind: "tool",
      color: "#b91c1c",
      position: { x: 388, y: 692 },
    }),
    createNode("Drawing Tool", {
      kind: "tool",
      color: "#b91c1c",
      position: { x: 710, y: 692 },
    }),
    createNode("Response Formatter", {
      kind: "process",
      color: "#0f4c81",
      position: { x: 72, y: 910 },
    }),
    createNode("User Response", {
      kind: "terminator",
      color: "#1d4ed8",
      position: { x: 544, y: 942 },
    }),
  ],
  edges: [
    createEdge("User", "Orchestrator", { label: "sends-query" }),
    createEdge("Orchestrator", "Append History", { label: "forward-query" }),
    createEdge("Append History", "Azure Guardrails", { label: "enriched-query" }),
    createEdge("Azure Guardrails", "Request Blocked", {
      label: "policy violation",
      color: "#991b1b",
      semantic: "error",
    }),
    createEdge("Azure Guardrails", "Intent Classifier", {
      label: "approved",
      color: "#15803d",
      semantic: "approval",
    }),
    createEdge("Conversation History", "Append History", {
      label: "fetch-history",
      style: "dashed",
    }),
    createEdge("Intent Classifier", "Sentiment Analysis Tool", {
      label: "sentiment-intent",
    }),
    createEdge("Intent Classifier", "Summarization Tool", {
      label: "summarization-intent",
    }),
    createEdge("Intent Classifier", "Drawing Tool", { label: "drawing-intent" }),
    createEdge("Sentiment Analysis Tool", "Response Formatter", { label: "result" }),
    createEdge("Summarization Tool", "Response Formatter", { label: "result" }),
    createEdge("Drawing Tool", "Response Formatter", { label: "result" }),
    createEdge("Response Formatter", "Conversation History", {
      label: "store-interaction",
      style: "dashed",
    }),
    createEdge("Response Formatter", "User Response", {
      label: "formatted-response",
    }),
  ],
  assumptions: [
    createAssumption(
      "Added a response formatter to collect tool outputs into a single response.",
      ["response-formatter", "user-response"],
    ),
  ],
};
