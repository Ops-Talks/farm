import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { IntegrationCredential } from "@/types/api";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockRemove = vi.fn();

vi.mock("@/lib/api-client", () => ({
  integrations: {
    credentials: {
      list: (...args: unknown[]) => mockList(...args),
      create: (...args: unknown[]) => mockCreate(...args),
      update: vi.fn(),
      remove: (...args: unknown[]) => mockRemove(...args),
    },
  },
}));

import { IntegrationSettingsClient } from "./IntegrationSettingsClient";

// ── Helpers ───────────────────────────────────────────────────────────────────

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

function buildCredential(
  overrides: Partial<IntegrationCredential> = {},
): IntegrationCredential {
  return {
    id: "cred-1",
    orgId: "org-1",
    type: "argocd",
    name: "Production ArgoCD",
    createdAt: "2024-01-15T10:00:00Z",
    updatedAt: "2024-01-15T10:00:00Z",
    ...overrides,
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("IntegrationSettingsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all four integration cards", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("ArgoCD")).toBeInTheDocument();
    });
    expect(screen.getByText("CircleCI")).toBeInTheDocument();
    expect(screen.getByText("Jenkins")).toBeInTheDocument();
    expect(screen.getByText("Travis CI")).toBeInTheDocument();
  });

  it("renders the page heading", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Integration Settings")).toBeInTheDocument();
    });
  });

  it("shows Not Connected status when credentials list is empty", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const notConnected = screen.getAllByText("Not Connected");
      expect(notConnected.length).toBe(4);
    });
  });

  it("shows Connected status for matched credential type", async () => {
    mockList.mockResolvedValue([buildCredential({ type: "argocd", name: "My ArgoCD" })]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("Connected")).toBeInTheDocument();
    });
    expect(screen.getByText("My ArgoCD")).toBeInTheDocument();
  });

  it("renders Connect button for unconnected integrations", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      const connectButtons = screen.getAllByRole("button", { name: /connect/i });
      // 4 Connect buttons (one per integration card)
      expect(connectButtons.length).toBeGreaterThanOrEqual(4);
    });
  });

  it("renders Disconnect button for connected integration", async () => {
    mockList.mockResolvedValue([buildCredential({ type: "circleci", name: "My CircleCI" })]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });
  });

  it("opens the connect modal when Connect button is clicked", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    // Wait for cards to be rendered
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /connect/i }).length).toBeGreaterThan(0);
    });

    // Click the first Connect button (ArgoCD)
    const connectButtons = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(connectButtons[0]!);

    // Modal should appear
    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("shows ArgoCD-specific form fields in connect modal", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^connect$/i }).length).toBeGreaterThan(0);
    });

    // Click ArgoCD Connect (first card)
    const [argoCDConnect] = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(argoCDConnect!);

    await waitFor(() => {
      expect(screen.getByLabelText(/url/i)).toBeInTheDocument();
    });
    expect(screen.getByLabelText(/token/i)).toBeInTheDocument();
  });

  it("calls credentials.create when connect form is submitted", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "argocd", name: "Test ArgoCD" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^connect$/i }).length).toBeGreaterThan(0);
    });

    const [argoCDConnect] = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(argoCDConnect!);

    // Wait for modal to appear
    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    // Fill form fields inside the modal
    await user.type(modal.getByLabelText(/^name/i), "Test ArgoCD");
    await user.type(modal.getByLabelText(/url/i), "https://argocd.example.com");
    await user.type(modal.getByLabelText(/token/i), "my-secret-token");

    // Submit via the modal's submit button (type="submit")
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "argocd",
          name: "Test ArgoCD",
          url: "https://argocd.example.com",
          token: "my-secret-token",
        }),
      );
    });
  });

  it("calls credentials.remove when disconnect is clicked", async () => {
    const user = userEvent.setup();
    const cred = buildCredential({ type: "jenkins", name: "My Jenkins" });
    mockList.mockResolvedValue([cred]);
    mockRemove.mockResolvedValue(undefined);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith(cred.id);
    });
  });

  it("renders integration icons/emojis", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("🔄")).toBeInTheDocument();
    });
    expect(screen.getByText("⭕")).toBeInTheDocument();
    expect(screen.getByText("🤖")).toBeInTheDocument();
    expect(screen.getByText("🔵")).toBeInTheDocument();
  });
});
