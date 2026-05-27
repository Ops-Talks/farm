import type { Metadata } from "next";
import { HealthPanel } from "@/components/dashboard/health-panel";
import { QuickStats } from "@/components/dashboard/quick-stats";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { QueuePanel } from "@/components/dashboard/queue-panel";
import { RecentPipelinesWidget } from "./_components/recent-pipelines-widget";
import { SetupChecklistCard } from "@/components/dashboard/setup-checklist-card";
import { IntegrationHealthCard } from "@/components/dashboard/integration-health-card";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "System overview and health status",
};

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          System overview and health status
        </p>
      </div>

      {/* Setup checklist (shown when items pending) */}
      <SetupChecklistCard />

      {/* Quick stats */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Overview
        </h2>
        <QuickStats />
      </section>

      {/* System health and integration health side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            System Health
          </h2>
          <HealthPanel />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Integrations
          </h2>
          <IntegrationHealthCard />
        </section>
      </div>

      {/* Activity feed and queue panel side by side */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Live Activity
          </h2>
          <ActivityFeed />
        </section>
        <section>
          <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Queues
          </h2>
          <QueuePanel />
        </section>
      </div>

      {/* Recent pipelines widget */}
      <section>
        <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
          Pipelines
        </h2>
        <RecentPipelinesWidget />
      </section>
    </div>
  );
}
