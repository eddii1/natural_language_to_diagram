"use client";

import { useRef, useState } from "react";

import { AssumptionsPanel } from "@/components/assumptions-panel";
import { ClarificationPanel } from "@/components/clarification-panel";
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

type BusyState = "idle" | "generate" | "revise" | "layout";

export function DiagramWorkspace() {
  const {
    diagram,
    selectedNodeId,
    selectedEdgeId,
    setDiagram,
    resetDiagram,
    updateNode,
    updateEdge,
    removeSelected,
  } = useDiagramStore();
  const canvasWrapperRef = useRef<HTMLDivElement | null>(null);
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe,transparent_36%),radial-gradient(circle_at_bottom_right,#fde68a,transparent_30%),linear-gradient(180deg,#f8fafc,#eef2ff)] px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1680px] gap-4 xl:grid-cols-[360px_minmax(0,1fr)_320px]">
        <div className="space-y-4">
          <PromptPanel
            prompt={prompt}
            revisionPrompt={revisionPrompt}
            isGenerating={busy === "generate"}
            isRevising={busy === "revise"}
            extracted={extracted}
            onPromptChange={setPrompt}
            onRevisionPromptChange={setRevisionPrompt}
            onGenerate={() => void handleGenerate()}
            onRevise={() => void handleRevise()}
            onUsePrompt={setPrompt}
          />
          <ClarificationPanel
            questions={questions}
            answers={clarificationAnswers}
            onAnswerChange={(questionId, value) =>
              setClarificationAnswers((current) => ({
                ...current,
                [questionId]: value,
              }))
            }
          />
          <AssumptionsPanel assumptions={assumptionsPreview} />
        </div>

        <div className="space-y-4">
          {error ? (
            <div className="rounded-[28px] border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-[0_18px_40px_-30px_rgba(190,24,93,0.5)]">
              {error}
            </div>
          ) : null}
          <div ref={canvasWrapperRef}>
            <DiagramCanvas
              diagram={diagram}
              busy={busy !== "idle"}
              onAutoLayout={() => void handleAutoLayout()}
              onReset={resetDiagram}
              onExport={(format) => void handleExport(format)}
            />
          </div>
        </div>

        <InspectorPanel
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
      </div>
    </main>
  );
}
