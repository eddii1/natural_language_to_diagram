"use client";

import type { Edge as ReactFlowEdge, Node as ReactFlowNode } from "@xyflow/react";

import { createEdge as createDiagramEdge, createNode as createDiagramNode } from "@/lib/normalization";
import type { DiagramEdge, DiagramNode, DiagramSpec } from "@/lib/schema";

export type CanvasNode = ReactFlowNode<{ node: DiagramNode }>;
export type CanvasEdge = ReactFlowEdge<{ edge: DiagramEdge }>;

function edgeToCanvasEdge(edge: DiagramEdge): CanvasEdge {
  return {
    id: edge.id,
    type: "labeled",
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    data: { edge },
  };
}

function nodeToCanvasNode(node: DiagramNode): CanvasNode {
  return {
    id: node.id,
    type: node.shape,
    position: node.position ?? { x: 0, y: 0 },
    data: { node },
  };
}

export function diagramToReactFlow(diagram: DiagramSpec) {
  return {
    nodes: diagram.nodes.map(nodeToCanvasNode),
    edges: diagram.edges.map(edgeToCanvasEdge),
  };
}

export function reactFlowToDiagram(
  base: DiagramSpec,
  nodes: CanvasNode[],
  edges: CanvasEdge[],
): DiagramSpec {
  const nextNodes = nodes.map((node) => {
    const source = node.data?.node;
    const fallback = base.nodes.find((candidate) => candidate.id === node.id);

    return {
      ...(fallback ?? createDiagramNode(node.id)),
      ...(source ?? {}),
      id: node.id,
      position: node.position,
      shape: (node.type as DiagramNode["shape"]) ?? source?.shape ?? fallback?.shape ?? "roundedRect",
    };
  });

  const nextEdges = edges.map((edge) => {
    const source = edge.data?.edge;
    const fallback = base.edges.find((candidate) => candidate.id === edge.id);

    return {
      ...(fallback ?? createDiagramEdge(edge.source, edge.target)),
      ...(source ?? {}),
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? source?.sourceHandle,
      targetHandle: edge.targetHandle ?? source?.targetHandle,
    };
  });

  return {
    ...base,
    nodes: nextNodes,
    edges: nextEdges,
  };
}

export function createCanvasNode(
  label: string,
  count: number,
): CanvasNode {
  const node = createDiagramNode(label, {
    position: {
      x: 140 + (count % 3) * 220,
      y: 160 + Math.floor(count / 3) * 140,
    },
  });

  return nodeToCanvasNode(node);
}

export function createCanvasEdge(edge: DiagramEdge): CanvasEdge {
  return edgeToCanvasEdge(edge);
}

export function diagramSignature(diagram: DiagramSpec) {
  return JSON.stringify({
    title: diagram.title,
    direction: diagram.direction,
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      kind: node.kind,
      shape: node.shape,
      color: node.color,
      icon: node.icon,
      notes: node.notes,
      position: node.position,
    })),
    edges: diagram.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
      semantic: edge.semantic,
      style: edge.style,
      color: edge.color,
    })),
    assumptions: diagram.assumptions,
  });
}

export function layoutSignature(diagram: DiagramSpec) {
  return JSON.stringify({
    direction: diagram.direction,
    nodes: diagram.nodes.map((node) => ({
      id: node.id,
      position: node.position,
    })),
    edges: diagram.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle,
      targetHandle: edge.targetHandle,
      label: edge.label,
    })),
  });
}
