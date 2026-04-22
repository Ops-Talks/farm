import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("./_components/PluginRegistryBrowserClient", () => ({
  PluginRegistryBrowserClient: () => (
    <div data-testid="plugin-registry-browser-client" />
  ),
}));

import PluginRegistryPage from "@/app/(protected)/plugins/registry/page";

describe("PluginRegistryPage", () => {
  it("renders the PluginRegistryBrowserClient", () => {
    render(<PluginRegistryPage />);
    expect(screen.getByTestId("plugin-registry-browser-client")).toBeInTheDocument();
  });
});
