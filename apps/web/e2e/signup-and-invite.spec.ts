/**
 * E2E — Signup + Invitation acceptance flow (Phase 37)
 *
 * Covers:
 *   • A new user can self-register at /signup and lands on the login page
 *     with a "registered" banner.
 *   • An invitee landing on /invitations/accept?token=... sees the
 *     org/role preview and the appropriate CTAs (login/signup vs accept).
 *
 * All backend API calls are intercepted with page.route() — no live API needed.
 */

import { test, expect } from "@playwright/test";

// Start every test unauthenticated.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("Signup", () => {
  test("user can sign up and is redirected to /login?registered=1", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/register", (route) =>
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          id: "u_new",
          username: "newuser",
          email: "newuser@example.com",
        }),
      }),
    );

    await page.goto("/signup");
    // CardTitle renders as <div>, so match by text rather than heading role.
    await expect(page.getByText("Create account").first()).toBeVisible();

    await page.getByLabel(/^Username$/).fill("newuser");
    await page.getByLabel(/^Email$/).fill("newuser@example.com");
    await page.getByLabel(/^Password$/).fill("Password123");
    await page.getByLabel(/Confirm password/).fill("Password123");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/login\?registered=1/);
    await expect(page.getByText(/Account created/i)).toBeVisible();
  });

  test("shows validation error on weak password", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel(/^Username$/).fill("abc");
    await page.getByLabel(/^Email$/).fill("abc@example.com");
    await page.getByLabel(/^Password$/).fill("short");
    await page.getByLabel(/Confirm password/).fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });

  test("shows conflict error on 409 from backend", async ({ page }) => {
    await page.route("**/api/v1/auth/register", (route) =>
      route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({ message: "Conflict", statusCode: 409 }),
      }),
    );

    await page.goto("/signup");
    await page.getByLabel(/^Username$/).fill("alice");
    await page.getByLabel(/^Email$/).fill("alice@example.com");
    await page.getByLabel(/^Password$/).fill("Password123");
    await page.getByLabel(/Confirm password/).fill("Password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(
      page.getByText(/Email or username already exists/i),
    ).toBeVisible();
  });
});

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

  test("valid token shows preview with login/signup CTAs", async ({ page }) => {
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
    const signupLink = page.getByRole("link", { name: /Sign up first/i });
    await expect(signupLink).toHaveAttribute(
      "href",
      /\/signup\?invite=valid-token/,
    );
  });
});
