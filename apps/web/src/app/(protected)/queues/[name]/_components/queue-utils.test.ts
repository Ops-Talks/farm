import { describe, it, expect } from "vitest";
import {
  statusBadgeVariant,
  formatTimestamp,
  formatDuration,
} from "@/app/(protected)/queues/[name]/_components/queue-utils";

describe("statusBadgeVariant", () => {
  it("returns 'default' for completed", () => {
    expect(statusBadgeVariant("completed")).toBe("default");
  });

  it("returns 'destructive' for failed", () => {
    expect(statusBadgeVariant("failed")).toBe("destructive");
  });

  it("returns 'secondary' for active", () => {
    expect(statusBadgeVariant("active")).toBe("secondary");
  });

  it("returns 'outline' for unknown statuses", () => {
    expect(statusBadgeVariant("waiting")).toBe("outline");
    expect(statusBadgeVariant("delayed")).toBe("outline");
    expect(statusBadgeVariant("unknown")).toBe("outline");
  });
});

describe("formatTimestamp", () => {
  it("returns '--' when timestamp is undefined", () => {
    expect(formatTimestamp(undefined)).toBe("--");
  });

  it("returns '--' when timestamp is 0", () => {
    expect(formatTimestamp(0)).toBe("--");
  });

  it("returns a non-empty string for a valid timestamp", () => {
    const result = formatTimestamp(Date.now());
    expect(result).not.toBe("--");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatDuration", () => {
  it("returns '--' when start is undefined", () => {
    expect(formatDuration(undefined, Date.now())).toBe("--");
  });

  it("returns '--' when end is undefined", () => {
    expect(formatDuration(Date.now(), undefined)).toBe("--");
  });

  it("returns '--' when both are undefined", () => {
    expect(formatDuration(undefined, undefined)).toBe("--");
  });

  it("returns milliseconds for a sub-second duration", () => {
    const start = 1000000;
    const end = start + 500;
    expect(formatDuration(start, end)).toBe("500ms");
  });

  it("returns seconds for a sub-minute duration", () => {
    const start = 1000000;
    const end = start + 3500;
    expect(formatDuration(start, end)).toBe("3.5s");
  });

  it("returns minutes for a long-running job", () => {
    const start = 1000000;
    const end = start + 90_000; // 1.5 minutes
    expect(formatDuration(start, end)).toBe("1.5m");
  });
});
