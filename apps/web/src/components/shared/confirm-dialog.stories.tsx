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
// Pending state — isPending prop drives spinner + blocked close behaviour
// ---------------------------------------------------------------------------

export const PendingState: Story = {
  name: "Pending State (isPending)",
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(false);
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [pending, setPending] = useState(false);

    function handleConfirm() {
      setPending(true);
      setTimeout(() => {
        setPending(false);
        setOpen(false);
      }, 3000);
    }

    return (
      <>
        <Button onClick={() => setOpen(true)}>Trigger Async Action</Button>
        <ConfirmDialog
          open={open}
          onOpenChange={setOpen}
          title="Apply Changes"
          description="Applying these changes will restart affected services. Confirm to proceed."
          isPending={pending}
          variant="default"
          onConfirm={handleConfirm}
        />
      </>
    );
  },
};

// ---------------------------------------------------------------------------
// Blocked close — dialog cannot be dismissed while isPending=true
// ---------------------------------------------------------------------------

export const BlockedClose: Story = {
  name: "Blocked Close (while pending)",
  render: () => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const [open, setOpen] = useState(true);
    return (
      <ConfirmDialog
        open={open}
        onOpenChange={setOpen}
        title="Processing…"
        description="This dialog cannot be closed while the action is in progress."
        isPending={true}
        onConfirm={() => {}}
      />
    );
  },
};
