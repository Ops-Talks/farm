/**
 * E2E — Organization management flows
 *
 * Covers the organizations list, create-organization, and detail/settings
 * pages. All NestJS API calls are intercepted with page.route() so the suite
 * runs without a live backend.
 *
 * Auth state is injected before each test by setupAuthStorage. The MOCK_USER
 * from global-setup has id "e2e-user-id" which matches MOCK_ORG.ownerId, so
 * the authenticated user is treated as the organization owner and the member
 * management UI is rendered in all relevant tests.
 */

import { test, expect } from "@playwright/test";
import { setupAuthStorage } from "./helpers/setup-auth-storage";

test.describe("Organizations — authenticated", () => {
  test.beforeEach(async ({ page }) => {
    await setupAuthStorage(page);
  });

// ---------------------------------------------------------------------------
// Shared mock data
// ---------------------------------------------------------------------------

const MOCK_ORG = {
  id: "org-e2e-001",
  name: "E2E Platform Org",
  slug: "e2e-platform-org",
  description: "E2E test organization",
  /** Must match MOCK_USER.id from global-setup so the user is treated as owner. */
  ownerId: "e2e-user-id",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

/**
 * Paginated wrapper shape returned by GET /api/v1/organizations.
 * The API client unwraps the .data array before passing it to the component,
 * so the mock must return the full { data, total } object.
 */
const MOCK_ORG_LIST = { data: [MOCK_ORG], total: 1 };

const MOCK_MEMBER = {
  userId: "member-user-id",
  username: "member-user",
  email: "member@example.com",
  role: "member",
  joinedAt: new Date().toISOString(),
};

/**
 * Paginated wrapper for GET /api/v1/organizations/{id}/members.
 * The MembersSection component accesses res.data directly, so the mock must
 * return the full { data, total } object.
 */
const MOCK_MEMBER_LIST = { data: [MOCK_MEMBER], total: 1 };
const MOCK_MEMBER_LIST_EMPTY = { data: [], total: 0 };

// ---------------------------------------------------------------------------
// Helper: stub all API routes needed for the organizations section
// ---------------------------------------------------------------------------

/**
 * Registers page.route() interceptors for the organizations API surface.
 *
 * Ordering follows Playwright's LIFO convention: the catch-all is registered
 * first (lowest priority), then specific routes are added in order of
 * increasing specificity so later registrations win.
 *
 * @param page - Playwright page instance to attach routes to.
 * @param options.emptyList - When true, the org list endpoint returns an empty
 *   collection (triggers the "No organizations yet" empty state).
 * @param options.emptyMembers - When true, the members list endpoint returns an
 *   empty collection (triggers the "No members yet" empty state).
 * @param options.includeCreation - When true, POST /organizations is handled
 *   and returns MOCK_ORG with status 201.
 * @param options.includeMemberAdd - When true, POST .../members is handled
 *   and returns MOCK_MEMBER with status 201.
 * @param options.includeMemberRemove - When true, DELETE .../members/{userId}
 *   is handled and returns status 204.
 */
async function mockOrgsRoutes(
  page: import("@playwright/test").Page,
  options: {
    emptyList?: boolean;
    emptyMembers?: boolean;
    includeCreation?: boolean;
    includeMemberAdd?: boolean;
    includeMemberRemove?: boolean;
  } = {},
): Promise<void> {
  // Catch-all registered FIRST so specific routes (registered after) take
  // priority. Playwright resolves routes in LIFO order — last registered wins.
  await page.route("**/api/v1/**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ data: [], total: 0 }),
    }),
  );

  // Member removal endpoint: DELETE /organizations/{id}/members/{userId}.
  // Registered before the members base-path route even though Playwright treats
  // these as distinct URL patterns — explicit ordering makes the priority clear.
  if (options.includeMemberRemove) {
    await page.route(
      `**/api/v1/organizations/${MOCK_ORG.id}/members/${MOCK_MEMBER.userId}`,
      (route) => {
        if (route.request().method() === "DELETE") {
          route.fulfill({ status: 204, body: "" });
        } else {
          void route.continue();
        }
      },
    );
  }

  // Members base route: GET (list) and optional POST (add member).
  await page.route(
    `**/api/v1/organizations/${MOCK_ORG.id}/members`,
    (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            options.emptyMembers ? MOCK_MEMBER_LIST_EMPTY : MOCK_MEMBER_LIST,
          ),
        });
      } else if (
        route.request().method() === "POST" &&
        options.includeMemberAdd
      ) {
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_MEMBER),
        });
      } else {
        void route.continue();
      }
    },
  );

  // Individual org detail: GET /organizations/{id}.
  await page.route(`**/api/v1/organizations/${MOCK_ORG.id}`, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ORG),
    }),
  );

  // Org list (GET) and creation (POST) — registered last for highest priority
  // on the /api/v1/organizations base path.
  await page.route("**/api/v1/organizations", (route) => {
    if (route.request().method() === "GET") {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(
          options.emptyList ? { data: [], total: 0 } : MOCK_ORG_LIST,
        ),
      });
    } else if (
      route.request().method() === "POST" &&
      options.includeCreation
    ) {
      route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify(MOCK_ORG),
      });
    } else {
      void route.continue();
    }
  });
}

// ── Tests ────────────────────────────────────────────────────────────────────

/**
 * Test 1: The list page renders the page heading and a card for each
 * organization returned by the API, including name, slug, and description.
 */
test("authenticated user can navigate to /organizations and see heading + org card", async ({
  page,
}) => {
  await mockOrgsRoutes(page);

  await page.goto("/organizations");

  // Page heading rendered by PageHeader → <h1>
  await expect(
    page.getByRole("heading", { name: "Organizations" }),
  ).toBeVisible();

  // Org card fields
  await expect(page.getByText(MOCK_ORG.name)).toBeVisible();
  await expect(page.getByText(MOCK_ORG.slug)).toBeVisible();
  await expect(page.getByText(MOCK_ORG.description)).toBeVisible();
});

/**
 * Test 2: The "Create Organization" button (link) is always visible on the
 * list page for authenticated users and links to /organizations/new.
 */
test("organizations list shows Create Organization button", async ({ page }) => {
  await mockOrgsRoutes(page);

  await page.goto("/organizations");

  // The header area renders a link wrapping a Button; the empty-state also
  // renders one — .first() is used to target the header button unambiguously.
  await expect(
    page.getByRole("link", { name: "Create Organization" }).first(),
  ).toBeVisible();
});

/**
 * Test 3: When the API returns an empty collection the list page shows the
 * "No organizations yet" empty-state message instead of a card grid.
 */
test("organizations list shows empty state when no orgs exist", async ({
  page,
}) => {
  await mockOrgsRoutes(page, { emptyList: true });

  await page.goto("/organizations");

  await expect(page.getByText("No organizations yet")).toBeVisible();
});

/**
 * Test 4: Navigating to /organizations/new shows the create form with all
 * expected fields identified by their id attributes.
 */
test("user can navigate to the create organization form", async ({ page }) => {
  await mockOrgsRoutes(page);

  await page.goto("/organizations/new");

  await expect(
    page.getByRole("heading", { name: "Create Organization" }),
  ).toBeVisible();

  // Required name input
  await expect(page.locator("#org-name")).toBeVisible();

  // Read-only slug preview (auto-derived from the name field)
  await expect(page.locator("#org-slug")).toBeVisible();

  // Optional description textarea
  await expect(page.locator("#org-description")).toBeVisible();
});

/**
 * Test 5: Filling in the name field and submitting the create form calls
 * POST /api/v1/organizations and redirects to the new org's detail page.
 */
test("user can create an organization and is redirected to the detail page", async ({
  page,
}) => {
  await mockOrgsRoutes(page, { includeCreation: true });

  await page.goto("/organizations/new");

  // Fill the required name field; the slug preview is derived automatically
  await page.locator("#org-name").fill(MOCK_ORG.name);

  // Optionally fill the description
  await page.locator("#org-description").fill(MOCK_ORG.description);

  // Submit — the button label is "Create Organization" when not in-flight
  await page.getByRole("button", { name: "Create Organization" }).click();

  // After successful creation the router pushes /organizations/{id}
  await expect(page).toHaveURL(new RegExp(`/organizations/${MOCK_ORG.id}`), {
    timeout: 10_000,
  });
});

/**
 * Test 6: The detail page for an existing organization renders the org name
 * as the page heading and shows the Members section with at least one member.
 */
test("organization detail page shows the members section", async ({ page }) => {
  await mockOrgsRoutes(page);

  await page.goto(`/organizations/${MOCK_ORG.id}`);

  // PageHeader renders the org name as <h1>
  await expect(
    page.getByRole("heading", { name: MOCK_ORG.name }),
  ).toBeVisible();

  // Members card title — CardTitle renders as a <div> in this project's
  // ui library, so a text match is used rather than a heading role query.
  await expect(page.getByText("Members")).toBeVisible();

  // The mock member should appear in the table
  await expect(page.getByText(MOCK_MEMBER.username)).toBeVisible();
});

/**
 * Test 7: When the members endpoint returns an empty collection the detail
 * page shows "No members yet" in place of the members table.
 */
test("organization detail page shows No members yet empty state", async ({
  page,
}) => {
  await mockOrgsRoutes(page, { emptyMembers: true });

  await page.goto(`/organizations/${MOCK_ORG.id}`);

  await expect(page.getByText("No members yet")).toBeVisible();
});

/**
 * Test 8: An admin/owner can add a new member by filling in the username
 * input, selecting a role, and clicking "Add Member". The form is reset and
 * the member list refreshes to display the newly added member.
 */
test("admin can add a member to the organization", async ({ page }) => {
  await mockOrgsRoutes(page, { emptyMembers: true });

  // Override the members endpoint with stateful behavior: GET returns an
  // empty list until a successful POST has been observed, after which it
  // returns the new member so the component table refreshes correctly.
  // This route is registered AFTER mockOrgsRoutes so LIFO gives it priority.
  let memberAdded = false;

  await page.route(
    `**/api/v1/organizations/${MOCK_ORG.id}/members`,
    (route) => {
      if (route.request().method() === "POST") {
        memberAdded = true;
        route.fulfill({
          status: 201,
          contentType: "application/json",
          body: JSON.stringify(MOCK_MEMBER),
        });
      } else if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            memberAdded ? MOCK_MEMBER_LIST : MOCK_MEMBER_LIST_EMPTY,
          ),
        });
      } else {
        void route.continue();
      }
    },
  );

  await page.goto(`/organizations/${MOCK_ORG.id}`);

  // The add-member form is rendered because the current user is the owner
  await expect(page.getByLabel("Username")).toBeVisible();

  // Fill in the new member's username
  await page.getByLabel("Username").fill(MOCK_MEMBER.username);

  // Select the "member" role from the role dropdown
  await page.getByLabel("New member role").selectOption("member");

  // Submit the add-member form
  await page.getByRole("button", { name: "Add Member" }).click();

  // After the POST resolves the component reloads the member list; the new
  // member's username should now appear in the refreshed table
  await expect(page.getByText(MOCK_MEMBER.username)).toBeVisible({
    timeout: 10_000,
  });
});

/**
 * Test 9: An admin/owner can remove a member by clicking the per-row remove
 * button and confirming in the ConfirmDialog that appears. After confirmation
 * the member list is refreshed and the "No members yet" state is shown.
 */
test("admin can remove a member from the organization", async ({ page }) => {
  await mockOrgsRoutes(page);

  // Override endpoints with stateful behavior: the member list returns the
  // mock member until a successful DELETE is observed, after which it returns
  // the empty collection so the empty state is rendered.
  // Both routes are registered AFTER mockOrgsRoutes so LIFO gives them priority.
  let memberRemoved = false;

  await page.route(
    `**/api/v1/organizations/${MOCK_ORG.id}/members/${MOCK_MEMBER.userId}`,
    (route) => {
      if (route.request().method() === "DELETE") {
        memberRemoved = true;
        route.fulfill({ status: 204, body: "" });
      } else {
        void route.continue();
      }
    },
  );

  await page.route(
    `**/api/v1/organizations/${MOCK_ORG.id}/members`,
    (route) => {
      if (route.request().method() === "GET") {
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            memberRemoved ? MOCK_MEMBER_LIST_EMPTY : MOCK_MEMBER_LIST,
          ),
        });
      } else {
        void route.continue();
      }
    },
  );

  await page.goto(`/organizations/${MOCK_ORG.id}`);

  // Confirm the member is initially visible in the table
  await expect(page.getByText(MOCK_MEMBER.username)).toBeVisible();

  // The remove button carries opacity-0 by default and becomes visible only
  // on group-hover. force: true bypasses the actionability visibility check
  // so the click fires regardless of the computed opacity.
  await page
    .getByRole("button", { name: `Remove ${MOCK_MEMBER.username}` })
    .click({ force: true });

  // A ConfirmDialog should appear with the "Remove member" title
  await expect(page.getByRole("heading", { name: "Remove member" })).toBeVisible();

  // Click the destructive confirm button whose accessible name is exactly
  // "Remove" — this is distinct from the icon button's aria-label which is
  // "Remove member-user", so exact: true safely targets only the dialog action.
  await page.getByRole("button", { name: "Remove", exact: true }).click();

  // After the DELETE resolves the member list refreshes; the empty state
  // should now be shown since the only member was removed
  await expect(page.getByText("No members yet")).toBeVisible({
    timeout: 10_000,
  });
});

}); // end test.describe("Organizations — authenticated")

/**
 * Test 10: An unauthenticated user who navigates to /organizations is
 * redirected to /login by the client-side AuthGuard.
 */
test.describe("unauthenticated access", () => {
  // Override the storageState inherited from the project config with an empty
  // state so no auth tokens are present in sessionStorage when the page loads.
  test.use({ storageState: { cookies: [], origins: [] } });

  test("unauthenticated user is redirected to /login from /organizations", async ({
    page,
  }) => {
    await page.goto("/organizations");

    // AuthGuard detects the missing token and calls router.replace("/login")
    await expect(page).toHaveURL(/\/login/);
  });
});
