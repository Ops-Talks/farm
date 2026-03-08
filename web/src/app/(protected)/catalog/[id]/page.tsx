"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { catalog, deployments } from "@/lib/api-client";
import type { CatalogComponent, Deployment } from "@/types/api";

function lifecycleVariant(
  lifecycle: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (lifecycle) {
    case "production":
      return "default";
    case "experimental":
      return "secondary";
    case "deprecated":
    case "decommissioned":
      return "destructive";
    default:
      return "outline";
  }
}

function deploymentStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (status) {
    case "succeeded":
      return "default";
    case "in_progress":
    case "pending":
      return "secondary";
    case "failed":
    case "rolled_back":
      return "destructive";
    default:
      return "outline";
  }
}

export default function ComponentDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [component, setComponent] = useState<CatalogComponent | null>(null);
  const [componentDeployments, setComponentDeployments] = useState<
    Deployment[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!params.id) return;

    Promise.allSettled([
      catalog.getComponent(params.id),
      deployments.list({ componentId: params.id, take: 10 }),
    ]).then(([compResult, deplResult]) => {
      if (compResult.status === "fulfilled") {
        setComponent(compResult.value);
      } else {
        setError("Component not found");
      }

      if (deplResult.status === "fulfilled") {
        setComponentDeployments(deplResult.value.data);
      }

      setLoading(false);
    });
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error || !component) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <p className="text-lg text-muted-foreground">
          {error ?? "Component not found"}
        </p>
        <Button variant="outline" onClick={() => router.push("/catalog")}>
          Back to Catalog
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{component.name}</h1>
            <Badge variant="outline" className="capitalize">
              {component.kind}
            </Badge>
            <Badge variant={lifecycleVariant(component.lifecycle)}>
              {component.lifecycle}
            </Badge>
          </div>
          {component.description && (
            <p className="mt-1 text-sm text-muted-foreground">
              {component.description}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={() => router.push("/catalog")}>
          Back
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main info */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Metadata card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-muted-foreground">Owner</span>
                  <p className="font-medium">{component.owner}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Team</span>
                  <p className="font-medium">
                    {component.team?.displayName ?? component.teamId ?? "--"}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">
                    {new Date(component.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated</span>
                  <p className="font-medium">
                    {new Date(component.updatedAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Tags */}
              {component.tags && component.tags.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Tags</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {component.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="text-xs"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Links */}
              {component.links && component.links.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <span className="text-sm text-muted-foreground">Links</span>
                    <div className="mt-1 space-y-1">
                      {component.links.map((link) => (
                        <a
                          key={link.url}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline"
                        >
                          {link.title}
                        </a>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              {component.metadata &&
                Object.keys(component.metadata).length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <span className="text-sm text-muted-foreground">
                        Metadata
                      </span>
                      <pre className="mt-1 rounded bg-muted p-2 text-xs">
                        {JSON.stringify(component.metadata, null, 2)}
                      </pre>
                    </div>
                  </>
                )}
            </CardContent>
          </Card>

          {/* Deployment history */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Recent Deployments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {componentDeployments.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No deployments recorded for this component.
                </p>
              ) : (
                <div className="space-y-3">
                  {componentDeployments.map((d) => (
                    <div
                      key={d.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={deploymentStatusVariant(d.status)}
                          className="text-xs"
                        >
                          {d.status}
                        </Badge>
                        <span className="font-medium">v{d.version}</span>
                        {d.environment && (
                          <span className="text-muted-foreground">
                            to {d.environment.name}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(d.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="flex flex-col gap-6">
          {/* Dependencies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Dependencies
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!component.dependencies ||
              component.dependencies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No dependencies declared.
                </p>
              ) : (
                <div className="space-y-2">
                  {component.dependencies.map((dep) => (
                    <Link
                      key={dep.id}
                      href={`/catalog/${dep.id}`}
                      className="flex items-center gap-2 rounded p-1 text-sm hover:bg-muted"
                    >
                      <Badge variant="outline" className="text-xs capitalize">
                        {dep.kind}
                      </Badge>
                      <span className="text-primary">{dep.name}</span>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Component ID */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Identifiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <span className="text-muted-foreground">ID</span>
                <p className="font-mono text-xs">{component.id}</p>
              </div>
              {component.teamId && (
                <div>
                  <span className="text-muted-foreground">Team ID</span>
                  <p className="font-mono text-xs">{component.teamId}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}