"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorBoundary } from "@/components/error-boundary";
import { catalog, deployments, finops, linkerd as linkerdApi, gatekeeper as gatekeeperApi, opa as opaApi } from "@/lib/api-client";
import type { CatalogComponent, Deployment, LinkerdStatus, OpaStatus } from "@/types/api";
import type { CostEstimate, ComponentActualCost } from "@/lib/api-client";
import { ChevronLeft, ExternalLink, GitBranch, Github } from "lucide-react";
import { HelmChartCard } from "./HelmChartCard";
import { ContainerImageCard } from "./ContainerImageCard";
import { CRDResourcesTab } from "./CRDResourcesTab";
import { CICDTab } from "./CICDTab";
import { CloudResourcesTab } from "./CloudResourcesTab";
import { ViolationsTab } from "./ViolationsTab";
import { KyvernoPolicyTab } from "./KyvernoPolicyTab";
import { IstioTrafficTab } from "./IstioTrafficTab";
import { IstioSecurityTab } from "./IstioSecurityTab";
import { IstioCanaryTab } from "./IstioCanaryTab";
import { LinkerdTrafficTab } from "./LinkerdTrafficTab";
import { LinkerdSecurityTab } from "./LinkerdSecurityTab";
import { LinkerdServiceProfileTab } from "./LinkerdServiceProfileTab";
import { ConstraintTemplateTable } from "./ConstraintTemplateTable";
import { OpaEvaluationPanel } from "./OpaEvaluationPanel";
import { ApiSpecsTab } from "./ApiSpecsTab";
import { GatewayRoutesTab } from "./GatewayRoutesTab";
import { OperatorsTab } from "./OperatorsTab";
import { ContainerSecurityTab } from "./ContainerSecurityTab";
import { IacModulesTab } from "./IacModulesTab";
import { IacStacksTab } from "./IacStacksTab";
import { ElasticsearchIndicesTab } from "./ElasticsearchIndicesTab";
import { HarborReplicationTable } from "./HarborReplicationTable";
import { FluxBindingCard } from "./FluxBindingCard";
import { KedaBindingCard } from "./KedaBindingCard";
import { LogPipelineCard } from "./LogPipelineCard";
import { CostEstimateCard } from "@/components/finops/CostEstimateCard";
import { CostBudgetExceededBanner } from "@/components/finops/CostBudgetExceededBanner";
import { recordSpan } from "@/lib/otel-spans";

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

/** Detect repository provider from URL for labelling the link button */
function detectProvider(url: string): { label: string; icon: React.ReactNode } {
  let hostname: string | null = null;
  try {
    hostname = new URL(url).hostname;
  } catch {
    // If URL parsing fails, fall back to generic repository label
    hostname = null;
  }

  if (hostname === "github.com" || (hostname !== null && hostname.endsWith(".github.com"))) {
    return {
      label: "View on GitHub",
      icon: <Github className="h-4 w-4" />,
    };
  }

  if (
    hostname === "gitlab.com" ||
    (hostname !== null && hostname.endsWith(".gitlab.com")) ||
    // Support generic gitlab.<tld> hosts, but restrict to exactly two labels (e.g. "gitlab.example")
    (hostname !== null && hostname.startsWith("gitlab.") && hostname.split(".").length === 2)
  ) {
    return {
      label: "View on GitLab",
      icon: <GitBranch className="h-4 w-4" />,
    };
  }

  return {
    label: "View Repository",
    icon: <ExternalLink className="h-4 w-4" />,
  };
}

interface RepositoryCardProps {
  repositoryUrl: string;
}

const RepositoryCard = memo(function RepositoryCard({ repositoryUrl }: RepositoryCardProps) {
  const { label, icon } = useMemo(() => detectProvider(repositoryUrl), [repositoryUrl]);

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Repository
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Repository link */}
        <div className="space-y-1">
          <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
            Source
          </span>
          <a
            href={repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-primary hover:underline break-all"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" />
            {repositoryUrl}
          </a>
        </div>

        {/* Provider-aware action button */}
        <a href={repositoryUrl} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="w-full gap-2">
            {icon}
            {label}
          </Button>
        </a>

        <Separator />

        {/* Live data placeholders — shown when backend integration is not yet returning data */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Last commit</span>
            <span className="text-muted-foreground italic">—</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Open PRs</span>
            <span className="text-muted-foreground italic">—</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Pipeline status</span>
            <span className="text-muted-foreground italic">—</span>
          </div>
          <p className="text-[11px] text-muted-foreground border border-dashed rounded-md px-3 py-2 text-center leading-snug">
            Connect repository to see live data
          </p>
        </div>
      </CardContent>
    </Card>
  );
});

export function ComponentDetailClient() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [component, setComponent] = useState<CatalogComponent | null>(null);
  const [componentDeployments, setComponentDeployments] = useState<
    Deployment[]
  >([]);
  const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
  const [actualCost, setActualCost] = useState<ComponentActualCost | null>(null);
  const [budgetBannerDismissed, setBudgetBannerDismissed] = useState(false);
  const [linkerdStatus, setLinkerdStatus] = useState<LinkerdStatus | null>(null);
  const [gatekeeperEnabled, setGatekeeperEnabled] = useState(false);
  const [opaReachable, setOpaReachable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!params.id) return;

    Promise.allSettled([
      catalog.getComponent(params.id),
      deployments.list({ componentId: params.id, take: 10 }),
      finops.getCostEstimate(params.id),
      finops.getActualCost(params.id).catch(() => null),
    ]).then(([compResult, deplResult, estimateResult, actualCostResult]) => {
      if (compResult.status === "fulfilled") {
        setComponent(compResult.value);
      } else {
        setError("Component not found");
      }

      if (deplResult.status === "fulfilled") {
        setComponentDeployments(deplResult.value.data);
      }

      if (estimateResult.status === "fulfilled") {
        setCostEstimate(estimateResult.value);
      }

      if (actualCostResult.status === "fulfilled" && actualCostResult.value !== null) {
        setActualCost(actualCostResult.value as ComponentActualCost);
      }

      setLoading(false);
    });
  }, [params.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Fetch Linkerd installation status once on mount (Phase 20).
  // Tabs are conditionally rendered based on linkerdStatus.installed.
  useEffect(() => {
    linkerdApi.getStatus().then(setLinkerdStatus).catch(() => {
      setLinkerdStatus({ installed: false, components: [] });
    });
  }, []);

  // Fetch Gatekeeper detection status once on mount (Phase 21).
  useEffect(() => {
    gatekeeperApi.isEnabled().then((r) => setGatekeeperEnabled(r.enabled)).catch(() => {
      setGatekeeperEnabled(false);
    });
  }, []);

  // Fetch OPA reachability status once on mount (Phase 21).
  useEffect(() => {
    opaApi.getStatus().then((s: OpaStatus) => setOpaReachable(s.reachable)).catch(() => {
      setOpaReachable(false);
    });
  }, []);

  // Record a catalog.component.view span when the component data is loaded.
  // Fires each time `component` transitions to a new value so we capture
  // every distinct component that the user views.
  useEffect(() => {
    if (!component) return;
    void recordSpan(
      "catalog.component.view",
      () => component.id,
      {
        "component.id": component.id,
        "component.kind": component.kind,
      },
    );
  }, [component]);

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !component) {
    return (
      <EmptyState
        title="Component Not Found"
        description={error || "The component you are looking for does not exist or has been deleted."}
      >
        <Button variant="outline" onClick={() => router.push("/catalog")}>
          Back to Catalog
        </Button>
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-500">
      <PageHeader
        title={component.name}
        description={component.description || "No description provided for this component."}
      >
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="capitalize">
            {component.kind}
          </Badge>
          <Badge variant={lifecycleVariant(component.lifecycle)}>
            {component.lifecycle}
          </Badge>
          <Separator orientation="vertical" className="h-6 mx-2" />
          <Button variant="outline" size="sm" onClick={() => router.push("/catalog")}>
            <ChevronLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </PageHeader>

      {/* FinOps budget exceeded banner (Phase 19) */}
      {!budgetBannerDismissed &&
        costEstimate &&
        component.costBudgetUsd != null &&
        costEstimate.estimatedMonthlyCost > component.costBudgetUsd && (
          <CostBudgetExceededBanner
            delta={costEstimate.estimatedMonthlyCost - component.costBudgetUsd}
            currency={costEstimate.currency}
            onDismiss={() => setBudgetBannerDismissed(true)}
          />
        )}

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="helm">Helm</TabsTrigger>
          <TabsTrigger value="crds">CRDs</TabsTrigger>
          <TabsTrigger value="cicd">CI/CD</TabsTrigger>
          <TabsTrigger value="cloud">Cloud</TabsTrigger>
          <TabsTrigger value="violations">Violations</TabsTrigger>
          <TabsTrigger value="kyverno">Kyverno</TabsTrigger>
          <TabsTrigger value="istio-traffic">Traffic</TabsTrigger>
          <TabsTrigger value="istio-security">Security</TabsTrigger>
          <TabsTrigger value="istio-canary">Canary</TabsTrigger>
          {linkerdStatus?.installed && (
            <>
              <TabsTrigger value="linkerd-traffic">Linkerd Traffic</TabsTrigger>
              <TabsTrigger value="linkerd-security">Linkerd Security</TabsTrigger>
              <TabsTrigger value="linkerd-profile">Service Profiles</TabsTrigger>
            </>
          )}
          {gatekeeperEnabled && (
            <TabsTrigger value="gatekeeper">Gatekeeper</TabsTrigger>
          )}
          {opaReachable && (
            <TabsTrigger value="opa">OPA</TabsTrigger>
          )}
          <TabsTrigger value="api-specs">API Specs</TabsTrigger>
          {/* Gateway Routes tab (FARM-E48) */}
          <TabsTrigger value="gateway">Gateway Routes</TabsTrigger>
          <TabsTrigger value="operators">Operators</TabsTrigger>
          <TabsTrigger value="container-security">Container Security</TabsTrigger>
          <TabsTrigger value="iac-modules">IaC Modules</TabsTrigger>
          <TabsTrigger value="iac-stacks">IaC Stacks</TabsTrigger>
          <TabsTrigger value="elasticsearch">Elasticsearch</TabsTrigger>
        </TabsList>

        {/* ── Overview tab ─────────────────────────────────────────────── */}
        <TabsContent value="overview">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Main info */}
            <div className="flex flex-col gap-6 lg:col-span-2">
              {/* Details card — red header border when actual 30-day cost exceeds budget */}
              <Card>
                <CardHeader
                  className={
                    actualCost?.thirtyDay?.totalCost != null &&
                    component.costBudgetUsd != null &&
                    actualCost.thirtyDay.totalCost > component.costBudgetUsd
                      ? "border-b border-red-500"
                      : undefined
                  }
                >
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Technical Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Owner</span>
                      <p className="mt-1 font-medium">{component.owner}</p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Team</span>
                      <p className="mt-1 font-medium">
                        {component.team?.displayName ?? component.teamId ?? "--"}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Created</span>
                      <p className="mt-1 font-medium">
                        {new Date(component.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Updated</span>
                      <p className="mt-1 font-medium">
                        {new Date(component.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {/* Tags */}
                  {component.tags && component.tags.length > 0 && (
                    <div className="pt-4 border-t">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Tags</span>
                      <div className="mt-2 flex flex-wrap gap-1.5">
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
                  )}

                  {/* Links */}
                  {component.links && component.links.length > 0 && (
                    <div className="pt-4 border-t">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">External Links</span>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {component.links.map((link) => (
                          <a
                            key={link.url}
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center p-2 rounded-md border bg-muted/30 text-sm font-medium hover:bg-muted transition-colors"
                          >
                            <span className="text-primary truncate">{link.title}</span>
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Metadata JSON */}
                  {component.metadata &&
                    Object.keys(component.metadata).length > 0 && (
                      <div className="pt-4 border-t">
                        <span className="text-xs text-muted-foreground uppercase font-semibold">
                          Raw Metadata
                        </span>
                        <pre className="mt-2 rounded-lg bg-muted p-4 text-xs overflow-auto max-h-60 font-mono">
                          {JSON.stringify(component.metadata, null, 2)}
                        </pre>
                      </div>
                    )}
                </CardContent>
              </Card>

              {/* Deployment history */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {componentDeployments.length === 0 ? (
                    <div className="py-10 text-center">
                      <p className="text-sm text-muted-foreground italic">
                        No deployment history available for this component.
                      </p>
                    </div>
                  ) : (
                    <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                      {componentDeployments.map((d) => (
                        <div key={d.id} className="relative flex items-center gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border bg-background shadow-sm z-10`}>
                            <div className={`h-2.5 w-2.5 rounded-full ${d.status === 'succeeded' ? 'bg-green-500' : 'bg-amber-500'}`} />
                          </div>
                          <div className="flex flex-1 flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-sm">v{d.version}</span>
                                <Badge variant={deploymentStatusVariant(d.status)} className="text-[10px] h-5 px-1.5 uppercase font-bold">
                                  {d.status}
                                </Badge>
                              </div>
                              {d.environment && (
                                <p className="text-xs text-muted-foreground">
                                  Deployed to <span className="font-medium text-foreground">{d.environment.name}</span>
                                </p>
                              )}
                            </div>
                            <time className="text-[10px] text-muted-foreground whitespace-nowrap bg-muted px-2 py-0.5 rounded-full font-mono">
                              {new Date(d.createdAt).toLocaleString()}
                            </time>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="flex flex-col gap-6">
              {/* Repository card — only shown when repositoryUrl is present */}
              {component.repositoryUrl && (
                <RepositoryCard repositoryUrl={component.repositoryUrl} />
              )}

              {/* Container image */}
              <ContainerImageCard containerImage={component.containerImage} />

              {/* Harbor replication rules — only for Harbor registries */}
              {component.containerImage?.registry === "harbor" && (
                <HarborReplicationTable />
              )}

              {/* Flux GitOps bindings (FARM-S251 / T189) */}
              <FluxBindingCard componentId={component.id} />

              {/* KEDA autoscaling bindings (FARM-S254 / T196) */}
              <KedaBindingCard componentId={component.id} />

              {/* Elastic Stack log pipeline (FARM-S334 / FARM-S335 / Phase 31) */}
              {component.namespace && (
                <LogPipelineCard namespace={component.namespace} />
              )}

              {/* Cost estimate card (Phase 19 — FinOps) */}
              {costEstimate && (
                <CostEstimateCard estimate={costEstimate} />
              )}

              {/* Dependencies */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Dependencies
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {!component.dependencies ||
                  component.dependencies.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic py-2">
                      No dependencies declared.
                    </p>
                  ) : (
                    <div className="grid gap-2">
                      {component.dependencies.map((dep) => (
                        <Link
                          key={dep.id}
                          href={`/catalog/${dep.id}`}
                          className="flex items-center justify-between group rounded-lg border p-2 text-sm hover:bg-muted transition-all"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium group-hover:text-primary transition-colors">{dep.name}</span>
                            <span className="text-[10px] text-muted-foreground uppercase">{dep.kind}</span>
                          </div>
                          <ChevronLeft className="h-4 w-4 rotate-180 text-muted-foreground" />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Identifiers */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    Identifiers
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Component UUID</span>
                    <p className="font-mono text-[11px] bg-muted/50 p-2 rounded border break-all select-all">{component.id}</p>
                  </div>
                  {component.teamId && (
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">Owner Team UUID</span>
                      <p className="font-mono text-[11px] bg-muted/50 p-2 rounded border break-all select-all">{component.teamId}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── Helm tab ──────────────────────────────────────────────────── */}
        <TabsContent value="helm">
          <ErrorBoundary>
            {component.helmChart ? (
              <HelmChartCard helmChart={component.helmChart} />
            ) : (
              <div className="py-16 text-center border rounded-xl bg-muted/20">
                <p className="text-sm font-medium text-muted-foreground">
                  No Helm chart configuration found for this component.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Add a Helm chart definition when editing the component.
                </p>
              </div>
            )}
          </ErrorBoundary>
        </TabsContent>

        {/* ── CRDs tab ──────────────────────────────────────────────────── */}
        <TabsContent value="crds">
          <ErrorBoundary>
            <CRDResourcesTab />
          </ErrorBoundary>
        </TabsContent>

        {/* ── CI/CD tab ─────────────────────────────────────────────────── */}
        <TabsContent value="cicd">
          <ErrorBoundary>
            <CICDTab component={component} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Cloud tab ─────────────────────────────────────────────────── */}
        <TabsContent value="cloud">
          <ErrorBoundary>
            <CloudResourcesTab
              componentId={component.id}
              componentName={component.name}
            />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Violations tab ────────────────────────────────────────────── */}
        <TabsContent value="violations">
          <ErrorBoundary>
            <ViolationsTab component={component} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Kyverno tab ───────────────────────────────────────────────── */}
        <TabsContent value="kyverno">
          <ErrorBoundary>
            <KyvernoPolicyTab component={component} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Istio tabs (FARM-E42) ──────────────────────────────────────── */}
        <TabsContent value="istio-traffic">
          <ErrorBoundary>
            <IstioTrafficTab component={component} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="istio-security">
          <ErrorBoundary>
            <IstioSecurityTab component={component} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="istio-canary">
          <ErrorBoundary>
            <IstioCanaryTab component={component} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Linkerd tabs (Phase 20) ────────────────────────────────────── */}
        {linkerdStatus?.installed && (
          <>
            <TabsContent value="linkerd-traffic">
              <ErrorBoundary>
                <LinkerdTrafficTab component={component} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="linkerd-security">
              <ErrorBoundary>
                <LinkerdSecurityTab component={component} />
              </ErrorBoundary>
            </TabsContent>
            <TabsContent value="linkerd-profile">
              <ErrorBoundary>
                <LinkerdServiceProfileTab component={component} />
              </ErrorBoundary>
            </TabsContent>
          </>
        )}

        {/* ── Gatekeeper tab (Phase 21) ─────────────────────────────── */}
        {gatekeeperEnabled && (
          <TabsContent value="gatekeeper">
            <ErrorBoundary>
              <ConstraintTemplateTable />
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* ── OPA tab (Phase 21) ────────────────────────────────────── */}
        {opaReachable && (
          <TabsContent value="opa">
            <ErrorBoundary>
              <OpaEvaluationPanel component={component} />
            </ErrorBoundary>
          </TabsContent>
        )}

        {/* ── API Specs tab (FARM-E47) ───────────────────────────────────── */}
        <TabsContent value="api-specs">
          <ErrorBoundary>
            <ApiSpecsTab componentId={component.id} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Gateway Routes tab (FARM-E48) ─────────────────────────────── */}
        <TabsContent value="gateway">
          <ErrorBoundary>
            {/*
             * isAdmin: No role context is available on this page for other tabs either.
             * Defaulting to false to keep the admin actions (Sync, Health Check) hidden
             * until a proper auth/role context is threaded through. Set to true during
             * local development to test the admin UI.
             */}
            <GatewayRoutesTab componentId={component.id} isAdmin={false} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Operators tab (Phase 16) ──────────────────────────────────── */}
        <TabsContent value="operators">
          <ErrorBoundary>
            <OperatorsTab component={component} />
          </ErrorBoundary>
        </TabsContent>

        {/* ── Container Security tab ──────────────────────────────────── */}
        <TabsContent value="container-security">
          <ErrorBoundary>
            <ContainerSecurityTab component={component} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="iac-modules">
          <ErrorBoundary>
            <IacModulesTab component={component} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="iac-stacks">
          <ErrorBoundary>
            <IacStacksTab component={component} />
          </ErrorBoundary>
        </TabsContent>
        <TabsContent value="elasticsearch">
          <ErrorBoundary>
            <ElasticsearchIndicesTab componentId={component.id} />
          </ErrorBoundary>
        </TabsContent>
      </Tabs>
    </div>
  );
}

