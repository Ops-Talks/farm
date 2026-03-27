import type { Meta, StoryObj } from "@storybook/react";
import { Plus, Trash2, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

const meta: Meta<typeof Button> = {
  title: "UI/Button",
  component: Button,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: [
        "default",
        "destructive",
        "outline",
        "secondary",
        "ghost",
        "link",
      ],
    },
    size: {
      control: "select",
      options: ["default", "sm", "lg", "icon", "xs", "icon-xs", "icon-sm", "icon-lg"],
    },
    disabled: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof Button>;

// ---------------------------------------------------------------------------
// Variant stories
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {
    children: "Button",
    variant: "default",
  },
};

export const Destructive: Story = {
  args: {
    children: "Delete",
    variant: "destructive",
  },
};

export const Outline: Story = {
  args: {
    children: "Outline",
    variant: "outline",
  },
};

export const Secondary: Story = {
  args: {
    children: "Secondary",
    variant: "secondary",
  },
};

export const Ghost: Story = {
  args: {
    children: "Ghost",
    variant: "ghost",
  },
};

export const Link: Story = {
  args: {
    children: "Link",
    variant: "link",
  },
};

// ---------------------------------------------------------------------------
// Size stories
// ---------------------------------------------------------------------------

export const SizeSmall: Story = {
  args: {
    children: "Small",
    size: "sm",
  },
};

export const SizeLarge: Story = {
  args: {
    children: "Large",
    size: "lg",
  },
};

export const SizeIcon: Story = {
  args: {
    children: <Plus />,
    size: "icon",
    "aria-label": "Add item",
  },
};

// ---------------------------------------------------------------------------
// With icon
// ---------------------------------------------------------------------------

export const WithLeadingIcon: Story = {
  args: {
    children: (
      <>
        <Plus data-icon="inline-start" />
        Add Item
      </>
    ),
  },
};

export const WithTrailingIcon: Story = {
  args: {
    children: (
      <>
        Delete
        <Trash2 data-icon="inline-end" />
      </>
    ),
    variant: "destructive",
  },
};

// ---------------------------------------------------------------------------
// State stories
// ---------------------------------------------------------------------------

export const Disabled: Story = {
  args: {
    children: "Disabled",
    disabled: true,
  },
};

export const Loading: Story = {
  args: {
    children: (
      <>
        <Loader2 className="animate-spin" data-icon="inline-start" />
        Loading...
      </>
    ),
    disabled: true,
  },
};
