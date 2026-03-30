import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockList = vi.fn();

vi.mock("@/lib/api-client", () => ({
  environmentRequests: {
    list: (...args: unknown[]) => mockList(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    approve: vi.fn(),
    reject: vi.fn(),
    expire: vi.fn(),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { id: "user-1", username: "testuser", roles: ["admin"] },
    hasRole: () => true,
  }),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

import EnvRequestsPage, { metadata } from "./page";

describe("EnvRequestsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Environment Requests heading", async () => {
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsPage />);

    await waitFor(() => {
      expect(screen.getByText("Environment Requests")).toBeInTheDocument();
    });
  });

  it("renders the Request Environment button", async () => {
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<EnvRequestsPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Request Environment").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("exports metadata with correct title", () => {
    expect(EnvRequestsPage).toBeDefined();
    expect(metadata).toEqual({ title: "Environment Requests" });
  });
});
