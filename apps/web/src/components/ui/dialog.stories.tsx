import type { Meta, StoryObj } from "@storybook/react";

import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const meta: Meta<typeof Dialog> = {
  title: "UI/Dialog",
  component: Dialog,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof Dialog>;

// ---------------------------------------------------------------------------
// Basic dialog
// ---------------------------------------------------------------------------

export const Basic: Story = {
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" />}>
        Open Dialog
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. Please confirm you want to proceed.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button>Confirm</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// ---------------------------------------------------------------------------
// Dialog with form fields
// ---------------------------------------------------------------------------

export const WithForm: Story = {
  name: "With Form",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button />}>Create Environment</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Environment</DialogTitle>
          <DialogDescription>
            Fill in the details below to create a new environment.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="env-name">
              Name
            </label>
            <Input id="env-name" placeholder="e.g. production" />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium" htmlFor="env-region">
              Region
            </label>
            <Input id="env-region" placeholder="e.g. us-east-1" />
          </div>
        </div>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Cancel
          </DialogClose>
          <Button>Create</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};

// ---------------------------------------------------------------------------
// Dialog without close button
// ---------------------------------------------------------------------------

export const WithoutCloseButton: Story = {
  name: "Without Close Button",
  render: () => (
    <Dialog>
      <DialogTrigger render={<Button variant="secondary" />}>
        Open (no X)
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Confirmation Required</DialogTitle>
          <DialogDescription>
            You must click a button below to dismiss this dialog.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>
            Dismiss
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
};
