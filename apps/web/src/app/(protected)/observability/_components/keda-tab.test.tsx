import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { KedaInstallStatus, KedaScaledObject, KedaScaledJob } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// Sheet from radix needs a portal target — provide a minimal stub.
vi.mock("@/components/ui/sheet", () => ({
  Sheet: ({
    open,
    children,
  }: {
    open: boolean;
    onOpenChange: (v: boolean) => void;
    children: React.ReactNode;
  }) => (open ? <div data-testid="sheet">{children}</div> : null),
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-header">{children}</div>
  ),
  SheetTitle: ({ children }: { children: React.ReactNode }) => (
    <h2 data-testid="sheet-title">{children}</h2>
  ),
}));

import { KedaTab } from "./keda-tab";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const installedStatus: KedaInstallStatus = {
  installed: true,
  version: "2.14.0",
};

const notInstalledStatus: KedaInstallStatus = {
  installed: false,
  version: "",
};

function makeScaledObject(overrides: Partial<KedaScaledObject> = {}): KedaScaledObject {
  return {
    name: "worker-scaler",
    namespace: "default",
    targetName: "worker",
    targetKind: "Deployment",
    minReplicaCount: 0,
    maxReplicaCount: 10,
    ready: true,
    active: true,
    paused: false,
    triggers: [{ type: "rabbitmq", metadata: { queueName: "tasks", queueLength: "5" } }],
    conditions: [],
    ...overrides,
  };
}

function makeScaledJob(overrides: Partial<KedaScaledJob> = {}): KedaScaledJob {
  return {
    name: "batch-job-scaler",
    namespace: "jobs",
    jobTemplateName: "batch-job",
    minReplicaCount: 0,
    maxReplicaCount: 20,
    ready: true,
    triggers: [{ type: "kafka", metadata: { topic: "events" } }],
    conditions: [],
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("KedaTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeleton placeholders when status is null", () => {
    const { container } = render(
      <KedaTab status={null} scaledObjects={[]} scaledJobs={[]} />,
    );
    // Skeletons should be rendered; real content should not be present.
    expect(screen.queryByText("KEDA Autoscaling")).not.toBeInTheDocument();
    // At least one skeleton div should be in the container.
    const skeletons = container.querySelectorAll("[class*='skeleton'], .animate-pulse, div");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("shows 'Not Installed' badge when installed is false", () => {
    render(
      <KedaTab
        status={notInstalledStatus}
        scaledObjects={[]}
        scaledJobs={[]}
      />,
    );
    expect(screen.getByText("Not Installed")).toBeInTheDocument();
  });

  it("shows 'Installed' badge when installed is true", () => {
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[]}
        scaledJobs={[]}
      />,
    );
    expect(screen.getByText("Installed")).toBeInTheDocument();
  });

  it("shows ScaledObjects tab with items by default", () => {
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[makeScaledObject()]}
        scaledJobs={[]}
      />,
    );
    // The ScaledObjects tab is active by default.
    expect(screen.getByText("worker-scaler")).toBeInTheDocument();
    expect(screen.getByText("default")).toBeInTheDocument();
  });

  it("renders 'Active' badge for active ScaledObject", () => {
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[makeScaledObject({ active: true, paused: false })]}
        scaledJobs={[]}
      />,
    );
    expect(screen.getByText("Active")).toBeInTheDocument();
  });

  it("renders 'Paused' badge for paused ScaledObject", () => {
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[makeScaledObject({ paused: true })]}
        scaledJobs={[]}
      />,
    );
    expect(screen.getByText("Paused")).toBeInTheDocument();
  });

  it("renders 'Idle' badge for inactive and unpaused ScaledObject", () => {
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[makeScaledObject({ active: false, paused: false })]}
        scaledJobs={[]}
      />,
    );
    expect(screen.getByText("Idle")).toBeInTheDocument();
  });

  it("shows ScaledJobs tab content when ScaledJobs tab is clicked", async () => {
    const user = userEvent.setup();
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[]}
        scaledJobs={[makeScaledJob()]}
      />,
    );

    await user.click(screen.getByText("ScaledJobs"));

    await waitFor(() => {
      expect(screen.getByText("batch-job-scaler")).toBeInTheDocument();
    });
    expect(screen.getByText("jobs")).toBeInTheDocument();
  });

  it("shows 'Ready' badge for ready ScaledJob", async () => {
    const user = userEvent.setup();
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[]}
        scaledJobs={[makeScaledJob({ ready: true })]}
      />,
    );

    await user.click(screen.getByText("ScaledJobs"));

    await waitFor(() => {
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });
  });

  it("opens detail sheet when a ScaledObject row is clicked", async () => {
    const user = userEvent.setup();
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[makeScaledObject()]}
        scaledJobs={[]}
      />,
    );

    const row = screen.getByTestId("scaled-object-row");
    await user.click(row);

    await waitFor(() => {
      expect(screen.getByTestId("sheet")).toBeInTheDocument();
    });
    // Sheet title should match the ScaledObject name.
    expect(screen.getByTestId("sheet-title")).toHaveTextContent("worker-scaler");
  });

  it("shows trigger type and metadata in the detail sheet", async () => {
    const user = userEvent.setup();
    render(
      <KedaTab
        status={installedStatus}
        scaledObjects={[
          makeScaledObject({
            triggers: [
              {
                type: "rabbitmq",
                metadata: { queueName: "tasks", queueLength: "5" },
              },
            ],
          }),
        ]}
        scaledJobs={[]}
      />,
    );

    await user.click(screen.getByTestId("scaled-object-row"));

    await waitFor(() => {
      expect(screen.getByTestId("sheet")).toBeInTheDocument();
    });
    // "rabbitmq" appears in both the row badge and the trigger detail inside the sheet.
    expect(screen.getAllByText("rabbitmq").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("queueName")).toBeInTheDocument();
    expect(screen.getByText("tasks")).toBeInTheDocument();
  });

  it("shows empty message when no ScaledObjects exist", () => {
    render(
      <KedaTab status={installedStatus} scaledObjects={[]} scaledJobs={[]} />,
    );
    expect(
      screen.getByText("No ScaledObjects found in this cluster."),
    ).toBeInTheDocument();
  });

  it("shows empty message when no ScaledJobs exist", async () => {
    const user = userEvent.setup();
    render(
      <KedaTab status={installedStatus} scaledObjects={[]} scaledJobs={[]} />,
    );

    await user.click(screen.getByText("ScaledJobs"));

    await waitFor(() => {
      expect(
        screen.getByText("No ScaledJobs found in this cluster."),
      ).toBeInTheDocument();
    });
  });
});
