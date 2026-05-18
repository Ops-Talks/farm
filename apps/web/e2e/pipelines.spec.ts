/**
 * E2E — Pipelines flows
 *
 * Covers the pipelines list, create, and detail pages (Definition + Runs tabs).
 * All NestJS API calls are intercepted with page.route() so the suite runs
 * without a live backend.
 *
 * Auth state is injected via setupAuthStorage before each authenticated test.
 * The unauthenticated test lives in its own describe block so that the
 * beforeEach that seeds sessionStorage tokens never runs for it.
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";
import { setupOrgMock } from "./helpers/setup-org-mock";

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_STAGE = {
  id: "stage-001",
  name: "build-image",
  type: "build",
  config: { tag: "{{version}}" },
  order: 0,
};

const MOCK_PIPELINE = {
  id: "pipe-e2e-001",
  name: "deploy-production",
  description: "E2E test pipeline",
  stages: [MOCK_STAGE],
  createdBy: "e2e-admin",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const MOCK_PIPELINE_LIST = { data: [MOCK_PIPELINE], total: 1 };

const MOCK_RUN = {
  id: "run-e2e-001",
  pipelineId: "pipe-e2e-001",
  status: "succeeded",
  triggeredBy: "e2e-admin",
  startedAt: new Date(Date.now() - 60_000).toISOString(),
  finishedAt: new Date().toISOString(),
  durationMs: 60_000,
  stages: [],
  logs: "",
};

const MOCK_RUNS_LIST = { data: [MOCK_RUN], total: 1 };

const MOCK_STATS = {
  total: 5,
  byStatus: { succeeded: 4, failed: 1 },
  successRate: 0.8,
  avgDurationMs: 45_000,
  lastRunAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helper: stub all API routes needed for the pipelines section.
//
// Registration order matters — Playwright resolves routes in LIFO order so the
// LAST registered route has the HIGHEST priority.  The catch-all is always
// registered first (lowest priority) and the most-specific routes last.
// ---------------------------------------------------------------------------

async function mockPipelineRoutes(
  page: import("@playwright/test").Page,
  options: {
    /** Return a 201 Pipeline for POST /api/v1/pipelines (creation form). */
    includeCreation?: boolean;
    /** Return a 201 PipelineRun for POST /api/v1/pipelines/{id}/trigger. */
    includeTrigger?: boolean;
    /** Return an empty list instead of MOCK_PIPELINE_LIST. */
    emptyList?: boolean;
  } = {},
): Promise<void> {
  // Abort log-streaming connections — these are long-lived SSE/WS endpoints
  // that would keep the test page alive indefinitely if not suppressed.
  await page.route("**/api/v1/pipelines/**/runs/*/logs**", (route) =>
    route.abort(),
  );

  // --- 1. Catch-all (lowest priority — registered first) -------------------
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // --- 2. Runs list glob (matches /runs and /runs?status=...) ---------------
  // Must be registered BEFORE the stats route so that the more-specific stats
  // path (registered next) takes priority over this glob via LIFO.
  await page.route(
    `**/api/v1/pipelines/${MOCK_PIPELINE.id}/runs**`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_RUNS_LIST),
      }),
  );

  // --- 3. Run stats — higher priority than runs** glob ---------------------
  await page.route(
    `**/api/v1/pipelines/${MOCK_PIPELINE.id}/runs/stats`,
    (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_STATS),
      }),
  );

  // --- 4. Trigger endpoint (conditional) -----------------------------------
  // When absent the catch-all absorbs the POST so the UI does not error out.
  if (options.includeTrigger) {
    await page.route(
      `**/api/v1/pipelines/${MOCK_PIPELINE.id}/trigger`,
      (route) => {
        if (route.request().method() === "POST") {
          route.fulfill({
            status: 201,
            contentType: "application/json",
            body: JSON.stringify(MOCK_RUN),
          });
        } else {
          void route.continue();
        }
      },
    );
  }

  // --- 5. Individual pipeline detail (GET) and delete (DELETE) -------------
  await page.route(`**/api/v1/pipelines/${MOCK_PIPELINE.id}`, (route) => {
    if (route.request().method() === "DELETE") {
      route.fulfill({ status: 204, body: "" });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PIPELINE),
      });
    }
  });

  // --- 6. Pipeline list (GET) and creation (POST) ---
  await page.route("**/api/v1/pipelines", (route) => {
    if (route.request().method() === "POST" && options.includeCreation) {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PIPELINE),
      });
    } else {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          options.emptyList ? { data: [], total: 0 } : MOCK_PIPELINE_LIST,
        ),
      });
    }
  });

  // Organizations — registered last so it wins over the catch-all.
  await setupOrgMock(page);
}

// ── Authenticated tests ──────────────────────────────────────────────────────

test.describe("Pipelines — authenticated flows", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthStorage(page);
  });

  /**
   * Test 1 — List page heading
   *
   * Verifies that an authenticated user can reach /pipelines and that the
   * <h1>Pipelines</h1> heading is rendered.
   */
  test("authenticated user can navigate to /pipelines and see the heading", async ({
    page,
  }) => {
    await mockPipelineRoutes(page);

    await page.goto("/pipelines");

    await expect(
      page.getByRole("heading", { name: "Pipelines" }),
    ).toBeVisible();
  });

  /**
   * Test 2 — List page renders pipeline row with name and stage badge
   *
   * Confirms that the mock pipeline name and its "1 stage(s)" badge appear in
   * the table when the API returns MOCK_PIPELINE_LIST.
   */
  test("pipeline list renders the mock pipeline with name and stage count", async ({
    page,
  }) => {
    await mockPipelineRoutes(page);

    await page.goto("/pipelines");

    // Pipeline name column
    await expect(page.getByText(MOCK_PIPELINE.name)).toBeVisible();

    // Stages badge — the table column shows "X stage(s)"
    await expect(page.getByText(/1 stage/i)).toBeVisible();
  });

  /**
   * Test 3 — Empty state
   *
   * When the API returns an empty list the page must render the
   * "No pipelines yet" empty-state message instead of a table.
   */
  test('pipeline list shows "No pipelines yet" when the API returns an empty list', async ({
    page,
  }) => {
    await mockPipelineRoutes(page, { emptyList: true });

    await page.goto("/pipelines");

    await expect(page.getByText("No pipelines yet")).toBeVisible();
  });

  /**
   * Test 4 — "Create Pipeline" link is visible
   *
   * The header area of the list page must contain a link labelled
   * "Create Pipeline" that navigates to /pipelines/new.
   */
  test('"Create Pipeline" link is visible on the pipelines list page', async ({
    page,
  }) => {
    await mockPipelineRoutes(page);

    await page.goto("/pipelines");

    await expect(
      page.getByRole("link", { name: "Create Pipeline" }),
    ).toBeVisible();
  });

  /**
   * Test 5 — Create form is reachable
   *
   * Navigating to /pipelines/new must render the "Create Pipeline" heading
   * together with the required pipeline-name input and description textarea.
   */
  test("user can navigate to the create pipeline form at /pipelines/new", async ({
    page,
  }) => {
    await mockPipelineRoutes(page);

    await page.goto("/pipelines/new");

    await expect(
      page.getByRole("heading", { name: "Create Pipeline" }),
    ).toBeVisible();

    // Required name input (id="pipeline-name")
    await expect(page.locator("#pipeline-name")).toBeVisible();

    // Optional description textarea (id="pipeline-description")
    await expect(page.locator("#pipeline-description")).toBeVisible();
  });

  /**
   * Test 6 — Create pipeline form submission redirects to the detail page
   *
   * Filling in the pipeline name and clicking "Create Pipeline" should POST
   * to /api/v1/pipelines and redirect the browser to /pipelines/{id}.
   */
  test("user can fill the pipeline name and submit — redirected to the detail page", async ({
    page,
  }) => {
    await mockPipelineRoutes(page, { includeCreation: true });

    await page.goto("/pipelines/new");

    await page.locator("#pipeline-name").fill(MOCK_PIPELINE.name);

    // The primary submit button label is "Create Pipeline" when idle
    await page.getByRole("button", { name: "Create Pipeline" }).click();

    // The API mock returns MOCK_PIPELINE (id = pipe-e2e-001) so the router
    // must navigate to /pipelines/pipe-e2e-001
    await expect(page).toHaveURL(
      new RegExp(`/pipelines/${MOCK_PIPELINE.id}`),
      { timeout: 10_000 },
    );
  });

  /**
   * Test 7 — Detail page Definition tab
   *
   * Visiting /pipelines/{id} must default to the Definition tab and display
   * the pipeline name, "Trigger Run" and "Delete Pipeline" buttons, and the
   * name of the stage defined in MOCK_PIPELINE.
   */
  test("pipeline detail page loads the Definition tab with the pipeline name and stage list", async ({
    page,
  }) => {
    await mockPipelineRoutes(page);

    await page.goto(`/pipelines/${MOCK_PIPELINE.id}`);

    // Pipeline name must appear in the detail view
    await expect(page.getByText(MOCK_PIPELINE.name)).toBeVisible();

    // Action buttons present on the Definition tab
    await expect(
      page.locator('button', { hasText: "Trigger Run" }),
    ).toBeVisible();
    await expect(
      page.locator('button', { hasText: "Delete" }).first(),
    ).toBeVisible();

    // Stage name from MOCK_PIPELINE.stages[0]
    await expect(page.getByText(MOCK_STAGE.name)).toBeVisible();
  });

  /**
   * Test 8 — Detail page Runs tab shows the run list
   *
   * After switching to the Runs tab the page must render rows from the mocked
   * run list.  The truncated run ID (first 8 chars) and the status badge are
   * used as stable anchor points for the assertion.
   */
  test("pipeline detail Runs tab shows the run list", async ({ page }) => {
    await mockPipelineRoutes(page);

    await page.goto(`/pipelines/${MOCK_PIPELINE.id}`);

    // Switch to the Runs tab (FilterTabs renders <button>, not role="tab")
    await page.getByRole("button", { name: "Runs" }).click();

    // Run ID column renders the first 8 characters of the full run ID
    await expect(page.getByText(MOCK_RUN.id.slice(0, 8))).toBeVisible({
      timeout: 10_000,
    });

    // Status badge — scope to the run row to avoid matching the filter <option>
    await expect(
      page.getByRole("cell").filter({ hasText: MOCK_RUN.status }),
    ).toBeVisible();
  });

  /**
   * Test 9 — Trigger button issues POST /api/v1/pipelines/{id}/trigger
   *
   * Clicking the aria-labelled trigger button on the list page must dispatch
   * a POST request to the trigger endpoint.  The test captures the outgoing
   * request and asserts its HTTP method and URL.
   */
  test("trigger pipeline button calls POST /api/v1/pipelines/{id}/trigger", async ({
    page,
  }) => {
    await mockPipelineRoutes(page, { includeTrigger: true });

    // Register the listener before navigating so no request is missed
    const triggerRequestPromise = page.waitForRequest(
      (req) =>
        req.url().includes(`/api/v1/pipelines/${MOCK_PIPELINE.id}/trigger`) &&
        req.method() === "POST",
    );

    await page.goto("/pipelines");

    // The table row exposes an aria-labelled button: "Trigger pipeline {name}"
    await page
      .getByRole("button", {
        name: `Trigger pipeline ${MOCK_PIPELINE.name}`,
      })
      .click();

    // Confirm the POST was dispatched to the correct endpoint
    const triggerRequest = await triggerRequestPromise;

    expect(triggerRequest.method()).toBe("POST");
    expect(triggerRequest.url()).toContain(
      `/api/v1/pipelines/${MOCK_PIPELINE.id}/trigger`,
    );
  });
});

// ── Unauthenticated test ─────────────────────────────────────────────────────

test.describe("Pipelines — unauthenticated access", () => {
  // Clear any persisted auth state so this test starts without a session.
  // Because this describe block is independent of the one above, the
  // beforeEach that calls setupAuthStorage never runs here — no tokens are
  // seeded into sessionStorage.
  test.use({ storageState: { cookies: [], origins: [] } });

  /**
   * Test 10 — Unauthenticated redirect
   *
   * Navigating directly to /pipelines without any session token must trigger
   * a client-side redirect to /login.  The AuthGuard detects the missing
   * token in sessionStorage and calls router.replace("/login").
   */
  test("unauthenticated user is redirected to /login when accessing /pipelines", async ({
    page,
  }) => {
    // Suppress Socket.IO polling — no auth seeding takes place in this block
    await page.route("**/socket.io/**", (route) => route.abort());

    await page.goto("/pipelines");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
