"use client";

import { AlertTriangle, ArrowRight, Sparkles, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  ClarificationQuestion,
  DiagramAssumption,
  ExplicitConstraints,
} from "@/lib/schema";
import { cn } from "@/lib/utils";

const SAMPLE_PROMPTS = [
  "I want an orchestrator tool that receives a user query, appends history, applies Azure guardrails, and then decides which component to use from a sentiment, summarization, or drawing tool. Make the tools red and the classifier green.",
  "Create a left-to-right architecture where a support bot calls a policy guardrail before sending approved requests to a routing classifier and then to search, billing, or ticket tools.",
  "Build a data-quality pipeline with an intake API, validation service, datastore, anomaly classifier, and an alerting tool. Use amber for guardrails and dark gray for storage.",
] as const;

export function PromptPanel({
  className,
  prompt,
  revisionPrompt,
  isGenerating,
  isRevising,
  extracted,
  questions,
  clarificationAnswers,
  assumptions,
  error,
  onPromptChange,
  onRevisionPromptChange,
  onGenerate,
  onRevise,
  onUsePrompt,
  onAnswerChange,
}: {
  className?: string;
  prompt: string;
  revisionPrompt: string;
  isGenerating: boolean;
  isRevising: boolean;
  extracted: ExplicitConstraints | null;
  questions: ClarificationQuestion[];
  clarificationAnswers: Record<string, string>;
  assumptions: DiagramAssumption[];
  error: string | null;
  onPromptChange: (value: string) => void;
  onRevisionPromptChange: (value: string) => void;
  onGenerate: () => void;
  onRevise: () => void;
  onUsePrompt: (value: string) => void;
  onAnswerChange: (questionId: string, value: string) => void;
}) {
  const extractedColors = extracted
    ? [
        ...Object.entries(extracted.colorByKind).map(
          ([kind, color]) => `${kind}: ${String(color)}`,
        ),
        ...Object.entries(extracted.colorByLabel).map(
          ([label, color]) => `${label}: ${String(color)}`,
        ),
      ]
    : [];

  return (
    <section
      className={cn(
        "flex min-h-0 flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(8,13,27,0.98))] shadow-[0_36px_90px_-46px_rgba(2,6,23,0.9)]",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 border-b border-white/8 px-5 py-5">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-300/80">
            Prompt
          </div>
          <h1 className="mt-2 text-[30px] font-semibold leading-none text-white">
            Diagram workspace
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
            Generate the first pass, then iterate with natural-language edits in
            the same panel.
          </p>
        </div>
        <Badge className="border-sky-400/20 bg-sky-400/10 text-sky-200">
          Dark canvas
        </Badge>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
        {error ? (
          <div className="mb-5 rounded-[24px] border border-rose-500/25 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </div>
        ) : null}

        <div className="space-y-4">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Describe the system
          </div>
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Describe the architecture, colors, routing logic, and important relationships."
            className="min-h-[200px] border-white/10 bg-white/[0.04] text-base leading-7 text-slate-100 placeholder:text-slate-500"
          />
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onUsePrompt(sample)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left text-xs font-medium text-slate-300 transition hover:border-sky-300/30 hover:bg-sky-400/10 hover:text-white"
              >
                {sample.slice(0, 62)}...
              </button>
            ))}
          </div>
          <Button className="w-full" onClick={onGenerate} disabled={isGenerating}>
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating diagram..." : "Generate diagram"}
          </Button>
        </div>

        <div className="my-5 h-px bg-white/8" />

        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-white">Refine current diagram</h2>
              <p className="mt-1 text-sm text-slate-400">
                Apply follow-up edits after the first canvas is generated.
              </p>
            </div>
            <Badge className="border-white/10 bg-white/[0.04] text-slate-300">
              Live revision
            </Badge>
          </div>
          <Textarea
            value={revisionPrompt}
            onChange={(event) => onRevisionPromptChange(event.target.value)}
            placeholder="Examples: Make tools red. Add a response formatter before user response. Insert a cache between the orchestrator and tools."
            className="min-h-[132px] border-white/10 bg-white/[0.04] text-slate-100 placeholder:text-slate-500"
          />
          <Button
            variant="secondary"
            className="w-full"
            onClick={onRevise}
            disabled={isRevising}
          >
            <Wand2 className="h-4 w-4" />
            {isRevising ? "Applying revision..." : "Apply revision"}
          </Button>
        </div>

        {questions.length ? (
          <>
            <div className="my-5 h-px bg-white/8" />
            <div className="space-y-4">
              <div>
                <h2 className="text-sm font-semibold text-white">Clarifications</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Answer only the decisions that materially affect the diagram.
                </p>
              </div>
              <div className="space-y-3">
                {questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <div className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Q{index + 1}
                        </div>
                        <div className="text-sm font-medium text-slate-100">
                          {question.question}
                        </div>
                        <div className="text-xs leading-5 text-slate-400">
                          {question.reason}
                        </div>
                      </div>
                      <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-slate-500" />
                    </div>
                    <div className="mt-3">
                      {question.options?.length ? (
                        <select
                          className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20"
                          value={clarificationAnswers[question.id] ?? ""}
                          onChange={(event) =>
                            onAnswerChange(question.id, event.target.value)
                          }
                        >
                          <option value="">Select an answer</option>
                          {question.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          value={clarificationAnswers[question.id] ?? ""}
                          placeholder="Type your answer"
                          onChange={(event) =>
                            onAnswerChange(question.id, event.target.value)
                          }
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {extracted || assumptions.length ? (
          <>
            <div className="my-5 h-px bg-white/8" />
            <div className="grid gap-4">
              {extracted ? (
                <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Detected constraints</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Explicit instructions the current diagram should respect.
                    </p>
                  </div>
                  <div className="mt-4 space-y-3">
                    {extracted.components.length ? (
                      <div className="flex flex-wrap gap-2">
                        {extracted.components.map((component) => (
                          <Badge
                            key={component}
                            className="border-white/10 bg-white/[0.04] text-slate-200"
                          >
                            {component}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                    {extractedColors.length ? (
                      <div className="flex flex-wrap gap-2">
                        {extractedColors.map((token) => (
                          <Badge
                            key={token}
                            className="border-white/10 bg-white/[0.04] text-slate-300"
                          >
                            {token}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
              ) : null}
              <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-semibold text-white">Assumptions</h2>
                    <p className="mt-1 text-sm text-slate-400">
                      Conservative inferences surfaced before export.
                    </p>
                  </div>
                  <Badge className="border-amber-400/20 bg-amber-400/10 text-amber-100">
                    {assumptions.length}
                  </Badge>
                </div>
                <div className="mt-4 space-y-3">
                  {assumptions.length ? (
                    assumptions.map((assumption) => (
                      <div
                        key={assumption.id}
                        className="rounded-[20px] border border-white/8 bg-[#0f172a] px-3 py-3"
                      >
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                            className={cn(
                              "mt-0.5 h-4 w-4 shrink-0",
                              assumption.severity === "warning"
                                ? "text-amber-300"
                                : "text-sky-300",
                            )}
                          />
                          <div className="space-y-1">
                            <div className="text-sm text-slate-200">
                              {assumption.text}
                            </div>
                            {assumption.affectedIds.length ? (
                              <div className="text-xs text-slate-500">
                                Affects: {assumption.affectedIds.join(", ")}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[20px] border border-dashed border-white/10 bg-white/[0.02] px-3 py-3 text-sm text-slate-500">
                      No inferred assumptions yet.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
}
