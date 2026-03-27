"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from "@xyflow/react";

import type { DiagramEdge } from "@/lib/schema";
import { cn } from "@/lib/utils";

export default function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  markerEnd,
}: EdgeProps) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const edge = (data as { edge?: DiagramEdge } | undefined)?.edge;
  const stroke = edge?.color ?? "#334155";

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        style={{
          stroke,
          strokeWidth: edge?.semantic === "error" ? 2.6 : 2.2,
          strokeDasharray: edge?.style === "dashed" ? "7 7" : undefined,
        }}
      />
      {edge?.label ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan absolute rounded-full border border-white/10 bg-slate-950/92 px-2.5 py-1 text-[11px] font-medium text-slate-200 shadow-[0_12px_20px_-12px_rgba(2,6,23,0.9)] backdrop-blur",
            )}
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            }}
          >
            {edge.label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}
