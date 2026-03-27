import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";

import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";

const meta: Meta<typeof ConfirmDialog> = {
  title: "Shared/ConfirmDialog",
  component: ConfirmDialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: "select",
      options: ["default", "destructive"],
    },
    open: { control: "boolean" },
  },
};

export default meta;

type Story = StoryObj<typeof ConfirmDialog>;

// ---------------------------------------------------------------------------
// Destructive confirm (default usage)
// ---------------------------------------------------------------------------

export const Destructive: Story = {
  name: "Destructive Confirm",
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button variant="destructive" onClick={() => setOpen(true)}>
          Delete Service
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Delete Service"
          description="This will permanently delete the service and all its associated data. This action cannot be undone."
          confirmLabel="Delete"
          variant="destructive"
          onConfirm={() => {}}
        />
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Custom title and description
// ---------------------------------------------------------------------------

export const CustomTitleDescription: Story = {
  name: "Custom Title and Description",
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);

    return (
      <>
        <Button variant="outline" onClick={() => setOpen(true)}>
          Archive Environment
        </Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Archive this environment?"
          description="Archiving will stop all running services. You can restore the environment later from the archives page."
          confirmLabel="Archive"
          cancelLabel="Keep Active"
          variant="default"
          onConfirm={() => {}}
        />
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Loading state — dialog open, confirm button simulates async operation
// ---------------------------------------------------------------------------

export const LoadingState: Story = {
  name: "Loading State",
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [loading, setLoading] = useState(false);

    function handleConfirm() {
      setLoading(true);
      // Simulate async operation that resolves after 2 seconds.
      setTimeout(() => {
        setLoading(false);
        setOpen(false);
      }, 2000);
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Trigger Action</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={(next) => {
            if (!loading) setOpen(next);
          }}
          title="Apply Changes"
          description="Applying these changes will restart affected services. Confirm to proceed."
          confirmLabel={loading ? "Applying..." : "Apply"}
          variant="default"
          onConfirm={handleConfirm}
        />
      </>
    );
  },
};
