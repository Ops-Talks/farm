import type { Meta, StoryObj } from "@storybook/react";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  decorators: [
    (Story) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof Tabs>;

// ---------------------------------------------------------------------------
// Two tabs
// ---------------------------------------------------------------------------

export const TwoTabs: Story = {
  name: "Two Tabs",
  render: () => (
    <Tabs defaultValue="overview">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">
        <p className="text-sm text-muted-foreground">Overview panel content.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p className="text-sm text-muted-foreground">Settings panel content.</p>
      </TabsContent>
    </Tabs>
  ),
};

// ---------------------------------------------------------------------------
// Three tabs
// ---------------------------------------------------------------------------

export const ThreeTabs: Story = {
  name: "Three Tabs",
  render: () => (
    <Tabs defaultValue="all">
      <TabsList>
        <TabsTrigger value="all">All</TabsTrigger>
        <TabsTrigger value="active">Active</TabsTrigger>
        <TabsTrigger value="archived">Archived</TabsTrigger>
      </TabsList>
      <TabsContent value="all">
        <p className="text-sm text-muted-foreground">Showing all items.</p>
      </TabsContent>
      <TabsContent value="active">
        <p className="text-sm text-muted-foreground">Showing active items.</p>
      </TabsContent>
      <TabsContent value="archived">
        <p className="text-sm text-muted-foreground">Showing archived items.</p>
      </TabsContent>
    </Tabs>
  ),
};

// ---------------------------------------------------------------------------
// Disabled tab
// ---------------------------------------------------------------------------

export const WithDisabledTab: Story = {
  name: "With Disabled Tab",
  render: () => (
    <Tabs defaultValue="available">
      <TabsList>
        <TabsTrigger value="available">Available</TabsTrigger>
        <TabsTrigger value="beta">Beta</TabsTrigger>
        <TabsTrigger value="deprecated" disabled>
          Deprecated
        </TabsTrigger>
      </TabsList>
      <TabsContent value="available">
        <p className="text-sm text-muted-foreground">Available integrations.</p>
      </TabsContent>
      <TabsContent value="beta">
        <p className="text-sm text-muted-foreground">Beta integrations.</p>
      </TabsContent>
      <TabsContent value="deprecated">
        <p className="text-sm text-muted-foreground">Deprecated integrations.</p>
      </TabsContent>
    </Tabs>
  ),
};
