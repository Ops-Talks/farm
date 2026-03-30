import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ── Mock fns (declared before vi.mock calls) ──────────────────────────────────

const mockList = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockScaffold = vi.fn();
const mockScaffoldDryRun = vi.fn();
const mockHasRole = vi.fn();

vi.mock("@/lib/api-client", () => ({
  serviceTemplates: {
    list: (...args: unknown[]) => mockList(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    scaffold: (...args: unknown[]) => mockScaffold(...args),
    scaffoldDryRun: (...args: unknown[]) => mockScaffoldDryRun(...args),
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ hasRole: mockHasRole }),
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

// ── Import component AFTER mocks ──────────────────────────────────────────────

import { TemplatesClient } from "./TemplatesClient";
import { toast } from "sonner";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mockTemplate = {
  id: "tpl-1",
  name: "Node.js Starter",
  description: "A simple Node.js starter template",
  language: "typescript",
  framework: "express",
  tags: ["api", "microservice"],
  repositoryUrl: "https://github.com/org/node-starter",
  variables: [
    {
      key: "SERVICE_NAME",
      label: "Service Name",
      description: "Name of the service",
      default: "my-service",
      required: true,
      pattern: "^[a-z0-9-]+$",
    },
    {
      key: "PORT",
      label: "Port",
      description: "HTTP port",
      default: "3000",
      required: false,
    },
  ],
  isBuiltIn: false,
  organizationId: "org-1",
  createdAt: "2024-01-01T00:00:00Z",
  updatedAt: "2024-01-01T00:00:00Z",
};

const mockBuiltInTemplate = {
  ...mockTemplate,
  id: "tpl-builtin",
  name: "Go Microservice",
  description: "Built-in Go microservice template",
  language: "go",
  framework: "gin",
  tags: ["grpc"],
  repositoryUrl: "https://github.com/org/go-template",
  variables: null,
  isBuiltIn: true,
};

const mockTemplate2 = {
  ...mockTemplate,
  id: "tpl-2",
  name: "Python FastAPI",
  description: "Python FastAPI template",
  language: "python",
  framework: "fastapi",
  tags: null,
  repositoryUrl: "https://github.com/org/python-template",
  variables: null,
  isBuiltIn: false,
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("TemplatesClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });
    mockHasRole.mockReturnValue(false);
  });

  // ── Data Loading ──────────────────────────────────────────────────────────

  it("renders loading skeleton initially", () => {
    // Never resolve the promise so it stays in loading state
    mockList.mockReturnValue(new Promise(() => {}));
    render(<TemplatesClient />);

    // Should show 4 skeleton elements
    const skeletons = document.querySelectorAll(".h-14");
    expect(skeletons.length).toBe(4);
  });

  it("displays template list after loading", async () => {
    mockList.mockResolvedValue({
      data: [mockTemplate, mockBuiltInTemplate],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });
    expect(screen.getByText("Go Microservice")).toBeInTheDocument();
    expect(screen.getByText("TypeScript")).toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("express")).toBeInTheDocument();
    expect(screen.getByText("gin")).toBeInTheDocument();
  });

  it("shows empty state when no templates", async () => {
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });
    expect(
      screen.getByText(
        "Create your first service template to enable golden-path scaffolding for your organization.",
      ),
    ).toBeInTheDocument();
  });

  it("handles API errors during loading with toast.error", async () => {
    mockList.mockRejectedValue(new Error("Network failure"));

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Network failure");
    });
  });

  it("shows generic error message for non-Error throw", async () => {
    mockList.mockRejectedValue("something broke");

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        "Failed to load service templates",
      );
    });
  });

  // ── Admin / RBAC ──────────────────────────────────────────────────────────

  it("shows Create Template button for admin users", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create template/i,
    });
    expect(createButtons.length).toBeGreaterThanOrEqual(1);
  });

  it("hides Create Template button for non-admin users", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /create template/i }),
    ).not.toBeInTheDocument();
  });

  it("shows Edit and Delete buttons only for non-built-in templates when admin", async () => {
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate, mockBuiltInTemplate],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    // Edit and Delete buttons should appear for custom template
    const editButtons = screen.getAllByRole("button", { name: /^edit$/i });
    const deleteButtons = screen.getAllByRole("button", { name: /^delete$/i });

    // Only 1 of each since the built-in template shouldn't have them
    expect(editButtons).toHaveLength(1);
    expect(deleteButtons).toHaveLength(1);
  });

  it("hides Edit/Delete buttons for non-admin users", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    expect(
      screen.queryByRole("button", { name: /^edit$/i }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^delete$/i }),
    ).not.toBeInTheDocument();
  });

  // ── Template badges ───────────────────────────────────────────────────────

  it("displays Built-in badge for built-in templates and Custom for custom", async () => {
    mockList.mockResolvedValue({
      data: [mockTemplate, mockBuiltInTemplate],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    // "Built-in" appears as both a column header and a badge; use getAllByText
    const builtInElements = screen.getAllByText("Built-in");
    expect(builtInElements.length).toBeGreaterThanOrEqual(2); // header + badge
    expect(screen.getByText("Custom")).toBeInTheDocument();
  });

  it("shows tags as badges, and -- when tags are null", async () => {
    mockList.mockResolvedValue({
      data: [mockTemplate, mockTemplate2],
      total: 2,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    expect(screen.getByText("api")).toBeInTheDocument();
    expect(screen.getByText("microservice")).toBeInTheDocument();
    expect(screen.getByText("--")).toBeInTheDocument();
  });

  // ── Create Template ─────────────────────────────────────────────────────

  it("opens create dialog, fills form, submits, and reloads list", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    const created = {
      ...mockTemplate,
      id: "tpl-new",
      name: "new-template",
    };
    mockCreate.mockResolvedValue(created);

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });

    // Click create button (in empty state)
    const createButtons = screen.getAllByRole("button", {
      name: /create template/i,
    });
    await user.click(createButtons[0]);

    // Dialog should open
    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    });

    // Fill the form
    const nameInput = screen.getByLabelText(/^Name/);
    await user.type(nameInput, "new-template");

    const descInput = screen.getByLabelText(/Description/);
    await user.type(descInput, "A new template");

    const frameworkInput = screen.getByLabelText(/Framework/);
    await user.type(frameworkInput, "nestjs");

    const repoInput = screen.getByLabelText(/Repository URL/);
    await user.type(repoInput, "https://github.com/org/repo");

    // Submit
    const submitBtn = screen.getByRole("button", { name: "Create" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "new-template",
          language: "typescript",
          framework: "nestjs",
          repositoryUrl: "https://github.com/org/repo",
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Template "new-template" created',
      );
    });
  });

  // ── Edit Template ─────────────────────────────────────────────────────────

  it("opens edit dialog with prefilled data and submits update", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    const updated = { ...mockTemplate, name: "Updated Template" };
    mockUpdate.mockResolvedValue(updated);

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /^edit$/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit Template")).toBeInTheDocument();
    });

    // Verify prefilled values
    const nameInput = screen.getByLabelText(/^Name/) as HTMLInputElement;
    expect(nameInput.value).toBe("Node.js Starter");

    // Update name
    await user.clear(nameInput);
    await user.type(nameInput, "Updated Template");

    const updateBtn = screen.getByRole("button", { name: "Update" });
    await user.click(updateBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "tpl-1",
        expect.objectContaining({ name: "Updated Template" }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Template "Updated Template" updated',
      );
    });
  });

  // ── Delete Template ───────────────────────────────────────────────────────

  it("deletes a template via confirm dialog", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockRemove.mockResolvedValue(undefined);

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteBtn);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText("Delete Template")).toBeInTheDocument();
    });
    expect(
      screen.getByText(/Are you sure you want to delete "Node.js Starter"\?/),
    ).toBeInTheDocument();

    // Click the confirm "Delete" button in the confirm dialog
    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("tpl-1");
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Template "Node.js Starter" deleted',
      );
    });
  });

  it("shows toast.error when delete fails", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockRemove.mockRejectedValue(new Error("Delete failed"));

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const deleteBtn = screen.getByRole("button", { name: /^delete$/i });
    await user.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText("Delete Template")).toBeInTheDocument();
    });

    const confirmBtn = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Delete failed");
    });
  });

  // ── Create validation ─────────────────────────────────────────────────────

  it("disables Create submit when required fields are empty", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create template/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    });

    // Submit button should be disabled because fields are empty
    const submitBtn = screen.getByRole("button", { name: "Create" });
    expect(submitBtn).toBeDisabled();
  });

  it("shows toast.error on create failure from API", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });
    mockCreate.mockRejectedValue(new Error("Duplicate name"));

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", {
      name: /create template/i,
    });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    });

    // Fill required fields
    await user.type(screen.getByLabelText(/^Name/), "duplicate-template");
    await user.type(screen.getByLabelText(/Framework/), "express");
    await user.type(
      screen.getByLabelText(/Repository URL/),
      "https://github.com/org/repo",
    );

    const submitBtn = screen.getByRole("button", { name: "Create" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Duplicate name");
    });
  });

  // ── Scaffold Wizard ─────────────────────────────────────────────────────

  it("opens scaffold dialog when clicking Scaffold button", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
  });

  it("shows template info in step 1 of scaffold wizard", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 1 should show template details
    expect(screen.getByText("Template Info")).toBeInTheDocument();
    // "express" appears in both the table and the scaffold card; use getAllByText
    const expressElements = screen.getAllByText("express");
    expect(expressElements.length).toBeGreaterThanOrEqual(2);
    expect(
      screen.getByText("https://github.com/org/node-starter"),
    ).toBeInTheDocument();
    expect(screen.getByText("2 defined")).toBeInTheDocument();
  });

  it("shows dynamic variable form based on template.variables in step 2", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Move to step 2 (Variables)
    const nextBtn = screen.getByRole("button", { name: "Next" });
    await user.click(nextBtn);

    // Should show variable inputs
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    expect(screen.getByText("Port")).toBeInTheDocument();
    expect(
      screen.getByText("Name of the service"),
    ).toBeInTheDocument();
  });

  it("shows target repository input in step 3", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Step 2 → 3 (variables already have defaults)
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
  });

  it("shows review summary in step 4 and allows dry run", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffoldDryRun.mockResolvedValue({
      id: "sr-1",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/new-service",
      variables: { SERVICE_NAME: "my-service" },
      status: "completed",
      statusMessage: null,
      requestedBy: "user-1",
      dryRun: true,
      renderedFiles: ["package.json", "src/index.ts", "Dockerfile"],
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    // Navigate through steps
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Step 2 → 3
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });

    // Fill target repo
    await user.type(
      screen.getByLabelText(/Target Repository/),
      "org/new-service",
    );

    // Step 3 → 4
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    // Should show Dry Run and Scaffold buttons
    expect(screen.getByRole("button", { name: "Dry Run" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Scaffold" }),
    ).toBeInTheDocument();

    // Execute dry run
    await user.click(screen.getByRole("button", { name: "Dry Run" }));

    await waitFor(() => {
      expect(mockScaffoldDryRun).toHaveBeenCalledWith(
        "tpl-1",
        expect.objectContaining({
          targetRepository: "org/new-service",
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("Dry run completed");
    });

    // Should show rendered files
    await waitFor(() => {
      expect(
        screen.getByText("Dry Run: Rendered Files"),
      ).toBeInTheDocument();
    });
  });

  it("executes scaffold and shows result", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockResolvedValue({
      id: "sr-2",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/new-service",
      variables: { SERVICE_NAME: "my-service" },
      status: "pending",
      statusMessage: null,
      requestedBy: "user-1",
      dryRun: false,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Navigate to step 2
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Navigate to step 3
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });

    await user.type(
      screen.getByLabelText(/Target Repository/),
      "org/new-service",
    );

    // Navigate to step 4 (Review)
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    // Click Scaffold
    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(mockScaffold).toHaveBeenCalledWith(
        "tpl-1",
        expect.objectContaining({
          targetRepository: "org/new-service",
        }),
      );
    });

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        'Scaffolding "Node.js Starter" started successfully',
      );
    });

    // Should show result card
    await waitFor(() => {
      expect(
        screen.getByText("Scaffold Request Created"),
      ).toBeInTheDocument();
    });
  });

  it("handles scaffold errors with toast.error", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockRejectedValue(new Error("Repository already exists"));

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Navigate through all steps
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(
      screen.getByLabelText(/Target Repository/),
      "org/new-service",
    );
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Repository already exists");
    });
  });

  it("shows 'no configurable variables' message for templates without variables", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockBuiltInTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Go Microservice")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Navigate to step 2
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /This template has no configurable variables/,
        ),
      ).toBeInTheDocument();
    });
  });

  // ── Pagination ──────────────────────────────────────────────────────────

  it("shows pagination when total > page size", async () => {
    const templates = Array.from({ length: 20 }, (_, i) => ({
      ...mockTemplate,
      id: `tpl-${i}`,
      name: `Template ${i}`,
    }));
    mockList.mockResolvedValue({
      data: templates,
      total: 30,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Template 0")).toBeInTheDocument();
    });

    expect(
      screen.getByText(/Showing 1--20 of 30 templates/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Next" }),
    ).not.toBeDisabled();
    expect(screen.getByRole("button", { name: "Previous" })).toBeDisabled();
  });

  it("navigates to next page when Next is clicked", async () => {
    const user = userEvent.setup();
    const templates = Array.from({ length: 20 }, (_, i) => ({
      ...mockTemplate,
      id: `tpl-${i}`,
      name: `Template ${i}`,
    }));
    mockList.mockResolvedValue({
      data: templates,
      total: 30,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Template 0")).toBeInTheDocument();
    });

    // Prepare mock for page 2
    mockList.mockResolvedValue({
      data: [
        { ...mockTemplate, id: "tpl-20", name: "Template 20" },
      ],
      total: 30,
      skip: 20,
      take: 20,
    });

    // Click Next
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({ skip: 20, take: 20 });
    });
  });

  // ── Scaffold always visible ───────────────────────────────────────────────

  it("shows Scaffold button for all users regardless of role", async () => {
    mockHasRole.mockReturnValue(false);
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    expect(
      screen.getByRole("button", { name: /scaffold/i }),
    ).toBeInTheDocument();
  });

  it("disables Next button at step 3 when target repository is empty", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    const scaffoldBtn = screen.getByRole("button", { name: /scaffold/i });
    await user.click(scaffoldBtn);

    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Step 2 → 3
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });

    // Next should be disabled since target repo is empty
    expect(screen.getByRole("button", { name: "Next" })).toBeDisabled();
  });

  // ── Edit template with null description/tags ───────────────────────────────

  it("opens edit dialog for template with null description and null tags", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    const noDescTemplate = {
      ...mockTemplate,
      id: "tpl-nodesc",
      name: "No Desc Template",
      description: null,
      tags: null,
      isBuiltIn: false,
    };
    mockList.mockResolvedValue({
      data: [noDescTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    const updated = { ...noDescTemplate, name: "Updated No Desc" };
    mockUpdate.mockResolvedValue(updated);

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("No Desc Template")).toBeInTheDocument();
    });

    const editBtn = screen.getByRole("button", { name: /^edit$/i });
    await user.click(editBtn);

    await waitFor(() => {
      expect(screen.getByText("Edit Template")).toBeInTheDocument();
    });

    // Description and tags inputs should be empty (defaults from ?? "")
    const descInput = screen.getByLabelText(/Description/) as HTMLInputElement;
    expect(descInput.value).toBe("");

    const tagsInput = screen.getByLabelText(/Tags/) as HTMLInputElement;
    expect(tagsInput.value).toBe("");

    // Submit update
    await user.click(screen.getByRole("button", { name: "Update" }));
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith(
        "tpl-nodesc",
        expect.objectContaining({ name: "No Desc Template" }),
      );
    });
  });

  // ── Badge helpers: additional languages ────────────────────────────────────

  it("renders java language badge correctly", async () => {
    const javaTemplate = {
      ...mockTemplate,
      id: "tpl-java",
      name: "Java Starter",
      language: "java",
      framework: "spring",
    };
    mockList.mockResolvedValue({
      data: [javaTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Java Starter")).toBeInTheDocument();
    });
    expect(screen.getByText("Java")).toBeInTheDocument();
  });

  it("renders rust language badge correctly", async () => {
    const rustTemplate = {
      ...mockTemplate,
      id: "tpl-rust",
      name: "Rust Starter",
      language: "rust",
      framework: "actix",
    };
    mockList.mockResolvedValue({
      data: [rustTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Rust Starter")).toBeInTheDocument();
    });
    expect(screen.getByText("Rust")).toBeInTheDocument();
  });

  it("renders unknown language badge with default style", async () => {
    const unknownLangTemplate = {
      ...mockTemplate,
      id: "tpl-unknown",
      name: "Unknown Lang Starter",
      language: "cobol",
      framework: "legacy",
    };
    mockList.mockResolvedValue({
      data: [unknownLangTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Unknown Lang Starter")).toBeInTheDocument();
    });
    // Unknown language renders the raw value since there is no match in SUPPORTED_LANGUAGES
    expect(screen.getByText("cobol")).toBeInTheDocument();
  });

  // ── Scaffold status badges ────────────────────────────────────────────────

  it("renders completed scaffold status badge", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockResolvedValue({
      id: "sr-completed",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/new-service",
      variables: {},
      status: "completed",
      statusMessage: "All done",
      requestedBy: "user-1",
      dryRun: false,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    // Navigate through scaffold wizard
    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/new-service");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(screen.getByText("Scaffold Request Created")).toBeInTheDocument();
    });
    // The status badge should show "completed"
    expect(screen.getByText("completed")).toBeInTheDocument();
    // statusMessage should be shown
    expect(screen.getByText("All done")).toBeInTheDocument();
  });

  it("renders in_progress scaffold status badge", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockResolvedValue({
      id: "sr-progress",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/in-progress-svc",
      variables: {},
      status: "in_progress",
      statusMessage: "Scaffolding in progress",
      requestedBy: "user-1",
      dryRun: false,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/in-progress-svc");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(screen.getByText("Scaffold Request Created")).toBeInTheDocument();
    });
    expect(screen.getByText("in_progress")).toBeInTheDocument();
    expect(screen.getByText("Scaffolding in progress")).toBeInTheDocument();
  });

  it("renders scaffold result with failed status badge and closes scaffold dialog", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockResolvedValue({
      id: "sr-failed",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/fail-service",
      variables: {},
      status: "failed",
      statusMessage: null,
      requestedBy: "user-1",
      dryRun: false,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/fail-service");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(screen.getByText("Scaffold Request Created")).toBeInTheDocument();
    });
    expect(screen.getByText("failed")).toBeInTheDocument();

    // Close the scaffold dialog via the Close button (use getAllByRole since dialog has multiple close buttons)
    const closeButtons = screen.getAllByRole("button", { name: "Close" });
    await user.click(closeButtons[closeButtons.length - 1]);
    await waitFor(() => {
      expect(screen.queryByText("Scaffold Request Created")).not.toBeInTheDocument();
    });
  });

  it("renders scaffold result with unknown status using default badge style", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockResolvedValue({
      id: "sr-unknown",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/svc",
      variables: {},
      status: "unknown_status",
      statusMessage: null,
      requestedBy: "user-1",
      dryRun: false,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/svc");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(screen.getByText("Scaffold Request Created")).toBeInTheDocument();
    });
    expect(screen.getByText("unknown_status")).toBeInTheDocument();
  });

  // ── Previous page navigation ──────────────────────────────────────────────

  it("navigates to previous page when Previous is clicked", async () => {
    const user = userEvent.setup();
    const templates = Array.from({ length: 20 }, (_, i) => ({
      ...mockTemplate,
      id: `tpl-${i}`,
      name: `Template ${i}`,
    }));
    mockList.mockResolvedValue({
      data: templates,
      total: 40,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);

    await waitFor(() => {
      expect(screen.getByText("Template 0")).toBeInTheDocument();
    });

    // Go to page 2
    const page2Templates = Array.from({ length: 20 }, (_, i) => ({
      ...mockTemplate,
      id: `tpl-${i + 20}`,
      name: `Template ${i + 20}`,
    }));
    mockList.mockResolvedValue({
      data: page2Templates,
      total: 40,
      skip: 20,
      take: 20,
    });
    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Template 20")).toBeInTheDocument();
    });

    // Now go back to page 1
    mockList.mockResolvedValue({
      data: templates,
      total: 40,
      skip: 0,
      take: 20,
    });
    await user.click(screen.getByRole("button", { name: "Previous" }));

    await waitFor(() => {
      expect(mockList).toHaveBeenCalledWith({ skip: 0, take: 20 });
    });
  });

  // ── Scaffold wizard: Back button ──────────────────────────────────────────

  it("navigates back in scaffold wizard via Back button", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 0 → 1
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Step 1 → 0 via Back button
    await user.click(screen.getByRole("button", { name: "Back" }));
    await waitFor(() => {
      expect(screen.getByText("Template Info")).toBeInTheDocument();
    });
    // Cancel button should appear on step 0
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  // ── Scaffold wizard: variable change ──────────────────────────────────────

  it("allows changing scaffold variable values", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockResolvedValue({
      id: "sr-custom",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/custom",
      variables: { SERVICE_NAME: "custom-name", PORT: "8080" },
      status: "pending",
      statusMessage: null,
      requestedBy: "user-1",
      dryRun: false,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 0 → 1 (Variables)
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Change variable values (use id because label includes required * span)
    const serviceNameInput = document.getElementById("scaffold-var-SERVICE_NAME") as HTMLInputElement;
    await user.clear(serviceNameInput);
    await user.type(serviceNameInput, "custom-name");

    const portInput = document.getElementById("scaffold-var-PORT") as HTMLInputElement;
    await user.clear(portInput);
    await user.type(portInput, "8080");

    // Continue through wizard to scaffold
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/custom");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    // Verify the variables show in review
    expect(screen.getByText("custom-name")).toBeInTheDocument();
    expect(screen.getByText("8080")).toBeInTheDocument();

    // Execute scaffold
    await user.click(screen.getByRole("button", { name: "Scaffold" }));
    await waitFor(() => {
      expect(mockScaffold).toHaveBeenCalledWith(
        "tpl-1",
        expect.objectContaining({
          targetRepository: "org/custom",
          variables: expect.objectContaining({
            SERVICE_NAME: "custom-name",
            PORT: "8080",
          }),
        }),
      );
    });
  });

  // ── Scaffold wizard: review shows empty variable text ────────────────────

  it("shows (empty) for variables without a value in review step", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 0 → 1
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // Clear the default value of PORT (use id because label has * for required fields)
    const portInput = document.getElementById("scaffold-var-PORT") as HTMLInputElement;
    await user.clear(portInput);

    // Step 1 → 2
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/repo");

    // Step 2 → 3 (Review)
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    expect(screen.getByText("(empty)")).toBeInTheDocument();
  });

  // ── Dry run: error handling ───────────────────────────────────────────────

  it("handles dry run non-Error failure with generic message", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffoldDryRun.mockRejectedValue("unexpected");

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/repo");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Dry Run" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Dry run failed");
    });
  });

  it("handles dry run failure with Error message", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffoldDryRun.mockRejectedValue(new Error("Template not found"));

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/repo");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Dry Run" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Template not found");
    });
  });

  // ── Dry run: failed status with statusMessage ─────────────────────────────

  it("shows dry run failed card when dry run returns failed status", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffoldDryRun.mockResolvedValue({
      id: "sr-dryfail",
      templateId: "tpl-1",
      templateName: "Node.js Starter",
      targetRepository: "org/new-service",
      variables: {},
      status: "failed",
      statusMessage: "Invalid template configuration",
      requestedBy: "user-1",
      dryRun: true,
      renderedFiles: null,
      organizationId: null,
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/new-service");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Dry Run" }));

    await waitFor(() => {
      expect(screen.getByText("Dry Run Failed")).toBeInTheDocument();
    });
    expect(screen.getByText("Invalid template configuration")).toBeInTheDocument();
  });

  // ── Scaffold: non-Error failure ───────────────────────────────────────────

  it("handles scaffold non-Error failure with generic message", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockScaffold.mockRejectedValue("unexpected");

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByLabelText(/Target Repository/)).toBeInTheDocument();
    });
    await user.type(screen.getByLabelText(/Target Repository/), "org/repo");
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Review Summary")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Scaffold" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Scaffolding failed");
    });
  });

  // ── Create / Edit dialog: cancel, language change, tags ───────────────────

  it("closes create dialog when Cancel is clicked", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", { name: /create template/i });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    });

    // Click Cancel
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    await waitFor(() => {
      expect(screen.queryByLabelText(/^Name/)).not.toBeInTheDocument();
    });
  });

  it("allows changing language and tags in create form", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });

    const created = {
      ...mockTemplate,
      id: "tpl-go",
      name: "go-template",
      language: "go",
      tags: ["api", "grpc"],
    };
    mockCreate.mockResolvedValue(created);

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", { name: /create template/i });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/^Name/), "go-template");
    await user.type(screen.getByLabelText(/Framework/), "gin");
    await user.type(screen.getByLabelText(/Repository URL/), "https://github.com/org/go-repo");

    // Change language select
    const langSelect = screen.getByLabelText(/Language/);
    await user.selectOptions(langSelect, "go");

    // Type tags
    const tagsInput = screen.getByLabelText(/Tags/);
    await user.type(tagsInput, "api, grpc");

    const submitBtn = screen.getByRole("button", { name: "Create" });
    await user.click(submitBtn);

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          language: "go",
          tags: ["api", "grpc"],
        }),
      );
    });
  });

  // ── Create: non-Error failure ─────────────────────────────────────────────

  it("shows generic error when create fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({ data: [], total: 0, skip: 0, take: 20 });
    mockCreate.mockRejectedValue("server error");

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("No service templates")).toBeInTheDocument();
    });

    const createButtons = screen.getAllByRole("button", { name: /create template/i });
    await user.click(createButtons[0]);

    await waitFor(() => {
      expect(screen.getByLabelText(/^Name/)).toBeInTheDocument();
    });

    await user.type(screen.getByLabelText(/^Name/), "new-template");
    await user.type(screen.getByLabelText(/Framework/), "express");
    await user.type(screen.getByLabelText(/Repository URL/), "https://github.com/org/repo");

    await user.click(screen.getByRole("button", { name: "Create" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to create template");
    });
  });

  // ── Update: error handling ────────────────────────────────────────────────

  it("shows toast.error when update fails with Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockUpdate.mockRejectedValue(new Error("Update failed"));

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByText("Edit Template")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Update failed");
    });
  });

  it("shows generic error when update fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockUpdate.mockRejectedValue("crash");

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^edit$/i }));
    await waitFor(() => {
      expect(screen.getByText("Edit Template")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Update" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to update template");
    });
  });

  // ── Delete: non-Error failure ─────────────────────────────────────────────

  it("shows generic error when delete fails with non-Error", async () => {
    const user = userEvent.setup();
    mockHasRole.mockImplementation((role: string) => role === "admin");
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });
    mockRemove.mockRejectedValue("something");

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /^delete$/i }));
    await waitFor(() => {
      expect(screen.getByText("Delete Template")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith("Failed to delete template");
    });
  });

  // ── Scaffold wizard: Cancel on step 0 ─────────────────────────────────────

  it("closes scaffold dialog via Cancel button on step 0", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Cancel on step 0
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(screen.queryByText("Scaffold New Service")).not.toBeInTheDocument();
    });
  });

  // ── Scaffold wizard: pattern text for variables ───────────────────────────

  it("shows pattern text for template variables with pattern defined", async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue({
      data: [mockTemplate],
      total: 1,
      skip: 0,
      take: 20,
    });

    render(<TemplatesClient />);
    await waitFor(() => {
      expect(screen.getByText("Node.js Starter")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: /scaffold/i }));
    await waitFor(() => {
      expect(screen.getByText("Scaffold New Service")).toBeInTheDocument();
    });

    // Step 0 → 1 (Variables)
    await user.click(screen.getByRole("button", { name: "Next" }));
    await waitFor(() => {
      expect(screen.getByText("Service Name")).toBeInTheDocument();
    });

    // SERVICE_NAME has pattern "^[a-z0-9-]+$"
    expect(screen.getByText("Pattern: ^[a-z0-9-]+$")).toBeInTheDocument();
  });
});
