import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CreateUserDialog } from "./CreateUserDialog";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockCreate = vi.fn();
vi.mock("@/lib/api-client", () => ({
  ApiError: class ApiError extends Error {
    status: number;
    constructor(status: number, body: { message: string }) {
      super(body.message);
      this.status = status;
    }
  },
  userManagement: {
    create: (...a: unknown[]) => mockCreate(...a),
  },
}));

let mockHasRole = (_r: string) => true;
vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: (r: string) => mockHasRole(r) }),
}));

let mockOrgs: { id: string; name: string; slug: string }[] = [];
vi.mock("@/contexts/organization-context", () => ({
  useOrganization: () => ({ organizations: mockOrgs }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function renderDialog(
  open = true,
  onOpenChange = vi.fn(),
) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <CreateUserDialog open={open} onOpenChange={onOpenChange} />
    </QueryClientProvider>,
  );
}

const ORGS = [
  { id: "org_1", name: "Acme", slug: "acme" },
  { id: "org_2", name: "Beta", slug: "beta" },
];

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("CreateUserDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHasRole = (_r: string) => true; // platform admin by default
    mockOrgs = [];
  });

  // ── Rendering ────────────────────────────────────────────────────────────

  it("renders form fields when open", () => {
    renderDialog();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Display name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
  });

  it("does not render dialog content when closed", () => {
    renderDialog(false);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  // ── Submit button state ───────────────────────────────────────────────────

  it("submit button is disabled when all required fields are empty", () => {
    renderDialog();
    expect(
      screen.getByRole("button", { name: /Create user/i }),
    ).toBeDisabled();
  });

  it("submit button is disabled when only username is filled", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    expect(
      screen.getByRole("button", { name: /Create user/i }),
    ).toBeDisabled();
  });

  it("submit button is enabled when all required fields are filled", async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");
    expect(
      screen.getByRole("button", { name: /Create user/i }),
    ).not.toBeDisabled();
  });

  // ── Successful submission — with tempPassword ────────────────────────────

  it("shows credentials panel when response includes tempPassword", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      id: "u_new",
      username: "alice",
      email: "alice@test.com",
      displayName: "Alice",
      roles: ["user"],
      isSuspended: false,
      tempPassword: "S3cr3t!",
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() =>
      expect(screen.getByText("S3cr3t!")).toBeInTheDocument(),
    );
    // Form fields should be replaced by credentials panel
    expect(screen.queryByLabelText(/Username/i)).not.toBeInTheDocument();
    // Done button visible
    expect(screen.getByRole("button", { name: /Done/i })).toBeInTheDocument();
  });

  it("Done button in credentials panel closes the dialog", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    mockCreate.mockResolvedValue({
      id: "u_new",
      username: "alice",
      email: "alice@test.com",
      displayName: "Alice",
      roles: ["user"],
      isSuspended: false,
      tempPassword: "S3cr3t!",
    });

    renderDialog(true, onOpenChange);
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });
    await screen.findByText("S3cr3t!");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Done/i }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Successful submission — without tempPassword ──────────────────────────

  it("closes dialog and shows toast when no tempPassword in response", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { toast } = await import("sonner");
    mockCreate.mockResolvedValue({
      id: "u_new",
      username: "alice",
      email: "alice@test.com",
      displayName: "Alice",
      roles: ["user"],
      isSuspended: false,
    });

    renderDialog(true, onOpenChange);
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(toast.success).toHaveBeenCalledWith("User created successfully.");
  });

  // ── Error handling ───────────────────────────────────────────────────────

  it("shows error alert when mutation fails with generic error", async () => {
    const user = userEvent.setup();
    mockCreate.mockRejectedValue(new Error("Network failure"));

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Failed to create user.",
      ),
    );
  });

  it("shows ApiError message in error alert", async () => {
    const user = userEvent.setup();
    const { ApiError } = await import("@/lib/api-client");
    mockCreate.mockRejectedValue(
      new ApiError(409, { message: "Username already taken." }),
    );

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Username already taken.",
      ),
    );
  });

  // ── Cancel button ────────────────────────────────────────────────────────

  it("Cancel button calls onOpenChange(false)", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    renderDialog(true, onOpenChange);

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Cancel/i }));
    });

    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  // ── Platform admin controls ───────────────────────────────────────────────

  it("shows platform admin checkbox for platform admin", () => {
    mockHasRole = (r) => r === "admin";
    renderDialog();
    expect(screen.getByLabelText(/Grant platform admin role/i)).toBeInTheDocument();
  });

  it("hides platform admin checkbox for non-admin", () => {
    mockHasRole = () => false;
    renderDialog();
    expect(
      screen.queryByLabelText(/Grant platform admin role/i),
    ).not.toBeInTheDocument();
  });

  it("includes platformAdmin in DTO when checkbox is checked by a platform admin", async () => {
    const user = userEvent.setup();
    mockHasRole = (r) => r === "admin";
    mockCreate.mockResolvedValue({
      id: "u_new", username: "alice", email: "alice@test.com",
      displayName: "Alice", roles: ["user", "admin"], isSuspended: false,
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");
    await user.click(screen.getByLabelText(/Grant platform admin role/i));

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ platformAdmin: true }),
    );
  });

  // ── Org enrollment ────────────────────────────────────────────────────────

  it("does not show org select when no orgs available", () => {
    mockOrgs = [];
    renderDialog();
    expect(screen.queryByLabelText(/Enroll in organization/i)).not.toBeInTheDocument();
  });

  it("shows org select when orgs are available", () => {
    mockOrgs = ORGS;
    renderDialog();
    expect(screen.getByLabelText(/Enroll in organization/i)).toBeInTheDocument();
  });

  it("shows org role select when an org is selected (platform admin)", async () => {
    const user = userEvent.setup();
    mockHasRole = (r) => r === "admin";
    mockOrgs = ORGS;
    renderDialog();

    // Platform admin: default is "None", select an org
    await user.selectOptions(
      screen.getByLabelText(/Enroll in organization/i),
      "org_1",
    );

    expect(screen.getByLabelText(/Organization role/i)).toBeInTheDocument();
  });

  it("does not show org role select when org is set to None (platform admin)", () => {
    mockHasRole = (r) => r === "admin";
    mockOrgs = ORGS;
    renderDialog();
    // default org is "None" (empty value) for platform admin
    expect(screen.queryByLabelText(/Organization role/i)).not.toBeInTheDocument();
  });

  it("auto-selects first org for non-platform-admin and shows org role select", () => {
    mockHasRole = () => false;
    mockOrgs = ORGS;
    renderDialog();
    // Non-admin: org is auto-selected → org role select must appear
    expect(screen.getByLabelText(/Organization role/i)).toBeInTheDocument();
  });

  it("includes orgId and orgRole in DTO when org is selected", async () => {
    const user = userEvent.setup();
    mockHasRole = (r) => r === "admin";
    mockOrgs = ORGS;
    mockCreate.mockResolvedValue({
      id: "u_new", username: "alice", email: "alice@test.com",
      displayName: "Alice", roles: ["user"], isSuspended: false,
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");
    await user.selectOptions(
      screen.getByLabelText(/Enroll in organization/i),
      "org_1",
    );

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ orgId: "org_1" }),
    );
  });

  // ── DTO payload ──────────────────────────────────────────────────────────

  it("includes password in DTO when password field is filled", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      id: "u_new", username: "alice", email: "alice@test.com",
      displayName: "Alice", roles: ["user"], isSuspended: false,
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");
    await user.type(screen.getByLabelText(/Password/i), "MyP@ss1234");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ password: "MyP@ss1234" }),
    );
  });

  it("omits password from DTO when password field is empty", async () => {
    const user = userEvent.setup();
    mockCreate.mockResolvedValue({
      id: "u_new", username: "alice", email: "alice@test.com",
      displayName: "Alice", roles: ["user"], isSuspended: false,
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith(
      expect.not.objectContaining({ password: expect.anything() }),
    );
  });

  // ── Copy button ──────────────────────────────────────────────────────────

  it("Copy button writes tempPassword to clipboard and shows success toast", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });

    mockCreate.mockResolvedValue({
      id: "u_new", username: "alice", email: "alice@test.com",
      displayName: "Alice", roles: ["user"], isSuspended: false,
      tempPassword: "C0pied!",
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await screen.findByText("C0pied!");

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Copy temporary password/i }),
      );
    });

    expect(writeText).toHaveBeenCalledWith("C0pied!");
    expect(toast.success).toHaveBeenCalledWith("Copied.");
  });

  it("Copy button shows error toast when clipboard write fails", async () => {
    const user = userEvent.setup();
    const { toast } = await import("sonner");
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
      writable: true,
      configurable: true,
    });

    mockCreate.mockResolvedValue({
      id: "u_new", username: "alice", email: "alice@test.com",
      displayName: "Alice", roles: ["user"], isSuspended: false,
      tempPassword: "C0pied!",
    });

    renderDialog();
    await user.type(screen.getByLabelText(/Username/i), "alice");
    await user.type(screen.getByLabelText(/Email/i), "alice@test.com");
    await user.type(screen.getByLabelText(/Display name/i), "Alice");

    await act(async () => {
      await user.click(screen.getByRole("button", { name: /Create user/i }));
    });

    await screen.findByText("C0pied!");

    await act(async () => {
      await user.click(
        screen.getByRole("button", { name: /Copy temporary password/i }),
      );
    });

    expect(toast.error).toHaveBeenCalledWith("Could not copy.");
  });
});
