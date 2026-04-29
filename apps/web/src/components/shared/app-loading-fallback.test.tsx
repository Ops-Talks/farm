import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AppLoadingFallback } from "./app-loading-fallback";

describe("AppLoadingFallback", () => {
  it('renders with aria-label="Loading"', () => {
    render(<AppLoadingFallback />);
    expect(screen.getByLabelText("Loading")).toBeInTheDocument();
  });

  it('renders the "Farm" text', () => {
    render(<AppLoadingFallback />);
    expect(screen.getByText("Farm")).toBeInTheDocument();
  });
});
