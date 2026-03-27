import type { Meta, StoryObj } from "@storybook/react";

import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: "select",
      options: ["default", "sm"],
    },
  },
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Card>;

// ---------------------------------------------------------------------------
// Basic card
// ---------------------------------------------------------------------------

export const Basic: Story = {
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Card Title</CardTitle>
        <CardDescription>
          A short description of what this card contains.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          Main card content goes here. This can include any React nodes.
        </p>
      </CardContent>
      <CardFooter>
        <Button variant="outline" size="sm">
          Cancel
        </Button>
        <Button size="sm" className="ml-auto">
          Save
        </Button>
      </CardFooter>
    </Card>
  ),
};

// ---------------------------------------------------------------------------
// Card without header
// ---------------------------------------------------------------------------

export const WithoutHeader: Story = {
  name: "Without Header",
  render: () => (
    <Card>
      <CardContent>
        <p className="text-sm">
          A card that contains only content — no header or footer.
        </p>
      </CardContent>
    </Card>
  ),
};

// ---------------------------------------------------------------------------
// Card with action
// ---------------------------------------------------------------------------

export const WithAction: Story = {
  name: "With Action",
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Deployment Status</CardTitle>
        <CardDescription>Last updated 2 minutes ago.</CardDescription>
        <CardAction>
          <Badge variant="secondary">Running</Badge>
        </CardAction>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          3 replicas healthy, 0 pending.
        </p>
      </CardContent>
    </Card>
  ),
};

// ---------------------------------------------------------------------------
// Small size variant
// ---------------------------------------------------------------------------

export const SmallSize: Story = {
  name: "Small Size",
  render: () => (
    <Card size="sm">
      <CardHeader>
        <CardTitle>Compact Card</CardTitle>
        <CardDescription>Uses the sm size variant.</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">Tighter padding.</p>
      </CardContent>
    </Card>
  ),
};

// ---------------------------------------------------------------------------
// Custom content
// ---------------------------------------------------------------------------

export const CustomContent: Story = {
  name: "Custom Content",
  render: () => (
    <Card>
      <CardHeader>
        <CardTitle>Custom Content Card</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">CPU</p>
            <p className="text-lg font-semibold">42%</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-xs text-muted-foreground">Memory</p>
            <p className="text-lg font-semibold">1.2 GB</p>
          </div>
        </div>
      </CardContent>
    </Card>
  ),
};
