"use client";

import { useMemo, useRef } from "react";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type Node,
  type OnReconnect,
  type OnSelectionChangeParams,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { Toolbar } from "@/components/toolbar";
import LabeledEdge from "@/components/edges/labeled-edge";
import DatastoreNode from "@/components/nodes/datastore-node";
import DecisionNode from "@/components/nodes/decision-node";
import GroupNode from "@/components/nodes/group-node";
import ProcessNode from "@/components/nodes/process-node";
import TerminatorNode from "@/components/nodes/terminator-node";
import { useDiagramStore } from "@/lib/store";
import type { DiagramSpec } from "@/lib/schema";

const nodeTypes = {
  roundedRect: ProcessNode,
  pill: TerminatorNode,
  cylinder: DatastoreNode,
  diamond: DecisionNode,
  group: GroupNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

function CanvasInner({
  diagram,
  exportRef,
  busy,
  onAutoLayout,
  onReset,
  onExport,
}: {
  diagram: DiagramSpec;
  exportRef: React.RefObject<HTMLDivElement | null>;
  busy: boolean;
  onAutoLayout: () => void | Promise<void>;
  onReset: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
}) {
  const {
    applyNodeChanges,
    applyEdgeChanges,
    connect,
    reconnect,
    selectNode,
    selectEdge,
    clearSelection,
    addNode,
    removeSelected,
  } = useDiagramStore();

  const nodes = useMemo<Node[]>(
    () =>
      diagram.nodes.map((node) => ({
        id: node.id,
        type: node.shape,
        position: node.position ?? { x: 0, y: 0 },
        data: { node },
      })),
    [diagram.nodes],
  );

  const edges = useMemo<Edge[]>(
    () =>
      diagram.edges.map((edge) => ({
        id: edge.id,
        type: "labeled",
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        data: { edge },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: edge.color ?? "#334155",
          width: 20,
          height: 20,
        },
      })),
    [diagram.edges],
  );

  const onSelectionChange = ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams) => {
    if (selectedNodes.length) {
      selectNode(selectedNodes[0].id);
      return;
    }

    if (selectedEdges.length) {
      selectEdge(selectedEdges[0].id);
      return;
    }

    clearSelection();
  };

  const onReconnect: OnReconnect = (_, connection) => {
    reconnect(_.id, connection);
  };

  return (
    <div
      ref={exportRef}
      className="relative h-[62vh] min-h-[620px] overflow-hidden rounded-[36px] border border-slate-200/80 bg-[#f8fafc] shadow-[0_34px_70px_-40px_rgba(15,23,42,0.55)] xl:h-[calc(100vh-2rem)]"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        onNodesChange={applyNodeChanges}
        onEdgesChange={applyEdgeChanges}
        onConnect={connect}
        onReconnect={onReconnect}
        onSelectionChange={onSelectionChange}
        onPaneClick={clearSelection}
        className="diagram-flow"
        defaultEdgeOptions={{
          type: "labeled",
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: "#334155",
          },
        }}
      >
        <Toolbar
          busy={busy}
          onAutoLayout={onAutoLayout}
          onReset={onReset}
          onAddNode={() => addNode("process")}
          onDeleteSelection={removeSelected}
          onExport={onExport}
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          className="!rounded-[24px] !border !border-slate-200 !bg-white/90"
          nodeColor={(node) => ((node.data as { node?: { color?: string } })?.node?.color ?? "#0f4c81")}
        />
        <Background color="#cbd5e1" gap={22} size={1.2} />
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas({
  diagram,
  busy,
  onAutoLayout,
  onReset,
  onExport,
}: {
  diagram: DiagramSpec;
  busy: boolean;
  onAutoLayout: () => void | Promise<void>;
  onReset: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
}) {
  const exportRef = useRef<HTMLDivElement | null>(null);

  return (
    <ReactFlowProvider>
      <CanvasInner
        diagram={diagram}
        exportRef={exportRef}
        busy={busy}
        onAutoLayout={onAutoLayout}
        onReset={onReset}
        onExport={(format) => {
          if (!exportRef.current) {
            return;
          }

          onExport(format);
        }}
      />
    </ReactFlowProvider>
  );
}
