import type { DiagramSpec } from "@/lib/schema";

export function createEmptyDiagram(): DiagramSpec {
  return {
    version: "1",
    title: "Untitled workflow",
    direction: "TB",
    nodes: [],
    edges: [],
    assumptions: [],
  };
}
