"use client";

import { useState } from "react";
import type { CatalogComponent, DocumentationEntry, DocumentationTreeNode } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

export function DocForm({
  components,
  treeNodes,
  initial,
  onSave,
  onCancel,
}: {
  components: CatalogComponent[];
  treeNodes: DocumentationTreeNode[];
  initial?: DocumentationEntry | null;
  onSave: (data: Partial<DocumentationEntry>) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState({
    title: initial?.title ?? "",
    sourceUrl: initial?.sourceUrl ?? "",
    componentId: initial?.componentId ?? "",
    author: initial?.author ?? "",
    version: initial?.version ?? "1.0.0",
    parentId: initial?.parentId ?? "",
    order: initial?.order ?? 0,
  });

  function flattenTree(
    nodes: DocumentationTreeNode[],
    depth = 0,
  ): { id: string; title: string; depth: number }[] {
    const result: { id: string; title: string; depth: number }[] = [];
    for (const n of nodes) {
      result.push({ id: n.id, title: n.title, depth });
      result.push(...flattenTree(n.children, depth + 1));
    }
    return result;
  }

  const flatNodes = flattenTree(treeNodes);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title: form.title,
      sourceUrl: form.sourceUrl,
      componentId: form.componentId || undefined,
      author: form.author,
      version: form.version,
      parentId: form.parentId || undefined,
      order: form.order,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{initial ? "Edit Document" : "New Document"}</CardTitle>
        <CardDescription>
          {initial
            ? "Update the document metadata."
            : "Register a new documentation entry by providing a title and source URL."}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Source URL <span className="text-destructive">*</span>
              </label>
              <Input
                type="url"
                placeholder="https://raw.githubusercontent.com/.../README.md"
                value={form.sourceUrl}
                onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Component <span className="text-destructive">*</span>
              </label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.componentId}
                onChange={(e) =>
                  setForm({ ...form, componentId: e.target.value })
                }
                required
              >
                <option value="">Select component...</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Parent Document</label>
              <select
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                value={form.parentId}
                onChange={(e) =>
                  setForm({ ...form, parentId: e.target.value })
                }
              >
                <option value="">(Root level)</option>
                {flatNodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {"  ".repeat(n.depth) + n.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <label className="text-sm font-medium">
                Author <span className="text-destructive">*</span>
              </label>
              <Input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Version</label>
              <Input
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Sort Order</label>
              <Input
                type="number"
                min={0}
                value={form.order}
                onChange={(e) =>
                  setForm({ ...form, order: parseInt(e.target.value, 10) || 0 })
                }
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {initial ? "Save Changes" : "Create Document"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
