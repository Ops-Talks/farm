import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import type { ApiSpec, SpecDiffResult } from "@/types/api";

// ---------------------------------------------------------------------------
// Mocks — must be declared BEFORE the import under test
// ---------------------------------------------------------------------------

const mockListByComponent = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockRemove = vi.fn();
const mockDiff = vi.fn();

vi.mock("@/lib/api-client", () => ({
  apiSpecs: {
    listByComponent: (...args: unknown[]) => mockListByComponent(...args),
    create: (...args: unknown[]) => mockCreate(...args),
    update: (...args: unknown[]) => mockUpdate(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
    diff: (...args: unknown[]) => mockDiff(...args),
    addConsumer: vi.fn(),
    removeConsumer: vi.fn(),
    listConsumedApis: vi.fn(),
    getOne: vi.fn(),
  },
}));

// SwaggerUI is a browser-only heavy component — mock it with a lightweight stub
vi.mock("swagger-ui-react", () => ({
  default: () => <div data-testid="swagger-ui" />,
}));

// next/dynamic — return the component directly (no lazy loading in tests)
vi.mock("next/dynamic", () => ({
  default: (importFn: () => Promise<{ default: React.ComponentType }>) => {
    // We need a synchronous-like component; wrap it so tests can render it
    let Component: React.ComponentType | null = null;
    // Eagerly resolve but return a placeholder that renders once resolved
    importFn().then((mod) => {
      Component = mod.default;
    });
    // Return a wrapper that delegates to Component once available
    const DynamicWrapper = (props: Record<string, unknown>) => {
      if (!Component) return <div data-testid="dynamic-loading" />;
      return <Component {...props} />;
    };
    DynamicWrapper.displayName = "DynamicWrapper";
    return DynamicWrapper;
  },
}));

// CSS import from swagger-ui-react — no-op in test environment
vi.mock("swagger-ui-react/swagger-ui.css", () => ({}));

import { ApiSpecsTab } from "./ApiSpecsTab";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSpec(overrides: Partial<ApiSpec> = {}): ApiSpec {
  return {
    id: "spec-1",
    componentId: "comp-1",
    name: "Payment API",
    format: "openapi",
    version: "1.0.0",
    spec: '{"openapi":"3.0.0","info":{"title":"Payment API","version":"1.0.0"},"paths":{}}',
    status: "active",
    deprecatedAt: null,
    sunsetAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeAsyncApiSpec(overrides: Partial<ApiSpec> = {}): ApiSpec {
  return makeSpec({
    id: "spec-async-1",
    name: "Events API",
    format: "asyncapi",
    spec: "asyncapi: 2.0.0\ninfo:\n  title: Events API\n  version: 1.0.0",
    ...overrides,
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("ApiSpecsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Shows loading state initially
  it("shows loading state initially", () => {
    // Never resolves during this test
    mockListByComponent.mockReturnValue(new Promise(() => {}));

    render(<ApiSpecsTab componentId="comp-1" />);

    expect(screen.getByTestId("api-specs-loading")).toBeInTheDocument();
  });

  // 2. Renders spec list after load (mock returns 2 specs)
  it("renders spec list after load", async () => {
    const spec1 = makeSpec({ id: "spec-1", name: "Payment API" });
    const spec2 = makeSpec({ id: "spec-2", name: "Auth API", version: "2.0.0" });
    mockListByComponent.mockResolvedValue([spec1, spec2]);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-1")).toBeInTheDocument();
    });
    expect(screen.getByTestId("spec-list-item-spec-2")).toBeInTheDocument();
    expect(screen.getByText("Payment API")).toBeInTheDocument();
    expect(screen.getByText("Auth API")).toBeInTheDocument();
  });

  // 3. Shows EmptyState when no specs
  it("shows EmptyState when there are no specs", async () => {
    mockListByComponent.mockResolvedValue([]);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByText(/No API Specs/i)).toBeInTheDocument();
    });
  });

  // 4. Clicking a spec selects it and shows the viewer panel
  it("clicking a spec selects it and shows the viewer panel", async () => {
    const spec = makeSpec();
    mockListByComponent.mockResolvedValue([spec]);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("spec-list-item-spec-1"));

    await waitFor(() => {
      expect(screen.getByTestId("spec-viewer")).toBeInTheDocument();
    });
    // The viewer header shows the spec name
    expect(screen.getByTestId("spec-viewer")).toHaveTextContent("Payment API");
  });

  // 5. "Add Spec" dialog opens on button click; submitting calls apiSpecs.create
  it("opens Add Spec dialog and submitting calls apiSpecs.create", async () => {
    mockListByComponent.mockResolvedValue([]);
    const newSpec = makeSpec({ id: "spec-new", name: "New API" });
    mockCreate.mockResolvedValue(newSpec);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("add-spec-button")).toBeInTheDocument();
    });

    // Open the dialog
    fireEvent.click(screen.getByTestId("add-spec-button"));

    await waitFor(() => {
      expect(screen.getByTestId("add-spec-form")).toBeInTheDocument();
    });

    // Fill in the form
    fireEvent.change(screen.getByTestId("spec-name-input"), {
      target: { value: "New API" },
    });
    fireEvent.change(screen.getByTestId("spec-version-input"), {
      target: { value: "1.0.0" },
    });
    fireEvent.change(screen.getByTestId("spec-content-input"), {
      target: { value: '{"openapi":"3.0.0"}' },
    });

    // Submit
    await act(async () => {
      fireEvent.submit(screen.getByTestId("add-spec-form"));
    });

    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith("comp-1", {
        name: "New API",
        format: "openapi",
        version: "1.0.0",
        spec: '{"openapi":"3.0.0"}',
      });
    });
  });

  // 6. "Deprecate" button triggers ConfirmDialog; confirming calls apiSpecs.update
  it("deprecate button triggers confirm dialog and calls apiSpecs.update on confirm", async () => {
    const spec = makeSpec({ status: "active" });
    const deprecatedSpec = makeSpec({ status: "deprecated" });
    mockListByComponent.mockResolvedValue([spec]);
    mockUpdate.mockResolvedValue(deprecatedSpec);

    render(<ApiSpecsTab componentId="comp-1" />);

    // Select the spec first
    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("spec-list-item-spec-1"));

    await waitFor(() => {
      expect(screen.getByTestId("deprecate-button")).toBeInTheDocument();
    });

    // Click Deprecate
    fireEvent.click(screen.getByTestId("deprecate-button"));

    // ConfirmDialog should appear — look for its Confirm button
    await waitFor(() => {
      expect(screen.getByText(/Deprecate API Spec/i)).toBeInTheDocument();
    });

    // Click confirm in the dialog
    const confirmBtn = screen.getByRole("button", { name: /^Deprecate$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith("spec-1", { status: "deprecated" });
    });
  });

  // 7. "Delete" button triggers ConfirmDialog; confirming calls apiSpecs.remove
  it("delete button triggers confirm dialog and calls apiSpecs.remove on confirm", async () => {
    const spec = makeSpec();
    mockListByComponent.mockResolvedValue([spec]);
    mockRemove.mockResolvedValue(undefined);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-1")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId("spec-list-item-spec-1"));

    await waitFor(() => {
      expect(screen.getByTestId("delete-button")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("delete-button"));

    await waitFor(() => {
      expect(screen.getByText(/Delete API Spec/i)).toBeInTheDocument();
    });

    // Click confirm
    const confirmBtn = screen.getByRole("button", { name: /^Delete$/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(mockRemove).toHaveBeenCalledWith("spec-1");
    });
  });

  // 8. Diff panel: selecting a compare target calls apiSpecs.diff and renders results
  it("selecting a diff target calls apiSpecs.diff and shows results table", async () => {
    const spec1 = makeSpec({ id: "spec-1", name: "Payment API", version: "1.0.0" });
    const spec2 = makeSpec({ id: "spec-2", name: "Payment API", version: "2.0.0" });
    mockListByComponent.mockResolvedValue([spec1, spec2]);

    const diffResult: SpecDiffResult = {
      totalChanges: 2,
      breakingChanges: 1,
      entries: [
        { type: "removed", breaking: true, path: "/paths/~1old-endpoint", detail: "Endpoint removed" },
        { type: "added", breaking: false, path: "/paths/~1new-endpoint", detail: "New endpoint" },
      ],
    };
    mockDiff.mockResolvedValue(diffResult);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-1")).toBeInTheDocument();
    });

    // Select spec1
    fireEvent.click(screen.getByTestId("spec-list-item-spec-1"));

    await waitFor(() => {
      expect(screen.getByTestId("diff-target-select")).toBeInTheDocument();
    });

    // Select spec2 as the diff target
    fireEvent.change(screen.getByTestId("diff-target-select"), {
      target: { value: "spec-2" },
    });

    await waitFor(() => {
      expect(mockDiff).toHaveBeenCalledWith("spec-1", "spec-2");
    });

    await waitFor(() => {
      expect(screen.getByTestId("diff-table")).toBeInTheDocument();
    });

    expect(screen.getByText("Total changes:")).toBeInTheDocument();
  });

  // 9. Shows SwaggerUI for openapi format spec
  it("shows SwaggerUI container for openapi format spec", async () => {
    const spec = makeSpec({ format: "openapi" });
    mockListByComponent.mockResolvedValue([spec]);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("spec-list-item-spec-1"));

    await waitFor(() => {
      expect(screen.getByTestId("swagger-ui-container")).toBeInTheDocument();
    });
  });

  // 10. Shows <pre> block for asyncapi format spec
  it("shows pre block for asyncapi format spec", async () => {
    const spec = makeAsyncApiSpec();
    mockListByComponent.mockResolvedValue([spec]);

    render(<ApiSpecsTab componentId="comp-1" />);

    await waitFor(() => {
      expect(screen.getByTestId("spec-list-item-spec-async-1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("spec-list-item-spec-async-1"));

    await waitFor(() => {
      expect(screen.getByTestId("asyncapi-pre")).toBeInTheDocument();
    });

    expect(screen.getByTestId("asyncapi-pre").textContent).toContain("asyncapi: 2.0.0");
  });
});
