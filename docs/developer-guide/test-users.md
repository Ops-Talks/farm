# Test Users and Permission Scopes

The `npm run seed` task provisions a deterministic matrix of users, organizations, and team memberships so contributors and QA can exercise every axis of Farm's authorization model without writing manual SQL. This page documents the matrix, the credentials, and the recipes used to test each scope.

The single source of truth for the matrix is the `TEST_USERS` constant exported from `apps/api/src/database/seeds/initial-seed.ts`. Updating that constant — and re-running the seed — is enough to extend the matrix.

## Authorization axes

Farm combines three orthogonal authorization mechanisms:

1. **Role-based access** — endpoints decorated with `@Roles("admin")` reject any user whose JWT `roles` claim does not include `admin`. Admin-only pages include `/elasticsearch`, parts of `/organizations`, and several settings views.
2. **Multi-tenancy via `OrgContextInterceptor`** — every protected request reads the optional `X-Organization-Id` header (UUID **or** organization slug). The interceptor verifies the user has a `UserOrganization` membership row for that org and rejects with `403 Forbidden` otherwise. Resources written while a tenancy is active are scoped to that organization.
3. **Team-scoped ownership** — `Component`, `Documentation`, and other entities can declare a `Team` owner. Endpoints that mutate ownership-scoped resources require the caller to be a member of the owning team (via the `team_members` join table).

The personas below cover each axis in isolation so a single login can prove or disprove the behavior under test.

## Persona matrix

Personas are named by their TEST PURPOSE — the combination of global JWT `roles` and per-tenant `OrgRole` they exercise — rather than by where they live. This is how each row maps to an authorization axis under test.

| Persona | Username | Password | Roles | Memberships (org → OrgRole) | Teams | Intended scope |
|---|---|---|---|---|---|---|
| Platform Admin | `admin` | `Admin1234` | `admin` | `farm-demo: OWNER` | — | Full platform admin: reaches `/elasticsearch`, manages every org. |
| Org Owner | `org-owner` | `OrgOwner1` | `user` | `org-b: OWNER` | — | Tenant owner of `org-b`; verifies catalog isolation when `X-Organization-Id: org-b` is set. |
| Org Admin | `org-admin` | `OrgAdmin1` | `user` | `farm-demo: ADMIN` | — | Verifies endpoints that require `OrgRole.ADMIN` (or higher) inside a tenant. |
| Org Member | `org-member` | `OrgMember1` | `user` | `farm-demo: MEMBER` | `backend-team` | Non-admin within the default tenant; verifies regular `user` flows and team-scoped writes on backend components. |
| Cross-Org Member | `cross-org-member` | `CrossOrg1` | `user` | `farm-demo: MEMBER`, `org-b: MEMBER` | — | Multi-tenant SSO-style account; verifies that the same bearer token can switch tenants by changing `X-Organization-Id`. |
| Team Lead | `team-lead` | `TeamLead1` | `user` | `farm-demo: MEMBER` | `platform-team` | Verifies ownership-scoped actions on platform-team resources. |
| Viewer | `viewer` | `Viewer1234` | `user` | `farm-demo: MEMBER` | — | Read-only persona inside the default tenant; verifies that users without team membership cannot perform team-scoped writes. |

> Passwords are reset on a fresh `npm run seed` only when the environment variable `SEED_RESET_PASSWORDS=true` is set. By default existing passwords are preserved so that production seed runs do not silently rotate credentials. If you change a persona's password manually in your dev DB and want to re-sync to the seed value, run `SEED_RESET_PASSWORDS=true npm run seed`.

## Switching tenancy in the Web UI and via API

The active organization is communicated to the API through the `X-Organization-Id` header, which accepts either an organization UUID or its slug.

- **Web UI** — the organization switcher in the top bar sets the header for every subsequent request automatically.
- **curl** — pass the header alongside the bearer token, for example:
  ```bash
  curl -H "Authorization: Bearer $TOKEN" \
       -H "X-Organization-Id: org-b" \
       http://localhost:3000/api/v1/catalog/components
  ```

If the header is omitted the request runs in a "no tenant" mode and only sees resources whose `organizationId` is `null`.

## How to test

### Recipe 1 — Admin-only routes

```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"admin","password":"Admin1234"}'
```

The `admin` username corresponds to the `platformAdmin` persona — the only persona whose JWT carries the global `admin` role. Use the returned `accessToken` to GET `/api/v1/elasticsearch/indices` — the response should be `200 OK` with the cross-component index list. Logging in as any other persona and hitting the same URL should return `403 Forbidden` because of `@Roles("admin")`.

### Recipe 2 — Tenant isolation with `org-owner`

```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"org-owner","password":"OrgOwner1"}'
```

With the resulting token:

- `curl -H "Authorization: Bearer $TOKEN" -H "X-Organization-Id: org-b" /api/v1/catalog/components` returns the components scoped to `org-b` (empty list on a fresh seed — the demo catalog lives in `farm-demo`).
- `curl -H "Authorization: Bearer $TOKEN" -H "X-Organization-Id: farm-demo" /api/v1/catalog/components` returns `403 Forbidden` because `org-owner` has no `UserOrganization` row for `farm-demo`.

In the Web UI, switch the organization in the header to `Org B`; the catalog and other org-scoped views should refresh to show the `org-b` tenant's data.

### Recipe 3 — Team-scoped ownership with `team-lead`

```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"team-lead","password":"TeamLead1"}'
```

`team-lead` is a member of `platform-team`. Mutations against components owned by `platform-team` (for example, updating the `description` of the `developer-portal` component) succeed; the same mutation issued by `viewer` (who is in `farm-demo` but in no team) returns `403 Forbidden`.

### Recipe 4 — Verifying read-only behavior with `viewer`

`viewer` has the `user` role and `farm-demo` membership but no team. Use this persona to verify that read-only flows work end-to-end while team-scoped writes are correctly rejected — useful when adding new endpoints that must be protected by team ownership rather than just by JWT role.

### Recipe 5 — Multi-tenant SSO with `cross-org-member`

```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"cross-org-member","password":"CrossOrg1"}'
```

`cross-org-member` holds two `UserOrganization` rows — one for `farm-demo` and one for `org-b`, both with `OrgRole.MEMBER`. The same bearer token therefore satisfies `OrgContextInterceptor` for either tenant depending solely on the `X-Organization-Id` header value:

- `curl -H "Authorization: Bearer $TOKEN" -H "X-Organization-Id: farm-demo" /api/v1/catalog/components` → `200 OK`, returns `farm-demo` data.
- `curl -H "Authorization: Bearer $TOKEN" -H "X-Organization-Id: org-b" /api/v1/catalog/components` → `200 OK`, returns `org-b` data.

This persona models the typical SSO scenario where one identity is provisioned into multiple tenants. Switching the organization in the Web UI's top bar exercises exactly the same code path.

### Recipe 6 — ADMIN-mininum endpoints with `org-admin`

```bash
curl -X POST http://localhost:3000/api/auth/login \
     -H 'Content-Type: application/json' \
     -d '{"username":"org-admin","password":"OrgAdmin1"}'
```

`org-admin` holds `OrgRole.ADMIN` (not OWNER) inside `farm-demo`. Use this persona to verify that endpoints which call `assertOrgRole(id, requesterId, OrgRole.ADMIN)` (for example `OrganizationService.update` in `apps/api/src/modules/organization/organization.service.ts`) accept ADMIN as the minimum role:

- The same call performed as `org-member` (MEMBER) returns `403 Forbidden`.
- As `org-admin` it returns `200 OK`, proving the guard correctly accepts ADMIN ≥ ADMIN, not only OWNER.

This persona is the missing axis between `platformAdmin` (global `admin` role) and `org-member` (MEMBER); without it, ADMIN-only endpoints could accidentally regress to OWNER-only without any test catching it.

## Re-seeding behavior

`seedUsers` is idempotent. Re-running `npm run seed` against a populated database:

- Adds any persona that is missing.
- Merges roles using set semantics (no duplicates) for already-existing personas.
- Upserts missing `UserOrganization` rows from the persona's `memberships`, with the declared `OrgRole` (OWNER, ADMIN, or MEMBER) for each `(orgSlug, role)` pair.
- Adds missing `team_members` rows from the persona's `teamSlugs`.
- **Never** removes memberships, roles, or team affiliations that were added manually.
- **Never** rewrites existing passwords unless `SEED_RESET_PASSWORDS=true`.

This means it is safe to run the seed in CI, in development containers, or after pulling new code.
