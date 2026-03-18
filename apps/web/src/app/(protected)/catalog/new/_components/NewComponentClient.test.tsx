import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------
const mockCreateComponent = vi.fn();
const mockRegisterYaml = vi.fn();

vi.mock("@/lib/api-client", () => ({
  catalog: {
    createComponent: (...args: unknown[]) => mockCreateComponent(...args),
    registerYaml: (...args: unknown[]) => mockRegisterYaml(...args),
  },
  ApiError: class ApiError extends Error {
    status: number;
    body: unknown;
    constructor(status: number, body: { message: string | string[] }) {
      super(typeof body.message === "string" ? body.message : body.message.join(", "));
      this.name = "ApiError";
      this.status = status;
      this.body = body;
    }
  },
}));

vi.mock("@/types/api", () => ({
  ComponentKind: {
    SERVICE: "service",
    LIBRARY: "library",
    API: "api",
    WEBSITE: "website",
    COMPONENT: "component",
    SYSTEM: "system",
    DOMAIN: "domain",
    RESOURCE: "resource",
    PIPELINE: "pipeline",
    QUEUE: "queue",
    DATABASE: "database",
    STORAGE: "storage",
    CLUSTER: "cluster",
    NETWORK: "network",
    DATASET: "dataset",
    DATA_PIPELINE: "data-pipeline",
    ML_MODEL: "ml-model",
    SECRET: "secret",
    POLICY: "policy",
    CERTIFICATE: "certificate",
  },
  ComponentLifecycle: {
    PLANNED: "planned",
    EXPERIMENTAL: "experimental",
    PRODUCTION: "production",
    DEPRECATED: "deprecated",
    DECOMMISSIONED: "decommissioned",
  },
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({
    title,
    children,
  }: {
    title: string;
    description?: string;
    children?: React.ReactNode;
  }) => (
    <div>
      <h1>{title}</h1>
      {children}
    </div>
  ),
}));

import { NewComponentClient } from "@/app/(protected)/catalog/new/_components/NewComponentClient";
import { ApiError } from "@/lib/api-client";

describe("NewComponentClient — Interactive Form tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the form fields", () => {
    render(<NewComponentClient />);
    // Heading and submit button both contain "Register Component"; check heading by role
    expect(screen.getByRole("heading", { name: "Register Component" })).toBeInTheDocument();
    expect(screen.getByLabelText(/^name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^owner/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register Component" })).toBeInTheDocument();
  });

  it("shows validation errors when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<NewComponentClient />);

    await user.click(screen.getByRole("button", { name: "Register Component" }));

    await waitFor(() => {
      expect(screen.getByText("Name is required")).toBeInTheDocument();
    });
    expect(screen.getByText("Owner is required")).toBeInTheDocument();
    expect(mockCreateComponent).not.toHaveBeenCalled();
  });

  it("shows a URL validation error for invalid repositoryUrl", async () => {
    const user = userEvent.setup();
    render(<NewComponentClient />);

    await user.type(screen.getByLabelText(/^name/i), "auth-service");
    await user.type(screen.getByLabelText(/^owner/i), "platform-team");
    await user.type(screen.getByLabelText(/repository url/i), "not-a-url");
    await user.click(screen.getByRole("button", { name: "Register Component" }));

    await waitFor(() => {
      expect(screen.getByText("Must be a valid URL")).toBeInTheDocument();
    });
    expect(mockCreateComponent).not.toHaveBeenCalled();
  });

  it("calls catalog.createComponent() with correct payload on valid submit", async () => {
    const user = userEvent.setup();
    mockCreateComponent.mockResolvedValueOnce({ id: "c1", name: "auth-service" });
    render(<NewComponentClient />);

    await user.type(screen.getByLabelText(/^name/i), "auth-service");
    await user.type(screen.getByLabelText(/^owner/i), "platform-team");
    await user.click(screen.getByRole("button", { name: "Register Component" }));

    await waitFor(() => {
      expect(mockCreateComponent).toHaveBeenCalledOnce();
    });
    expect(mockCreateComponent).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "auth-service",
        owner: "platform-team",
      }),
    );
  });

  it("shows API error from createComponent on failure", async () => {
    const user = userEvent.setup();
    mockCreateComponent.mockRejectedValueOnce(
      new ApiError(422, { message: "Component already registered", statusCode: 422, timestamp: "2025-01-01T00:00:00Z", path: "/test" }),
    );
    render(<NewComponentClient />);

    await user.type(screen.getByLabelText(/^name/i), "auth-service");
    await user.type(screen.getByLabelText(/^owner/i), "platform-team");
    await user.click(screen.getByRole("button", { name: "Register Component" }));

    await waitFor(() => {
      expect(screen.getByText("Component already registered")).toBeInTheDocument();
    });
  });
});

describe("NewComponentClient — YAML Import tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  async function switchToYamlTab(user: ReturnType<typeof userEvent.setup>) {
    render(<NewComponentClient />);
    await user.click(screen.getByRole("button", { name: "YAML Import" }));
  }

  it("shows validation error when YAML is empty on submit", async () => {
    const user = userEvent.setup();
    await switchToYamlTab(user);

    await user.click(screen.getByRole("button", { name: "Import from YAML" }));

    await waitFor(() => {
      expect(screen.getByText("YAML content is required")).toBeInTheDocument();
    });
    expect(mockRegisterYaml).not.toHaveBeenCalled();
  });

  it("calls catalog.registerYaml() with the YAML content on valid submit", async () => {
    const user = userEvent.setup();
    mockRegisterYaml.mockResolvedValueOnce({ id: "c2", name: "yaml-service" });
    await switchToYamlTab(user);

    await user.type(
      screen.getByLabelText(/catalog yaml/i),
      "apiVersion: farm.io/v1alpha1\nkind: Component",
    );
    await user.click(screen.getByRole("button", { name: "Import from YAML" }));

    await waitFor(() => {
      expect(mockRegisterYaml).toHaveBeenCalledOnce();
    });
    expect(mockRegisterYaml).toHaveBeenCalledWith(
      expect.stringContaining("farm.io"),
    );
  });
});
