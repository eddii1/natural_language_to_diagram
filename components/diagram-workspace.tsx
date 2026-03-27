"use client";

import { useState } from "react";

import { DiagramCanvas } from "@/components/diagram-canvas";
import { InspectorPanel } from "@/components/inspector-panel";
import { PromptPanel } from "@/components/prompt-panel";
import { exportCanvasAsPng, exportCanvasAsSvg, exportJson } from "@/lib/export";
import {
  getDefaultColor,
  inferIcon,
  inferShapeForKind,
} from "@/lib/normalization";
import type {
  AnalyzeResponse,
  DiagramSpec,
  ExplicitConstraints,
} from "@/lib/schema";
import { useDiagramStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type BusyState = "idle" | "generate" | "revise";

type GenerateResponse = {
  diagram: DiagramSpec;
  extracted: ExplicitConstraints;
};

type ReviseResponse = {
  diagram: DiagramSpec;
  extracted?: ExplicitConstraints;
};

export function DiagramWorkspace() {
  const {
    activeDiagram,
    history,
    activeHistoryEntryId,
    draftGeneratePrompt,
    draftRevisionPrompt,
    clarificationAnswers,
    questions,
    extracted,
    assumptionsPreview,
    error,
    selectedNodeId,
    selectedEdgeId,
    setActiveDiagram,
    clearActiveDiagram,
    restoreHistoryEntry,
    setDraftGeneratePrompt,
    setDraftRevisionPrompt,
    setQuestions,
    setClarificationAnswers,
    setExtracted,
    setAssumptionsPreview,
    setError,
    startFreshGenerationRequest,
    recordGenerateResult,
    recordRevisionResult,
    clearSelection,
    selectEdge,
    selectNode,
    updateNode,
    updateEdge,
    removeSelected,
  } = useDiagramStore();
  const [busy, setBusy] = useState<BusyState>("idle");

  const selectedNode = activeDiagram.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = activeDiagram.edges.find((edge) => edge.id === selectedEdgeId);
  const hasSelection = Boolean(selectedNode || selectedEdge);
  const canRevise = activeDiagram.nodes.length > 0;

  const handlePromptChange = (value: string) => {
    setDraftGeneratePrompt(value);
    setQuestions([]);
    setClarificationAnswers({});
    setExtracted(null);
    setAssumptionsPreview(activeDiagram.assumptions);
    setError(null);
  };

  const handleGenerate = async () => {
    setBusy("generate");
    setError(null);
    startFreshGenerationRequest();

    try {
      const analyzeResponse = await fetch("/api/diagram/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt: draftGeneratePrompt }),
      });

      const analyzeData = (await analyzeResponse.json()) as AnalyzeResponse & {
        error?: string;
      };

      if (!analyzeResponse.ok) {
        throw new Error(
          "reason" in analyzeData
            ? analyzeData.reason
            : analyzeData.error ?? "Failed to analyze prompt.",
        );
      }

      if (analyzeData.status === "blocked") {
        throw new Error(analyzeData.reason);
      }

      setExtracted(analyzeData.extracted);
      setAssumptionsPreview(analyzeData.assumptionsPreview);

      if (analyzeData.status === "needs_clarification") {
        setQuestions(analyzeData.questions);

        const missingAnswers = analyzeData.questions.some(
          (question) => !clarificationAnswers[question.id]?.trim(),
        );

        if (missingAnswers) {
          return;
        }
      } else {
        setQuestions([]);
      }

      const generateResponse = await fetch("/api/diagram/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: draftGeneratePrompt,
          clarificationAnswers,
        }),
      });

      const generateData = (await generateResponse.json()) as GenerateResponse & {
        error?: string;
      };

      if (!generateResponse.ok) {
        throw new Error(generateData.error ?? "Failed to generate diagram.");
      }

      recordGenerateResult({
        prompt: draftGeneratePrompt,
        diagram: generateData.diagram,
        extracted: generateData.extracted,
        assumptions: generateData.diagram.assumptions,
      });
      setQuestions([]);
      setClarificationAnswers({});
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Something went wrong while generating the diagram.",
      );
    } finally {
      setBusy("idle");
    }
  };

  const handleRevise = async () => {
    if (!draftRevisionPrompt.trim()) {
      setError("Enter a revision prompt before applying changes.");
      return;
    }

    if (!canRevise) {
      setError("Generate or restore a workflow before applying revisions.");
      return;
    }

    setBusy("revise");
    setError(null);

    try {
      const response = await fetch("/api/diagram/revise", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: draftRevisionPrompt,
          currentDiagram: activeDiagram,
        }),
      });

      const data = (await response.json()) as ReviseResponse & { error?: string };
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to revise diagram.");
      }

      recordRevisionResult({
        prompt: draftRevisionPrompt,
        diagram: data.diagram,
        extracted: data.extracted ?? extracted,
        assumptions: data.diagram.assumptions,
      });
    } catch (revisionError) {
      setError(
        revisionError instanceof Error
          ? revisionError.message
          : "Something went wrong while revising the diagram.",
      );
    } finally {
      setBusy("idle");
    }
  };

  const handleExport = async (format: "png" | "svg" | "json") => {
    try {
      if (format === "json") {
        exportJson(activeDiagram, "architecture-diagram.json");
        return;
      }

      const root = document.querySelector(".diagram-flow")?.parentElement as HTMLElement | null;
      if (!root) {
        throw new Error("Canvas is not ready for export.");
      }

      if (format === "png") {
        await exportCanvasAsPng(root, "architecture-diagram.png");
        return;
      }

      await exportCanvasAsSvg(root, "architecture-diagram.svg");
    } catch (exportError) {
      setError(
        exportError instanceof Error
          ? exportError.message
          : "Failed to export diagram.",
      );
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.14),transparent_24%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_26%),linear-gradient(180deg,#050816_0%,#0b1020_100%)] px-4 py-4 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-[1800px] xl:h-[calc(100vh-2rem)]">
        <div className="grid gap-5 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(0,2fr)_minmax(340px,1fr)]">
          <div className="order-2 min-w-0 xl:order-1 xl:h-full xl:min-h-0">
            <DiagramCanvas
              diagram={activeDiagram}
              busy={busy !== "idle"}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onDeleteWorkflow={clearActiveDiagram}
              onExport={(format) => void handleExport(format)}
              onDiagramChange={setActiveDiagram}
              onSelectNode={selectNode}
              onSelectEdge={selectEdge}
              onClearSelection={clearSelection}
            />
          </div>

          <aside
            className={cn(
              "order-1 flex min-h-0 flex-col gap-5 xl:order-2 xl:h-full",
              hasSelection && "xl:grid xl:grid-rows-2",
            )}
          >
            <PromptPanel
              className="min-h-[420px] xl:min-h-0"
              prompt={draftGeneratePrompt}
              revisionPrompt={draftRevisionPrompt}
              isGenerating={busy === "generate"}
              isRevising={busy === "revise"}
              canRevise={canRevise}
              extracted={extracted}
              questions={questions}
              clarificationAnswers={clarificationAnswers}
              assumptions={assumptionsPreview}
              history={history}
              activeHistoryEntryId={activeHistoryEntryId}
              error={error}
              onPromptChange={handlePromptChange}
              onRevisionPromptChange={setDraftRevisionPrompt}
              onGenerate={() => void handleGenerate()}
              onRevise={() => void handleRevise()}
              onUsePrompt={handlePromptChange}
              onAnswerChange={(questionId, value) =>
                setClarificationAnswers({
                  ...clarificationAnswers,
                  [questionId]: value,
                })
              }
              onRestoreHistoryEntry={restoreHistoryEntry}
              onClearWorkflow={clearActiveDiagram}
            />

            {hasSelection ? (
              <InspectorPanel
                className="min-h-[360px] xl:min-h-0"
                node={selectedNode}
                edge={selectedEdge}
                onDelete={removeSelected}
                onNodeChange={(patch) => {
                  if (!selectedNode) {
                    return;
                  }

                  const nextKind = patch.kind ?? selectedNode.kind;
                  updateNode(selectedNode.id, {
                    ...patch,
                    kind: nextKind,
                    icon: patch.icon ?? inferIcon(nextKind, selectedNode.icon),
                    shape: patch.shape ?? inferShapeForKind(nextKind),
                    color: patch.color ?? selectedNode.color ?? getDefaultColor(nextKind),
                  });
                }}
                onEdgeChange={(patch) => {
                  if (!selectedEdge) {
                    return;
                  }

                  updateEdge(selectedEdge.id, patch);
                }}
              />
            ) : null}
          </aside>
        </div>
      </div>
    </main>
  );
}
