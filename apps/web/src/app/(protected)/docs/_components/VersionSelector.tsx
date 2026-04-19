"use client";

import { type ChangeEvent, useEffect, useState } from "react";
import { docs } from "@/lib/api-client";
import type { DocumentationBuild } from "@/types/api";
import { Badge } from "@/components/ui/badge";

interface VersionSelectorProps {
  componentId: string;
  onBuildSelected: (build: DocumentationBuild | null) => void;
}

export function VersionSelector({
  componentId,
  onBuildSelected,
}: VersionSelectorProps) {
  const [builds, setBuilds] = useState<DocumentationBuild[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!componentId) return;
    setLoading(true);
    docs
      .getVersions(componentId)
      .then((data) => {
        setBuilds(data);
        if (data.length > 0 && data[0]) {
          setSelectedId(data[0].id);
          onBuildSelected(data[0]);
        } else {
          onBuildSelected(null);
        }
      })
      .catch(() => {
        setBuilds([]);
        onBuildSelected(null);
      })
      .finally(() => setLoading(false));
  // onBuildSelected is intentionally excluded from deps to avoid re-renders
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [componentId]);

  if (loading || builds.length === 0) return null;

  function handleChange(e: ChangeEvent<HTMLSelectElement>) {
    const id = e.target.value;
    setSelectedId(id);
    const build = builds.find((b) => b.id === id) ?? null;
    onBuildSelected(build);
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Version:</span>
      <select
        className="rounded-md border px-2 py-1 text-sm bg-background h-8"
        value={selectedId}
        onChange={handleChange}
        aria-label="Select build version"
      >
        {builds.map((b) => (
          <option key={b.id} value={b.id}>
            {b.version} ({b.sourceType})
          </option>
        ))}
      </select>
      {builds.find((b) => b.id === selectedId) && (
        <Badge variant="secondary" className="text-xs capitalize">
          {builds.find((b) => b.id === selectedId)?.sourceType}
        </Badge>
      )}
    </div>
  );
}
