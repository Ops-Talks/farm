# Organizations

Organizations are the top-level multi-tenant isolation unit in Farm. Every resource -- catalog components, teams, pipelines, and environments -- can be scoped to an organization. This allows multiple independent teams or business units to share a single Farm installation without their data overlapping.

---

## What is an Organization?

An organization groups users, resources, and configurations under a shared namespace. When you scope a request to an organization, Farm filters all results to that organization's data only.

Each organization has:

- A unique `slug` used as a human-readable identifier
- A list of members, each with an assigned role
- Isolated resources: catalog components, pipelines, environments, and teams can all carry an `organizationId`

---

## Creating an Organization

```bash
curl -X POST http://localhost:3000/api/v1/organizations \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Platform Engineering",
    "slug": "platform-engineering",
    "description": "Platform Engineering team organization"
  }'
```

The user who creates the organization is automatically assigned the `owner` role.

---

## Switching Between Organizations

### Via API

Pass the `X-Organization-Id` header on any request to scope it to a specific organization:

```bash
curl http://localhost:3000/api/v1/catalog/components \
  -H "Authorization: Bearer <token>" \
  -H "X-Organization-Id: <org-uuid>"
```

All resource-returning endpoints respect this header and filter results accordingly.

### Via the Web UI

The Farm web UI includes an organization switcher in the navigation bar. Select an organization to set it as your active context. All subsequent API requests from the UI will include the `X-Organization-Id` header automatically.

---

## Managing Members

### Viewing Members

```bash
curl http://localhost:3000/api/v1/organizations/<org-id>/members \
  -H "Authorization: Bearer <token>"
```

Returns a list of members with their roles and join dates.

### Adding a Member

```bash
curl -X POST http://localhost:3000/api/v1/organizations/<org-id>/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "userId": "<user-uuid>", "role": "member" }'
```

Requires `admin` or `owner` role in the organization.

### Changing a Member's Role

```bash
curl -X PATCH http://localhost:3000/api/v1/organizations/<org-id>/members/<user-id>/role \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "role": "admin" }'
```

### Removing a Member

```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/<org-id>/members/<user-id> \
  -H "Authorization: Bearer <token>"
```

---

## Org Roles

Each member of an organization is assigned exactly one of the following roles:

| Role | Description |
|------|-------------|
| `owner` | Full control. Assigned to the creator. Can promote other users to `owner`. |
| `admin` | Can add members, change roles (with restrictions), and remove members. |
| `member` | Can view organization resources. Cannot manage members. |

### Role Hierarchy Rules

- Only the `owner` can promote another user to `owner`.
- An `admin` cannot change another `admin`'s role.
- An `admin` cannot remove another `admin`.
- The `owner` role is immutable -- it cannot be downgraded via the API.

---

## Fine-Grained Permissions (Phase 46)

Beyond the four org roles, Farm enforces fine-grained **named permissions** on every resource endpoint. Your org role implicitly grants a set of permissions defined in `@farm/types`:

| Permission | `viewer` | `member` | `admin` | `owner` |
|---|:---:|:---:|:---:|:---:|
| `catalog:read` | Yes | Yes | Yes | Yes |
| `catalog:write` | -- | -- | Yes | Yes |
| `catalog:delete` | -- | -- | -- | Yes |
| `team:read` | Yes | Yes | Yes | Yes |
| `team:manage` | -- | -- | Yes | Yes |
| `environment:read` | Yes | Yes | Yes | Yes |
| `environment:write` | -- | -- | Yes | Yes |
| `pipeline:read` | Yes | Yes | Yes | Yes |
| `pipeline:trigger` | -- | Yes | Yes | Yes |

If your role does not include the required permission for an endpoint, Farm returns `403 Forbidden`. The web UI automatically hides write-action buttons (register, edit, delete) based on your current permissions.

---

## How Organization Scope Affects Resources

When you include `X-Organization-Id` in a request, Farm applies an organization filter to all resource queries:

| Resource | Behavior |
|----------|----------|
| Catalog components | Returns only components with a matching `organizationId` |
| Teams | Returns only teams belonging to the organization |
| Pipelines | Returns only pipelines scoped to the organization |
| Environments | Returns only environments associated with the organization |

Resources without an `organizationId` are considered global and may appear regardless of the active organization context, depending on endpoint configuration.

---

## Further Reading

- [Organizations API Reference](../api-reference/organizations.md) -- full endpoint documentation
- [Multi-Tenancy and RBAC](../developer-guide/backend/multi-tenancy.md) -- developer guide for the multi-tenant implementation



