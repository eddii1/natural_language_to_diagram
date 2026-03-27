"use client";

import type { Connection, EdgeChange, NodeChange } from "@xyflow/react";
import { create } from "zustand";

import { SAMPLE_DIAGRAM } from "@/lib/demo-data";
import {
  createEdge,
  createNode,
  getDefaultColor,
  inferIcon,
  inferShapeForKind,
} from "@/lib/normalization";
import type {
  DiagramEdge,
  DiagramNode,
  DiagramNodeKind,
  DiagramSpec,
} from "@/lib/schema";

type DiagramStore = {
  diagram: DiagramSpec;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setDiagram: (diagram: DiagramSpec) => void;
  resetDiagram: () => void;
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;
  updateNode: (nodeId: string, patch: Partial<DiagramNode>) => void;
  updateEdge: (edgeId: string, patch: Partial<DiagramEdge>) => void;
  applyNodeChanges: (changes: NodeChange[]) => void;
  applyEdgeChanges: (changes: EdgeChange[]) => void;
  connect: (connection: Connection) => void;
  reconnect: (edgeId: string, connection: Connection) => void;
  addNode: (kind?: DiagramNodeKind) => void;
  removeSelected: () => void;
};

function withDiagram(
  diagram: DiagramSpec,
  update: (draft: DiagramSpec) => DiagramSpec,
) {
  return update(structuredClone(diagram));
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  diagram: SAMPLE_DIAGRAM,
  selectedNodeId: null,
  selectedEdgeId: null,
  setDiagram: (diagram) =>
    set({
      diagram,
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
  resetDiagram: () =>
    set({
      diagram: SAMPLE_DIAGRAM,
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
  selectNode: (selectedNodeId) =>
    set((state) => {
      if (
        state.selectedNodeId === selectedNodeId &&
        state.selectedEdgeId === null
      ) {
        return state;
      }

      return { ...state, selectedNodeId, selectedEdgeId: null };
    }),
  selectEdge: (selectedEdgeId) =>
    set((state) => {
      if (
        state.selectedEdgeId === selectedEdgeId &&
        state.selectedNodeId === null
      ) {
        return state;
      }

      return { ...state, selectedEdgeId, selectedNodeId: null };
    }),
  clearSelection: () =>
    set((state) => {
      if (state.selectedNodeId === null && state.selectedEdgeId === null) {
        return state;
      }

      return { ...state, selectedNodeId: null, selectedEdgeId: null };
    }),
  updateNode: (nodeId, patch) =>
    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        draft.nodes = draft.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...patch } : node,
        );
        return draft;
      }),
    })),
  updateEdge: (edgeId, patch) =>
    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        draft.edges = draft.edges.map((edge) =>
          edge.id === edgeId ? { ...edge, ...patch } : edge,
        );
        return draft;
      }),
    })),
  applyNodeChanges: (changes) =>
    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        for (const change of changes) {
          if (change.type === "remove") {
            draft.nodes = draft.nodes.filter((node) => node.id !== change.id);
            draft.edges = draft.edges.filter(
              (edge) => edge.source !== change.id && edge.target !== change.id,
            );
          }

          if (change.type === "position" && change.position) {
            draft.nodes = draft.nodes.map((node) =>
              node.id === change.id
                ? { ...node, position: change.position }
                : node,
            );
          }
        }

        return draft;
      }),
    })),
  applyEdgeChanges: (changes) =>
    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        for (const change of changes) {
          if (change.type === "remove") {
            draft.edges = draft.edges.filter((edge) => edge.id !== change.id);
          }
        }

        return draft;
      }),
    })),
  connect: (connection) =>
    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        if (!connection.source || !connection.target) {
          return draft;
        }

        draft.edges.push(
          createEdge(connection.source, connection.target, {
            label: "connection",
            sourceHandle: connection.sourceHandle ?? undefined,
            targetHandle: connection.targetHandle ?? undefined,
          }),
        );
        return draft;
      }),
    })),
  reconnect: (edgeId, connection) =>
    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        draft.edges = draft.edges.map((edge) => {
          if (edge.id !== edgeId) {
            return edge;
          }

          return {
            ...edge,
            source: connection.source ?? edge.source,
            target: connection.target ?? edge.target,
            sourceHandle: connection.sourceHandle ?? edge.sourceHandle,
            targetHandle: connection.targetHandle ?? edge.targetHandle,
          };
        });
        return draft;
      }),
    })),
  addNode: (kind = "process") =>
    set((state) => {
      const nextIndex = state.diagram.nodes.length + 1;
      const node = createNode(`${kind} ${nextIndex}`, {
        kind,
        color: getDefaultColor(kind),
        icon: inferIcon(kind),
        shape: inferShapeForKind(kind),
        position: {
          x: 120 + (nextIndex % 3) * 120,
          y: 120 + Math.floor(nextIndex / 3) * 96,
        },
      });

      return {
        diagram: {
          ...state.diagram,
          nodes: [...state.diagram.nodes, node],
        },
        selectedNodeId: node.id,
        selectedEdgeId: null,
      };
    }),
  removeSelected: () => {
    const { selectedEdgeId, selectedNodeId } = get();

    set((state) => ({
      diagram: withDiagram(state.diagram, (draft) => {
        if (selectedNodeId) {
          draft.nodes = draft.nodes.filter((node) => node.id !== selectedNodeId);
          draft.edges = draft.edges.filter(
            (edge) =>
              edge.source !== selectedNodeId && edge.target !== selectedNodeId,
          );
        }

        if (selectedEdgeId) {
          draft.edges = draft.edges.filter((edge) => edge.id !== selectedEdgeId);
        }

        return draft;
      }),
      selectedEdgeId: null,
      selectedNodeId: null,
    }));
  },
}));
