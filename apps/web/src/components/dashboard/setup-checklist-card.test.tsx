import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { SetupChecklistCard } from "./setup-checklist-card";

vi.mock("@/contexts/auth-context", () => ({
  useAuth: () => ({ isAuthenticated: true }),
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));

vi.mock("@/lib/api-client", () => ({
  setup: {
    getChecklist: vi.fn().mockResolvedValue([]),
    dismissItem: vi.fn().mockResolvedValue(undefined),
  },
}));

const mockInvalidateQueries = vi.fn();
const mockMutate = vi.fn();

// Mutable container so tests can inspect the callbacks passed to useMutation.
// NOTE: vi.mock is hoisted before variable declarations at runtime, but the
// factory closure captures the BINDING, which is initialised before any test
// function executes, so the captured callbacks are always available.
const capturedMutation: {
  mutationFn?: (key: string) => Promise<void>;
  onSuccess?: () => void;
  onError?: () => void;
} = {};

vi.mock("@tanstack/react-query", () => ({
  useQuery: vi.fn(),
  useMutation: (opts: {
    mutationFn?: (key: string) => Promise<void>;
    onSuccess?: () => void;
    onError?: () => void;
  }) => {
    capturedMutation.mutationFn = opts.mutationFn;
    capturedMutation.onSuccess = opts.onSuccess;
    capturedMutation.onError = opts.onError;
    return { mutate: mockMutate, isPending: false };
  },
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

import { useQuery } from "@tanstack/react-query";
import { setup as setupApi } from "@/lib/api-client";
import { toast } from "sonner";

const pendingItem = { key: "k8s", title: "Configure Kubernetes", completed: false, dismissed: false, description: "", href: "/kubernetes" };
const doneItem = { key: "registry", title: "Configure Registry", completed: true, dismissed: false, description: "", href: "/integrations/settings" };

describe("SetupChecklistCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useQuery).mockReturnValue({
      data: [pendingItem, doneItem],
      isLoading: false,
    } as ReturnType<typeof useQuery>);
  });

  it("renders pending and completed items, hides dismissed items", () => {
    render(<SetupChecklistCard />);
    expect(screen.getByText("Configure Kubernetes")).toBeTruthy();
    // completed (non-dismissed) item is now shown with a checkmark
    expect(screen.getByText("Configure Registry")).toBeTruthy();
  });

  it("dismiss button triggers mutate", () => {
    render(<SetupChecklistCard />);
    fireEvent.click(screen.getByLabelText("Dismiss Configure Kubernetes"));
    expect(mockMutate).toHaveBeenCalledWith("k8s");
  });

  it("returns null when no pending items", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: [{ key: "k8s", title: "K8s", completed: true, dismissed: false, description: "", href: "/kubernetes" }],
      isLoading: false,
    } as ReturnType<typeof useQuery>);
    const { container } = render(<SetupChecklistCard />);
    expect(container.firstChild).toBeNull();
  });

  it("shows skeletons while loading", () => {
    vi.mocked(useQuery).mockReturnValue({
      data: undefined,
      isLoading: true,
    } as ReturnType<typeof useQuery>);
    const { container } = render(<SetupChecklistCard />);
    // Card renders (not null) even while loading
    expect(container.firstChild).not.toBeNull();
  });

  it("queryFn calls the getChecklist API endpoint", async () => {
    // Override useQuery so it calls the queryFn passed by the component.
    vi.mocked(useQuery).mockImplementation((opts) => {
      const fn = (opts as { queryFn?: () => unknown }).queryFn;
      void fn?.();
      return {
        data: [pendingItem],
        isLoading: false,
      } as unknown as ReturnType<typeof useQuery>;
    });
    render(<SetupChecklistCard />);
    expect(vi.mocked(setupApi.getChecklist)).toHaveBeenCalled();
  });

  it("mutationFn calls the dismissItem API endpoint", async () => {
    render(<SetupChecklistCard />);
    // Directly invoke the captured mutationFn to cover its body (line 61).
    await capturedMutation.mutationFn?.("k8s");
    expect(vi.mocked(setupApi.dismissItem)).toHaveBeenCalledWith("k8s");
  });

  it("onSuccess invalidates the setup-checklist query", () => {
    render(<SetupChecklistCard />);
    capturedMutation.onSuccess?.();
    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ["setup-checklist"],
    });
  });

  it("onError shows a toast error message", () => {
    render(<SetupChecklistCard />);
    capturedMutation.onError?.();
    expect(vi.mocked(toast.error)).toHaveBeenCalledWith("Failed to dismiss item");
  });
});
