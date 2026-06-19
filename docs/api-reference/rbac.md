# RBAC API Reference

Farm uses a two-tier RBAC model: **global platform roles** (stored in the JWT) and **per-organization roles** (stored in the `UserOrganization` table). Phase 46 added a third layer of fine-grained named permissions resolved from the org role.

---

## Global Roles

| Role | Description |
|------|-------------|
| `admin` | Full platform access. Bypasses org-level restrictions. Can manage users and organizations. |
| `user` | Standard access. Subject to org-level permissions for multi-tenant resources. |

Global roles are included in the JWT payload under the `roles` claim and enforced by `RolesGuard` + `@Roles('admin')`.

---

## Org Roles

Org roles are stored per `(userId, organizationId)` pair in the `UserOrganization` join table.

| Role | Weight | Capabilities |
|------|--------|--------------|
| `owner` | 4 | Full control: delete org, transfer ownership, manage all members, all permissions including `ORG_MANAGE` |
| `admin` | 3 | Manage members, update org settings, all resource write/delete operations except org management |
| `member` | 2 | Create/update catalog entries, trigger pipelines, update environments, manage IaC resources |
| `viewer` | 1 | Read-only access; no write permissions granted |

The role is resolved at request time from the `X-Organization-Id` header. Pass this header on every org-scoped request:

```http
GET /api/v1/catalog/components
Authorization: Bearer <access_token>
X-Organization-Id: <org-uuid>
```

---

## Named Permissions

Each org role implicitly grants a set of named permissions. Endpoints declare a required permission; the `PermissionGuard` checks the resolved org role at runtime.

| Permission | `viewer` | `member` | `admin` | `owner` |
|---|:---:|:---:|:---:|:---:|
| `CATALOG_WRITE` | — | Yes | Yes | Yes |
| `CATALOG_DELETE` | — | — | Yes | Yes |
| `PIPELINE_TRIGGER` | — | Yes | Yes | Yes |
| `PIPELINE_DELETE` | — | — | Yes | Yes |
| `ENVIRONMENT_WRITE` | — | Yes | Yes | Yes |
| `TEAM_MANAGE` | — | — | Yes | Yes |
| `ORG_MANAGE` | — | — | — | Yes |
| `IAC_WRITE` | — | Yes | Yes | Yes |

### Error response when permission is denied

```json
{
  "statusCode": 403,
  "timestamp": "2026-01-01T00:00:00.000Z",
  "path": "/api/v1/catalog/components",
  "message": "Insufficient permissions",
  "errorCode": "INSUFFICIENT_PERMISSIONS"
}
```

---

## Get Current User's Org Role

Returns the calling user's role in the specified organization.

```http
GET /api/v1/organizations/:id/members/me
Authorization: Bearer <access_token>
```

**Response:**

```json
{
  "role": "admin"
}
```

Returns `404` if the user is not a member of the organization.

---

## Related

- [Organizations API Reference](organizations.md) — org and member management endpoints
- [Multi-Tenancy and RBAC Developer Guide](../developer-guide/backend/multi-tenancy.md) — implementation details
- [User Guide: Organizations](../user-guide/organizations.md) — usage guide


