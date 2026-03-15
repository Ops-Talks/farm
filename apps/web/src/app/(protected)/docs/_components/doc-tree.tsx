"use client";

import { useState } from "react";
import type { DocumentationTreeNode } from "@/types/api";

function TreeItem({
  node,
  selectedId,
  onSelect,
  depth,
}: {
  node: DocumentationTreeNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  depth: number;
}) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = node.id === selectedId;

  return (
    <div>
      <button
        className={`w-full text-left px-2 py-1.5 rounded text-sm flex items-center gap-1 hover:bg-muted ${
          isSelected ? "bg-muted font-medium" : ""
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          onSelect(node.id);
          if (hasChildren) setExpanded(!expanded);
        }}
      >
        {hasChildren && (
          <span className="text-muted-foreground text-xs w-4 flex-shrink-0">
            {expanded ? "v" : ">"}
          </span>
        )}
        {!hasChildren && <span className="w-4 flex-shrink-0" />}
        <span className="truncate">{node.title}</span>
      </button>
      {expanded &&
        hasChildren &&
        node.children.map((child) => (
          <TreeItem
            key={child.id}
            node={child}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={depth + 1}
          />
        ))}
    </div>
  );
}

export function DocTree({
  tree,
  selectedId,
  onSelect,
}: {
  tree: DocumentationTreeNode[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-md border p-2 max-h-[600px] overflow-y-auto">
      {tree.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-4">
          No documents for this component
        </p>
      ) : (
        tree.map((node) => (
          <TreeItem
            key={node.id}
            node={node}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={0}
          />
        ))
      )}
    </div>
  );
}
