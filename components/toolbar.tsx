"use client";

import { Plus, RefreshCcw, Scan, Trash2, Download, WandSparkles } from "lucide-react";
import { useReactFlow } from "@xyflow/react";

import { Button } from "@/components/ui/button";

export function Toolbar({
  busy,
  onAutoLayout,
  onReset,
  onAddNode,
  onDeleteSelection,
  onExport,
}: {
  busy: boolean;
  onAutoLayout: () => void | Promise<void>;
  onReset: () => void;
  onAddNode: () => void;
  onDeleteSelection: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
}) {
  const reactFlow = useReactFlow();

  return (
    <div className="absolute top-4 left-4 z-20 flex max-w-[calc(100%-2rem)] flex-wrap items-center gap-2 rounded-[24px] border border-white/10 bg-slate-950/80 p-2 shadow-[0_22px_50px_-28px_rgba(2,6,23,0.95)] backdrop-blur-xl">
      <Button
        size="sm"
        variant="secondary"
        onClick={() => void onAutoLayout()}
        disabled={busy}
      >
        <WandSparkles className="h-4 w-4" />
        Auto layout
      </Button>
      <Button size="sm" variant="secondary" onClick={onAddNode}>
        <Plus className="h-4 w-4" />
        Add node
      </Button>
      <Button size="sm" variant="secondary" onClick={onDeleteSelection}>
        <Trash2 className="h-4 w-4" />
        Delete
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => reactFlow.fitView({ duration: 400, padding: 0.2 })}
      >
        <Scan className="h-4 w-4" />
        Fit view
      </Button>
      <Button size="sm" variant="secondary" onClick={onReset}>
        <RefreshCcw className="h-4 w-4" />
        Reset
      </Button>
      <div className="flex flex-wrap items-center gap-2 xl:ml-4">
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
