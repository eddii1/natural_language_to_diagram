"use client";

import { create } from "zustand";

import { SAMPLE_DIAGRAM } from "@/lib/demo-data";
import type {
  DiagramEdge,
  DiagramNode,
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
