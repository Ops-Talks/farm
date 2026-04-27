"use client";

/**
 * ElasticsearchIndicesTab (FARM-T404 / Phase 35)
 *
 * Lists Elasticsearch indices linked to the current catalog component along
 * with live cluster health, document count and store size. Operators can
 * link new index patterns or unlink existing ones; rows expose a deep link
 * into Kibana Discover when `NEXT_PUBLIC_KIBANA_URL` is configured.
 */

import { useState } from "react";
import { ExternalLink, Link2, Trash2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  componentElasticsearchIndices,
  ApiError,
} from "@/lib/api-client";
import { useElasticsearchIndices } from "@/hooks/use-elasticsearch-indices";
import { buildKibanaDiscoverUrl } from "@/lib/kibana-config";
import { EsHealthBadge } from "@/components/elasticsearch/EsHealthBadge";

// ---------------------------------------------------------------------------
// Link dialog
// ---------------------------------------------------------------------------

interface LinkIndexDialogProps {
  componentId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function LinkIndexDialog({
  componentId,
  open,
  onOpenChange,
  onSuccess,
}: LinkIndexDialogProps) {
  const [indexPattern, setIndexPattern] = useState("");
  const [esUrl, setEsUrl] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setIndexPattern("");
    setEsUrl("");
    setDescription("");
    setError(null);
    setSubmitting(false);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedPattern = indexPattern.trim();
    if (!trimmedPattern) {
      setError("Index pattern is required");
      return;
    }
    const trimmedUrl = esUrl.trim();
    if (trimmedUrl) {
      try {
        new URL(trimmedUrl);
      } catch {
        setError("Elasticsearch URL must be a valid URL");
        return;
      }
    }

    setSubmitting(true);
    try {
      await componentElasticsearchIndices.create(componentId, {
        indexPattern: trimmedPattern,
        esUrl: trimmedUrl || undefined,
        description: description.trim() || undefined,
      });
      reset();
      onOpenChange(false);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          "An index with this pattern is already linked to this component",
        );
      } else if (err instanceof Error) {
        setError(err.message || "Failed to link index");
      } else {
        setError("Failed to link index");
      }
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Link Elasticsearch Index</DialogTitle>
          <DialogDescription>
            Associate an Elasticsearch index pattern with this component to
            surface live document counts and cluster health.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label
              htmlFor="es-index-pattern"
              className="text-sm font-medium"
            >
              Index pattern
            </label>
            <Input
              id="es-index-pattern"
              required
              placeholder="logs-app-*"
              value={indexPattern}
              onChange={(e) => setIndexPattern(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="es-url" className="text-sm font-medium">
              Elasticsearch URL{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="es-url"
              type="text"
              placeholder="https://es.example.com:9200"
              value={esUrl}
              onChange={(e) => setEsUrl(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="es-description"
              className="text-sm font-medium"
            >
              Description{" "}
              <span className="text-xs text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="es-description"
              placeholder="Application JSON logs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          {error && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-md border border-destructive/50 bg-destructive/10 p-2 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Linking..." : "Link"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Tab
// ---------------------------------------------------------------------------

const NUMBER_FORMATTER = new Intl.NumberFormat("en-US");

interface ElasticsearchIndicesTabProps {
  componentId: string;
}

export function ElasticsearchIndicesTab({
  componentId,
}: ElasticsearchIndicesTabProps) {
  const { indices, loading, error, refetch } =
    useElasticsearchIndices(componentId);
  const [linkOpen, setLinkOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(indexId: string, pattern: string) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Unlink index "${pattern}" from this component? This cannot be undone.`,
      )
    ) {
      return;
    }
    setDeletingId(indexId);
    try {
      await componentElasticsearchIndices.remove(componentId, indexId);
      await refetch();
    } finally {
      setDeletingId(null);
    }
  }

  if (loading && indices.length === 0 && !error) {
    return (
      <div className="space-y-2" data-testid="es-loading">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/5 p-4"
      >
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          <span>Failed to load Elasticsearch indices: {error.message}</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Linked Elasticsearch Indices
        </h3>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setLinkOpen(true)}
        >
          <Link2 className="mr-1.5 h-3.5 w-3.5" />
          Link Index
        </Button>
      </div>

      {indices.length === 0 ? (
        <div className="py-8 text-center border rounded-xl bg-muted/20">
          <p className="text-sm text-muted-foreground">
            No Elasticsearch indices linked
          </p>
          <Button
            size="sm"
            variant="outline"
            className="mt-3"
            onClick={() => setLinkOpen(true)}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Link Index
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-md border">
          <table
            className="w-full text-sm"
            aria-label="Linked Elasticsearch indices"
          >
            <caption className="sr-only">
              Elasticsearch indices linked to this component, with cluster
              health and document counts.
            </caption>
            <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Index pattern
                </th>
                <th scope="col" className="px-3 py-2 text-left font-medium">
                  Health
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Docs
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  Store size
                </th>
                <th scope="col" className="px-3 py-2 text-right font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {indices.map((row) => {
                const kibanaUrl = buildKibanaDiscoverUrl(row.indexPattern);
                return (
                  <tr
                    key={row.indexId}
                    className="border-t hover:bg-muted/20"
                  >
                    <td className="px-3 py-2 font-mono text-xs">
                      {row.indexPattern}
                    </td>
                    <td className="px-3 py-2">
                      <EsHealthBadge row={row} />
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.stats
                        ? NUMBER_FORMATTER.format(row.stats.docsCount)
                        : "—"}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {row.stats?.storeSize ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {kibanaUrl && (
                          <a
                            href={kibanaUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                            aria-label={`Open ${row.indexPattern} in Kibana`}
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open in Kibana
                          </a>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          disabled={deletingId === row.indexId}
                          onClick={() =>
                            void handleDelete(row.indexId, row.indexPattern)
                          }
                          aria-label={`Unlink ${row.indexPattern}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <LinkIndexDialog
        componentId={componentId}
        open={linkOpen}
        onOpenChange={setLinkOpen}
        onSuccess={() => void refetch()}
      />
    </div>
  );
}
