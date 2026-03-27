import { createAssumption } from "@/lib/normalization";
import type { GraphPlan } from "@/lib/graph-plan";
import { detectPromptDirection } from "@/lib/diagram-type";

export async function planTransformerReference(prompt: string): Promise<GraphPlan> {
  return {
    version: "1",
    diagramType: "reference_architecture",
    title: "Transformer reference architecture",
    direction: detectPromptDirection(prompt, "LR"),
    nodes: [
      { id: "input-tokens", label: "Input Tokens", kind: "terminator" },
      { id: "input-embedding", label: "Input Embedding", kind: "process" },
      { id: "positional-encoding", label: "Positional Encoding", kind: "process" },
      { id: "encoder-stack", label: "Encoder Stack (Nx)", kind: "process" },
      { id: "shifted-output-tokens", label: "Shifted Output Tokens", kind: "terminator" },
      { id: "output-embedding", label: "Output Embedding", kind: "process" },
      {
        id: "decoder-positional-encoding",
        label: "Decoder Positional Encoding",
        kind: "process",
      },
      { id: "masked-self-attention", label: "Masked Self-Attention", kind: "process" },
      {
        id: "encoder-decoder-attention",
        label: "Encoder-Decoder Attention",
        kind: "process",
      },
      { id: "feed-forward", label: "Feed Forward", kind: "process" },
      { id: "decoder-stack", label: "Decoder Stack (Nx)", kind: "process" },
      { id: "linear-softmax", label: "Linear + Softmax", kind: "process" },
      { id: "output-tokens", label: "Output Tokens", kind: "terminator" },
    ],
    edges: [
      { source: "input-tokens", target: "input-embedding", label: "embed" },
      { source: "input-embedding", target: "positional-encoding", label: "add positions" },
      { source: "positional-encoding", target: "encoder-stack", label: "encode" },
      {
        source: "shifted-output-tokens",
        target: "output-embedding",
        label: "embed",
      },
      {
        source: "output-embedding",
        target: "decoder-positional-encoding",
        label: "add positions",
      },
      {
        source: "decoder-positional-encoding",
        target: "masked-self-attention",
        label: "decode context",
      },
      {
        source: "masked-self-attention",
        target: "encoder-decoder-attention",
        label: "attend to encoder memory",
      },
      {
        source: "encoder-stack",
        target: "encoder-decoder-attention",
        label: "encoder memory",
        semantic: "data",
      },
      {
        source: "encoder-decoder-attention",
        target: "feed-forward",
        label: "transform",
      },
      { source: "feed-forward", target: "decoder-stack", label: "stack output" },
      { source: "decoder-stack", target: "linear-softmax", label: "project logits" },
      { source: "linear-softmax", target: "output-tokens", label: "predict tokens" },
    ],
    assumptions: [
      createAssumption(
        'Used a high-level canonical transformer layout rather than reproducing every annotation from "Attention Is All You Need".',
      ),
    ],
    clarificationQuestions: [],
  };
}
