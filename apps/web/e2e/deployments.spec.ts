/**
 * E2E — Deployment matrix flows
 *
 * Covers the deployment matrix page in both the empty-state and
 * populated-matrix scenarios.
 *
 * All NestJS API calls are intercepted with page.route().
 * Auth state is loaded from the file written by global-setup.ts.
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

// A minimal matrix row — matches the shape of DeploymentMatrixRow from @farm/types
const MOCK_MATRIX_ROW = {
  id: "comp-deploy-001",
  name: "payment-service",
  kind: "service",
  environments: [
    {
      environmentId: "env-staging",
      environmentName: "staging",
      status: "succeeded",
      version: "v1.2.3",
      deployedAt: new Date().toISOString(),
    },
    {
      environmentId: "env-prod",
      environmentName: "production",
      status: "succeeded",
      version: "v1.2.2",
      deployedAt: new Date().toISOString(),
    },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function mockDeploymentRoutes(
  page: import("@playwright/test").Page,
  matrixData: unknown[] = [],
) {
  // Catch-all registered FIRST so specific routes (registered after) take
  // priority. Playwright resolves routes in LIFO order — last registered wins.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // Deployment history list (registered after catch-all → higher priority)
  await page.route("**/api/v1/deployments**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // Deployment matrix endpoint
  await page.route("**/api/v1/deployments/matrix**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(matrixData),
    }),
  );

  // Organizations — registered last so it wins over the catch-all.
  await setupOrgMock(page);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("authenticated user can navigate to /deployments", async ({ page }) => {
  await mockDeploymentRoutes(page);

  await page.goto("/deployments");

  // Page heading should always be present
  await expect(
    page.getByRole("heading", { name: "Deployment Matrix" }),
  ).toBeVisible();
});

test("deployments page renders an empty state when no components exist", async ({
  page,
}) => {
  // Provide an empty matrix (no components deployed yet)
  await mockDeploymentRoutes(page, []);

  await page.goto("/deployments");

  // The EmptyState component renders "No components found"
  await expect(page.getByText("No components found")).toBeVisible();
});

test("deployments page renders the matrix table when data is available", async ({
  page,
}) => {
  // Provide a populated matrix row
  await mockDeploymentRoutes(page, [MOCK_MATRIX_ROW]);

  await page.goto("/deployments");

  // The component name should appear as a link in the matrix table
  await expect(
    page.getByRole("link", { name: MOCK_MATRIX_ROW.name }),
  ).toBeVisible();

  // Environment column headers should be visible
  await expect(page.getByText("staging")).toBeVisible();
  await expect(page.getByText("production")).toBeVisible();
});

test("deployments page shows the Deployment History button", async ({
  page,
}) => {
  await mockDeploymentRoutes(page);

  await page.goto("/deployments");

  await expect(
    page.getByRole("link", { name: "Deployment History" }),
  ).toBeVisible();
});
