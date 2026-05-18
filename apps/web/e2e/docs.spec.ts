/**
 * E2E — Documentation page flows
 *
 * Tests cover the docs list, tree navigation, document content rendering,
 * search, create-form access, and unauthenticated redirect behavior.
 * All NestJS API calls are intercepted with page.route() so the suite
 * runs without a live backend.
 *
 * Auth state is seeded via setupAuthStorage (addInitScript) before each
 * authenticated test so the app sees a valid admin session on first render.
 *
 * Route registration order follows the LIFO (last-in, first-out) priority
 * rule used by Playwright: catch-all routes are registered FIRST so that
 * more-specific routes registered afterwards take precedence over them.
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";
import { setupOrgMock } from "./helpers/setup-org-mock";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_DOC = {
  id: "doc-e2e-001",
  title: "Getting Started Guide",
  sourceUrl: "https://raw.githubusercontent.com/example/docs/README.md",
  componentId: "comp-e2e-001",
  author: "platform-team",
  version: "1.0.0",
  parentId: null,
  order: 0,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_DOC_LIST = { data: [MOCK_DOC], total: 1 };

const MOCK_TREE_NODE = {
  id: "doc-e2e-001",
  title: "Getting Started Guide",
  children: [],
};

/**
 * The rendered endpoint returns a JSON-encoded HTML string.
 * The api-client always calls res.json(), so the mock body must be
 * JSON.stringify(htmlString) — not raw HTML.
 */
const MOCK_RENDERED_HTML =
  "<h1>Getting Started</h1><p>Welcome to the platform.</p>";

const MOCK_SEARCH_RESULT = {
  id: "doc-e2e-001",
  title: "Getting Started Guide",
  componentId: "comp-e2e-001",
  score: 0.95,
};

const MOCK_COMPONENT = {
  id: "comp-e2e-001",
  name: "e2e-test-service",
  kind: "service",
};

// ---------------------------------------------------------------------------
// Helper: stub all API routes required by the docs section.
//
// Registration order (LIFO — last registered wins):
//   1. catch-all                           (lowest priority)
//   2. catalog components
//   3. /api/v1/docs  exact path            (handles list without qs + POST)
//   4. /api/v1/docs?**                     (list with query params)
//   5. /api/v1/docs/:id                    (individual doc metadata)
//   6. /api/v1/docs/:id/rendered           (rendered HTML — overrides #5)
//   7. /api/v1/docs/tree**                 (tree endpoint)
//   8. /api/v1/docs/search**               (search endpoint)
//   9. /api/v1/docs/builds/**              (Phase 29 — build history)
//  10. /api/v1/docs/*/versions             (Phase 29 — versions, highest priority)
// ---------------------------------------------------------------------------
async function mockDocsRoutes(
  page: import("@playwright/test").Page,
  options: { empty?: boolean; includeCreation?: boolean } = {},
): Promise<void> {
  // 1. Catch-all — registered FIRST so specific routes override it.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // 2. Catalog components list — used by both the sidebar selector and the
  //    create form to populate the component <select>.
  await page.route("**/api/v1/catalog/components**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [MOCK_COMPONENT], total: 1 }),
    }),
  );

  // 3. Docs list — exact path, no query string (also handles POST creation).
  if (options.includeCreation) {
    await page.route("**/api/v1/docs", (route) => {
      if (route.request().method() === "POST") {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_DOC),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            options.empty ? { data: [], total: 0 } : MOCK_DOC_LIST,
          ),
        });
      }
    });
  } else {
    await page.route("**/api/v1/docs", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          options.empty ? { data: [], total: 0 } : MOCK_DOC_LIST,
        ),
      }),
    );
  }

  // 4. Docs list with query params — docs.list({ take: 100 }) produces
  //    /api/v1/docs?take=100, which only this pattern catches.
  await page.route("**/api/v1/docs?**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(
        options.empty ? { data: [], total: 0 } : MOCK_DOC_LIST,
      ),
    }),
  );

  // 5. Individual document metadata — docs.get(id).
  await page.route(`**/api/v1/docs/${MOCK_DOC.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_DOC),
    }),
  );

  // 6. Rendered HTML content — must be registered AFTER #5 so it takes
  //    priority over the generic /:id pattern.
  //    api-client calls res.json(), so the body must be a JSON-encoded string.
  await page.route(`**/api/v1/docs/${MOCK_DOC.id}/rendered`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_RENDERED_HTML),
    }),
  );

  // 7. Tree endpoint — fetched with /api/v1/docs/tree?componentId=...
  await page.route("**/api/v1/docs/tree**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MOCK_TREE_NODE]),
    }),
  );

  // 8. Search endpoint — GET /api/v1/docs/search?q=... (highest priority).
  await page.route("**/api/v1/docs/search**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([MOCK_SEARCH_RESULT]),
    }),
  );

  // 9. Phase 29 — builds list: GET /api/v1/docs/builds/:componentId
  await page.route("**/api/v1/docs/builds/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // 10. Phase 29 — versions list: GET /api/v1/docs/:componentId/versions
  await page.route("**/api/v1/docs/*/versions", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // Organizations — registered last so it wins over the catch-all.
  await setupOrgMock(page);
}

// ---------------------------------------------------------------------------
// Authenticated test suite
// Auth tokens are seeded before each test via addInitScript so the React
// auth context sees a valid admin session before it hydrates.
// ---------------------------------------------------------------------------

test.describe("docs page — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthStorage(page);
  });

  /**
   * Test 1 — Basic navigation.
   * Verifies that a logged-in user can reach /docs and the page heading
   * rendered by PageHeader is visible.
   */
  test("authenticated user can navigate to /docs and see the heading", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    await expect(
      page.getByRole("heading", { name: "Documentation" }),
    ).toBeVisible();
  });

  /**
   * Test 2 — Admin privilege indicator.
   * The "New Document" button is conditionally rendered only when the
   * authenticated user holds the "admin" role. The mock user set up by
   * setupAuthStorage has roles: ["admin"].
   */
  test("docs page shows 'New Document' button for admin users", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    await expect(
      page.getByRole("button", { name: "New Document" }),
    ).toBeVisible();
  });

  /**
   * Test 3 — Empty state.
   * When the API returns an empty docs list the component renders the
   * "No documentation registered" placeholder instead of the layout.
   */
  test("docs page shows empty state when no docs are registered", async ({
    page,
  }) => {
    await mockDocsRoutes(page, { empty: true });

    await page.goto("/docs");

    await expect(
      page.getByText("No documentation registered"),
    ).toBeVisible();
  });

  /**
   * Test 4 — Tree sidebar population.
   * When docs are returned the left sidebar renders a clickable DocTree.
   * The mock tree node title must appear in the sidebar.
   */
  test("docs page renders tree sidebar with mock doc title", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    await expect(page.getByText(MOCK_TREE_NODE.title)).toBeVisible({
      timeout: 5000,
    });
  });

  /**
   * Test 5 — Tree item click loads content.
   * Clicking a tree node triggers GET /docs/:id and GET /docs/:id/rendered.
   * The rendered HTML is injected into the .prose div.
   */
  test("clicking a tree item loads the document content in the prose area", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    // Wait for the tree to render before interacting.
    const treeItem = page.getByRole("button", { name: MOCK_TREE_NODE.title });
    await expect(treeItem).toBeVisible({ timeout: 5000 });

    await treeItem.click();

    // The prose div is populated asynchronously; wait for the heading from
    // the mocked rendered HTML to appear inside it.
    await expect(page.locator(".prose")).toContainText("Getting Started", {
      timeout: 5000,
    });
  });

  /**
   * Test 6 — Search returns and displays results.
   * Typing a query and clicking "Search" calls /docs/search.
   * The results card title and each result row (title + score badge) must
   * appear on screen.
   */
  test("search returns results and displays them in a search results card", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    await page
      .getByPlaceholder("Search documentation...")
      .fill("getting started");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    // The CardTitle renders "Search Results (1)".
    await expect(page.getByText(/Search Results/)).toBeVisible({
      timeout: 5000,
    });

    // Scope to the search results card to avoid matching the tree sidebar title.
    const searchCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: /Search Results/ });
    // The result row must show the title and the relevance score badge.
    await expect(searchCard.getByText(MOCK_SEARCH_RESULT.title)).toBeVisible();
    // score 0.95 → Math.round(0.95 * 100) = 95 → badge text "95%".
    await expect(searchCard.getByText("95%")).toBeVisible();
  });

  /**
   * Test 7 — Clicking a search result selects the document.
   * After clicking a result row the search panel is dismissed and the
   * selected document's rendered content appears in the prose area.
   */
  test("clicking a search result selects the document and shows its content", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    await page
      .getByPlaceholder("Search documentation...")
      .fill("getting started");
    await page.getByRole("button", { name: "Search", exact: true }).click();

    await expect(page.getByText(/Search Results/)).toBeVisible({
      timeout: 5000,
    });

    // The search result is rendered as a <button> inside the results card.
    // Scope to the card to avoid the identically-named tree sidebar button.
    const searchResultCard = page
      .locator('[data-slot="card"]')
      .filter({ hasText: /Search Results/ });
    await searchResultCard
      .getByRole("button", { name: MOCK_SEARCH_RESULT.title })
      .first()
      .click();

    // The search results panel must be dismissed.
    await expect(page.getByText(/Search Results/)).not.toBeVisible();

    // The prose area must contain the rendered document content.
    await expect(page.locator(".prose")).toContainText("Getting Started", {
      timeout: 5000,
    });
  });

  /**
   * Test 8 — Admin create form fields.
   * Clicking "New Document" renders the inline DocForm. All required input
   * fields must be present and the Cancel / Create Document action buttons
   * must be visible.
   */
  test("admin can open the create form via 'New Document' button and see the form fields", async ({
    page,
  }) => {
    await mockDocsRoutes(page);

    await page.goto("/docs");

    await page.getByRole("button", { name: "New Document" }).click();

    // Required fields.
    await expect(page.locator("#doc-title")).toBeVisible();
    await expect(page.locator("#doc-source-url")).toBeVisible();
    await expect(page.locator("#doc-component")).toBeVisible();
    await expect(page.locator("#doc-author")).toBeVisible();

    // Optional fields.
    await expect(page.locator("#doc-version")).toBeVisible();
    await expect(page.locator("#doc-order")).toBeVisible();

    // Form action buttons.
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Create Document" }),
    ).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Unauthenticated test suite
//
// The storageState is explicitly cleared so no auth tokens are seeded.
// The AuthGuard in the Next.js app detects the missing session and
// redirects the user to /login before rendering the protected page.
// ---------------------------------------------------------------------------

test.describe("docs page — unauthenticated", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Test 9 — Unauthenticated redirect.
   * Navigating to /docs without a valid session must redirect to /login.
   */
  test("unauthenticated user is redirected to /login when accessing /docs", async ({
    page,
  }) => {
    // Suppress Socket.IO noise; no auth tokens are seeded so we also
    // return 401 for any API call that might fire before the redirect.
    await page.route("**/socket.io/**", (route) => route.abort());
    await page.route("**/api/v1/**", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ message: "Unauthorized" }),
      }),
    );

    await page.goto("/docs");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
