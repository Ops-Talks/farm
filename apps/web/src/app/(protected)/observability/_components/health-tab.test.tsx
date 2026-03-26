import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { HealthTab } from "@/app/(protected)/observability/_components/health-tab";
import type { HealthStatus, ObservabilitySummary } from "@/types/api";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const makeHealthStatus = (overrides: Partial<HealthStatus> = {}): HealthStatus => ({
  status: "ok",
  info: {
    database: { status: "up", connectionCount: 5 },
    redis: { status: "up", usedMemory: 1024 * 1024 },
  },
  ...overrides,
} as HealthStatus);

const makeSummary = (overrides: Partial<ObservabilitySummary> = {}): ObservabilitySummary => ({
  uptime: 3661,
  memory: {
    heapUsed: 50 * 1024 * 1024,
    heapTotal: 100 * 1024 * 1024,
    rss: 80 * 1024 * 1024,
    external: 0,
    arrayBuffers: 0,
  },
  requestsByStatus: {},
  latencyPercentiles: { p50: 10, p90: 50, p95: 100, p99: 200 },
  ...overrides,
} as ObservabilitySummary);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("HealthTab", () => {
  it("shows 'API Unreachable' when healthData is null", () => {
    render(<HealthTab healthData={null} summary={null} />);
    expect(screen.getByText("API Unreachable")).toBeInTheDocument();
  });

  it("shows 'Healthy' badge when status is ok", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={null} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
  });

  it("shows 'Degraded' badge when status is not ok", () => {
    render(<HealthTab healthData={makeHealthStatus({ status: "error" })} summary={null} />);
    expect(screen.getByText("Degraded")).toBeInTheDocument();
  });

  it("renders uptime formatted when summary is provided", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={makeSummary()} />);
    // 3661 seconds = 1h 1m 1s
    expect(screen.getByText("1h 1m 1s")).toBeInTheDocument();
  });

  it("renders heap memory when summary is provided", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={makeSummary()} />);
    expect(screen.getByText("Heap Memory")).toBeInTheDocument();
    expect(screen.getByText("50.0 MB")).toBeInTheDocument();
  });

  it("renders RSS memory when summary is provided", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={makeSummary()} />);
    expect(screen.getByText("RSS Memory")).toBeInTheDocument();
    expect(screen.getByText("80.0 MB")).toBeInTheDocument();
  });

  it("renders service status cards for info entries", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={null} />);
    expect(screen.getByText("database")).toBeInTheDocument();
    expect(screen.getByText("redis")).toBeInTheDocument();
  });

  it("renders 'up' badge for services that are up", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={null} />);
    const upBadges = screen.getAllByText("up");
    expect(upBadges.length).toBeGreaterThanOrEqual(2);
  });

  it("renders numeric values as bytes for known memory keys", () => {
    const healthData = makeHealthStatus({
      info: {
        memory: { status: "up", heapUsed: 1024 },
      },
    });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("1.0 KB")).toBeInTheDocument();
  });

  it("does not render summary cards when summary is null", () => {
    render(<HealthTab healthData={makeHealthStatus()} summary={null} />);
    expect(screen.queryByText("Heap Memory")).not.toBeInTheDocument();
    expect(screen.queryByText("Uptime")).not.toBeInTheDocument();
  });

  it("renders a destructive badge for services with status 'down'", () => {
    const healthData = makeHealthStatus({
      info: { database: { status: "down" } },
    });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("down")).toBeInTheDocument();
  });

  it("renders a secondary badge for services with an unrecognized status", () => {
    const healthData = makeHealthStatus({
      info: { cache: { status: "degrading" } },
    });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("degrading")).toBeInTheDocument();
  });

  it("formats memory below 1 KB as raw bytes", () => {
    const healthData = makeHealthStatus({
      info: { memory: { status: "up", heapUsed: 512 } },
    });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("512 B")).toBeInTheDocument();
  });

  it("formats memory of 1 GB or more in GB", () => {
    const healthData = makeHealthStatus({
      info: { memory: { status: "up", heapUsed: 2 * 1024 * 1024 * 1024 } },
    });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("2.0 GB")).toBeInTheDocument();
  });

  it("formats uptime as seconds only when under one minute", () => {
    render(
      <HealthTab healthData={makeHealthStatus()} summary={makeSummary({ uptime: 45 })} />,
    );
    expect(screen.getByText("45s")).toBeInTheDocument();
  });

  it("formats uptime with a days component when exceeding 24 hours", () => {
    // 90061 seconds = 1d 1h 1m 1s
    render(
      <HealthTab healthData={makeHealthStatus()} summary={makeSummary({ uptime: 90061 })} />,
    );
    expect(screen.getByText("1d 1h 1m 1s")).toBeInTheDocument();
  });

  it("renders non-numeric detail values as plain strings", () => {
    const healthData = makeHealthStatus({
      info: { service: { status: "up", version: "3.14.1" } },
    });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("3.14.1")).toBeInTheDocument();
  });

  it("renders no info cards when healthData.info is undefined", () => {
    const healthData = makeHealthStatus({ info: undefined });
    render(<HealthTab healthData={healthData} summary={null} />);
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.queryByText("database")).not.toBeInTheDocument();
  });

  it("renders zero bytes for heap and RSS when summary memory properties are absent", () => {
    const summaryNoMem = makeSummary({ memory: undefined });
    render(<HealthTab healthData={makeHealthStatus()} summary={summaryNoMem} />);
    // Both heapUsed ?? 0 and rss ?? 0 resolve to 0 bytes
    const zeroBValues = screen.getAllByText("0 B");
    expect(zeroBValues.length).toBeGreaterThanOrEqual(1);
  });
});
