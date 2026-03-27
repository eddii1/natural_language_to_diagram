"use client";

import { Sparkles, Wand2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ExplicitConstraints } from "@/lib/schema";

const SAMPLE_PROMPTS = [
  "I want an orchestrator tool that receives a user query, appends history, applies Azure guardrails, and then decides which component to use from a sentiment, summarization, or drawing tool. Make the tools red and the classifier green.",
  "Create a left-to-right architecture where a support bot calls a policy guardrail before sending approved requests to a routing classifier and then to search, billing, or ticket tools.",
  "Build a data-quality pipeline with an intake API, validation service, datastore, anomaly classifier, and an alerting tool. Use amber for guardrails and dark gray for storage.",
] as const;

export function PromptPanel({
  prompt,
  revisionPrompt,
  isGenerating,
  isRevising,
  extracted,
  onPromptChange,
  onRevisionPromptChange,
  onGenerate,
  onRevise,
  onUsePrompt,
}: {
  prompt: string;
  revisionPrompt: string;
  isGenerating: boolean;
  isRevising: boolean;
  extracted: ExplicitConstraints | null;
  onPromptChange: (value: string) => void;
  onRevisionPromptChange: (value: string) => void;
  onGenerate: () => void;
  onRevise: () => void;
  onUsePrompt: (value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-[32px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_26px_52px_-34px_rgba(15,23,42,0.55)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
              Prompt to diagram
            </div>
            <h1 className="mt-2 text-2xl font-semibold text-slate-950">
              Architecture canvas generator
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Describe the system in plain English. The app generates a single
              editable diagram, fills logical gaps conservatively, and flags every
              inference in the assumptions panel.
            </p>
          </div>
          <Badge className="border-sky-100 bg-sky-50 text-sky-700">
            Best-effort guarded generation
          </Badge>
        </div>

        <div className="mt-5 space-y-3">
          <Textarea
            value={prompt}
            onChange={(event) => onPromptChange(event.target.value)}
            placeholder="Describe the architecture, colors, routing logic, and important relationships."
            className="min-h-[176px] bg-slate-50/70"
          />
          <div className="flex flex-wrap gap-2">
            {SAMPLE_PROMPTS.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => onUsePrompt(sample)}
                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:bg-white hover:text-slate-900"
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
      </section>

      <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.45)]">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Prompt-based revisions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Update the current canvas with natural language. Styling-only edits keep
            positions; topology changes re-layout automatically.
          </p>
        </div>
        <div className="mt-4 space-y-3">
          <Textarea
            value={revisionPrompt}
            onChange={(event) => onRevisionPromptChange(event.target.value)}
            placeholder="Examples: Make tools red. Add a response formatter before user response. Insert a cache between the orchestrator and tools."
            className="min-h-[128px] bg-slate-50/70"
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
      </section>

      {extracted ? (
        <section className="rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.45)]">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Detected constraints</h2>
            <p className="mt-1 text-sm text-slate-500">
              Explicit instructions the validator expects the diagram to respect.
            </p>
          </div>
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-2">
              {extracted.components.length ? (
                extracted.components.map((component) => (
                  <Badge key={component}>{component}</Badge>
                ))
              ) : (
                <span className="text-sm text-slate-500">No explicit components detected.</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(extracted.colorByKind).map(([kind, color]) => (
                <Badge key={kind}>
                  {kind}: {String(color)}
                </Badge>
              ))}
              {Object.entries(extracted.colorByLabel).map(([label, color]) => (
                <Badge key={label}>
                  {label}: {String(color)}
                </Badge>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
