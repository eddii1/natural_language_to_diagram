"use client";

import type { ClarificationQuestion } from "@/lib/schema";

import { Input } from "@/components/ui/input";

export function ClarificationPanel({
  questions,
  answers,
  onAnswerChange,
}: {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
  onAnswerChange: (questionId: string, value: string) => void;
}) {
  if (!questions.length) {
    return null;
  }

  return (
    <section className="space-y-3 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.45)]">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">Clarifications</h2>
        <p className="mt-1 text-sm text-slate-500">
          Answer only the open decisions that materially change the architecture.
        </p>
      </div>
      <div className="space-y-4">
        {questions.map((question, index) => (
          <div key={question.id} className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Q{index + 1}
            </div>
            <div className="text-sm font-medium text-slate-800">{question.question}</div>
            <div className="text-xs text-slate-500">{question.reason}</div>
            {question.options?.length ? (
              <select
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
                value={answers[question.id] ?? ""}
                onChange={(event) => onAnswerChange(question.id, event.target.value)}
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
                value={answers[question.id] ?? ""}
                placeholder="Type your answer"
                onChange={(event) => onAnswerChange(question.id, event.target.value)}
              />
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
