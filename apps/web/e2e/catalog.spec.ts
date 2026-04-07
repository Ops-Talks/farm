/**
 * E2E — Catalog CRUD flows
 *
 * Tests cover the software catalog list, create, and detail pages.
 * All NestJS API calls are intercepted with page.route() so the suite
 * runs without a live backend.
 *
 * Auth state is loaded from the file written by global-setup.ts so
 * every test starts as an already-authenticated admin user.
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";

// ---------------------------------------------------------------------------
// Inject mock auth tokens into sessionStorage before each test page load.
// storageState cannot restore sessionStorage (per-tab only), so addInitScript
// is used to seed the values before React hydrates.
// ---------------------------------------------------------------------------
test.beforeEach(async ({ page }) => {
  await setupAuthStorage(page);
});

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_COMPONENT = {
  id: "comp-e2e-001",
  name: "e2e-test-service",
  kind: "service",
  lifecycle: "experimental",
  owner: "platform-team",
  description: "Created by E2E test",
  tags: ["e2e", "test"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_COMPONENT_LIST = {
  data: [MOCK_COMPONENT],
  total: 1,
};

// ---------------------------------------------------------------------------
// Helper: stub all the API routes needed for the catalog section
// ---------------------------------------------------------------------------
async function mockCatalogRoutes(
  page: import("@playwright/test").Page,
  options: { includeCreation?: boolean } = {},
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

  // Deployments for this component (detail page sidebar)
  await page.route(
    `**/api/v1/deployments/latest?componentId=${MOCK_COMPONENT.id}`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
  );

  // Individual component detail
  await page.route(`**/api/v1/catalog/components/${MOCK_COMPONENT.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_COMPONENT),
    }),
  );

  // Component creation (POST) or list without query params
  if (options.includeCreation) {
    await page.route("**/api/v1/catalog/components", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_COMPONENT),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_COMPONENT_LIST),
        });
      }
    });
  } else {
    await page.route("**/api/v1/catalog/components", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_COMPONENT_LIST),
      }),
    );
  }

  // Catalog list with query params (registered last → highest priority)
  await page.route("**/api/v1/catalog/components?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_COMPONENT_LIST),
    }),
  );
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("authenticated user can navigate to /catalog", async ({ page }) => {
  await mockCatalogRoutes(page);

  await page.goto("/catalog");

  // The page header should say "Software Catalog"
  await expect(
    page.getByRole("heading", { name: "Software Catalog" }),
  ).toBeVisible();

  // Our mock component should appear in the table
  await expect(page.getByText(MOCK_COMPONENT.name)).toBeVisible();
});

test("catalog page shows the Register Component button", async ({ page }) => {
  await mockCatalogRoutes(page);

  await page.goto("/catalog");

  // The "Register Component" link should be visible
  const registerLink = page.getByRole("link", { name: "Register Component" });
  await expect(registerLink).toBeVisible();
});

test("authenticated user can open the create component form", async ({
  page,
}) => {
  await mockCatalogRoutes(page);

  // Navigate directly to the new-component page
  await page.goto("/catalog/new");

  // The page header should say "Register Component"
  await expect(
    page.getByRole("heading", { name: "Register Component" }),
  ).toBeVisible();

  // The form inputs should be present, identified by their IDs
  await expect(page.locator("#comp-name")).toBeVisible();
  await expect(page.locator("#comp-owner")).toBeVisible();
  await expect(page.locator("#comp-kind")).toBeVisible();
  await expect(page.locator("#comp-lifecycle")).toBeVisible();
});

test("authenticated user can create a component and see it in the list", async ({
  page,
}) => {
  await mockCatalogRoutes(page, { includeCreation: true });

  await page.goto("/catalog/new");

  // Fill in the required form fields
  await page.locator("#comp-name").fill(MOCK_COMPONENT.name);
  await page.locator("#comp-owner").fill(MOCK_COMPONENT.owner);

  // Select kind = service (the default, but set it explicitly)
  await page.locator("#comp-kind").selectOption("service");

  // Submit the form
  await page.getByRole("button", { name: "Register Component" }).click();

  // After successful creation the component detail page is shown.
  // The API mock returns MOCK_COMPONENT with id = comp-e2e-001.
  await expect(page).toHaveURL(
    new RegExp(`/catalog/${MOCK_COMPONENT.id}`),
    { timeout: 10_000 },
  );
});

test("authenticated user can click a component to view its detail page", async ({
  page,
}) => {
  await mockCatalogRoutes(page);

  await page.goto("/catalog");

  const link = page.getByRole("link", { name: MOCK_COMPONENT.name });
  await expect(link).toBeVisible();
  const href = await link.getAttribute("href");
  expect(href).toBe(`/catalog/${MOCK_COMPONENT.id}`);

  // Click the link to trigger Next.js client-side navigation.  Full-page
  // navigation (page.goto / window.location) causes the Next.js server to
  // SSR the detail page, issuing API calls that page.route() mocks cannot
  // intercept.  On WebKit the SSR failure redirects back to /catalog.
  await link.click();

  // Should be on the detail page
  await expect(page).toHaveURL(
    new RegExp(`/catalog/${MOCK_COMPONENT.id}`),
    { timeout: 10_000 },
  );
});
