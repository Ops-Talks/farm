import type { Meta, StoryObj } from "@storybook/react";
import { Plus, RefreshCw, Settings } from "lucide-react";

import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof PageHeader> = {
  title: "Shared/PageHeader",
  component: PageHeader,
  parameters: {
    layout: "padded",
  },
  tags: ["autodocs"],
  argTypes: {
    title: { control: "text" },
    description: { control: "text" },
  },
};

export default meta;

type Story = StoryObj<typeof PageHeader>;

// ---------------------------------------------------------------------------
// Title and description only
// ---------------------------------------------------------------------------

export const TitleAndDescription: Story = {
  name: "Title and Description",
  args: {
    title: "Environments",
    description: "Manage your deployment environments.",
  },
};

// ---------------------------------------------------------------------------
// Title only
// ---------------------------------------------------------------------------

export const TitleOnly: Story = {
  name: "Title Only",
  args: {
    title: "Dashboard",
  },
};

// ---------------------------------------------------------------------------
// With action button
// ---------------------------------------------------------------------------

export const WithActionButton: Story = {
  name: "With Action Button",
  args: {
    title: "Services",
    description: "All services running in this environment.",
  },
  render: (args) => (
    <PageHeader {...args}>
      <Button>
        <Plus data-icon="inline-start" />
        New Service
      </Button>
    </PageHeader>
  ),
};

// ---------------------------------------------------------------------------
// With multiple action buttons
// ---------------------------------------------------------------------------

export const WithMultipleActions: Story = {
  name: "With Multiple Action Buttons",
  args: {
    title: "Catalog",
    description: "Browse available service templates.",
  },
  render: (args) => (
    <PageHeader {...args}>
      <Button variant="outline" size="icon" aria-label="Refresh">
        <RefreshCw />
      </Button>
      <Button variant="outline" size="icon" aria-label="Settings">
        <Settings />
      </Button>
      <Button>
        <Plus data-icon="inline-start" />
        Deploy
      </Button>
    </PageHeader>
  ),
};
