"use client";

// CICDTab — shows CI/CD status from ArgoCD, CircleCI, Jenkins and Travis CI
// for the current catalog component.

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { argocd, circleci, jenkins, travisci } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";
import type {
  ArgoCDApplication,
  CatalogComponent,
  CircleCIPipeline,
  JenkinsJob,
  TravisBuild,
} from "@/types/api";

// ---------------------------------------------------------------------------
// Badge helpers — use Tailwind colour classes, not the Badge component, so we
// can easily apply specific colour semantics per status value.
// ---------------------------------------------------------------------------

function healthBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "healthy")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {status}
      </span>
    );
  if (s === "degraded")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        {status}
      </span>
    );
  if (s === "progressing")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
        {status}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {status || "Unknown"}
    </span>
  );
}

function syncBadge(status: string) {
  const s = status.toLowerCase();
  if (s === "synced")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {status}
      </span>
    );
  if (s === "outofsync")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-orange-100 text-orange-800">
        {status}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {status || "Unknown"}
    </span>
  );
}

function ciStateBadge(state: string) {
  const s = (state ?? "").toLowerCase();
  if (s === "success" || s === "passed")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {state}
      </span>
    );
  if (s === "failed" || s === "errored")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        {state}
      </span>
    );
  if (s === "started" || s === "running" || s === "created")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
        {state}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {state || "Unknown"}
    </span>
  );
}

function jenkinsBadge(result: string | null | undefined) {
  if (!result)
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
        —
      </span>
    );
  const r = result.toUpperCase();
  if (r === "SUCCESS")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800">
        {result}
      </span>
    );
  if (r === "FAILURE")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800">
        {result}
      </span>
    );
  if (r === "UNSTABLE")
    return (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-yellow-100 text-yellow-800">
        {result}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600">
      {result}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

function SectionSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptySection({ message }: { message: string }) {
  return (
    <div className="py-8 text-center border rounded-xl bg-muted/20">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Section header
// ---------------------------------------------------------------------------

function SectionHeader({ title }: { title: string }) {
  return (
    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
      {title}
    </h3>
  );
}

// ---------------------------------------------------------------------------
// ArgoCD section
// ---------------------------------------------------------------------------

function ArgoCDSection({
  argocdApp,
  isAdmin,
}: {
  argocdApp?: string;
  isAdmin: boolean;
}) {
  const queryClient = useQueryClient();

  const { data: apps = [], isPending } = useQuery({
    queryKey: ["argocd-applications", argocdApp],
    queryFn: () => argocd.listApplications(),
  });

  const syncMutation = useMutation({
    mutationFn: (name: string) => argocd.syncApplication(name),
    onSuccess: () => {
      toast.success("ArgoCD sync triggered");
      void queryClient.invalidateQueries({ queryKey: ["argocd-applications"] });
    },
    onError: () => toast.error("Failed to trigger sync"),
  });

  // Filter by argocdApp name if provided
  const filtered = argocdApp
    ? apps.filter((a) => a.name === argocdApp)
    : apps;

  return (
    <div>
      <SectionHeader title="ArgoCD" />
      {isPending ? (
        <SectionSkeleton />
      ) : filtered.length === 0 ? (
        <EmptySection message="No ArgoCD applications found for this component." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Application</TableHead>
              <TableHead>Health</TableHead>
              <TableHead>Sync Status</TableHead>
              <TableHead>Repo</TableHead>
              {isAdmin && <TableHead>Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((app: ArgoCDApplication) => (
              <TableRow key={app.name}>
                <TableCell className="font-medium">{app.name}</TableCell>
                <TableCell>{healthBadge(app.status.health.status)}</TableCell>
                <TableCell>{syncBadge(app.status.sync.status)}</TableCell>
                <TableCell className="text-xs text-muted-foreground font-mono truncate max-w-[200px]">
                  {app.spec.source.repoURL}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => syncMutation.mutate(app.name)}
                      disabled={syncMutation.isPending}
                    >
                      Sync
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// CircleCI section
// ---------------------------------------------------------------------------

function CircleCISection({ vcsUrl }: { vcsUrl?: string }) {
  const { data: pipelines = [], isPending } = useQuery({
    queryKey: ["circleci-pipelines", vcsUrl],
    queryFn: () => circleci.listPipelines(vcsUrl),
  });

  return (
    <div>
      <SectionHeader title="CircleCI" />
      {isPending ? (
        <SectionSkeleton />
      ) : pipelines.length === 0 ? (
        <EmptySection message="No CircleCI pipelines found for this component." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Project</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pipelines.map((p: CircleCIPipeline) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-xs">{p.number}</TableCell>
                <TableCell className="font-mono text-xs">{p.project_slug}</TableCell>
                <TableCell>{ciStateBadge(p.state)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{p.trigger.type}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {new Date(p.updated_at).toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Jenkins section
// ---------------------------------------------------------------------------

function JenkinsSection() {
  const { data: jobs = [], isPending } = useQuery({
    queryKey: ["jenkins-jobs"],
    queryFn: () => jenkins.listJobs(),
  });

  return (
    <div>
      <SectionHeader title="Jenkins" />
      {isPending ? (
        <SectionSkeleton />
      ) : jobs.length === 0 ? (
        <EmptySection message="No Jenkins jobs found." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Job</TableHead>
              <TableHead>Last Build</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Duration</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobs.map((job: JenkinsJob) => (
              <TableRow key={job.name}>
                <TableCell className="font-medium">{job.name}</TableCell>
                <TableCell className="font-mono text-xs">
                  {job.lastBuild ? `#${job.lastBuild.number}` : "—"}
                </TableCell>
                <TableCell>{jenkinsBadge(job.lastBuild?.result)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {job.lastBuild
                    ? `${(job.lastBuild.duration / 1000).toFixed(1)}s`
                    : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Travis CI section
// ---------------------------------------------------------------------------

function TravisCISection({ vcsUrl }: { vcsUrl?: string }) {
  const { data: builds = [], isPending } = useQuery({
    queryKey: ["travisci-builds", vcsUrl],
    queryFn: () => travisci.listBuilds(vcsUrl),
  });

  return (
    <div>
      <SectionHeader title="Travis CI" />
      {isPending ? (
        <SectionSkeleton />
      ) : builds.length === 0 ? (
        <EmptySection message="No Travis CI builds found for this component." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>#</TableHead>
              <TableHead>Repository</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Started</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {builds.map((b: TravisBuild) => (
              <TableRow key={b.id}>
                <TableCell className="font-mono text-xs">{b.number}</TableCell>
                <TableCell className="font-mono text-xs">{b.repository.slug}</TableCell>
                <TableCell>{ciStateBadge(b.state)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{b.branch.name}</TableCell>
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  {b.started_at ? new Date(b.started_at).toLocaleString() : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------

interface CICDTabProps {
  component: CatalogComponent;
}

export function CICDTab({ component }: CICDTabProps) {
  const { hasRole } = useAuth();
  const isAdmin = hasRole("admin");

  return (
    <div className="space-y-8">
      <ArgoCDSection argocdApp={component.argocdApp} isAdmin={isAdmin} />
      <CircleCISection vcsUrl={component.vcsUrl ?? component.repositoryUrl} />
      <JenkinsSection />
      <TravisCISection vcsUrl={component.vcsUrl ?? component.repositoryUrl} />
    </div>
  );
}
