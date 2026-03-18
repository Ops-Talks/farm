import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { CatalogComponent, DocumentationTreeNode } from "@/types/api";

import { DocForm } from "@/app/(protected)/docs/_components/doc-form";

// DocForm calls onSave/onCancel callbacks — no API mocks needed.

const COMPONENTS: CatalogComponent[] = [
  {
    id: "c1",
    name: "auth-service",
    kind: "service" as never,
    lifecycle: "production" as never,
    owner: "team-alpha",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  },
];

const TREE_NODES: DocumentationTreeNode[] = [];

describe("DocForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    render(
      <DocForm
        components={COMPONENTS}
        treeNodes={TREE_NODES}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("New Document")).toBeInTheDocument();
    expect(screen.getByLabelText(/title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/component/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/author/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create Document" })).toBeInTheDocument();
  });

  it("shows validation errors when required fields are empty", async () => {
    const user = userEvent.setup();
    render(
      <DocForm
        components={COMPONENTS}
        treeNodes={TREE_NODES}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Create Document" }));

    await waitFor(() => {
      expect(screen.getByText("Title is required")).toBeInTheDocument();
    });
    expect(screen.getByText("Must be a valid URL")).toBeInTheDocument();
    expect(screen.getByText("Component is required")).toBeInTheDocument();
    expect(screen.getByText("Author is required")).toBeInTheDocument();
  });

  it("calls onSave with correct values when form is valid", async () => {
    const user = userEvent.setup();
    const mockOnSave = vi.fn();
    render(
      <DocForm
        components={COMPONENTS}
        treeNodes={TREE_NODES}
        onSave={mockOnSave}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/title/i), "Getting Started");
    await user.type(
      screen.getByLabelText(/source url/i),
      "https://github.com/org/repo/README.md",
    );
    await user.selectOptions(screen.getByLabelText(/component/i), "c1");
    await user.type(screen.getByLabelText(/author/i), "Alice");

    await user.click(screen.getByRole("button", { name: "Create Document" }));

    await waitFor(() => {
      expect(mockOnSave).toHaveBeenCalledOnce();
    });
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Getting Started",
        sourceUrl: "https://github.com/org/repo/README.md",
        componentId: "c1",
        author: "Alice",
      }),
    );
  });

  it("calls onCancel when Cancel is clicked", async () => {
    const user = userEvent.setup();
    const mockOnCancel = vi.fn();
    render(
      <DocForm
        components={COMPONENTS}
        treeNodes={TREE_NODES}
        onSave={vi.fn()}
        onCancel={mockOnCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(mockOnCancel).toHaveBeenCalledOnce();
  });

  it("pre-fills fields when editing an existing document", () => {
    const initial = {
      id: "doc-1",
      title: "Existing Doc",
      sourceUrl: "https://example.com/doc",
      componentId: "c1",
      author: "Bob",
      version: "2.0.0",
      parentId: null,
      order: 5,
      createdAt: "2025-01-01T00:00:00Z",
      updatedAt: "2025-01-01T00:00:00Z",
    };
    render(
      <DocForm
        components={COMPONENTS}
        treeNodes={TREE_NODES}
        initial={initial}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByText("Edit Document")).toBeInTheDocument();
    expect((screen.getByLabelText(/title/i) as HTMLInputElement).value).toBe("Existing Doc");
    expect((screen.getByLabelText(/author/i) as HTMLInputElement).value).toBe("Bob");
    expect(screen.getByRole("button", { name: "Save Changes" })).toBeInTheDocument();
  });

  it("shows a URL validation error for invalid sourceUrl", async () => {
    const user = userEvent.setup();
    render(
      <DocForm
        components={COMPONENTS}
        treeNodes={TREE_NODES}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    await user.type(screen.getByLabelText(/title/i), "My Doc");
    await user.type(screen.getByLabelText(/source url/i), "not-a-url");
    await user.selectOptions(screen.getByLabelText(/component/i), "c1");
    await user.type(screen.getByLabelText(/author/i), "Alice");

    await user.click(screen.getByRole("button", { name: "Create Document" }));

    await waitFor(() => {
      expect(screen.getByText("Must be a valid URL")).toBeInTheDocument();
    });
  });
});
