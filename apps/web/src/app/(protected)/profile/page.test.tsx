import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/components/profile/ProfileForm", () => ({
  ProfileForm: () => <div data-testid="profile-form">ProfileForm</div>,
}));

vi.mock("@/components/profile/ChangePasswordForm", () => ({
  ChangePasswordForm: () => (
    <div data-testid="change-password-form">ChangePasswordForm</div>
  ),
}));

vi.mock("@/components/shared/page-header", () => ({
  PageHeader: ({
    title,
    description,
  }: {
    title: string;
    description: string;
  }) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

import ProfilePage from "@/app/(protected)/profile/page";

describe("ProfilePage", () => {
  it("renders the page header with correct title and description", () => {
    render(<ProfilePage />);

    expect(screen.getByTestId("page-header")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(
      screen.getByText(/Manage your personal information/i),
    ).toBeInTheDocument();
  });

  it("renders the ProfileForm and ChangePasswordForm components", () => {
    render(<ProfilePage />);

    expect(screen.getByTestId("profile-form")).toBeInTheDocument();
    expect(screen.getByTestId("change-password-form")).toBeInTheDocument();
  });
});
