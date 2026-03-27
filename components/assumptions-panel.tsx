"use client";

import { AlertTriangle, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { DiagramAssumption } from "@/lib/schema";

export function AssumptionsPanel({
  assumptions,
}: {
  assumptions: DiagramAssumption[];
}) {
  return (
    <section className="space-y-3 rounded-[28px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_22px_40px_-32px_rgba(15,23,42,0.45)]">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Assumptions</h2>
          <p className="mt-1 text-sm text-slate-500">
            Best-effort inferred structure. Review before exporting.
          </p>
        </div>
        <Badge className="gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          {assumptions.length}
        </Badge>
      </div>
      <div className="space-y-3">
        {assumptions.length ? (
          assumptions.map((assumption) => (
            <div
              key={assumption.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle
                  className={
                    assumption.severity === "warning"
                      ? "mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                      : "mt-0.5 h-4 w-4 shrink-0 text-sky-600"
                  }
                />
                <div className="space-y-1">
                  <div className="text-sm text-slate-800">{assumption.text}</div>
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-500">
            No inferred assumptions yet.
          </div>
        )}
      </div>
    </section>
  );
}
