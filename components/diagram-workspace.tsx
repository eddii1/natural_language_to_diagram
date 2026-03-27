"use client";

import { useState } from "react";

import { DiagramCanvas } from "@/components/diagram-canvas";
import { InspectorPanel } from "@/components/inspector-panel";
import { PromptPanel } from "@/components/prompt-panel";
import { exportCanvasAsPng, exportCanvasAsSvg, exportJson } from "@/lib/export";
import { layoutDiagram } from "@/lib/layout";
import { SAMPLE_PROMPT } from "@/lib/demo-data";
import {
  getDefaultColor,
  inferIcon,
  inferShapeForKind,
  normalizeDiagramSpec,
} from "@/lib/normalization";
import type {
  AnalyzeResponse,
  ClarificationQuestion,
  ExplicitConstraints,
} from "@/lib/schema";
import { useDiagramStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type BusyState = "idle" | "generate" | "revise" | "layout";

export function DiagramWorkspace() {
  const {
    diagram,
    selectedNodeId,
    selectedEdgeId,
    setDiagram,
    resetDiagram,
    clearSelection,
    selectEdge,
    selectNode,
    updateNode,
    updateEdge,
  } = useDiagramStore();
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [revisionPrompt, setRevisionPrompt] = useState("");
  const [busy, setBusy] = useState<BusyState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [questions, setQuestions] = useState<ClarificationQuestion[]>([]);
  const [clarificationAnswers, setClarificationAnswers] = useState<Record<string, string>>({});
  const [extracted, setExtracted] = useState<ExplicitConstraints | null>(null);
  const [assumptionsPreview, setAssumptionsPreview] = useState(diagram.assumptions);

  const selectedNode = diagram.nodes.find((node) => node.id === selectedNodeId);
  const selectedEdge = diagram.edges.find((edge) => edge.id === selectedEdgeId);
  const hasSelection = Boolean(selectedNode || selectedEdge);

  const handleDeleteSelection = () => {
    if (!selectedNodeId && !selectedEdgeId) {
      return;
    }

    setDiagram({
      ...diagram,
      nodes: selectedNodeId
        ? diagram.nodes.filter((node) => node.id !== selectedNodeId)
        : diagram.nodes,
      edges: diagram.edges.filter((edge) => {
        if (selectedEdgeId && edge.id === selectedEdgeId) {
          return false;
        }

        if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
          return false;
        }

        return true;
      }),
    });
    clearSelection();
  };

  const handleGenerate = async () => {
    setBusy("generate");
    setError(null);

    try {
      const analyzeResponse = await fetch("/api/diagram/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      });

      const analyzeData = (await analyzeResponse.json()) as AnalyzeResponse;

      if (!analyzeResponse.ok) {
        throw new Error(
          "reason" in analyzeData ? analyzeData.reason : "Failed to analyze prompt.",
        );
      }

      if (analyzeData.status === "blocked") {
        throw new Error(analyzeData.reason);
      }

      setExtracted(analyzeData.extracted);
      setAssumptionsPreview(
        "assumptionsPreview" in analyzeData ? analyzeData.assumptionsPreview : [],
      );

      if (analyzeData.status === "needs_clarification") {
        const missingAnswers = analyzeData.questions.some(
          (question) => !clarificationAnswers[question.id]?.trim(),
        );

        setQuestions(analyzeData.questions);

        if (missingAnswers) {
          setBusy("idle");
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
          prompt,
          clarificationAnswers,
        }),
      });

      const generateData = await generateResponse.json();
      if (!generateResponse.ok) {
        throw new Error(generateData.error ?? "Failed to generate diagram.");
      }

      setDiagram(generateData.diagram);
      setExtracted(generateData.extracted);
      setQuestions([]);
      setRevisionPrompt("");
      setAssumptionsPreview(generateData.diagram.assumptions);
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
    if (!revisionPrompt.trim()) {
      setError("Enter a revision prompt before applying changes.");
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
          prompt: revisionPrompt,
          currentDiagram: diagram,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to revise diagram.");
      }

      setDiagram(data.diagram);
      setExtracted(data.extracted);
      setAssumptionsPreview(data.diagram.assumptions);
      setRevisionPrompt("");
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

  const handleAutoLayout = async () => {
    setBusy("layout");
    setError(null);

    try {
      const next = await layoutDiagram(normalizeDiagramSpec(diagram));
      setDiagram(next);
    } catch (layoutError) {
      setError(
        layoutError instanceof Error
          ? layoutError.message
          : "Failed to auto-layout the current diagram.",
      );
    } finally {
      setBusy("idle");
    }
  };

  const handleExport = async (format: "png" | "svg" | "json") => {
    try {
      if (format === "json") {
        exportJson(diagram, "architecture-diagram.json");
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
              diagram={diagram}
              busy={busy !== "idle"}
              selectedNodeId={selectedNodeId}
              selectedEdgeId={selectedEdgeId}
              onAutoLayout={() => void handleAutoLayout()}
              onReset={resetDiagram}
              onExport={(format) => void handleExport(format)}
              onDiagramChange={setDiagram}
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
              prompt={prompt}
              revisionPrompt={revisionPrompt}
              isGenerating={busy === "generate"}
              isRevising={busy === "revise"}
              extracted={extracted}
              questions={questions}
              clarificationAnswers={clarificationAnswers}
              assumptions={assumptionsPreview}
              error={error}
              onPromptChange={setPrompt}
              onRevisionPromptChange={setRevisionPrompt}
              onGenerate={() => void handleGenerate()}
              onRevise={() => void handleRevise()}
              onUsePrompt={setPrompt}
              onAnswerChange={(questionId, value) =>
                setClarificationAnswers((current) => ({
                  ...current,
                  [questionId]: value,
                }))
              }
            />

            {hasSelection ? (
              <InspectorPanel
                className="min-h-[360px] xl:min-h-0"
                node={selectedNode}
                edge={selectedEdge}
                onDelete={handleDeleteSelection}
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
