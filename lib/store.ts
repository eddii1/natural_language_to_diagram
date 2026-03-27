"use client";

import { create } from "zustand";

import { SAMPLE_DIAGRAM } from "@/lib/demo-data";
import { SAMPLE_PROMPT } from "@/lib/demo-data";
import { createEmptyDiagram } from "@/lib/empty-diagram";
import type { HistoryEntry } from "@/lib/session-types";
import type {
  ClarificationQuestion,
  DiagramAssumption,
  DiagramEdge,
  DiagramNode,
  DiagramSpec,
  ExplicitConstraints,
} from "@/lib/schema";

type DiagramStore = {
  activeDiagram: DiagramSpec;
  history: HistoryEntry[];
  activeHistoryEntryId: string | null;
  draftGeneratePrompt: string;
  draftRevisionPrompt: string;
  clarificationAnswers: Record<string, string>;
  questions: ClarificationQuestion[];
  extracted: ExplicitConstraints | null;
  assumptionsPreview: DiagramAssumption[];
  error: string | null;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  setActiveDiagram: (diagram: DiagramSpec) => void;
  clearActiveDiagram: () => void;
  setHistory: (history: HistoryEntry[]) => void;
  appendHistoryEntry: (entry: HistoryEntry) => void;
  restoreHistoryEntry: (entryId: string) => void;
  setDraftGeneratePrompt: (prompt: string) => void;
  setDraftRevisionPrompt: (prompt: string) => void;
  setQuestions: (questions: ClarificationQuestion[]) => void;
  setClarificationAnswers: (answers: Record<string, string>) => void;
  setExtracted: (extracted: ExplicitConstraints | null) => void;
  setAssumptionsPreview: (assumptions: DiagramAssumption[]) => void;
  setError: (error: string | null) => void;
  startFreshGenerationRequest: () => void;
  recordGenerateResult: (entry: Omit<HistoryEntry, "id" | "timestamp" | "kind">) => void;
  recordRevisionResult: (entry: Omit<HistoryEntry, "id" | "timestamp" | "kind">) => void;
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

function createHistoryEntry(
  kind: HistoryEntry["kind"],
  entry: Omit<HistoryEntry, "id" | "timestamp" | "kind">,
): HistoryEntry {
  return {
    id: crypto.randomUUID(),
    kind,
    timestamp: new Date().toISOString(),
    ...entry,
  };
}

export const useDiagramStore = create<DiagramStore>((set, get) => ({
  activeDiagram: SAMPLE_DIAGRAM,
  history: [],
  activeHistoryEntryId: null,
  draftGeneratePrompt: SAMPLE_PROMPT,
  draftRevisionPrompt: "",
  clarificationAnswers: {},
  questions: [],
  extracted: null,
  assumptionsPreview: SAMPLE_DIAGRAM.assumptions,
  error: null,
  selectedNodeId: null,
  selectedEdgeId: null,
  setActiveDiagram: (activeDiagram) =>
    set({
      activeDiagram,
      activeHistoryEntryId: null,
      assumptionsPreview: activeDiagram.assumptions,
    }),
  clearActiveDiagram: () =>
    set({
      activeDiagram: createEmptyDiagram(),
      activeHistoryEntryId: null,
      extracted: null,
      assumptionsPreview: [],
      questions: [],
      clarificationAnswers: {},
      error: null,
      selectedNodeId: null,
      selectedEdgeId: null,
    }),
  setHistory: (history) => set((state) => ({ ...state, history })),
  appendHistoryEntry: (entry) =>
    set((state) => ({
      ...state,
      history: [entry, ...state.history],
      activeHistoryEntryId: entry.id,
    })),
  restoreHistoryEntry: (entryId) =>
    set((state) => {
      const entry = state.history.find((candidate) => candidate.id === entryId);
      if (!entry) {
        return state;
      }

      return {
        ...state,
        activeDiagram: entry.diagram,
        activeHistoryEntryId: entry.id,
        draftGeneratePrompt: entry.kind === "generate" ? entry.prompt : state.draftGeneratePrompt,
        draftRevisionPrompt: entry.kind === "revise" ? entry.prompt : "",
        extracted: entry.extracted ?? null,
        assumptionsPreview: entry.assumptions,
        selectedNodeId: null,
        selectedEdgeId: null,
        questions: [],
        clarificationAnswers: {},
        error: null,
      };
    }),
  setDraftGeneratePrompt: (draftGeneratePrompt) =>
    set((state) => ({ ...state, draftGeneratePrompt })),
  setDraftRevisionPrompt: (draftRevisionPrompt) =>
    set((state) => ({ ...state, draftRevisionPrompt })),
  setQuestions: (questions) => set((state) => ({ ...state, questions })),
  setClarificationAnswers: (clarificationAnswers) =>
    set((state) => ({ ...state, clarificationAnswers })),
  setExtracted: (extracted) => set((state) => ({ ...state, extracted })),
  setAssumptionsPreview: (assumptionsPreview) =>
    set((state) => ({ ...state, assumptionsPreview })),
  setError: (error) => set((state) => ({ ...state, error })),
  startFreshGenerationRequest: () =>
    set((state) => ({
      ...state,
      activeDiagram: createEmptyDiagram(),
      activeHistoryEntryId: null,
      draftRevisionPrompt: "",
      questions: [],
      extracted: null,
      assumptionsPreview: [],
      selectedNodeId: null,
      selectedEdgeId: null,
      error: null,
    })),
  recordGenerateResult: (entry) =>
    set((state) => {
      const nextEntry = createHistoryEntry("generate", entry);

      return {
        ...state,
        activeDiagram: nextEntry.diagram,
        history: [nextEntry, ...state.history],
        activeHistoryEntryId: nextEntry.id,
        extracted: nextEntry.extracted ?? null,
        assumptionsPreview: nextEntry.assumptions,
        draftRevisionPrompt: "",
        error: null,
        selectedNodeId: null,
        selectedEdgeId: null,
      };
    }),
  recordRevisionResult: (entry) =>
    set((state) => {
      const nextEntry = createHistoryEntry("revise", entry);

      return {
        ...state,
        activeDiagram: nextEntry.diagram,
        history: [nextEntry, ...state.history],
        activeHistoryEntryId: nextEntry.id,
        extracted: nextEntry.extracted ?? state.extracted,
        assumptionsPreview: nextEntry.assumptions,
        draftRevisionPrompt: "",
        error: null,
        selectedNodeId: null,
        selectedEdgeId: null,
      };
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
      activeHistoryEntryId: null,
      activeDiagram: withDiagram(state.activeDiagram, (draft) => {
        draft.nodes = draft.nodes.map((node) =>
          node.id === nodeId ? { ...node, ...patch } : node,
        );
        return draft;
      }),
    })),
  updateEdge: (edgeId, patch) =>
    set((state) => ({
      activeHistoryEntryId: null,
      activeDiagram: withDiagram(state.activeDiagram, (draft) => {
        draft.edges = draft.edges.map((edge) =>
          edge.id === edgeId ? { ...edge, ...patch } : edge,
        );
        return draft;
      }),
    })),
  removeSelected: () => {
    const { selectedEdgeId, selectedNodeId } = get();

    set((state) => ({
      activeHistoryEntryId: null,
      activeDiagram: withDiagram(state.activeDiagram, (draft) => {
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
