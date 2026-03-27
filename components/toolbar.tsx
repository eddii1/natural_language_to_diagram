"use client";

import { Download, Plus, Scan, Trash2 } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

import { Button } from "@/components/ui/button";

export function Toolbar({
  busy,
  onAddNode,
  onDeleteSelection,
  onDeleteWorkflow,
  onExport,
}: {
  busy: boolean;
  onAddNode: () => void;
  onDeleteSelection: () => void;
  onDeleteWorkflow: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
}) {
  const reactFlow = useReactFlow();

  return (
    <div className="absolute right-4 bottom-4 left-4 z-20 overflow-x-auto rounded-[24px] border border-white/10 bg-slate-950/85 p-2 shadow-[0_22px_50px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl">
      <div className="flex min-w-max flex-nowrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={onAddNode}>
          <Plus className="h-4 w-4" />
          Add node
        </Button>
        <Button size="sm" variant="secondary" onClick={onDeleteSelection} disabled={busy}>
          <Trash2 className="h-4 w-4" />
          Delete
        </Button>
        <Button size="sm" variant="danger" onClick={onDeleteWorkflow} disabled={busy}>
          <Trash2 className="h-4 w-4" />
          Clear workflow
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => reactFlow.fitView({ duration: 400, padding: 0.2 })}
        >
          <Scan className="h-4 w-4" />
          Fit view
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onExport("png")}>
          <Download className="h-4 w-4" />
          PNG
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onExport("svg")}>
          <Download className="h-4 w-4" />
          SVG
        </Button>
        <Button size="sm" variant="secondary" onClick={() => onExport("json")}>
          <Download className="h-4 w-4" />
          JSON
        </Button>
      </div>
    </div>
  );
}
