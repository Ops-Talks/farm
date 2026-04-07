/**
 * E2E — User Profile Management (Phase 24)
 *
 * Tests cover the /profile page: navigation, profile update form,
 * change password form, and unauthenticated redirect.
 *
 * All NestJS API calls are intercepted with page.route() so the suite
 * runs without a live backend.
 *
 * Auth state is injected via setupAuthStorage (addInitScript) following
 * the same pattern as catalog.spec.ts.
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";
import { MOCK_USER } from "./global-setup";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_PROFILE = {
  id: MOCK_USER.id,
  username: MOCK_USER.username,
  email: MOCK_USER.email,
  displayName: MOCK_USER.displayName,
  roles: MOCK_USER.roles,
  firstName: "E2E",
  lastName: "Admin",
  gender: null,
  createdAt: MOCK_USER.createdAt,
  updatedAt: MOCK_USER.updatedAt,
};

// ---------------------------------------------------------------------------
// Helper: stub all API routes needed for the profile page
// ---------------------------------------------------------------------------

async function mockProfileRoutes(page: import("@playwright/test").Page) {
  // Catch-all so unrelated API calls don't bleed through.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({}),
    }),
  );

  // PATCH /auth/profile/password must be registered BEFORE the more general
  // /auth/profile pattern (Playwright resolves routes in LIFO order — last
  // registered wins, so more-specific routes are added last).
  await page.route("**/api/v1/auth/profile/password", (route) =>
    route.fulfill({ status: 204, body: "" }),
  );

  // GET + PATCH /auth/profile
  await page.route("**/api/v1/auth/profile", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROFILE),
      });
    } else if (route.request().method() === "PATCH") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ...MOCK_PROFILE, firstName: "Updated" }),
      });
    } else {
      void route.continue();
    }
  });
}

// ---------------------------------------------------------------------------
// Inject mock auth tokens before each test
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await setupAuthStorage(page);
});

// ── Tests ────────────────────────────────────────────────────────────────────

test("authenticated user can navigate to /profile", async ({ page }) => {
  await mockProfileRoutes(page);

  await page.goto("/profile");

  // Page heading should be "Profile"
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();

  // Both card sections should be present (CardTitle renders as div, not heading)
  await expect(page.getByText("Personal Information").first()).toBeVisible();
  await expect(page.getByText("Security").first()).toBeVisible();
});

test("profile form loads and shows user data", async ({ page }) => {
  await mockProfileRoutes(page);

  await page.goto("/profile");

  // Wait for the form to load (skeleton disappears, inputs appear)
  await expect(page.locator("#profile-email")).toBeVisible({ timeout: 10_000 });

  // Fields should be pre-filled with the mock profile data
  await expect(page.locator("#profile-email")).toHaveValue(MOCK_USER.email);
  await expect(page.locator("#profile-firstName")).toHaveValue("E2E");
  await expect(page.locator("#profile-lastName")).toHaveValue("Admin");
});

test("user can update profile and see success toast", async ({ page }) => {
  await mockProfileRoutes(page);

  await page.goto("/profile");

  // Wait for form to load
  await expect(page.locator("#profile-firstName")).toBeVisible({
    timeout: 10_000,
  });

  // Update first name
  await page.locator("#profile-firstName").clear();
  await page.locator("#profile-firstName").fill("Updated");

  // Submit the Personal Information form
  await page.getByRole("button", { name: /save changes/i }).click();

  // Success toast should appear
  await expect(page.getByText("Profile updated successfully")).toBeVisible({
    timeout: 10_000,
  });
});

test("user can change password and see success toast", async ({ page }) => {
  await mockProfileRoutes(page);

  await page.goto("/profile");

  // Wait for the Change Password form to render
  await expect(page.locator("#cp-currentPassword")).toBeVisible({
    timeout: 10_000,
  });

  await page.locator("#cp-currentPassword").fill("currentpass123");
  await page.locator("#cp-newPassword").fill("newpass456!");
  await page.locator("#cp-confirmPassword").fill("newpass456!");

  await page.getByRole("button", { name: /change password/i }).click();

  await expect(page.getByText("Password changed successfully")).toBeVisible({
    timeout: 10_000,
  });
});

test("unauthenticated access to /profile redirects to /login", async ({
  page,
}) => {
  // Do NOT call setupAuthStorage — navigate without tokens so AuthGuard fires.
  // Still stub socket.io and organizations to keep the test clean.
  await page.route("**/socket.io/**", (route) => route.abort());
  await page.route("**/api/v1/organizations", (route) =>
    route.fulfill({
      status: 401,
      contentType: "application/json",
      body: JSON.stringify({ message: "Unauthorized" }),
    }),
  );

  await page.goto("/profile");

  // AuthGuard redirects unauthenticated users to /login.
  await expect(page).toHaveURL(/\/login/, { timeout: 30_000 });
});
