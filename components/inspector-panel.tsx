"use client";

import { CircleDashed, PencilLine, Trash2 } from "lucide-react";

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
  node,
  edge,
  onNodeChange,
  onEdgeChange,
  onDelete,
}: {
  node: DiagramNode | undefined;
  edge: DiagramEdge | undefined;
  onNodeChange: (patch: Partial<DiagramNode>) => void;
  onEdgeChange: (patch: Partial<DiagramEdge>) => void;
  onDelete: () => void;
}) {
  return (
    <section className="rounded-[32px] border border-slate-200/80 bg-white/92 p-5 shadow-[0_26px_52px_-34px_rgba(15,23,42,0.55)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700">
            Inspector
          </div>
          <h2 className="mt-2 text-xl font-semibold text-slate-950">
            {node ? node.label : edge ? edge.label ?? "Selected edge" : "Canvas editor"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Edit semantic meaning, styling, labels, and connections without leaving
            the canvas.
          </p>
        </div>
        {(node || edge) ? (
          <Button variant="danger" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        ) : null}
      </div>

      {node ? (
        <div className="mt-5 space-y-4">
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                className="h-11 w-16 rounded-2xl border border-slate-200 bg-white p-2"
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
              className="min-h-[120px] bg-slate-50/70"
              value={node.notes ?? ""}
              onChange={(event) => onNodeChange({ notes: event.target.value })}
            />
          </label>
        </div>
      ) : edge ? (
        <div className="mt-5 space-y-4">
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
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
                className="h-11 w-16 rounded-2xl border border-slate-200 bg-white p-2"
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
      ) : (
        <div className="mt-6 space-y-4">
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-start gap-3">
              <PencilLine className="mt-0.5 h-5 w-5 text-sky-700" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-800">
                  Click a node or edge to edit it
                </div>
                <div className="text-sm text-slate-500">
                  Use the canvas to move blocks, reconnect arrows, and create new
                  relationships. The inspector updates based on your selection.
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4">
            <div className="flex items-start gap-3">
              <CircleDashed className="mt-0.5 h-5 w-5 text-slate-700" />
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-800">
                  Semantic palette
                </div>
                <div className="text-sm text-slate-500">
                  Rounded rectangles represent services, cylinders represent storage,
                  pills represent actors or endpoints, and diamonds represent routing
                  decisions.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
