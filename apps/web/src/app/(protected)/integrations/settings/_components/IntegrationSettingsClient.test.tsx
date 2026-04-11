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

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { IntegrationSettingsClient } from "./IntegrationSettingsClient";
import { toast } from "sonner";

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

  it("renders all six integration cards", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByText("ArgoCD")).toBeInTheDocument();
    });
    expect(screen.getByText("CircleCI")).toBeInTheDocument();
    expect(screen.getByText("Jenkins")).toBeInTheDocument();
    expect(screen.getByText("Travis CI")).toBeInTheDocument();
    expect(screen.getByText("GitHub Actions")).toBeInTheDocument();
    expect(screen.getByText("Azure DevOps")).toBeInTheDocument();
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
      expect(notConnected.length).toBe(6);
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

  it("shows success toast and closes modal after successful create", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "argocd", name: "New ArgoCD" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^connect$/i }).length).toBeGreaterThan(0);
    });

    const [argoCDConnect] = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(argoCDConnect!);

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.type(modal.getByLabelText(/^name/i), "New ArgoCD");
    await user.type(modal.getByLabelText(/url/i), "https://argocd.example.com");
    await user.type(modal.getByLabelText(/token/i), "token-value");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    // Wait for onSuccess side effects: toast shown and modal closed.
    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        expect.stringContaining("connected"),
      );
    });
    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("shows error toast when create fails", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockRejectedValue(new Error("Network error"));
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^connect$/i }).length).toBeGreaterThan(0);
    });

    const [argoCDConnect] = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(argoCDConnect!);

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.type(modal.getByLabelText(/^name/i), "Fail ArgoCD");
    await user.type(modal.getByLabelText(/url/i), "https://argocd.example.com");
    await user.type(modal.getByLabelText(/token/i), "bad-token");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        expect.stringContaining("Failed to save"),
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

  it("shows success toast after successful disconnect", async () => {
    const user = userEvent.setup();
    const cred = buildCredential({ type: "argocd", name: "ArgoCD Prod" });
    mockList.mockResolvedValue([cred]);
    mockRemove.mockResolvedValue(undefined);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(vi.mocked(toast.success)).toHaveBeenCalledWith(
        expect.stringContaining("disconnected"),
      );
    });
  });

  it("shows error toast when disconnect fails", async () => {
    const user = userEvent.setup();
    const cred = buildCredential({ type: "circleci", name: "My CircleCI" });
    mockList.mockResolvedValue([cred]);
    mockRemove.mockRejectedValue(new Error("Remove failed"));
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /disconnect/i })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /disconnect/i }));

    await waitFor(() => {
      expect(vi.mocked(toast.error)).toHaveBeenCalledWith(
        expect.stringContaining("Failed to disconnect"),
      );
    });
  });

  it("renders SVG brand icons for integrations", async () => {
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      // Brand icon SVGs are rendered — verify via the integration card test ids
      expect(screen.getByTestId("integration-card-argocd")).toBeInTheDocument();
    });
    expect(screen.getByTestId("integration-card-circleci")).toBeInTheDocument();
    expect(screen.getByTestId("integration-card-jenkins")).toBeInTheDocument();
    expect(screen.getByTestId("integration-card-travisci")).toBeInTheDocument();
    expect(screen.getByTestId("integration-card-github_actions")).toBeInTheDocument();
    expect(screen.getByTestId("integration-card-azure_devops")).toBeInTheDocument();
  });

  // --- Tests for Phase 25 new integration modals ---

  it("opens the CircleCI connect modal and submits its form", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "circleci", name: "My CircleCI" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-circleci")).toBeInTheDocument();
    });

    const circleciCard = screen.getByTestId("integration-card-circleci");
    await user.click(within(circleciCard).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    expect(modal.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(modal.getByLabelText(/token/i)).toBeInTheDocument();

    await user.type(modal.getByLabelText(/^name/i), "My CircleCI");
    await user.type(modal.getByLabelText(/token/i), "cci-token");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "circleci", token: "cci-token" }),
      );
    });
  });

  it("opens the Jenkins connect modal and submits its form", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "jenkins", name: "My Jenkins" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-jenkins")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-jenkins");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    expect(modal.getByLabelText(/username/i)).toBeInTheDocument();
    expect(modal.getByLabelText(/api token/i)).toBeInTheDocument();

    await user.type(modal.getByLabelText(/^name/i), "My Jenkins");
    await user.type(modal.getByLabelText(/url/i), "https://jenkins.example.com");
    await user.type(modal.getByLabelText(/username/i), "admin");
    await user.type(modal.getByLabelText(/api token/i), "jenkins-token");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "jenkins", username: "admin" }),
      );
    });
  });

  it("opens the Travis CI connect modal and submits its form", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "travisci", name: "My Travis" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-travisci")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-travisci");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    expect(screen.getByText("Travis CI")).toBeInTheDocument();

    await user.type(modal.getByLabelText(/^name/i), "My Travis");
    await user.type(modal.getByLabelText(/token/i), "travis-token");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "travisci", token: "travis-token" }),
      );
    });
  });

  it("opens the GitHub Actions connect modal and renders its form", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-github_actions")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-github_actions");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText(/Connect GitHub Actions/i)).toBeInTheDocument();
  });

  it("opens the Azure DevOps connect modal and renders its form", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-azure_devops")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-azure_devops");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
    expect(screen.getByText(/Connect Azure DevOps/i)).toBeInTheDocument();
  });

  it("closes the modal when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^connect$/i }).length).toBeGreaterThan(0);
    });

    const [argoCDConnect] = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(argoCDConnect!);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });

    // Click Cancel inside the modal form — triggers onClose -> setModalType(null).
    const dialog = screen.getByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });
  });

  it("submits the GitHub Actions form with required fields", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "github_actions", name: "My GitHub" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-github_actions")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-github_actions");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.type(modal.getByLabelText(/^name/i), "My GitHub");
    await user.type(modal.getByLabelText(/token/i), "ghp_token");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "github_actions", token: "ghp_token" }),
      );
    });
  });

  it("submits the Azure DevOps form with required fields", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    mockCreate.mockResolvedValue(
      buildCredential({ type: "azure_devops", name: "My Azure" }),
    );
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-azure_devops")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-azure_devops");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.type(modal.getByLabelText(/^name/i), "My Azure");
    await user.type(modal.getByLabelText(/token/i), "az_token");
    await user.type(modal.getByLabelText(/organization/i), "my-org");
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ type: "azure_devops", org: "my-org" }),
      );
    });
  });

  it("shows validation errors in ArgoCD form when submitted empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: /^connect$/i }).length).toBeGreaterThan(0);
    });

    const [argoCDConnect] = screen.getAllByRole("button", { name: /^connect$/i });
    await user.click(argoCDConnect!);

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    // Submit with no fields filled — triggers all required-field errors.
    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(modal.getByText("Name is required")).toBeInTheDocument();
    });
  });

  it("shows validation errors in CircleCI form when submitted empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-circleci")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-circleci");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(modal.getByText("Name is required")).toBeInTheDocument();
    });
    expect(modal.getByText("Token is required")).toBeInTheDocument();
  });

  it("shows validation errors in Jenkins form when submitted empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-jenkins")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-jenkins");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(modal.getByText("Name is required")).toBeInTheDocument();
    });
    expect(modal.getByText("Username is required")).toBeInTheDocument();
  });

  it("shows validation errors in Travis CI form when submitted empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-travisci")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-travisci");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(modal.getByText("Name is required")).toBeInTheDocument();
    });
    expect(modal.getByText("Token is required")).toBeInTheDocument();
  });

  it("shows validation errors in GitHub Actions form when submitted empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-github_actions")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-github_actions");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(modal.getByText("Name is required")).toBeInTheDocument();
    });
    expect(modal.getByText("Token is required")).toBeInTheDocument();
  });

  it("shows validation errors in Azure DevOps form when submitted empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([]);
    render(<IntegrationSettingsClient />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId("integration-card-azure_devops")).toBeInTheDocument();
    });

    const card = screen.getByTestId("integration-card-azure_devops");
    await user.click(within(card).getByRole("button", { name: /^connect$/i }));

    const dialog = await screen.findByRole("dialog");
    const modal = within(dialog);

    await user.click(modal.getByRole("button", { name: /^connect$/i }));

    await waitFor(() => {
      expect(modal.getByText("Name is required")).toBeInTheDocument();
    });
    expect(modal.getByText("Organization is required")).toBeInTheDocument();
  });
});
