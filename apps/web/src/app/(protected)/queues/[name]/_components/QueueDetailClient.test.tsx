import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockGetQueue = vi.fn();
const mockListJobs = vi.fn();
const mockRetryJob = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
  usePathname: () => "/queues/catalog-discovery",
  useParams: () => ({ name: "catalog-discovery" }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

vi.mock("@/lib/api-client", () => ({
  queues: {
    get: (...args: unknown[]) => mockGetQueue(...args),
    listJobs: (...args: unknown[]) => mockListJobs(...args),
    retryJob: (...args: unknown[]) => mockRetryJob(...args),
  },
}));

import { QueueDetailClient } from "@/app/(protected)/queues/[name]/_components/QueueDetailClient";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeQueueInfo = () => ({
  name: "catalog-discovery",
  isPaused: false,
  jobCounts: {
    active: 2,
    waiting: 1,
    completed: 100,
    failed: 3,
    delayed: 0,
    waiting_children: 0,
    prioritized: 0,
    paused: 0,
  },
});

const makeJob = (overrides = {}) => ({
  id: "job-1",
  name: "catalog-ingest",
  status: "completed",
  data: { repoUrl: "https://github.com/example/repo" },
  attemptsMade: 1,
  timestamp: Date.now() - 5000,
  processedOn: Date.now() - 4000,
  finishedOn: Date.now() - 3000,
  ...overrides,
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("QueueDetailClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders skeletons while loading", () => {
    mockGetQueue.mockReturnValue(new Promise(() => {}));
    mockListJobs.mockReturnValue(new Promise(() => {}));
    render(<QueueDetailClient />);
    // No queue name heading yet — only skeletons
    expect(screen.queryByText("catalog-discovery")).not.toBeInTheDocument();
  });

  it("renders the queue name after data loads", async () => {
    mockGetQueue.mockResolvedValue(makeQueueInfo());
    mockListJobs.mockResolvedValue([]);
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "catalog-discovery" })).toBeInTheDocument();
    });
  });

  it("renders the Bull Board link", async () => {
    mockGetQueue.mockResolvedValue(makeQueueInfo());
    mockListJobs.mockResolvedValue([]);
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Bull Board" })).toBeInTheDocument();
    });
  });

  it("renders Paused badge for paused queues", async () => {
    mockGetQueue.mockResolvedValue({ ...makeQueueInfo(), isPaused: true });
    mockListJobs.mockResolvedValue([]);
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Paused")).toBeInTheDocument();
    });
  });

  it("renders job count stats", async () => {
    mockGetQueue.mockResolvedValue(makeQueueInfo());
    mockListJobs.mockResolvedValue([]);
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("100")).toBeInTheDocument(); // completed
    });
    expect(screen.getByText("3")).toBeInTheDocument(); // failed
  });

  it("renders a job row in the job list", async () => {
    mockGetQueue.mockResolvedValue(makeQueueInfo());
    mockListJobs.mockResolvedValue([makeJob()]);
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("catalog-ingest")).toBeInTheDocument();
    });
  });

  it("shows error banner when API call fails", async () => {
    mockGetQueue.mockRejectedValue(new Error("Redis unavailable"));
    mockListJobs.mockRejectedValue(new Error("Redis unavailable"));
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByText("Redis unavailable")).toBeInTheDocument();
    });
  });

  it("changes status filter when a filter button is clicked", async () => {
    const user = userEvent.setup();
    mockGetQueue.mockResolvedValue(makeQueueInfo());
    mockListJobs.mockResolvedValue([]);
    render(<QueueDetailClient />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /failed/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /failed/i }));

    // After clicking, it triggers a re-fetch with the new status
    await waitFor(() => {
      expect(mockListJobs).toHaveBeenCalledWith(
        "catalog-discovery",
        expect.objectContaining({ status: "failed" }),
      );
    });
  });
});
