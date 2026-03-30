import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const mockList = vi.fn();

vi.mock("@/lib/api-client", () => ({
  serviceTemplates: {
    list: (...args: unknown[]) => mockList(...args),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
    scaffold: vi.fn(),
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

import TemplatesPage, { metadata } from "./page";

describe("TemplatesPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the Service Templates heading", async () => {
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(screen.getByText("Service Templates")).toBeInTheDocument();
    });
  });

  it("renders the Create Template button for admin users", async () => {
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<TemplatesPage />);

    await waitFor(() => {
      expect(
        screen.getAllByText("Create Template").length,
      ).toBeGreaterThanOrEqual(1);
    });
  });

  it("exports metadata with correct title", () => {
    expect(TemplatesPage).toBeDefined();
    expect(metadata).toEqual({ title: "Service Templates" });
  });
});
