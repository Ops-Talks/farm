/**
 * E2E — Team management flows
 *
 * Covers the teams list and create-team pages.
 * All NestJS API calls are intercepted with page.route().
 *
 * Auth state is loaded from the file written by global-setup.ts
 * (user has the "admin" role, so the Create Team button is visible).
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";
import { setupOrgMock } from "./helpers/setup-org-mock";

test.beforeEach(async ({ page }) => {
  await setupAuthStorage(page);
});

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_TEAM = {
  id: "team-e2e-001",
  name: "platform-core",
  displayName: "Platform Core Team",
  description: "E2E test team",
  type: "dev",
  contactEmail: "platform@example.com",
  slackChannel: "platform-core",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_TEAM_LIST = {
  data: [MOCK_TEAM],
  total: 1,
};

// ---------------------------------------------------------------------------
// Helper: stub all API routes needed for the teams section
// ---------------------------------------------------------------------------
async function mockTeamsRoutes(
  page: import("@playwright/test").Page,
  options: { includeCreation?: boolean } = {},
) {
  // Catch-all registered FIRST so specific routes (registered after) take
  // priority. Playwright resolves routes in LIFO order — the last registered
  // route wins — so the catch-all must be first to have the lowest priority.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // Team members (more specific than the teams base route — register first
  // among the specific routes so it is not shadowed by the teams base route)
  await page.route(`**/api/v1/teams/${MOCK_TEAM.id}/members`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // Team components
  await page.route(`**/api/v1/teams/${MOCK_TEAM.id}/components`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // Individual team detail
  await page.route(`**/api/v1/teams/${MOCK_TEAM.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_TEAM),
    }),
  );

    // Team list
  await page.route("**/api/v1/teams", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TEAM_LIST),
      });
    } else if (route.request().method() === "POST" && options.includeCreation) {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TEAM),
      });
    } else {
      route.continue();
    }
  });

  // Organizations — registered last so it wins over the catch-all.
  await setupOrgMock(page);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("authenticated user can navigate to /teams", async ({ page }) => {
  await mockTeamsRoutes(page);

  await page.goto("/teams");

  await expect(page.getByRole("heading", { name: "Teams" })).toBeVisible();

  // Our mock team card should be visible
  await expect(page.getByText(MOCK_TEAM.displayName)).toBeVisible();
});

test("admin user sees the Create Team button on the teams page", async ({
  page,
}) => {
  await mockTeamsRoutes(page);

  await page.goto("/teams");

  // The "Create Team" link is only rendered when the user has the admin role.
  // The pre-loaded auth state has roles: ['admin'], so it must be visible.
  await expect(
    page.getByRole("link", { name: "Create Team" }),
  ).toBeVisible();
});

test("authenticated user can open the create team form", async ({ page }) => {
  await mockTeamsRoutes(page);

  await page.goto("/teams/new");

  await expect(page.getByRole("heading", { name: "Create Team" })).toBeVisible();

  // Form fields — identified by placeholder since inputs lack id attributes
  await expect(
    page.getByPlaceholder("e.g. platform-core"),
  ).toBeVisible();
  await expect(
    page.getByPlaceholder("e.g. Platform Core Team"),
  ).toBeVisible();
});

test("authenticated user can create a team and is redirected to its detail page", async ({
  page,
}) => {
  await mockTeamsRoutes(page, { includeCreation: true });

  await page.goto("/teams/new");

  // Fill required fields
  await page.getByPlaceholder("e.g. platform-core").fill(MOCK_TEAM.name);
  await page
    .getByPlaceholder("e.g. Platform Core Team")
    .fill(MOCK_TEAM.displayName);

  // Submit
  await page.getByRole("button", { name: "Create Team" }).click();

  // After creation the user is redirected to the new team's detail page
  await expect(page).toHaveURL(new RegExp(`/teams/${MOCK_TEAM.id}`), {
    timeout: 10_000,
  });
});
