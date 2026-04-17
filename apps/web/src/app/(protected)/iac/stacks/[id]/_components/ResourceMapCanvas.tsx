"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import Dagre from "@dagrejs/dagre";
import { iac } from "@/lib/api-client";
import type { IacResourceNode, IacResourceEdge } from "@/types/api";

const NODE_WIDTH = 180;
const NODE_HEIGHT = 60;

function buildLayout(
  resources: IacResourceNode[],
  dependencies: IacResourceEdge[],
): { nodes: Node[]; edges: Edge[] } {
  const g = new Dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", ranksep: 80, nodesep: 40 });
  g.setDefaultEdgeLabel(() => ({}));

  for (const r of resources) {
    g.setNode(r.address, { width: NODE_WIDTH, height: NODE_HEIGHT });
  }
  for (const d of dependencies) {
    g.setEdge(d.source, d.target);
  }

  Dagre.layout(g);

  const nodes: Node[] = resources.map((r) => {
    const pos = g.node(r.address);
    return {
      id: r.address,
      position: {
        x: pos.x - NODE_WIDTH / 2,
        y: pos.y - NODE_HEIGHT / 2,
      },
      data: {
        label: (
          <div
            className="flex flex-col items-center justify-center h-full px-2 text-center"
            title={r.address}
          >
            <span className="text-xs font-semibold truncate w-full">
              {r.resourceType}
            </span>
            <span className="text-xs text-muted-foreground truncate w-full">
              {r.resourceName}
            </span>
          </div>
        ),
      },
      style: { width: NODE_WIDTH, height: NODE_HEIGHT },
    };
  });

  const edges: Edge[] = dependencies.map((d, i) => ({
    id: `e-${i}-${d.source}-${d.target}`,
    source: d.source,
    target: d.target,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: false,
  }));

  return { nodes, edges };
}

export function ResourceMapCanvas() {
  const params = useParams<{ id: string }>();
  const stackId = params?.id ?? "";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["iac-resources", stackId],
    queryFn: () => iac.getResources(stackId),
    enabled: !!stackId,
  });

  if (isLoading) {
    return (
      <div
        data-testid="resource-map-loading"
        className="flex items-center justify-center h-64 text-muted-foreground text-sm"
      >
        Loading resource map...
      </div>
    );
  }

  if (isError) {
    return (
      <div
        data-testid="resource-map-error"
        className="flex items-center justify-center h-64 text-destructive text-sm"
      >
        Failed to load resource map.
      </div>
    );
  }

  if (!data || data.resources.length === 0) {
    return (
      <div
        data-testid="resource-map-empty"
        className="flex items-center justify-center h-64 text-muted-foreground text-sm"
      >
        No resources have been ingested for this stack yet.
      </div>
    );
  }

  const { nodes, edges } = buildLayout(data.resources, data.dependencies);

  return (
    <div
      data-testid="resource-map-canvas"
      data-nodes={nodes.length}
      data-edges={edges.length}
      className="h-[600px] w-full rounded-md border"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
      >
        <Background />
        <Controls />
        <MiniMap />
      </ReactFlow>
    </div>
  );
}
