/**
 * E2E — User management dashboard (Phase 37)
 *
 * Verifies the /users page for an authenticated platform admin:
 *   • Renders user list from the mocked GET /api/v1/users endpoint
 *   • Filters trigger a refetch with the right query params
 *   • Empty state is shown when the API returns no users
 *
 * The user is pre-authenticated via global-setup storage state, so we don't
 * need to call loginAsAdmin() here.
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";

// sessionStorage cannot be restored via storageState (per-tab only), so we
// seed the auth tokens with addInitScript before each test page load.
test.beforeEach(async ({ page }) => {
  await setupAuthStorage(page);
});

const MOCK_USERS = {
  users: [
    {
      id: "u_alice",
      username: "alice",
      email: "alice@example.com",
      displayName: "Alice Doe",
      suspended: false,
      platformRoles: ["admin"],
      orgMemberships: [
        { orgId: "org_1", orgName: "Acme", orgSlug: "acme", role: "admin" },
      ],
      lastLogin: new Date(Date.now() - 3_600_000).toISOString(),
      createdAt: new Date().toISOString(),
    },
    {
      id: "u_bob",
      username: "bob",
      email: "bob@example.com",
      displayName: "Bob Smith",
      suspended: false,
      platformRoles: [],
      orgMemberships: [
        { orgId: "org_1", orgName: "Acme", orgSlug: "acme", role: "member" },
      ],
      lastLogin: null,
      createdAt: new Date().toISOString(),
    },
  ],
  total: 2,
  page: 1,
  pageSize: 20,
};

const EMPTY_USERS = { users: [], total: 0, page: 1, pageSize: 20 };

async function stubFeatureAndOrgs(page: import("@playwright/test").Page) {
  // Catch-all so unrelated API calls don't 404 and crash the page.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  await page.route("**/api/v1/features/availability", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ features: {} }),
    }),
  );

  await page.route("**/api/v1/organizations*", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [{ id: "org_1", name: "Acme", slug: "acme" }], total: 1 }),
    }),
  );
}

test("renders the users table with mocked data", async ({ page }) => {
  await stubFeatureAndOrgs(page);
  await page.route(/\/api\/v1\/users(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_USERS),
    }),
  );

  await page.goto("/users");
  await expect(page.getByRole("heading", { name: /Users/i })).toBeVisible();
  await expect(page.getByText("Alice Doe")).toBeVisible();
  await expect(page.getByText("Bob Smith")).toBeVisible();
  await expect(page.getByText("alice@example.com")).toBeVisible();
});

test("shows empty state when no users are returned", async ({ page }) => {
  await stubFeatureAndOrgs(page);
  await page.route(/\/api\/v1\/users(\?|$)/, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_USERS),
    }),
  );

  await page.goto("/users");
  await expect(page.getByText(/No users found/i)).toBeVisible();
});

test("typing in the search box triggers a refetch with the search param", async ({
  page,
}) => {
  await stubFeatureAndOrgs(page);

  let lastSearch: string | null = null;
  await page.route(/\/api\/v1\/users(\?|$)/, (route) => {
    const url = new URL(route.request().url());
    lastSearch = url.searchParams.get("search");
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(EMPTY_USERS),
    });
  });

  await page.goto("/users");
  await page.getByLabel(/Search users/i).fill("ali");

  // Wait for refetch with new query string.
  await expect.poll(() => lastSearch).toBe("ali");
});

// ---------------------------------------------------------------------------
// Phase 56 — Create user flow
// ---------------------------------------------------------------------------

test.describe("create user flow", () => {
  async function stubWithOrgMock(page: import("@playwright/test").Page) {
    await stubFeatureAndOrgs(page);

    // Required per codebase conventions: setupOrgMock and permission-gated UI
    // both need GET /organizations/*/members/me to return the user's org role.
    await page.route("**/api/v1/organizations/*/members/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "owner" }),
      }),
    );

    await page.route(/\/api\/v1\/users(\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_USERS),
      }),
    );
  }

  test("platform admin sees New User button", async ({ page }) => {
    await stubWithOrgMock(page);
    await page.goto("/users");
    await expect(page.getByRole("button", { name: /New User/i })).toBeVisible();
  });

  test("fill form, submit, and credentials panel appears with generated password", async ({
    page,
  }) => {
    await stubWithOrgMock(page);

    // Intercept POST /api/v1/users and return a tempPassword
    await page.route("**/api/v1/users", (route) => {
      if (route.request().method() === "POST") {
        return route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify({
            id: "u_new",
            username: "newbie",
            email: "newbie@test.com",
            displayName: "Newbie User",
            roles: ["user"],
            isSuspended: false,
            tempPassword: "Tmp@P4ss!",
          }),
        });
      }
      return route.continue();
    });

    await page.goto("/users");
    await page.getByRole("button", { name: /New User/i }).click();

    // Fill mandatory fields
    await page.getByLabel(/Username/i).fill("newbie");
    await page.getByLabel(/Email/i).fill("newbie@test.com");
    await page.getByLabel(/Display name/i).fill("Newbie User");

    await page.getByRole("button", { name: /Create user/i }).click();

    // Credentials panel with the temp password must appear
    await expect(page.getByText("Tmp@P4ss!")).toBeVisible();

    // Close the dialog
    await page.getByRole("button", { name: /Done/i }).click();
    await expect(page.getByText("Tmp@P4ss!")).not.toBeVisible();
  });

  test("New User button is NOT visible for a regular viewer", async ({ page }) => {
    await stubFeatureAndOrgs(page);

    // Override org member role to viewer (non-privileged)
    await page.route("**/api/v1/organizations/*/members/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ role: "viewer" }),
      }),
    );

    await page.route(/\/api\/v1\/users(\?|$)/, (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(EMPTY_USERS),
      }),
    );

    // Downgrade the stored user to a non-admin before the page boots.
    // The outer beforeEach already seeded admin roles; this override runs after.
    await page.addInitScript(() => {
      const stored = sessionStorage.getItem("farm_user");
      if (stored) {
        const u = JSON.parse(stored) as Record<string, unknown>;
        u.roles = ["user"];
        sessionStorage.setItem("farm_user", JSON.stringify(u));
      }
    });

    await page.goto("/users");
    await expect(page.getByRole("button", { name: /New User/i })).not.toBeVisible();
  });
});
