"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const docFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  sourceUrl: z.string().url("Must be a valid URL"),
  componentId: z.string().min(1, "Component is required"),
  author: z.string().min(1, "Author is required"),
  version: z.string().optional(),
  parentId: z.string().optional(),
  // Use z.number() (not coerce) — RHF's valueAsNumber option does the
  // string→number conversion before Zod receives the value.
  order: z.number().int().min(0),
});

type DocFormValues = z.infer<typeof docFormSchema>;

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<DocFormValues>({
    resolver: zodResolver(docFormSchema),
    mode: "onChange",
    defaultValues: {
      title: initial?.title ?? "",
      sourceUrl: initial?.sourceUrl ?? "",
      componentId: initial?.componentId ?? "",
      author: initial?.author ?? "",
      version: initial?.version ?? "1.0.0",
      parentId: initial?.parentId ?? "",
      order: initial?.order ?? 0,
    },
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

  const onSubmit = (values: DocFormValues) => {
    onSave({
      title: values.title,
      sourceUrl: values.sourceUrl,
      componentId: values.componentId || undefined,
      author: values.author,
      version: values.version,
      parentId: values.parentId || undefined,
      order: values.order,
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="doc-title" className="text-sm font-medium">
                Title <span className="text-destructive">*</span>
              </label>
              <Input
                id="doc-title"
                aria-invalid={!!errors.title}
                aria-describedby={errors.title ? "title-error" : undefined}
                {...register("title")}
              />
              {errors.title?.message && (
                <p id="title-error" role="alert" aria-live="polite" className="text-xs text-destructive">{errors.title.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="doc-source-url" className="text-sm font-medium">
                Source URL <span className="text-destructive">*</span>
              </label>
              {/* type="text" — Zod .url() handles validation; jsdom quirks with type="url" */}
              <Input
                id="doc-source-url"
                type="text"
                placeholder="https://raw.githubusercontent.com/.../README.md"
                aria-invalid={!!errors.sourceUrl}
                aria-describedby={errors.sourceUrl ? "sourceUrl-error" : undefined}
                {...register("sourceUrl")}
              />
              {errors.sourceUrl?.message && (
                <p id="sourceUrl-error" role="alert" aria-live="polite" className="text-xs text-destructive">{errors.sourceUrl.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <label htmlFor="doc-component" className="text-sm font-medium">
                Component <span className="text-destructive">*</span>
              </label>
              <select
                id="doc-component"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                aria-invalid={!!errors.componentId}
                aria-describedby={errors.componentId ? "componentId-error" : undefined}
                {...register("componentId")}
              >
                <option value="">Select component...</option>
                {components.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {errors.componentId?.message && (
                <p id="componentId-error" role="alert" aria-live="polite" className="text-xs text-destructive">{errors.componentId.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="doc-parent" className="text-sm font-medium">Parent Document</label>
              <select
                id="doc-parent"
                className="w-full rounded-md border px-3 py-2 text-sm bg-background"
                {...register("parentId")}
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
              <label htmlFor="doc-author" className="text-sm font-medium">
                Author <span className="text-destructive">*</span>
              </label>
              <Input
                id="doc-author"
                aria-invalid={!!errors.author}
                aria-describedby={errors.author ? "author-error" : undefined}
                {...register("author")}
              />
              {errors.author?.message && (
                <p id="author-error" role="alert" aria-live="polite" className="text-xs text-destructive">{errors.author.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <label htmlFor="doc-version" className="text-sm font-medium">Version</label>
              <Input
                id="doc-version"
                {...register("version")}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="doc-order" className="text-sm font-medium">Sort Order</label>
              {/* valueAsNumber tells RHF to convert the HTML string value to a number */}
              <Input
                id="doc-order"
                type="number"
                min={0}
                {...register("order", { valueAsNumber: true })}
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
