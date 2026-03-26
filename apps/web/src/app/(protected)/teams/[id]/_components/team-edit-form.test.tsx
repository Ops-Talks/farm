import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { TeamType } from "@/types/api";

// ---------------------------------------------------------------------------
// Mock
// ---------------------------------------------------------------------------
vi.mock("@/types/api", () => ({
  TeamType: {
    DEV: "dev",
    INFRA: "infra",
    SECURITY: "security",
    DATA: "data",
    PLATFORM: "platform",
    OTHER: "other",
  },
}));

import { TeamEditForm } from "@/app/(protected)/teams/[id]/_components/team-edit-form";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const BASE_FORM = {
  displayName: "Team Alpha",
  description: "Alpha squad description",
  type: TeamType.DEV,
  contactEmail: "alpha@farm.dev",
  slackChannel: "team-alpha",
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe("TeamEditForm", () => {
  it("renders all form fields with initial values", () => {
    render(
      <TeamEditForm
        form={BASE_FORM}
        saving={false}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(screen.getByDisplayValue("Team Alpha")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Alpha squad description")).toBeInTheDocument();
    expect(screen.getByDisplayValue("alpha@farm.dev")).toBeInTheDocument();
    expect(screen.getByDisplayValue("team-alpha")).toBeInTheDocument();
  });

  it("renders the 'Edit Team Details' heading", () => {
    render(
      <TeamEditForm
        form={BASE_FORM}
        saving={false}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );
    expect(screen.getByText("Edit Team Details")).toBeInTheDocument();
  });

  it("calls onSave when Save Changes button is clicked", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(
      <TeamEditForm
        form={BASE_FORM}
        saving={false}
        onFormChange={vi.fn()}
        onSave={onSave}
        onCancel={vi.fn()}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Save Changes" }));
    expect(onSave).toHaveBeenCalled();
  });

  it("calls onCancel when Cancel button is clicked", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <TeamEditForm
        form={BASE_FORM}
        saving={false}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalled();
  });

  it("shows 'Saving...' and disables the save button when saving", () => {
    render(
      <TeamEditForm
        form={BASE_FORM}
        saving={true}
        onFormChange={vi.fn()}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: "Saving..." });
    expect(saveBtn).toBeDisabled();
  });

  it("calls onFormChange when the display name input changes", async () => {
    const user = userEvent.setup();
    const onFormChange = vi.fn();
    render(
      <TeamEditForm
        form={BASE_FORM}
        saving={false}
        onFormChange={onFormChange}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    const nameInput = screen.getByDisplayValue("Team Alpha");
    await user.type(nameInput, "!");
    // At least one call should include a displayName key
    expect(onFormChange).toHaveBeenCalled();
    const lastCall = onFormChange.mock.calls[onFormChange.mock.calls.length - 1][0] as Record<string, unknown>;
    expect(lastCall).toHaveProperty("displayName");
  });
});
