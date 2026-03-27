"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  addEdge as addReactFlowEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  type EdgeChange,
  type NodeChange,
  type OnConnect,
  type OnInit,
  type OnReconnect,
  type OnSelectionChangeParams,
  type ReactFlowInstance,
} from "@xyflow/react";

import { Toolbar } from "@/components/toolbar";
import LabeledEdge from "@/components/edges/labeled-edge";
import DatastoreNode from "@/components/nodes/datastore-node";
import DecisionNode from "@/components/nodes/decision-node";
import GroupNode from "@/components/nodes/group-node";
import ProcessNode from "@/components/nodes/process-node";
import TerminatorNode from "@/components/nodes/terminator-node";
import { createEdge } from "@/lib/normalization";
import {
  createCanvasEdge,
  createCanvasNode,
  diagramSignature,
  diagramToReactFlow,
  layoutSignature,
  reactFlowToDiagram,
  type CanvasEdge,
  type CanvasNode,
} from "@/lib/reactflow-mappers";
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
  busy,
  selectedNodeId,
  selectedEdgeId,
  onAutoLayout,
  onReset,
  onExport,
  onDiagramChange,
  onSelectNode,
  onSelectEdge,
  onClearSelection,
}: {
  diagram: DiagramSpec;
  busy: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onAutoLayout: () => void | Promise<void>;
  onReset: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
  onDiagramChange: (diagram: DiagramSpec) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onClearSelection: () => void;
}) {
  const instanceRef = useRef<ReactFlowInstance<CanvasNode, CanvasEdge> | null>(null);
  const fitViewRanRef = useRef(false);
  const skipExternalSignatureRef = useRef<string | null>(null);
  const lastAppliedSignatureRef = useRef(diagramSignature(diagram));
  const lastLayoutSignatureRef = useRef(layoutSignature(diagram));
  const baseDiagramRef = useRef(diagram);
  const nodesRef = useRef<CanvasNode[]>([]);
  const edgesRef = useRef<CanvasEdge[]>([]);
  const initialFlowRef = useRef(diagramToReactFlow(diagram));
  const [nodes, setNodes] = useNodesState<CanvasNode>(initialFlowRef.current.nodes);
  const [edges, setEdges] = useEdgesState<CanvasEdge>(initialFlowRef.current.edges);

  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);

  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const fitCanvas = useCallback(() => {
    const instance = instanceRef.current;
    if (!instance) {
      return;
    }

    requestAnimationFrame(() => {
      void instance.fitView({ padding: 0.2, duration: 0 });
      fitViewRanRef.current = true;
    });
  }, []);

  const syncUpstream = useCallback(
    (nextNodes: CanvasNode[], nextEdges: CanvasEdge[]) => {
      const nextDiagram = reactFlowToDiagram(baseDiagramRef.current, nextNodes, nextEdges);
      const nextSignature = diagramSignature(nextDiagram);

      skipExternalSignatureRef.current = nextSignature;
      baseDiagramRef.current = nextDiagram;
      lastAppliedSignatureRef.current = nextSignature;
      lastLayoutSignatureRef.current = layoutSignature(nextDiagram);
      onDiagramChange(nextDiagram);
    },
    [onDiagramChange],
  );

  useEffect(() => {
    const incomingSignature = diagramSignature(diagram);
    const incomingLayoutSignature = layoutSignature(diagram);

    baseDiagramRef.current = diagram;

    if (skipExternalSignatureRef.current === incomingSignature) {
      skipExternalSignatureRef.current = null;
      lastAppliedSignatureRef.current = incomingSignature;
      lastLayoutSignatureRef.current = incomingLayoutSignature;
      return;
    }

    if (lastAppliedSignatureRef.current === incomingSignature) {
      return;
    }

    const mapped = diagramToReactFlow(diagram);
    setNodes(mapped.nodes);
    setEdges(mapped.edges);
    lastAppliedSignatureRef.current = incomingSignature;

    const shouldFit =
      lastLayoutSignatureRef.current !== incomingLayoutSignature || !fitViewRanRef.current;

    lastLayoutSignatureRef.current = incomingLayoutSignature;

    if (shouldFit) {
      fitCanvas();
    }
  }, [diagram, fitCanvas, setEdges, setNodes]);

  const onInit = useCallback<OnInit<CanvasNode, CanvasEdge>>(
    (instance) => {
      instanceRef.current = instance;
      fitCanvas();
    },
    [fitCanvas],
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      setNodes((currentNodes) => {
        const nextNodes = applyNodeChanges(changes, currentNodes);

        if (changes.some((change) => change.type === "remove")) {
          syncUpstream(nextNodes, edgesRef.current);
        }

        return nextNodes;
      });
    },
    [setNodes, syncUpstream],
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<CanvasEdge>[]) => {
      setEdges((currentEdges) => {
        const nextEdges = applyEdgeChanges(changes, currentEdges);

        if (changes.some((change) => change.type === "remove")) {
          syncUpstream(nodesRef.current, nextEdges);
        }

        return nextEdges;
      });
    },
    [setEdges, syncUpstream],
  );

  const handleNodeDragStop = useCallback(() => {
    syncUpstream(nodesRef.current, edgesRef.current);
  }, [syncUpstream]);

  const handleConnect = useCallback<OnConnect>(
    (connection) => {
      if (!connection.source || !connection.target) {
        return;
      }

      const diagramEdge = createEdge(connection.source, connection.target, {
        label: "connection",
        sourceHandle: connection.sourceHandle ?? undefined,
        targetHandle: connection.targetHandle ?? undefined,
      });
      const nextEdge = createCanvasEdge(diagramEdge);

      setEdges((currentEdges) => {
        const nextEdges = addReactFlowEdge(nextEdge, currentEdges);
        syncUpstream(nodesRef.current, nextEdges);
        return nextEdges;
      });
    },
    [setEdges, syncUpstream],
  );

  const handleReconnect = useCallback<OnReconnect>(
    (oldEdge, connection) => {
      setEdges((currentEdges) => {
        const nextEdges = currentEdges.map((edge) =>
          edge.id === oldEdge.id
            ? {
                ...edge,
                source: connection.source ?? edge.source,
                target: connection.target ?? edge.target,
                sourceHandle: connection.sourceHandle ?? edge.sourceHandle ?? undefined,
                targetHandle: connection.targetHandle ?? edge.targetHandle ?? undefined,
                data: {
                  edge: {
                    ...(edge.data?.edge ?? createEdge(edge.source, edge.target)),
                    source: connection.source ?? edge.source,
                    target: connection.target ?? edge.target,
                    sourceHandle:
                      connection.sourceHandle ?? edge.sourceHandle ?? undefined,
                    targetHandle:
                      connection.targetHandle ?? edge.targetHandle ?? undefined,
                  },
                },
              }
            : edge,
        );

        syncUpstream(nodesRef.current, nextEdges);
        return nextEdges;
      });
    },
    [setEdges, syncUpstream],
  );

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: OnSelectionChangeParams<CanvasNode, CanvasEdge>) => {
      if (selectedNodes.length) {
        onSelectNode(selectedNodes[0].id);
        return;
      }

      if (selectedEdges.length) {
        onSelectEdge(selectedEdges[0].id);
        return;
      }

      onClearSelection();
    },
    [onClearSelection, onSelectEdge, onSelectNode],
  );

  const handleDeleteSelection = useCallback(() => {
    const nextNodes = selectedNodeId
      ? nodesRef.current.filter((node) => node.id !== selectedNodeId)
      : nodesRef.current;
    const nextEdges = edgesRef.current.filter((edge) => {
      if (selectedEdgeId && edge.id === selectedEdgeId) {
        return false;
      }

      if (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId)) {
        return false;
      }

      return true;
    });

    setNodes(nextNodes);
    setEdges(nextEdges);
    onClearSelection();
    syncUpstream(nextNodes, nextEdges);
  }, [
    onClearSelection,
    selectedEdgeId,
    selectedNodeId,
    setEdges,
    setNodes,
    syncUpstream,
  ]);

  const handleAddNode = useCallback(() => {
    const nextNode = createCanvasNode(`Process ${nodesRef.current.length + 1}`, nodesRef.current.length);
    const nextNodes = [...nodesRef.current, nextNode];

    setNodes(nextNodes);
    onSelectNode(nextNode.id);
    syncUpstream(nextNodes, edgesRef.current);
  }, [onSelectNode, setNodes, syncUpstream]);

  return (
    <div className="relative h-[66vh] min-h-[620px] w-full min-w-0 overflow-hidden rounded-[34px] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(56,189,248,0.08),transparent_24%),linear-gradient(180deg,#101827_0%,#0b1120_100%)] shadow-[0_44px_120px_-60px_rgba(2,6,23,0.95)] xl:h-full xl:min-h-0">
      <ReactFlow<CanvasNode, CanvasEdge>
        nodes={nodes}
        edges={edges.map((edge) => ({
          ...edge,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: edge.data?.edge.color ?? "#334155",
            width: 20,
            height: 20,
          },
        }))}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onInit={onInit}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onConnect={handleConnect}
        onReconnect={handleReconnect}
        onSelectionChange={handleSelectionChange}
        onPaneClick={onClearSelection}
        className="diagram-flow h-full w-full"
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
          onAddNode={handleAddNode}
          onDeleteSelection={handleDeleteSelection}
          onExport={onExport}
        />
        <Controls position="bottom-right" showInteractive={false} />
        <MiniMap
          position="bottom-left"
          pannable
          zoomable
          className="!rounded-[24px] !border !border-white/10 !bg-slate-950/85"
          nodeColor={(node) =>
            ((node.data as { node?: { color?: string } })?.node?.color ?? "#0f4c81")
          }
        />
        <Background color="#334155" gap={24} size={1.1} />
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas(props: {
  diagram: DiagramSpec;
  busy: boolean;
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onAutoLayout: () => void | Promise<void>;
  onReset: () => void;
  onExport: (format: "png" | "svg" | "json") => void;
  onDiagramChange: (diagram: DiagramSpec) => void;
  onSelectNode: (nodeId: string | null) => void;
  onSelectEdge: (edgeId: string | null) => void;
  onClearSelection: () => void;
}) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}
