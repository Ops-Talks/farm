import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HelmChartCard } from "./HelmChartCard";
import type { HelmChart } from "@/types/api";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const FULL_HELM_CHART: HelmChart = {
  repo: "https://charts.bitnami.com/bitnami",
  chart: "nginx",
  version: "15.1.0",
  valuesRef: "configmap/nginx-values",
};

const MINIMAL_HELM_CHART: HelmChart = {
  repo: "https://charts.example.com",
  chart: "my-app",
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("HelmChartCard", () => {
  it("renders nothing when helmChart is null", () => {
    const { container } = render(<HelmChartCard helmChart={null} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing when helmChart is undefined", () => {
    const { container } = render(<HelmChartCard />);
    expect(container.firstChild).toBeNull();
  });

  it("renders the Helm Chart card title when helmChart is set", () => {
    render(<HelmChartCard helmChart={FULL_HELM_CHART} />);
    expect(screen.getByText("Helm Chart")).toBeInTheDocument();
  });

  it("displays repo, chart, version, and valuesRef for a fully populated helmChart", () => {
    render(<HelmChartCard helmChart={FULL_HELM_CHART} />);

    expect(screen.getByText("https://charts.bitnami.com/bitnami")).toBeInTheDocument();
    expect(screen.getByText("nginx")).toBeInTheDocument();
    expect(screen.getByText("15.1.0")).toBeInTheDocument();
    expect(screen.getByText("configmap/nginx-values")).toBeInTheDocument();
  });

  it("renders without optional version and valuesRef", () => {
    render(<HelmChartCard helmChart={MINIMAL_HELM_CHART} />);

    expect(screen.getByText("https://charts.example.com")).toBeInTheDocument();
    expect(screen.getByText("my-app")).toBeInTheDocument();
    // Optional fields should not appear at all when absent.
    expect(screen.queryByText("Version")).not.toBeInTheDocument();
    expect(screen.queryByText("Values Ref")).not.toBeInTheDocument();
  });

  it("shows field labels in uppercase", () => {
    render(<HelmChartCard helmChart={FULL_HELM_CHART} />);

    expect(screen.getByText("Repo")).toBeInTheDocument();
    expect(screen.getByText("Chart")).toBeInTheDocument();
    expect(screen.getByText("Version")).toBeInTheDocument();
    expect(screen.getByText("Values Ref")).toBeInTheDocument();
  });
});
