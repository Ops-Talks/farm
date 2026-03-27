import type { Meta, StoryObj } from "@storybook/react";

import { Input } from "@/components/ui/input";

const meta: Meta<typeof Input> = {
  title: "UI/Input",
  component: Input,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    disabled: { control: "boolean" },
    placeholder: { control: "text" },
    type: {
      control: "select",
      options: ["text", "email", "password", "number", "search", "url"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Input>;

// ---------------------------------------------------------------------------
// Default
// ---------------------------------------------------------------------------

export const Default: Story = {
  args: {},
};

// ---------------------------------------------------------------------------
// With placeholder
// ---------------------------------------------------------------------------

export const WithPlaceholder: Story = {
  name: "With Placeholder",
  args: {
    placeholder: "Enter a value...",
  },
};

// ---------------------------------------------------------------------------
// With label
// ---------------------------------------------------------------------------

export const WithLabel: Story = {
  name: "With Label",
  render: () => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor="story-input">
        Email address
      </label>
      <Input
        id="story-input"
        type="email"
        placeholder="you@example.com"
      />
    </div>
  ),
};

// ---------------------------------------------------------------------------
// Disabled state
// ---------------------------------------------------------------------------

export const Disabled: Story = {
  args: {
    placeholder: "Disabled input",
    disabled: true,
  },
};

// ---------------------------------------------------------------------------
// Error state (aria-invalid triggers red border via CSS)
// ---------------------------------------------------------------------------

export const ErrorState: Story = {
  name: "Error State",
  render: () => (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium" htmlFor="story-input-error">
        Username
      </label>
      <Input
        id="story-input-error"
        placeholder="Enter username"
        aria-invalid="true"
        defaultValue="taken-username"
      />
      <p className="text-xs text-destructive">
        This username is already taken.
      </p>
    </div>
  ),
};
