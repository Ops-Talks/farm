import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";

function UnsavedChangesDemo() {
  const [value, setValue] = useState("");
  const initialValue = "";
  const { showBadge } = useUnsavedChanges(value !== initialValue);

  return (
    <div className="w-80 space-y-3">
      <label htmlFor="demo-name" className="text-sm font-medium">Team name</label>
      <Input
        id="demo-name"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Type something to trigger unsaved state\u2026"
      />
      <div className="flex items-center gap-3">
        <Button onClick={() => setValue("")} variant="outline">
          Cancel
        </Button>
        <div className="flex items-center gap-2">
          <Button onClick={() => setValue("")}>Save</Button>
          {showBadge && (
            <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
              \u2022 Unsaved changes
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// Separate named component for the static "always dirty" demo — required so
// that useUnsavedChanges is not called directly inside a render() callback,
// which would violate the rules of hooks.
function AlwaysDirtyDemo() {
  const { showBadge } = useUnsavedChanges(true);
  return (
    <div className="w-80 space-y-3">
      <label className="text-sm font-medium">Team name</label>
      <Input defaultValue="Platform Team (modified)" />
      <div className="flex items-center gap-2">
        <Button>Save</Button>
        {showBadge && (
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            \u2022 Unsaved changes
          </span>
        )}
      </div>
    </div>
  );
}

const meta: Meta = {
  title: "Patterns/UnsavedChanges",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Interactive: Story = {
  name: "Interactive \u2014 type to mark dirty",
  render: () => <UnsavedChangesDemo />,
};

export const DirtyState: Story = {
  name: "Dirty state (badge visible)",
  render: () => <AlwaysDirtyDemo />,
};
