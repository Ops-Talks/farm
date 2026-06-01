/**
 * E2E — Invitation acceptance flow
 *
 * Covers:
 *   • An invitee landing on /invitations/accept?token=... sees the
 *     org/role preview and the login CTA.
 *
 * All backend API calls are intercepted with page.route() — no live API needed.
 */

import { test, expect } from "@playwright/test";

// Start every test unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Invitation acceptance (public preview)", () => {
  test("missing token shows error card", async ({ page }) => {
    await page.goto("/invitations/accept");
    await expect(page.getByText(/Invalid invitation link/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /Go to login/i })).toBeVisible();
  });

  test("expired token (410) shows the no-longer-valid message", async ({
    page,
  }) => {
    await page.route(
      "**/api/v1/invitations/by-token/expired",
      (route) =>
        route.fulfill({
          status: 410,
          contentType: "application/json",
          body: JSON.stringify({ message: "Gone", statusCode: 410 }),
        }),
    );
    await page.goto("/invitations/accept?token=expired");
    await expect(page.getByText(/no longer valid/i)).toBeVisible();
  });

  test("valid token shows preview with login CTA", async ({ page }) => {
    await page.route(
      "**/api/v1/invitations/by-token/valid-token",
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            orgName: "Acme",
            orgId: "org_1",
            invitedByName: "Bob",
            role: "member",
            expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            message: "Welcome aboard!",
          }),
        }),
    );

    await page.goto("/invitations/accept?token=valid-token");
    await expect(page.getByText("You're invited")).toBeVisible();
    await expect(page.getByText("Acme")).toBeVisible();
    await expect(page.getByText("Welcome aboard!")).toBeVisible();
    const loginLink = page.getByRole("link", { name: /Log in to accept/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute(
      "href",
      /\/login\?redirect=/,
    );
    await expect(
      page.getByRole("link", { name: /Sign up first/i }),
    ).not.toBeVisible();
  });
});
