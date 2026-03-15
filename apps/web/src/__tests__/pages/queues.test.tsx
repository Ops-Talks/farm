import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockListQueues = vi.fn();
vi.mock("@/lib/api-client", () => ({
  queues: { list: () => mockListQueues() },
}));

vi.mock("@/lib/ws-client", () => ({
  subscribe: vi.fn(() => vi.fn()),
  FarmEvent: {
    COMPONENT_CREATED: "component.created",
    DEPLOYMENT_CREATED: "deployment.created",
  },
}));

import QueuesPage from "@/app/(protected)/queues/page";

const mockQueue = (overrides: Record<string, unknown> = {}) => ({
  name: "catalog-discovery",
  isPaused: false,
  jobCounts: { active: 2, waiting: 1, completed: 100, failed: 3, delayed: 0 },
  ...overrides,
});

describe("QueuesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render heading and Bull Board link", async () => {
    mockListQueues.mockResolvedValue([mockQueue()]);
    render(<QueuesPage />);

    await waitFor(() => {
      expect(screen.getByText("Queues")).toBeInTheDocument();
    });
    expect(screen.getByText("Open Bull Board")).toBeInTheDocument();
  });

  it("should display queue cards with job counts", async () => {
    mockListQueues.mockResolvedValue([mockQueue()]);
    render(<QueuesPage />);

    await waitFor(() => {
      expect(screen.getByText("catalog-discovery")).toBeInTheDocument();
    });
    expect(screen.getByText("2")).toBeInTheDocument(); // active
    expect(screen.getByText("1")).toBeInTheDocument(); // waiting
    expect(screen.getByText("100")).toBeInTheDocument(); // completed
    expect(screen.getByText("3")).toBeInTheDocument(); // failed
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Waiting")).toBeInTheDocument();
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("Delayed")).toBeInTheDocument();
    expect(screen.getByText("106 total")).toBeInTheDocument();
  });

  it("should show paused badge for paused queues", async () => {
    mockListQueues.mockResolvedValue([mockQueue({ isPaused: true })]);
    render(<QueuesPage />);

    await waitFor(() => {
      expect(screen.getByText("Paused")).toBeInTheDocument();
    });
  });

  it("should show empty state when no queues", async () => {
    mockListQueues.mockResolvedValue([]);
    render(<QueuesPage />);

    await waitFor(() => {
      expect(screen.getByText(/No queues registered/)).toBeInTheDocument();
    });
  });

  it("should show error message on API failure", async () => {
    mockListQueues.mockRejectedValue(new Error("Redis unavailable"));
    render(<QueuesPage />);

    await waitFor(() => {
      expect(screen.getByText("Redis unavailable")).toBeInTheDocument();
    });
  });

  it("should render View Jobs button", async () => {
    mockListQueues.mockResolvedValue([mockQueue()]);
    render(<QueuesPage />);

    await waitFor(() => {
      expect(screen.getByText("View Jobs")).toBeInTheDocument();
    });
  });
});
