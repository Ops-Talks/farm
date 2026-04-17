import { describe, it, expect } from "vitest";
import { providerBadgeClass } from "./iac-utils";
import type { IacProvider } from "@/types/api";

describe("providerBadgeClass", () => {
  it("returns the aws badge class for provider 'aws'", () => {
    const cls = providerBadgeClass("aws");
    expect(cls).toContain("orange");
  });

  it("returns the gcp badge class for provider 'gcp'", () => {
    const cls = providerBadgeClass("gcp");
    expect(cls).toContain("blue");
  });

  it("returns the azure badge class for provider 'azure'", () => {
    const cls = providerBadgeClass("azure");
    expect(cls).toContain("sky");
  });

  it("returns the kubernetes badge class for provider 'kubernetes'", () => {
    const cls = providerBadgeClass("kubernetes");
    expect(cls).toContain("indigo");
  });

  // -------------------------------------------------------------------------
  // Fallback branch (line 23): unknown provider returns default slate class
  // -------------------------------------------------------------------------

  it("returns the default slate badge class for an unknown provider", () => {
    const cls = providerBadgeClass("unknown-provider" as IacProvider);
    expect(cls).toContain("slate");
  });
});
