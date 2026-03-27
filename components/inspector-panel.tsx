"use client";

import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  ICON_OPTIONS,
  getDefaultColor,
  inferShapeForKind,
} from "@/lib/normalization";
import type {
  DiagramEdge,
  DiagramNode,
  DiagramNodeKind,
  EdgeSemantic,
} from "@/lib/schema";
import { cn } from "@/lib/utils";

const nodeKindOptions: DiagramNodeKind[] = [
  "actor",
  "process",
  "tool",
  "guardrail",
  "classifier",
  "datastore",
  "decision",
  "terminator",
  "group",
];

const edgeSemantics: EdgeSemantic[] = [
  "request",
  "response",
  "data",
  "approval",
  "error",
  "generic",
];

export function InspectorPanel({
  className,
  node,
  edge,
  onNodeChange,
  onEdgeChange,
  onDelete,
}: {
  className?: string;
  node: DiagramNode | undefined;
  edge: DiagramEdge | undefined;
  onNodeChange: (patch: Partial<DiagramNode>) => void;
  onEdgeChange: (patch: Partial<DiagramEdge>) => void;
  onDelete: () => void;
}) {
  if (!node && !edge) {
    return null;
  }

  const selectClassName =
    "h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/60 focus:ring-2 focus:ring-sky-400/20";

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
            Canvas editor
          </div>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            {node ? node.label : edge?.label ?? "Selected edge"}
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Adjust metadata, style, and connection semantics without leaving the
            canvas.
          </p>
        </div>
        <Button variant="danger" size="icon" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
        {node ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Label
              </span>
              <Input
                value={node.label}
                onChange={(event) => onNodeChange({ label: event.target.value })}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Kind
                </span>
                <select
                  className={selectClassName}
                  value={node.kind}
                  onChange={(event) => {
                    const kind = event.target.value as DiagramNodeKind;
                    onNodeChange({
                      kind,
                      shape: inferShapeForKind(kind),
                      color: getDefaultColor(kind),
                    });
                  }}
                >
                  {nodeKindOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Icon
                </span>
                <select
                  className={selectClassName}
                  value={node.icon ?? "none"}
                  onChange={(event) => onNodeChange({ icon: event.target.value })}
                >
                  {ICON_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Color
              </span>
              <div className="flex gap-3">
                <input
                  className="h-11 w-16 rounded-2xl border border-white/10 bg-white/[0.04] p-2"
                  type="color"
                  value={node.color}
                  onChange={(event) => onNodeChange({ color: event.target.value })}
                />
                <Input
                  value={node.color}
                  onChange={(event) => onNodeChange({ color: event.target.value })}
                />
              </div>
            </label>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Notes
              </span>
              <Textarea
                className="min-h-[160px]"
                value={node.notes ?? ""}
                onChange={(event) => onNodeChange({ notes: event.target.value })}
              />
            </label>
          </div>
        ) : edge ? (
          <div className="space-y-4">
            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Label
              </span>
              <Input
                value={edge.label ?? ""}
                onChange={(event) => onEdgeChange({ label: event.target.value })}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Semantic
                </span>
                <select
                  className={selectClassName}
                  value={edge.semantic}
                  onChange={(event) =>
                    onEdgeChange({ semantic: event.target.value as EdgeSemantic })
                  }
                >
                  {edgeSemantics.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Style
                </span>
                <select
                  className={selectClassName}
                  value={edge.style}
                  onChange={(event) =>
                    onEdgeChange({ style: event.target.value as DiagramEdge["style"] })
                  }
                >
                  <option value="solid">solid</option>
                  <option value="dashed">dashed</option>
                </select>
              </label>
            </div>

            <label className="block space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Color
              </span>
              <div className="flex gap-3">
                <input
                  className="h-11 w-16 rounded-2xl border border-white/10 bg-white/[0.04] p-2"
                  type="color"
                  value={edge.color ?? "#334155"}
                  onChange={(event) => onEdgeChange({ color: event.target.value })}
                />
                <Input
                  value={edge.color ?? "#334155"}
                  onChange={(event) => onEdgeChange({ color: event.target.value })}
                />
              </div>
            </label>
          </div>
        ) : null}
      </div>
    </section>
  );
}
