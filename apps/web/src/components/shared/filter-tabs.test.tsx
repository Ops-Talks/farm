import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { FilterTabs } from "@/components/shared/filter-tabs";

const TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "archived", label: "Archived" },
];

describe("FilterTabs", () => {
  it("renders all tab labels", () => {
    render(<FilterTabs tabs={TABS} activeTab="all" onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "All" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Active" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Archived" })).toBeInTheDocument();
  });

  it("calls onChange with the tab id when a tab is clicked", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<FilterTabs tabs={TABS} activeTab="all" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Active" }));
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("applies primary-colored border to the active tab", () => {
    render(<FilterTabs tabs={TABS} activeTab="active" onChange={vi.fn()} />);
    const activeButton = screen.getByRole("button", { name: "Active" });
    expect(activeButton.className).toContain("border-primary");
  });

  it("applies transparent border to inactive tabs", () => {
    render(<FilterTabs tabs={TABS} activeTab="all" onChange={vi.fn()} />);
    const inactiveButton = screen.getByRole("button", { name: "Archived" });
    expect(inactiveButton.className).toContain("border-transparent");
  });

  it("accepts an optional className prop", () => {
    const { container } = render(
      <FilterTabs
        tabs={TABS}
        activeTab="all"
        onChange={vi.fn()}
        className="my-custom-class"
      />,
    );
    expect(container.firstChild).toHaveClass("my-custom-class");
  });
});
