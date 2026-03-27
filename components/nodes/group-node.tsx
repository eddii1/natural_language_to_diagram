"use client";

import { NodeShell } from "@/components/nodes/node-shell";

export default function GroupNode(props: Parameters<typeof NodeShell>[0]) {
  return <NodeShell {...props} shape="group" />;
}
