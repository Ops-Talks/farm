"use client";

import { useCallback, useEffect, useState } from "react";
import { docs, catalog, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  DocumentationEntry,
  DocumentationTreeNode,
  DocumentationSearchResult,
  CatalogComponent,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { toast } from "sonner";

// -- Tree sidebar component --

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

// -- Create/Edit form --

function DocForm({
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

// -- Main page --

export default function DocsPage() {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  const [allDocs, setAllDocs] = useState<DocumentationEntry[]>([]);
  const [tree, setTree] = useState<DocumentationTreeNode[]>([]);
  const [components, setComponents] = useState<CatalogComponent[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renderedHtml, setRenderedHtml] = useState<string>("");
  const [selectedDoc, setSelectedDoc] = useState<DocumentationEntry | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [contentLoading, setContentLoading] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    DocumentationSearchResult[]
  >([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingDoc, setEditingDoc] = useState<DocumentationEntry | null>(null);

  // Selected component for tree
  const [selectedComponentId, setSelectedComponentId] = useState<string>("");

  const fetchDocs = useCallback(() => {
    docs
      .list({ take: 100 })
      .then((res) => {
        setAllDocs(res.data);
        // Extract unique componentIds
        const componentIds = [
          ...new Set(res.data.map((d) => d.componentId)),
        ];
        if (componentIds.length > 0 && !selectedComponentId) {
          const firstId = componentIds[0];
          if (firstId) {
            setSelectedComponentId(firstId);
          }
        }
      })
      .catch(() => setAllDocs([]))
      .finally(() => setLoading(false));
  }, [selectedComponentId]);

  useEffect(() => {
    fetchDocs();
    catalog
      .listComponents({ take: 100 })
      .then((res) => setComponents(res.data))
      .catch(() => setComponents([]));
  }, [fetchDocs]);

  // Build tree when component selection changes
  useEffect(() => {
    if (!selectedComponentId) return;
    docs
      .tree(selectedComponentId)
      .then(setTree)
      .catch(() => setTree([]));
  }, [selectedComponentId, allDocs]);

  // Load rendered content when a doc is selected
  useEffect(() => {
    if (!selectedId) return;
    // Wrap in a microtask to avoid synchronous setState in effect
    Promise.resolve()
      .then(() => setContentLoading(true))
      .then(() =>
        Promise.all([docs.get(selectedId), docs.getRendered(selectedId)]),
      )
      .then(([meta, html]) => {
        setSelectedDoc(meta);
        setRenderedHtml(typeof html === "string" ? html : String(html));
      })
      .catch(() => {
        setSelectedDoc(null);
        setRenderedHtml("<p>Failed to load document content.</p>");
      })
      .finally(() => setContentLoading(false));
  }, [selectedId]);

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    docs
      .search(searchQuery.trim())
      .then(setSearchResults)
      .catch(() => setSearchResults([]))
      .finally(() => setIsSearching(false));
  };

  const handleCreate = (data: Partial<DocumentationEntry>) => {
    docs
      .create(data)
      .then((created) => {
        toast.success(`Document "${created.title}" created`);
        setShowForm(false);
        fetchDocs();
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
      });
  };

  const handleUpdate = (data: Partial<DocumentationEntry>) => {
    if (!editingDoc) return;
    docs
      .update(editingDoc.id, data)
      .then((updated) => {
        toast.success(`Document "${updated.title}" updated`);
        setEditingDoc(null);
        setShowForm(false);
        fetchDocs();
        if (selectedId === updated.id) {
          setSelectedDoc(updated);
        }
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
      });
  };

  const handleDelete = (id: string, title: string) => {
    if (!confirm(`Delete document "${title}"?`)) return;
    docs
      .delete(id)
      .then(() => {
        toast.success("Document deleted");
        if (selectedId === id) {
          setSelectedId(null);
        }
        fetchDocs();
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          const msg = err.body.message;
          toast.error(Array.isArray(msg) ? msg.join(", ") : msg);
        }
      });
  };

  // Get unique component IDs from docs
  const docComponentIds = [...new Set(allDocs.map((d) => d.componentId))];
  const componentMap = new Map(components.map((c) => [c.id, c]));

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <div className="flex gap-6">
          <Skeleton className="h-96 w-56" />
          <Skeleton className="h-96 flex-1" />
        </div>
      </div>
    );
  }

  // Show create/edit form
  if (showForm) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-sm text-muted-foreground">
            {editingDoc ? "Edit document" : "Register a new document"}
          </p>
        </div>
        <DocForm
          components={components}
          treeNodes={tree}
          initial={editingDoc}
          onSave={editingDoc ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingDoc(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Documentation</h1>
          <p className="text-sm text-muted-foreground">
            {allDocs.length} document{allDocs.length !== 1 ? "s" : ""}{" "}
            registered
          </p>
        </div>
        {isAdmin && (
          <Button
            onClick={() => {
              setEditingDoc(null);
              setShowForm(true);
            }}
          >
            New Document
          </Button>
        )}
      </div>

      {/* Search bar */}
      <div className="flex gap-2">
        <Input
          placeholder="Search documentation..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSearch();
          }}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch} disabled={isSearching}>
          {isSearching ? "Searching..." : "Search"}
        </Button>
        {searchResults.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchQuery("");
              setSearchResults([]);
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Search results */}
      {searchResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Search Results ({searchResults.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {searchResults.map((r) => (
              <button
                key={r.id}
                className="w-full text-left rounded px-3 py-2 hover:bg-muted flex items-center justify-between"
                onClick={() => {
                  setSelectedId(r.id);
                  setSelectedComponentId(r.componentId);
                  setSearchResults([]);
                  setSearchQuery("");
                }}
              >
                <span className="font-medium text-sm">{r.title}</span>
                <Badge variant="secondary" className="text-xs">
                  {Math.round(r.score * 100)}%
                </Badge>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      {allDocs.length === 0 ? (
        <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
          No documentation registered yet.
          {isAdmin && " Click 'New Document' to create one."}
        </div>
      ) : (
        <div className="flex gap-6 min-h-[500px]">
          {/* Sidebar - tree navigation */}
          <div className="w-56 flex-shrink-0 space-y-3">
            {/* Component selector */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Component
              </label>
              <select
                className="w-full rounded-md border px-2 py-1.5 text-sm bg-background"
                value={selectedComponentId}
                onChange={(e) => {
                  setSelectedComponentId(e.target.value);
                  setSelectedId(null);
                }}
              >
                {docComponentIds.map((cid) => {
                  const comp = componentMap.get(cid);
                  return (
                    <option key={cid} value={cid}>
                      {comp?.name ?? cid}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Tree */}
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
                    onSelect={setSelectedId}
                    depth={0}
                  />
                ))
              )}
            </div>
          </div>

          {/* Content area */}
          <div className="flex-1 min-w-0">
            {!selectedId ? (
              <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
                Select a document from the tree to view its content.
              </div>
            ) : contentLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-64" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            ) : (
              <div className="space-y-4">
                {/* Document header */}
                {selectedDoc && (
                  <div className="flex items-start justify-between border-b pb-3">
                    <div>
                      <h2 className="text-xl font-bold">
                        {selectedDoc.title}
                      </h2>
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>Author: {selectedDoc.author}</span>
                        <span>Version: {selectedDoc.version}</span>
                        <span>
                          Updated:{" "}
                          {new Date(selectedDoc.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingDoc(selectedDoc);
                            setShowForm(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() =>
                            handleDelete(selectedDoc.id, selectedDoc.title)
                          }
                        >
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* Rendered content */}
                <div
                  className="prose prose-sm dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
