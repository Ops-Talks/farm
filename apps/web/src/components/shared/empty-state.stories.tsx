import type { Meta, StoryObj } from "@storybook/react";
import { Server, ShieldAlert, DatabaseZap } from "lucide-react";

import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof EmptyState> = {
  title: "Shared/EmptyState",
  component: EmptyState,
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

type Story = StoryObj<typeof EmptyState>;

// ---------------------------------------------------------------------------
// With icon, title, and description
// ---------------------------------------------------------------------------

export const WithIconAndDescription: Story = {
  name: "With Icon, Title, and Description",
  args: {
    title: "No services found",
    description:
      "You have not deployed any services yet. Get started by adding your first service.",
    icon: <Server className="h-6 w-6 text-muted-foreground" />,
  },
};

// ---------------------------------------------------------------------------
// With action button
// ---------------------------------------------------------------------------

export const WithActionButton: Story = {
  name: "With Action Button",
  args: {
    title: "No environments",
    description: "Create your first environment to start deploying services.",
    icon: <DatabaseZap className="h-6 w-6 text-muted-foreground" />,
  },
  render: (args) => (
    <EmptyState {...args}>
      <Button>Create Environment</Button>
    </EmptyState>
  ),
};

// ---------------------------------------------------------------------------
// With custom icon
// ---------------------------------------------------------------------------

export const WithCustomIcon: Story = {
  name: "With Custom Icon",
  args: {
    title: "No security alerts",
    description: "Your services are running without any known vulnerabilities.",
    icon: <ShieldAlert className="h-6 w-6 text-muted-foreground" />,
  },
};

// ---------------------------------------------------------------------------
// Minimal — title only
// ---------------------------------------------------------------------------

export const Minimal: Story = {
  name: "Minimal (Title Only)",
  args: {
    title: "Nothing here yet.",
  },
};

// ---------------------------------------------------------------------------
// Default icon (FolderSearch fallback)
// ---------------------------------------------------------------------------

export const DefaultIcon: Story = {
  name: "Default Icon (Fallback)",
  args: {
    title: "No results",
    description: "Try adjusting your search or filter criteria.",
  },
};
