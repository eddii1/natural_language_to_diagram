"use client";

import {
  Bot,
  BrainCircuit,
  Database,
  FileOutput,
  GitBranch,
  Send,
  Shield,
  Sparkles,
  UserRound,
  Wrench,
} from "lucide-react";
import { Handle, Position, type NodeProps } from "@xyflow/react";

import type { DiagramNode } from "@/lib/schema";
import { cn } from "@/lib/utils";

const iconMap = {
  none: null,
  user: UserRound,
  bot: Bot,
  shield: Shield,
  brain: BrainCircuit,
  wrench: Wrench,
  database: Database,
  route: GitBranch,
  sparkles: Sparkles,
  send: Send,
  "file-output": FileOutput,
} as const;

function Handles() {
  return (
    <>
      <Handle
        id="target-top"
        type="target"
        position={Position.Top}
        className="!h-3 !w-3 !bg-slate-300"
      />
      <Handle
        id="source-bottom"
        type="source"
        position={Position.Bottom}
        className="!h-3 !w-3 !bg-slate-300"
      />
      <Handle
        id="target-left"
        type="target"
        position={Position.Left}
        className="!h-3 !w-3 !bg-slate-300"
      />
      <Handle
        id="source-right"
        type="source"
        position={Position.Right}
        className="!h-3 !w-3 !bg-slate-300"
      />
    </>
  );
}

export function NodeShell({
  data,
  className,
  innerClassName,
  shape = "roundedRect",
}: NodeProps & {
  className?: string;
  innerClassName?: string;
  shape?: "roundedRect" | "pill" | "cylinder" | "diamond" | "group";
}) {
  const node = (data as { node: DiagramNode }).node;
  const Icon = iconMap[node.icon as keyof typeof iconMap] ?? Sparkles;

  if (shape === "diamond") {
    return (
      <div className="relative">
        <Handles />
        <div
            className={cn(
            "flex h-36 w-36 rotate-45 items-center justify-center border-2 bg-white shadow-[0_22px_40px_-22px_rgba(15,23,42,0.45)]",
            className,
          )}
          style={{
            borderColor: node.color,
            backgroundColor: `${node.color}14`,
          }}
        >
          <div className="flex -rotate-45 flex-col items-center gap-2 text-center">
            <span
              className="rounded-full p-2 text-white shadow-sm"
              style={{ backgroundColor: node.color }}
            >
              <Icon className="h-4 w-4" />
            </span>
            <span className="max-w-24 text-sm font-semibold text-slate-900">
              {node.label}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative min-w-[170px]", className)}>
      <Handles />
      <div
        className={cn(
          "relative overflow-hidden border-2 bg-white p-4 text-slate-900 shadow-[0_22px_40px_-22px_rgba(15,23,42,0.45)]",
          shape === "pill" && "rounded-full px-6 py-3",
          shape === "roundedRect" && "rounded-[26px]",
          shape === "group" && "rounded-[32px] border-dashed bg-slate-50/80",
          shape === "cylinder" && "rounded-[28px] pt-6 pb-6",
          innerClassName,
        )}
        style={{
          borderColor: node.color,
          backgroundColor: shape === "group" ? "#f8fafc" : `${node.color}12`,
        }}
      >
        {shape === "cylinder" ? (
          <>
            <div
              className="absolute inset-x-3 top-2 h-5 rounded-full border"
              style={{
                borderColor: node.color,
                backgroundColor: `${node.color}18`,
              }}
            />
            <div
              className="absolute inset-x-3 bottom-2 h-5 rounded-full border"
              style={{
                borderColor: node.color,
                backgroundColor: `${node.color}10`,
              }}
            />
          </>
        ) : null}
        <div className="relative flex items-center gap-3">
          <span
            className="rounded-full p-2 text-white shadow-sm"
            style={{ backgroundColor: node.color }}
          >
            <Icon className="h-4 w-4" />
          </span>
          <div className="space-y-0.5">
            <div className="text-sm font-semibold leading-tight">{node.label}</div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-slate-500">
              {node.kind}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
