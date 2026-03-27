"use client";

import { NodeShell } from "@/components/nodes/node-shell";

export default function TerminatorNode(props: Parameters<typeof NodeShell>[0]) {
  return <NodeShell {...props} shape="pill" />;
}
