import type { Meta, StoryObj } from "@storybook/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function FormFieldDemo({
  showError,
  submitting,
}: {
  showError: boolean;
  submitting: boolean;
}) {
  return (
    <div className="w-80 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="demo-email" className="text-sm font-medium">Email address</label>
        <Input
          id="demo-email"
          type="email"
          placeholder="you@example.com"
          defaultValue={showError ? "not-an-email" : ""}
          aria-invalid={showError ? "true" : undefined}
          aria-describedby={showError ? "demo-email-error" : undefined}
          disabled={submitting}
        />
        {showError && (
          <p
            id="demo-email-error"
            role="alert"
            aria-live="polite"
            className="text-sm text-destructive mt-1"
          >
            Please enter a valid email address.
          </p>
        )}
      </div>
      <Button disabled={submitting} type="button">
        {submitting ? "Saving\u2026" : "Save"}
      </Button>
    </div>
  );
}

const meta: Meta = {
  title: "Patterns/FormValidation",
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj;

export const Valid: Story = {
  name: "Valid field",
  render: () => <FormFieldDemo showError={false} submitting={false} />,
};

export const Invalid: Story = {
  name: "Invalid field (with aria error)",
  render: () => <FormFieldDemo showError={true} submitting={false} />,
};

export const Submitting: Story = {
  name: "Submitting state",
  render: () => <FormFieldDemo showError={false} submitting={true} />,
};
