/**
 * Tests for the VersionSelector component.
 *
 * Covers: renders nothing while loading or with no ready builds, renders
 * selector with ready builds, calls onBuildSelected with the first ready
 * build on mount, and filters out non-ready builds.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { VersionSelector } from "./VersionSelector";
import type { DocumentationBuild } from "@/types/api";

// ---------------------------------------------------------------------------
// Hoisted mock factories — must be created before vi.mock() factories run.
// ---------------------------------------------------------------------------
const mocks = vi.hoisted(() => ({
  docsGetBuilds: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Module mocks
// ---------------------------------------------------------------------------

vi.mock("@/lib/api-client", () => ({
  docs: {
    getBuilds: mocks.docsGetBuilds,
  },
}));

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

const buildReady1: DocumentationBuild = {
  id: "build-1",
  componentId: "comp-1",
  version: "1.0.0",
  sourceType: "mkdocs",
  status: "ready",
  buildLog: null,
  artifactsPath: "/artifacts/build-1",
  triggeredAt: "2024-01-01T00:00:00Z",
  completedAt: "2024-01-01T00:05:00Z",
};

const buildReady2: DocumentationBuild = {
  id: "build-2",
  componentId: "comp-1",
  version: "2.0.0",
  sourceType: "markdown",
  status: "ready",
  buildLog: null,
  artifactsPath: "/artifacts/build-2",
  triggeredAt: "2024-01-02T00:00:00Z",
  completedAt: "2024-01-02T00:05:00Z",
};

const buildBuilding: DocumentationBuild = {
  id: "build-3",
  componentId: "comp-1",
  version: "3.0.0",
  sourceType: "mkdocs",
  status: "building",
  buildLog: null,
  artifactsPath: null,
  triggeredAt: "2024-01-03T00:00:00Z",
  completedAt: null,
};

const buildFailed: DocumentationBuild = {
  id: "build-4",
  componentId: "comp-1",
  version: "4.0.0",
  sourceType: "markdown",
  status: "failed",
  buildLog: "Error: build failed",
  artifactsPath: null,
  triggeredAt: "2024-01-04T00:00:00Z",
  completedAt: "2024-01-04T00:01:00Z",
};

// ---------------------------------------------------------------------------
// Test suites
// ---------------------------------------------------------------------------

describe("VersionSelector", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // -------------------------------------------------------------------------
  // 1. Renders nothing while loading or when no ready builds
  // -------------------------------------------------------------------------
  it("renders nothing when getBuilds returns an empty array", async () => {
    mocks.docsGetBuilds.mockResolvedValue([]);
    const onBuildSelected = vi.fn();

    const { container } = render(
      <VersionSelector componentId="comp-1" onBuildSelected={onBuildSelected} />,
    );

    // Wait for the promise to settle
    await waitFor(() => expect(mocks.docsGetBuilds).toHaveBeenCalledOnce());

    // Component should render nothing (null)
    expect(container.firstChild).toBeNull();
  });

  // -------------------------------------------------------------------------
  // 2. Renders version selector with ready builds
  // -------------------------------------------------------------------------
  it("renders a select element when ready builds are returned", async () => {
    mocks.docsGetBuilds.mockResolvedValue([buildReady1, buildReady2]);
    const onBuildSelected = vi.fn();

    render(
      <VersionSelector componentId="comp-1" onBuildSelected={onBuildSelected} />,
    );

    // The native select has aria-label "Select build version"
    const select = await screen.findByRole("combobox", {
      name: /select build version/i,
    });

    expect(select).toBeInTheDocument();

    // Both ready builds should appear as options
    expect(screen.getByRole("option", { name: /1\.0\.0/i })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /2\.0\.0/i })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // 3. Calls onBuildSelected with the first ready build on mount
  // -------------------------------------------------------------------------
  it("calls onBuildSelected with the first ready build immediately after load", async () => {
    mocks.docsGetBuilds.mockResolvedValue([buildReady1, buildReady2]);
    const onBuildSelected = vi.fn();

    render(
      <VersionSelector componentId="comp-1" onBuildSelected={onBuildSelected} />,
    );

    await waitFor(() =>
      expect(onBuildSelected).toHaveBeenCalledWith(buildReady1),
    );
  });

  // -------------------------------------------------------------------------
  // 4. Filters out non-ready builds (building + failed)
  // -------------------------------------------------------------------------
  it("renders nothing when all returned builds have non-ready status", async () => {
    mocks.docsGetBuilds.mockResolvedValue([buildBuilding, buildFailed]);
    const onBuildSelected = vi.fn();

    const { container } = render(
      <VersionSelector componentId="comp-1" onBuildSelected={onBuildSelected} />,
    );

    await waitFor(() => expect(mocks.docsGetBuilds).toHaveBeenCalledOnce());

    // No ready builds — component must render null
    expect(container.firstChild).toBeNull();

    // Callback should be called with null since there are no ready builds
    expect(onBuildSelected).toHaveBeenCalledWith(null);
  });

  // -------------------------------------------------------------------------
  // 5. Calls onBuildSelected with null when getBuilds rejects
  // -------------------------------------------------------------------------
  it("calls onBuildSelected with null and renders nothing on error", async () => {
    mocks.docsGetBuilds.mockRejectedValue(new Error("Network error"));
    const onBuildSelected = vi.fn();

    const { container } = render(
      <VersionSelector componentId="comp-1" onBuildSelected={onBuildSelected} />,
    );

    await waitFor(() => expect(mocks.docsGetBuilds).toHaveBeenCalledOnce());

    expect(container.firstChild).toBeNull();
    expect(onBuildSelected).toHaveBeenCalledWith(null);
  });
});
