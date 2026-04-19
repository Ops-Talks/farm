import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const mockListDocs = vi.fn();
const mockTreeDocs = vi.fn();
const mockGetDoc = vi.fn();
const mockGetRenderedDoc = vi.fn();
const mockSearchDocs = vi.fn();
const mockListComponents = vi.fn();

vi.mock("@/lib/api-client", () => ({
  docs: {
    list: (...args: unknown[]) => mockListDocs(...args),
    tree: (...args: unknown[]) => mockTreeDocs(...args),
    get: (...args: unknown[]) => mockGetDoc(...args),
    getRendered: (...args: unknown[]) => mockGetRenderedDoc(...args),
    search: (...args: unknown[]) => mockSearchDocs(...args),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getBuilds: vi.fn().mockResolvedValue([]),
  },
  catalog: {
    listComponents: (...args: unknown[]) => mockListComponents(...args),
  },
  ApiError: class extends Error {
    constructor(public status: number, public body: { message: string | string[] }) {
      super("API Error");
      this.name = "ApiError";
    }
  },
}));

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({
    user: { username: "admin", displayName: "Admin User", roles: ["admin"] },
    hasRole: (role: string) => role === "admin",
  }),
}));

import DocsPage from "@/app/(protected)/docs/page";

const mockDoc = (overrides: Record<string, unknown> = {}) => ({
  id: "d1",
  title: "Getting Started",
  componentId: "c1",
  author: "Admin",
  version: "1.0.0",
  updatedAt: new Date().toISOString(),
  ...overrides,
});

const mockNode = (overrides: Record<string, unknown> = {}) => ({
  id: "d1",
  title: "Getting Started",
  children: [],
  ...overrides,
});

describe("DocsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockListDocs.mockResolvedValue({ data: [], total: 0 });
    mockListComponents.mockResolvedValue({ data: [] });
    mockTreeDocs.mockResolvedValue([]);
  });

  it("should render heading and empty state", async () => {
    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("Documentation")).toBeInTheDocument();
    });
    expect(screen.getByText(/No documentation registered yet/i)).toBeInTheDocument();
  });

  it("should list components in the selector", async () => {
    mockListDocs.mockResolvedValue({
      data: [mockDoc({ componentId: "c1" })],
      total: 1,
    });
    mockListComponents.mockResolvedValue({
      data: [{ id: "c1", name: "auth-service" }],
    });

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    expect(screen.getByText("auth-service")).toBeInTheDocument();
  });

  it("should display documentation tree", async () => {
    mockListDocs.mockResolvedValue({
      data: [mockDoc({ componentId: "c1" })],
      total: 1,
    });
    mockTreeDocs.mockResolvedValue([
      mockNode({ title: "Architecture", children: [mockNode({ id: "d2", title: "API Design" })] }),
    ]);

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("Architecture")).toBeInTheDocument();
    });
    expect(screen.getByText("API Design")).toBeInTheDocument();
  });

  it("should display content when a document is selected", async () => {
    const user = userEvent.setup();
    mockListDocs.mockResolvedValue({ data: [mockDoc()], total: 1 });
    mockTreeDocs.mockResolvedValue([mockNode({ id: "d1", title: "Getting Started" })]);
    mockGetDoc.mockResolvedValue(mockDoc({ title: "Getting Started" }));
    mockGetRenderedDoc.mockResolvedValue("<h1>Welcome</h1><p>Start here.</p>");

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("Getting Started")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Getting Started"));

    await waitFor(() => {
      expect(screen.getByText("Welcome")).toBeInTheDocument();
    });
    expect(screen.getByText("Start here.")).toBeInTheDocument();
  });

  it("should search for documentation", async () => {
    const user = userEvent.setup();
    mockListDocs.mockResolvedValue({ data: [mockDoc()], total: 1 });
    mockSearchDocs.mockResolvedValue([
      { id: "d1", title: "Found Doc", componentId: "c1", score: 0.95 },
    ]);

    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText("Search documentation...")).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText("Search documentation..."), "test");
    await user.click(screen.getByText("Search"));

    await waitFor(() => {
      expect(screen.getByText("Search Results (1)")).toBeInTheDocument();
    });
    expect(screen.getByText("Found Doc")).toBeInTheDocument();
    expect(screen.getByText("95%")).toBeInTheDocument();
  });

  it("should show/hide form for admin", async () => {
    const user = userEvent.setup();
    render(<DocsPage />);

    await waitFor(() => {
      expect(screen.getByText("New Document")).toBeInTheDocument();
    });

    await user.click(screen.getByText("New Document"));

    expect(screen.getByText("Register a new documentation entry by providing a title and source URL.")).toBeInTheDocument();
    expect(screen.getByText("Cancel")).toBeInTheDocument();

    await user.click(screen.getByText("Cancel"));
    expect(screen.queryByText("Register a new documentation entry")).not.toBeInTheDocument();
  });
});
