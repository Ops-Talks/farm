import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { FilterTabs } from "@/components/shared/filter-tabs";

const meta: Meta<typeof FilterTabs> = {
  title: "Shared/FilterTabs",
  component: FilterTabs,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof FilterTabs>;

// ---------------------------------------------------------------------------
// Two tabs
// ---------------------------------------------------------------------------

export const TwoTabs: Story = {
  name: "Two Tabs",
  render: () => {
    const tabs = [
      { id: "active", label: "Active" },
      { id: "inactive", label: "Inactive" },
    ];

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [active, setActive] = useState("active");

    return (
      <FilterTabs tabs={tabs} activeTab={active} onChange={setActive} />
    );
  },
};

// ---------------------------------------------------------------------------
// Four tabs — catalog-style (All, Dev, Infra, Data, Security)
// ---------------------------------------------------------------------------

export const CatalogTabs: Story = {
  name: "Catalog Tabs (5 options)",
  render: () => {
    const tabs = [
      { id: "all", label: "All" },
      { id: "dev", label: "Dev" },
      { id: "infra", label: "Infra" },
      { id: "data", label: "Data" },
      { id: "security", label: "Security" },
    ];

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [active, setActive] = useState("all");

    return (
      <FilterTabs tabs={tabs} activeTab={active} onChange={setActive} />
    );
  },
};

// ---------------------------------------------------------------------------
// With active selection — starts on second tab
// ---------------------------------------------------------------------------

export const WithActiveSelection: Story = {
  name: "With Active Selection",
  render: () => {
    const tabs = [
      { id: "all", label: "All" },
      { id: "running", label: "Running" },
      { id: "stopped", label: "Stopped" },
      { id: "failed", label: "Failed" },
    ];

    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [active, setActive] = useState("running");

    return (
      <FilterTabs tabs={tabs} activeTab={active} onChange={setActive} />
    );
  },
};
