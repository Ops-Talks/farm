"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { docs, catalog, ApiError } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  DocumentationEntry,
  DocumentationTreeNode,
  DocumentationSearchResult,
  DocumentationBuild,
  CatalogComponent,
} from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
// Co-located sub-components — same _components/ directory
import { DocTree } from "./doc-tree";
import { DocForm } from "./doc-form";
import { VersionSelector } from "./VersionSelector";

export function DocsClient() {
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

  // Build version selected from VersionSelector
  const [selectedBuild, setSelectedBuild] = useState<DocumentationBuild | null>(null);

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

  const handleSearch = useCallback(() => {
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
  }, [searchQuery]);

  const handleCreate = useCallback((data: Partial<DocumentationEntry>) => {
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
  }, [fetchDocs]);

  const handleUpdate = useCallback((data: Partial<DocumentationEntry>) => {
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
  }, [editingDoc, fetchDocs, selectedId]);

  const handleDelete = useCallback((id: string, title: string) => {
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
  }, [selectedId, fetchDocs]);

  // Get unique component IDs from docs
  const docComponentIds = useMemo(
    () => [...new Set(allDocs.map((d) => d.componentId))],
    [allDocs],
  );
  const componentMap = useMemo(
    () => new Map(components.map((c) => [c.id, c])),
    [components],
  );

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
      <PageHeader
        title="Documentation"
        description={`${allDocs.length} document${allDocs.length !== 1 ? "s" : ""} registered`}
      >
        {selectedComponentId && (
          <VersionSelector
            componentId={selectedComponentId}
            onBuildSelected={setSelectedBuild}
          />
        )}
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
      </PageHeader>

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
        <EmptyState
          title="No documentation registered"
          description="Add your first documentation page to get started."
        />
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
            <DocTree
              tree={tree}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
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

                {/* Build version info */}
                {selectedBuild && selectedDoc && (
                  <div className="text-xs text-muted-foreground mb-2">
                    Built from{" "}
                    <span className="font-medium">{selectedBuild.sourceType}</span>{" "}
                    — version{" "}
                    <span className="font-medium">{selectedBuild.version}</span>
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
