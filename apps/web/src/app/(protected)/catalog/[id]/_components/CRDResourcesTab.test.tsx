import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { KubernetesCRD } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockListCRDs = vi.fn();

vi.mock("@/lib/api-client", () => ({
  kubernetes: {
    listCRDs: (...args: unknown[]) => mockListCRDs(...args),
  },
}));

import { CRDResourcesTab } from "./CRDResourcesTab";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildCRD(overrides: Partial<KubernetesCRD> = {}): KubernetesCRD {
  return {
    name: "crontabs.stable.example.com",
    group: "stable.example.com",
    version: "v1",
    scope: "Namespaced",
    kind: "CronTab",
    displayTemplate: "Example Operator",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("CRDResourcesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows the empty state when there are no CRDs", async () => {
    mockListCRDs.mockResolvedValue([]);
    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("No Custom Resources discovered.")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Ensure your cluster has Operators installed/i),
    ).toBeInTheDocument();
  });

  it("renders a table row for each discovered CRD", async () => {
    mockListCRDs.mockResolvedValue([
      buildCRD({ kind: "CronTab", group: "stable.example.com" }),
      buildCRD({
        name: "foos.samplecontroller.k8s.io",
        kind: "Foo",
        group: "samplecontroller.k8s.io",
        displayTemplate: "Sample Controller",
      }),
    ]);

    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("CronTab")).toBeInTheDocument();
    });
    expect(screen.getByText("Foo")).toBeInTheDocument();
  });

  it("groups CRDs by displayTemplate with section headers", async () => {
    mockListCRDs.mockResolvedValue([
      buildCRD({ displayTemplate: "Operator A", kind: "Alpha" }),
      buildCRD({
        name: "betas.b.com",
        displayTemplate: "Operator B",
        kind: "Beta",
        group: "b.com",
      }),
    ]);

    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Operator A appears in both the section <h3> and the table cell,
      // so use getAllByText to handle multiple matches.
      expect(screen.getAllByText("Operator A").length).toBeGreaterThanOrEqual(1);
    });
    expect(screen.getAllByText("Operator B").length).toBeGreaterThanOrEqual(1);
  });

  it("filters CRDs by kind", async () => {
    mockListCRDs.mockResolvedValue([
      buildCRD({ kind: "CronTab", group: "stable.example.com" }),
      buildCRD({
        name: "foos.other.io",
        kind: "Foo",
        group: "other.io",
        displayTemplate: "Other",
      }),
    ]);

    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("CronTab")).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText("Filter by kind or group...");
    await userEvent.type(filterInput, "cron");

    expect(screen.getByText("CronTab")).toBeInTheDocument();
    expect(screen.queryByText("Foo")).not.toBeInTheDocument();
  });

  it("filters CRDs by group", async () => {
    mockListCRDs.mockResolvedValue([
      buildCRD({ kind: "CronTab", group: "stable.example.com" }),
      buildCRD({
        name: "foos.other.io",
        kind: "Foo",
        group: "other.io",
        displayTemplate: "Other",
      }),
    ]);

    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("CronTab")).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText("Filter by kind or group...");
    await userEvent.type(filterInput, "other.io");

    expect(screen.queryByText("CronTab")).not.toBeInTheDocument();
    expect(screen.getByText("Foo")).toBeInTheDocument();
  });

  it("shows empty state when filter matches nothing", async () => {
    mockListCRDs.mockResolvedValue([buildCRD()]);

    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("CronTab")).toBeInTheDocument();
    });

    const filterInput = screen.getByPlaceholderText("Filter by kind or group...");
    await userEvent.type(filterInput, "zzznomatch");

    await waitFor(() => {
      expect(screen.getByText("No Custom Resources discovered.")).toBeInTheDocument();
    });
  });

  it("renders table column headers", async () => {
    mockListCRDs.mockResolvedValue([buildCRD()]);

    render(<CRDResourcesTab />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Kind")).toBeInTheDocument();
    });
    expect(screen.getByText("Group")).toBeInTheDocument();
    expect(screen.getByText("Operator")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("Scope")).toBeInTheDocument();
  });
});
