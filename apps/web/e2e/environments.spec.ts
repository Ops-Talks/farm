/**
 * E2E — Environments monitoring page flows
 *
 * Covers the /environments page, which renders four widgets:
 *   - CloudCostWidget    (GET /api/v1/cloud/cost)
 *   - HelmReleasesPanel  (GET /api/v1/helm/releases, POST /api/v1/helm/releases/sync)
 *   - RolloutStatusCard  (GET /api/v1/kubernetes/rollouts)
 *   - ArgoCDStatusCard   (GET /api/v1/argocd/applications,
 *                         POST /api/v1/argocd/applications/:name/sync)
 *
 * All NestJS API calls are intercepted with page.route() so the suite
 * runs without a live backend.
 *
 * Auth state is seeded by setupAuthStorage (addInitScript) before every
 * page.goto() call. The MOCK_USER carries the "admin" role, so
 * per-application ArgoCD sync buttons are rendered.
 */

import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";
import { setupOrgMock } from "./helpers/setup-org-mock";

// ---------------------------------------------------------------------------
// Authenticated test suite — beforeEach is scoped here so the unauthenticated
// describe block below does not inherit the addInitScript token injection.
// ---------------------------------------------------------------------------
test.describe("Environments — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthStorage(page);
  });

// ---------------------------------------------------------------------------
// Shared mock data
//
// Shapes must match the actual TypeScript interfaces used by the components:
//   - HelmRelease        (src/types/api.ts)
//   - KubernetesRollout  (src/types/api.ts) — uses `phase`, not `status`
//   - ArgoCDApplication  (src/types/api.ts) — nested status.health / status.sync
// ---------------------------------------------------------------------------

const MOCK_HELM_RELEASE = {
  name: "helm-deploy",
  namespace: "helm-ns",
  chart: "helm-chart",
  chartVersion: "1.2.3",
  appVersion: "v2.0.0",
  status: "deployed",
  revision: 5,
  updatedAt: new Date().toISOString(),
};

const MOCK_ROLLOUT = {
  name: "argo-rollout",
  namespace: "rollout-ns",
  // KubernetesRollout uses `phase`, not `status`
  phase: "Healthy",
  updatedAt: new Date().toISOString(),
};

const MOCK_ARGOCD_APP = {
  name: "argocd-prod-app",
  namespace: "argocd-ns",
  // ArgoCDApplication uses a nested status object, not flat syncStatus/healthStatus
  status: {
    health: { status: "Healthy" },
    sync: { status: "Synced" },
  },
  spec: {
    source: {
      repoURL: "https://github.com/example/my-service",
      targetRevision: "main",
    },
  },
};

// ---------------------------------------------------------------------------
// Helper: stub all API routes needed by EnvironmentsClient widgets.
//
// Registration order is intentional:
//   1. Catch-all (**/api/v1/**) is registered FIRST — lowest priority.
//   2. Specific routes are registered AFTER — Playwright resolves routes in
//      LIFO order, so the last-registered handler wins for a given URL.
// ---------------------------------------------------------------------------

interface MockEnvironmentOptions {
  helmReleases?: unknown[];
  rollouts?: unknown[];
  argocdApps?: unknown[];
}

async function mockEnvironmentRoutes(
  page: Page,
  options: MockEnvironmentOptions = {},
): Promise<void> {
  const {
    helmReleases = [MOCK_HELM_RELEASE],
    rollouts = [MOCK_ROLLOUT],
    argocdApps = [MOCK_ARGOCD_APP],
  } = options;

  // 1. Catch-all — absorbs any /api/v1/* request not matched by a later handler.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // 2. Cloud cost — CloudCostWidget only fires when an org is selected; stub
  //    the endpoint so it never reaches the Next.js proxy even if orgId is set.
  await page.route("**/api/v1/cloud/cost**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify([]),
    }),
  );

  // 3. Helm sync — POST endpoint triggered by the "Sync Releases" button.
  await page.route("**/api/v1/helm/releases/sync", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ synced: 1, errors: [] }),
      });
    } else {
      void route.continue();
    }
  });

  // 4. Helm releases list — registered after the sync route so the glob
  //    "**/helm/releases**" does not accidentally shadow the sync path.
  await page.route("**/api/v1/helm/releases**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(helmReleases),
    }),
  );

  // 5. Argo Rollouts list.
  await page.route("**/api/v1/kubernetes/rollouts**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(rollouts),
    }),
  );

  // 6. ArgoCD per-application sync — registered before the list GET so the
  //    more-specific wildcard pattern has higher LIFO priority.
  await page.route("**/api/v1/argocd/applications/*/sync", (route) => {
    if (route.request().method() === "POST") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ message: "sync triggered" }),
      });
    } else {
      void route.continue();
    }
  });

  // 7. ArgoCD applications list.
  await page.route("**/api/v1/argocd/applications", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(argocdApps),
    }),
  );

  // Organizations — registered last so it wins over the catch-all.
  await setupOrgMock(page);
}

// ── Tests ────────────────────────────────────────────────────────────────────

test("authenticated user can navigate to /environments and see the heading", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page);

  await page.goto("/environments");

  // The h1 rendered by EnvironmentsClient
  await expect(
    page.getByRole("heading", { name: "Environments" }),
  ).toBeVisible();

  // The descriptive subtext that sits directly below the heading
  await expect(
    page.getByText(
      "Monitor Helm releases, Argo Rollout status, and ArgoCD applications across all cluster namespaces.",
    ),
  ).toBeVisible();
});

test("Helm releases panel renders a table row with mock release data", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page);

  await page.goto("/environments");

  // The card section heading rendered by HelmReleasesPanel
  await expect(page.getByText("Helm Releases", { exact: true })).toBeVisible();

  // The release name and namespace must both appear inside the table
  await expect(page.getByText(MOCK_HELM_RELEASE.name)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: MOCK_HELM_RELEASE.namespace, exact: true }),
  ).toBeVisible();
});

test("Helm releases panel shows empty state when no releases are returned", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page, { helmReleases: [] });

  await page.goto("/environments");

  // The empty state paragraph rendered when releases.length === 0
  await expect(page.getByText("No Helm releases found.")).toBeVisible();
});

test("Sync Releases button triggers POST /api/v1/helm/releases/sync", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page);

  await page.goto("/environments");

  // Wait for the table to confirm the panel has loaded before clicking
  await expect(page.getByText(MOCK_HELM_RELEASE.name)).toBeVisible();

  // Register the request watcher before the click so the race window is zero
  const syncRequest = page.waitForRequest(
    (req) =>
      req.url().includes("/api/v1/helm/releases/sync") &&
      req.method() === "POST",
  );

  // The button label as rendered by HelmReleasesPanel in the idle state
  await page.getByRole("button", { name: "Sync Releases" }).click();

  // Assert the network request was actually dispatched
  await syncRequest;
});

test("RolloutStatusCard renders with Argo Rollout data", async ({ page }) => {
  await mockEnvironmentRoutes(page);

  await page.goto("/environments");

  // The h3 section heading rendered above the rollout cards grid
  await expect(page.getByText("Argo Rollouts")).toBeVisible();

  // The rollout name rendered inside RolloutCard
  await expect(page.getByText(MOCK_ROLLOUT.name)).toBeVisible();

  // The namespace rendered in monospace below the rollout name
  await expect(page.getByText(MOCK_ROLLOUT.namespace, { exact: true })).toBeVisible();
});

test("ArgoCDStatusCard renders with ArgoCD application data", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page);

  await page.goto("/environments");

  // The card section heading rendered by ArgoCDStatusCard
  await expect(page.getByText("ArgoCD Applications", { exact: true })).toBeVisible();

  // The application name and namespace must both appear in the table
  await expect(page.getByText(MOCK_ARGOCD_APP.name)).toBeVisible();
  await expect(
    page.getByRole("cell", { name: MOCK_ARGOCD_APP.namespace, exact: true }),
  ).toBeVisible();
});

test("ArgoCDStatusCard shows empty state when no applications are returned", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page, { argocdApps: [] });

  await page.goto("/environments");

  // The empty state message rendered when apps.length === 0
  await expect(
    page.getByText(
      "Connect ArgoCD in Integration Settings to see application status",
    ),
  ).toBeVisible();
});

test("ArgoCDStatusCard per-app Sync button triggers POST for the correct application", async ({
  page,
}) => {
  await mockEnvironmentRoutes(page);

  await page.goto("/environments");

  // Wait for the application row to be visible before interacting
  await expect(page.getByText(MOCK_ARGOCD_APP.name)).toBeVisible();

  // Register the request watcher before the click
  const syncRequest = page.waitForRequest(
    (req) =>
      req
        .url()
        .includes(`/api/v1/argocd/applications/${MOCK_ARGOCD_APP.name}/sync`) &&
      req.method() === "POST",
  );

  // The per-row sync button carries aria-label="Sync <name>" and is only
  // visible when the authenticated user has the "admin" role (MOCK_USER does).
  await page
    .getByRole("button", { name: `Sync ${MOCK_ARGOCD_APP.name}` })
    .click();

  // Assert the correct application sync endpoint was called
  await syncRequest;
});

}); // end test.describe("Environments — authenticated")

// ── Unauthenticated access ───────────────────────────────────────────────────

test.describe("Environments — unauthenticated access", () => {
  // This describe block is independent of the beforeEach above, so no tokens
  // are seeded into sessionStorage and the AuthGuard will redirect.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user visiting /environments is redirected to /login", async ({
    page,
  }) => {
    await page.route("**/socket.io/**", (route) => route.abort());

    await page.goto("/environments");

    await expect(page).toHaveURL(/\/login/, { timeout: 10_000 });
  });
});
