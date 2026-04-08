"use client";

// ContainerImageCard — displays container image metadata for a catalog component.
// Renders nothing when containerImage is not set on the component.

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ContainerImageMetadata } from "@/types/api";

interface ContainerImageCardProps {
  containerImage?: ContainerImageMetadata | null;
}

function registryLabel(registry: string): string {
  switch (registry.toLowerCase()) {
    case "ecr":
      return "AWS ECR";
    case "gcr":
      return "GCP Artifact Registry";
    case "dockerhub":
      return "Docker Hub";
    case "harbor":
      return "Harbor";
    default:
      return registry;
  }
}

function truncateDigest(digest?: string): string | undefined {
  if (!digest) return undefined;
  // Show "sha256:" prefix + first 12 hex chars + "..."
  const prefix = digest.startsWith("sha256:") ? "sha256:" : "";
  const hex = digest.replace(/^sha256:/, "");
  return `${prefix}${hex.slice(0, 12)}...`;
}

export function ContainerImageCard({ containerImage }: ContainerImageCardProps) {
  // Return nothing when there is no container image configuration attached.
  if (!containerImage) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Container Image
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {/* Registry badge */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
              Registry
            </span>
            <div>
              <Badge variant="secondary">{registryLabel(containerImage.registry)}</Badge>
            </div>
          </div>

          {/* Image name */}
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
              Image
            </span>
            <p className="text-sm font-mono break-all">{containerImage.image}</p>
          </div>

          {/* Latest tag (optional) */}
          {containerImage.latestTag && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Tag
              </span>
              <p className="text-sm font-mono">{containerImage.latestTag}</p>
            </div>
          )}

          {/* Digest (optional, truncated) */}
          {containerImage.digest && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Digest
              </span>
              <p className="text-sm font-mono text-muted-foreground break-all">
                {truncateDigest(containerImage.digest)}
              </p>
            </div>
          )}

          {/* Pushed at (optional) */}
          {containerImage.pushedAt && (
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                Pushed
              </span>
              <p className="text-sm">{new Date(containerImage.pushedAt).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
