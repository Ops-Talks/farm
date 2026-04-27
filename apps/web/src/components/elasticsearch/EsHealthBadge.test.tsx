import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  EsHealthBadge,
  resolveEsHealthKind,
} from "./EsHealthBadge";

describe("EsHealthBadge (FARM-T406 — shared badge contract)", () => {
  it("renders red for stats.health=red", () => {
    render(
      <EsHealthBadge
        row={{
          reachable: true,
          stats: { health: "red" },
        }}
      />,
    );
    const badge = screen.getByTestId("es-health-badge");
    expect(badge).toHaveAttribute("data-health", "red");
    expect(badge).toHaveAttribute("aria-label", expect.stringMatching(/critical/i));
  });

  it("renders green for stats.health=green", () => {
    render(
      <EsHealthBadge
        row={{ reachable: true, stats: { health: "green" } }}
      />,
    );
    expect(screen.getByTestId("es-health-badge")).toHaveAttribute(
      "data-health",
      "green",
    );
  });

  it("renders yellow for stats.health=yellow", () => {
    render(
      <EsHealthBadge
        row={{ reachable: true, stats: { health: "yellow" } }}
      />,
    );
    expect(screen.getByTestId("es-health-badge")).toHaveAttribute(
      "data-health",
      "yellow",
    );
  });

  it("renders unknown when stats are absent but reachable", () => {
    render(<EsHealthBadge row={{ reachable: true }} />);
    expect(screen.getByTestId("es-health-badge")).toHaveAttribute(
      "data-health",
      "unknown",
    );
  });

  it("renders unknown when stats.health is unknown", () => {
    render(
      <EsHealthBadge
        row={{ reachable: true, stats: { health: "unknown" } }}
      />,
    );
    expect(screen.getByTestId("es-health-badge")).toHaveAttribute(
      "data-health",
      "unknown",
    );
  });

  it("renders unreachable when reachable=false", () => {
    render(<EsHealthBadge row={{ reachable: false }} />);
    expect(screen.getByTestId("es-health-badge")).toHaveAttribute(
      "data-health",
      "unreachable",
    );
  });

  it("resolveEsHealthKind contract", () => {
    expect(resolveEsHealthKind({ reachable: false })).toBe("unreachable");
    expect(resolveEsHealthKind({ reachable: true })).toBe("unknown");
    expect(
      resolveEsHealthKind({ reachable: true, stats: { health: "red" } }),
    ).toBe("red");
  });
});
