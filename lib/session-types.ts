import type {
  ClarificationQuestion,
  DiagramAssumption,
  DiagramSpec,
  ExplicitConstraints,
} from "@/lib/schema";

export type HistoryEntryKind = "generate" | "revise";

export type HistoryEntry = {
  id: string;
  kind: HistoryEntryKind;
  prompt: string;
  timestamp: string;
  diagram: DiagramSpec;
  extracted?: ExplicitConstraints | null;
  assumptions: DiagramAssumption[];
};

export type WorkspaceSessionState = {
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
};
