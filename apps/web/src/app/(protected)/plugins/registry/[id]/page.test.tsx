import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./_components/PluginRegistryDetailClient", () => ({
  PluginRegistryDetailClient: () => (
    <div data-testid="plugin-registry-detail-client" />
  ),
}));

import PluginRegistryDetailPage from "@/app/(protected)/plugins/registry/[id]/page";

describe("PluginRegistryDetailPage", () => {
  it("renders the PluginRegistryDetailClient", () => {
    render(<PluginRegistryDetailPage />);
    expect(screen.getByTestId("plugin-registry-detail-client")).toBeInTheDocument();
  });
});
