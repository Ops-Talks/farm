# Multi-Tenancy and RBAC

This guide explains how Farm handles multi-tenancy through Organizations, how the RBAC model works across global roles, org roles, and granular permissions, and how to integrate these features in both backend and frontend code.

## Overview

Farm uses a multi-tenant model where a single deployment serves multiple isolated organizations. The key relationships are:

- One **User** can belong to many **Organizations**, each with a distinct role.
- One **Organization** owns many resources: components, teams, environments, documentation pages, API specs, gateway routes, and audit log entries.
- Resources without an organization affiliation remain accessible to all authenticated users (backward-compatible with pre-multi-tenancy data).

The `organizationId` foreign key on `Component`, `Team`, `Environment`, `AuditLog`, `Documentation`, `ApiSpec`, and `GatewayRoute` is **nullable and indexed**. A `null` value means the resource is not scoped to any organization.

## Organization Lifecycle

```
Create organization  -->  Invite members  -->  Assign roles  -->  Scope resources
(POST /api/v1/organizations)                  (OrgRole enum)     (X-Organization-Id header)
```

1. A user creates an organization. The creator is automatically assigned the `OWNER` role.
2. The owner or an admin adds members to the organization.
3. Resources (components, teams, environments, documentation, API specs, gateway routes) created while an org context is active are tagged with `organizationId`.
4. Subsequent requests include the `X-Organization-Id` header to operate within the organization's scope.

## RBAC Model

### Tier 1 - Global Roles

Global roles are stored as a `string[]` on the `User` entity and included in the JWT payload under the `roles` claim. They are enforced by `RolesGuard` using the `@Roles()` decorator.

| Role | Description |
|------|-------------|
| `admin` | Full platform access; bypasses org-level restrictions |
| `user` | Standard access; subject to org-level permissions |

Example:

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
@Delete(':id')
remove(@Param('id') id: string) { ... }
```

### Tier 2 - Org Roles

Org roles are stored in the `UserOrganization` join table and resolved at request time from the database. They are enforced by `OrgRolesGuard` using the `@OrgRoles()` decorator.

| Role | Numeric Weight | Capabilities |
|------|---------------|--------------|
| `OWNER` | 3 | Full control: update org, delete org, manage all members and roles |
| `ADMIN` | 2 | Manage members, update org settings, manage org resources |
| `MEMBER` | 1 | Read and contribute access to org resources |

The guard performs a **minimum-weight check**: `@OrgRoles("admin")` allows both `ADMIN` (2) and `OWNER` (3).

Example:

```typescript
@UseGuards(JwtAuthGuard, OrgRolesGuard)
@OrgRoles('admin')
@Patch(':id')
update(@Param('id') id: string, @Body() dto: UpdateOrganizationDto) { ... }
```

Combining both tiers (global admin bypasses org role check):

```typescript
@UseGuards(JwtAuthGuard, RolesGuard, OrgRolesGuard)
@Roles('admin')
@OrgRoles('member')
@Get()
findAll(@Req() req: RequestWithOrg) { ... }
```

### Tier 2 in Practice

`OrgRolesGuard` is used for organization management operations (CRUD on the org itself and its members). For resource endpoints (catalog, pipelines, teams, environments), the fine-grained permission model (Tier 3) is used instead.

### Tier 3 — Granular Permissions (Phase 46)

Phase 46 introduced a fine-grained permission model layered on top of org roles. Instead of checking the raw org role, resource endpoints check specific named permissions resolved from the role.

**Permission enum** (defined in `@farm/types`):

| Permission | Granted to |
|---|---|
| `CATALOG_WRITE` | `admin`, `owner` |
| `CATALOG_DELETE` | `owner` |
| `TEAM_MANAGE` | `admin`, `owner` |
| `PIPELINE_TRIGGER` | `admin`, `owner` |
| `PIPELINE_DELETE` | `owner` |

`RolePermissions` maps each `OrgRole` to its list of granted `Permission` values. Both are exported from `@farm/types` for use in the frontend.

**Guard chain for resource endpoints:**

```typescript
@UseGuards(JwtAuthGuard, OrgRequiredGuard, PermissionGuard)
@RequiresPermission(Permission.CATALOG_WRITE)
@Post()
create(@Req() req: RequestWithOrg, @Body() dto: CreateComponentDto) { ... }
```

- `OrgRequiredGuard` — reads `X-Organization-Id`, validates membership, sets `req.organizationId` and `req.orgRole`; throws 403 (`ForbiddenException`) if the header is missing or the user is not a member, with the response message and any `errorCode` coming from the thrown forbidden error
- `PermissionGuard` — reads `@RequiresPermission()` metadata and checks `req.orgRole` against `RolePermissions`

**Frontend RBAC:**

```typescript
import { usePermission } from "@/hooks/use-permission";
import { Permission } from "@farm/types";

function CatalogActions() {
  const canWrite = usePermission(Permission.CATALOG_WRITE);
  return canWrite ? <RegisterButton /> : null;
}
```

`usePermission()` reads `orgRole` from `OrganizationContext` and checks it against `RolePermissions`. Returns `false` while the role is loading.

## Creating an Organization

```http
POST /api/v1/organizations
Authorization: Bearer <access_token>
Content-Type: application/json

{
  "name": "Acme Platform Team",
  "slug": "acme-platform",
  "description": "Platform engineering team for Acme Corp"
}
```

Response:

```json
{
  "id": "f3a2b1c0-...",
  "name": "Acme Platform Team",
  "slug": "acme-platform",
  "description": "Platform engineering team for Acme Corp",
  "ownerId": "a1b2c3d4-...",
  "createdAt": "2025-01-01T00:00:00.000Z",
  "updatedAt": "2025-01-01T00:00:00.000Z"
}
```

The calling user is automatically assigned the `OWNER` role in this organization.

## Managing Members

### List organizations for the current user

```http
GET /api/v1/organizations
Authorization: Bearer <access_token>
```

### Get a specific organization

```http
GET /api/v1/organizations/:id
Authorization: Bearer <access_token>
X-Organization-Id: f3a2b1c0-...
```

### Update an organization (requires ADMIN or OWNER)

```http
PATCH /api/v1/organizations/:id
Authorization: Bearer <access_token>
X-Organization-Id: f3a2b1c0-...
Content-Type: application/json

{
  "description": "Updated description"
}
```

### Delete an organization (requires OWNER)

```http
DELETE /api/v1/organizations/:id
Authorization: Bearer <access_token>
X-Organization-Id: f3a2b1c0-...
```

## OrgContextInterceptor

`OrgContextInterceptor` is registered globally as `APP_INTERCEPTOR` in `AppModule`. It executes on every incoming request before the controller handler runs.

**Processing logic:**

1. Read the `X-Organization-Id` header from the incoming request.
2. If the header is **absent** or the user is **unauthenticated**: set `req.organizationId = undefined` and continue. This preserves backward compatibility with clients that do not send the header.
3. If the header is **present** and the user is **authenticated**: query the `UserOrganization` repository for a record matching `{ userId, organizationId }`.
4. If a membership record is **found**: attach `req.organizationId` for downstream use.
5. If a membership record is **not found**: throw `ForbiddenException("Not a member of this organization")`.

**Interface:**

Controllers and services receive the organization context via the `RequestWithOrg` interface:

```typescript
// apps/api/src/common/interfaces/request-with-org.interface.ts
export interface RequestWithOrg extends Request {
  organizationId?: string;
  user?: {
    userId: string;
    username: string;
    roles: string[];
  };
}
```

**Do not** read `organizationId` from query parameters. Always use `req.organizationId` as injected by the interceptor.

## Query Scoping

When `req.organizationId` is set, service `findAll()` methods scope their TypeORM queries to that organization:

```typescript
// Example from CatalogService
async findAll(organizationId?: string): Promise<Component[]> {
  const where = organizationId ? { organizationId } : {};
  return this.componentRepository.find({ where });
}
```

Resources with `organizationId = null` are **not returned** when an org context is active, ensuring tenant isolation. Resources created outside an org context retain `organizationId = null` and remain accessible to non-scoped queries.

## API Usage Examples

### Request without org context (backward-compatible)

Returns all components accessible to the user, regardless of org affiliation:

```http
GET /api/v1/catalog/components
Authorization: Bearer <access_token>
```

### Request with org context

Returns only components belonging to the specified organization:

```http
GET /api/v1/catalog/components
Authorization: Bearer <access_token>
X-Organization-Id: f3a2b1c0-...
```

If the user is not a member of that organization, the interceptor returns:

```json
{
  "statusCode": 403,
  "timestamp": "2025-01-01T00:00:00.000Z",
  "path": "/api/v1/catalog/components",
  "message": "Not a member of this organization"
}
```

## Frontend Integration

### OrganizationProvider

`OrganizationProvider` (`apps/web/src/contexts/organization-context.tsx`) wraps the application and:

- Fetches the list of organizations the current user belongs to on mount.
- Persists the selected organization ID in `sessionStorage` under the key `farm_current_org` (plain string).
- Exposes `switchOrg(id)` to change the active organization and `refreshOrgs()` to reload the list.
- Fetches the current user's org role from `GET /v1/organizations/:id/members/me` when `currentOrg` changes, exposing it as `orgRole: OrgRole | null`.

Use `usePermission(permission)` from `apps/web/src/hooks/use-permission.ts` to gate write-action UI elements based on the current user's org role:

```typescript
import { usePermission } from "@/hooks/use-permission";
import { Permission } from "@farm/types";

const canWrite = usePermission(Permission.CATALOG_WRITE);
return canWrite ? <RegisterButton /> : null;
```

### Automatic Header Injection

The API client (`apps/web/src/lib/api-client.ts`) reads the current org ID from `sessionStorage` and appends the `X-Organization-Id` header to every outbound request:

```typescript
const currentOrg = typeof window !== 'undefined'
  ? sessionStorage.getItem('farm_current_org')
  : null;

if (currentOrg) {
  headers['X-Organization-Id'] = currentOrg;
}
```

This behavior is:

- **SSR-safe**: guarded by `typeof window !== 'undefined'`.
- **Non-blocking**: the header is omitted when no organization is selected.

### OrgSwitcher Component

The `OrgSwitcher` dropdown in the sidebar lets users switch between their organizations. Selecting an organization calls `switchOrg()`, which updates `sessionStorage` and triggers a re-render so subsequent API calls include the new org context.

### Organization Pages

| Route | Description |
|-------|-------------|
| `/organizations` | List all organizations for the current user |
| `/organizations/new` | Create a new organization |
| `/organizations/[id]` | View and manage a specific organization |

## Guard Reference

| Guard | Decorator | When to use |
|-------|-----------|-------------|
| `JwtAuthGuard` | (applied via `@UseGuards`) | All authenticated endpoints; verifies JWT and populates `req.user` |
| `RolesGuard` | `@Roles('admin')` | Global admin-only operations not scoped to an organization |
| `OrgRolesGuard` | `@OrgRoles('admin')` | Organization management routes (org CRUD, member management) |
| `OrgRequiredGuard` | — | Org-scoped resource endpoints; validates membership and sets `req.orgRole` |
| `PermissionGuard` | `@RequiresPermission(Permission.X)` | Fine-grained permission checks on resource endpoints (Phase 46) |

**Never** combine `RolesGuard` and `PermissionGuard` on the same endpoint — they serve different concerns.
