/**
 * Tests for NotificationListener — S116 / FARM-E26
 *
 * Covers:
 *  1. Component renders null (nothing in DOM)
 *  2. Subscribes to two WebSocket events on mount
 *  3. Calls both unsubscribe functions on unmount
 *  4. Shows info toast for audit-log.created events
 *  5. Shows success toast for SUCCEEDED pipeline runs
 *  6. Shows error toast for FAILED pipeline runs
 *  7. Shows info toast for CANCELLED pipeline runs with short run id
 *  8. Does NOT toast for RUNNING status
 *  9. Does NOT toast for WAITING_APPROVAL status
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { FarmEvent, PipelineRunStatus } from "@/types/api";
import type { AuditLog, PipelineRun } from "@/types/api";

// ---------------------------------------------------------------------------
// Use vi.hoisted so these variables are initialised before the vi.mock
// factories run (vi.mock calls are hoisted to the top of the file by Vitest).
// ---------------------------------------------------------------------------
type EventCallback = (payload: unknown) => void;

const { capturedCallbacks, capturedUnsubFns, mockSubscribe } = vi.hoisted(() => {
  const capturedCallbacks: Record<string, EventCallback> = {};
  const capturedUnsubFns: Record<string, ReturnType<typeof vi.fn>> = {};

  const mockSubscribe = vi.fn((event: string, callback: EventCallback) => {
    capturedCallbacks[event] = callback;
    const unsubFn = vi.fn();
    capturedUnsubFns[event] = unsubFn;
    return unsubFn;
  });

  return { capturedCallbacks, capturedUnsubFns, mockSubscribe };
});

vi.mock("@/lib/ws-client", () => ({
  subscribe: mockSubscribe,
}));

// sonner is already mocked globally in setup.ts but we re-declare here to
// ensure the module factory is isolated per test file.
vi.mock("sonner", () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
  },
  Toaster: () => null,
}));

// Component import must come after vi.mock declarations.
import { NotificationListener } from "@/components/notification-listener";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const mockAuditLog: AuditLog = {
  id: "audit-1",
  actor: "alice",
  action: "created",
  resourceType: "Pipeline",
  resourceId: "p-1",
  createdAt: "2025-01-01T00:00:00Z",
};

function makeMockRun(status: PipelineRunStatus): PipelineRun {
  return {
    id: "abc12345-0000-0000-0000-000000000000",
    pipelineId: "p-1",
    status,
    triggeredBy: "alice",
    createdAt: "2025-01-01T00:00:00Z",
    updatedAt: "2025-01-01T00:00:00Z",
  };
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe("NotificationListener", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset captured state between tests so each test starts clean.
    Object.keys(capturedCallbacks).forEach((k) => delete capturedCallbacks[k]);
    Object.keys(capturedUnsubFns).forEach((k) => delete capturedUnsubFns[k]);
  });

  // -------------------------------------------------------------------------
  // 1. Renders null
  // -------------------------------------------------------------------------
  it("renders null — no DOM elements present", () => {
    const { container } = render(<NotificationListener />);
    expect(container.firstChild).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. Subscribes to two events on mount
  // -------------------------------------------------------------------------
  it("subscribes to AUDIT_LOG_CREATED and PIPELINE_RUN_UPDATED on mount", () => {
    render(<NotificationListener />);

    expect(mockSubscribe).toHaveBeenCalledTimes(2);
    expect(mockSubscribe).toHaveBeenCalledWith(
      FarmEvent.AUDIT_LOG_CREATED,
      expect.any(Function),
    );
    expect(mockSubscribe).toHaveBeenCalledWith(
      FarmEvent.PIPELINE_RUN_UPDATED,
      expect.any(Function),
    );
  });

  // -------------------------------------------------------------------------
  // 3. Unsubscribes on unmount
  // -------------------------------------------------------------------------
  it("calls both unsubscribe functions when the component unmounts", () => {
    const { unmount } = render(<NotificationListener />);

    const unsubAudit = capturedUnsubFns[FarmEvent.AUDIT_LOG_CREATED];
    const unsubPipeline = capturedUnsubFns[FarmEvent.PIPELINE_RUN_UPDATED];

    expect(unsubAudit).toBeDefined();
    expect(unsubPipeline).toBeDefined();

    unmount();

    expect(unsubAudit).toHaveBeenCalledTimes(1);
    expect(unsubPipeline).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // 4. Info toast for audit-log.created
  // -------------------------------------------------------------------------
  it("shows an info toast for audit-log.created events", async () => {
    const { toast } = await import("sonner");

    render(<NotificationListener />);
    capturedCallbacks[FarmEvent.AUDIT_LOG_CREATED](mockAuditLog);

    expect(toast.info).toHaveBeenCalledWith(
      "alice created Pipeline",
      expect.objectContaining({ duration: 3000 }),
    );
  });

  // -------------------------------------------------------------------------
  // 5. Success toast for SUCCEEDED
  // -------------------------------------------------------------------------
  it("shows a success toast when a pipeline run SUCCEEDS", async () => {
    const { toast } = await import("sonner");

    render(<NotificationListener />);
    capturedCallbacks[FarmEvent.PIPELINE_RUN_UPDATED](
      makeMockRun(PipelineRunStatus.SUCCEEDED),
    );

    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("abc12345"),
    );
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining("SUCCEEDED"),
    );
  });

  // -------------------------------------------------------------------------
  // 6. Error toast for FAILED
  // -------------------------------------------------------------------------
  it("shows an error toast when a pipeline run FAILS", async () => {
    const { toast } = await import("sonner");

    render(<NotificationListener />);
    capturedCallbacks[FarmEvent.PIPELINE_RUN_UPDATED](
      makeMockRun(PipelineRunStatus.FAILED),
    );

    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("abc12345"),
    );
    expect(toast.error).toHaveBeenCalledWith(
      expect.stringContaining("FAILED"),
    );
  });

  // -------------------------------------------------------------------------
  // 7. Info toast for CANCELLED with short run id
  // -------------------------------------------------------------------------
  it("shows an info toast with the short run id when a pipeline run is CANCELLED", async () => {
    const { toast } = await import("sonner");

    render(<NotificationListener />);
    capturedCallbacks[FarmEvent.PIPELINE_RUN_UPDATED](
      makeMockRun(PipelineRunStatus.CANCELLED),
    );

    // The component slices the id to the first 8 characters.
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining("abc12345"),
    );
    expect(toast.info).toHaveBeenCalledWith(
      expect.stringContaining("CANCELLED"),
    );
  });

  // -------------------------------------------------------------------------
  // 8. No toast for RUNNING
  // -------------------------------------------------------------------------
  it("does NOT show a toast for RUNNING status", async () => {
    const { toast } = await import("sonner");

    render(<NotificationListener />);
    capturedCallbacks[FarmEvent.PIPELINE_RUN_UPDATED](
      makeMockRun(PipelineRunStatus.RUNNING),
    );

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 9. No toast for WAITING_APPROVAL
  // -------------------------------------------------------------------------
  it("does NOT show a toast for WAITING_APPROVAL status", async () => {
    const { toast } = await import("sonner");

    render(<NotificationListener />);
    capturedCallbacks[FarmEvent.PIPELINE_RUN_UPDATED](
      makeMockRun(PipelineRunStatus.WAITING_APPROVAL),
    );

    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.info).not.toHaveBeenCalled();
  });
});
