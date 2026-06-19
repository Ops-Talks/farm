# Organizations API Reference

Base path: `/api/v1/organizations`

All endpoints require a valid JWT bearer token. Member management endpoints additionally require the caller to hold an `owner` or `admin` role within the target organization.

---

## Organization Object

```json
{
  "id": "uuid",
  "name": "platform-engineering",
  "slug": "platform-engineering",
  "description": "Platform Engineering team organization",
  "createdAt": "2026-03-17T00:00:00.000Z",
  "updatedAt": "2026-03-17T00:00:00.000Z"
}
```

## MemberResponse Object

```json
{
  "userId": "uuid",
  "username": "john.doe",
  "role": "admin",
  "joinedAt": "2026-03-17T00:00:00.000Z"
}
```

---

## Org Roles

| Role | Description |
|------|-------------|
| `owner` | Full control over the organization. Assigned to the creator. Can promote other users to `owner`. |
| `admin` | Can manage members (add, update role, remove), but cannot modify another `admin` or promote to `owner`. |
| `member` | Read-only membership. Can view organization resources. |

### Role Hierarchy Enforcement

- Only a user with the `owner` role can promote another user to `owner`.
- An `admin` cannot change another `admin`'s role.
- An `admin` cannot remove another `admin`.
- The `owner` role is immutable after creation — it cannot be changed via the update-role endpoint.

---

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/v1/organizations` | List all organizations | JWT |
| POST | `/api/v1/organizations` | Create an organization | JWT |
| GET | `/api/v1/organizations/:id` | Get an organization | JWT |
| PATCH | `/api/v1/organizations/:id` | Update an organization | JWT + org admin |
| DELETE | `/api/v1/organizations/:id` | Delete an organization | JWT + org owner |
| GET | `/api/v1/organizations/:id/members` | List members | JWT + org member |
| POST | `/api/v1/organizations/:id/members` | Add a member | JWT + org admin |
| PATCH | `/api/v1/organizations/:id/members/:userId/role` | Update member role | JWT + org admin |
| DELETE | `/api/v1/organizations/:id/members/:userId` | Remove a member | JWT + org admin |

---

### List Organizations

`GET /api/v1/organizations`

Returns all organizations the authenticated user has access to.

**Response** `200 OK`

```json
[
  {
    "id": "uuid",
    "name": "platform-engineering",
    "slug": "platform-engineering",
    "description": "Platform Engineering team organization",
    "createdAt": "2026-03-17T00:00:00.000Z",
    "updatedAt": "2026-03-17T00:00:00.000Z"
  }
]
```

---

### Create Organization

`POST /api/v1/organizations`

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Human-readable organization name |
| `slug` | string | Yes | URL-safe identifier (lowercase, hyphens allowed) |
| `description` | string | No | Optional description |

**Example request:**

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

**Response** `201 Created` — the created Organization object.

**Error** `409 Conflict` — an organization with that `slug` already exists.

---

### Get Organization

`GET /api/v1/organizations/:id`

**Response** `200 OK` — the Organization object.

**Error** `404 Not Found` — organization does not exist.

---

### Update Organization

`PATCH /api/v1/organizations/:id`

Requires `admin` or `owner` org role.

**Request body** — any subset of `{ name, slug, description }`.

**Response** `200 OK` — the updated Organization object.

**Error** `403 Forbidden` — caller does not have `admin` or `owner` role in the organization.

**Error** `409 Conflict` — the new `slug` is already taken.

---

### Delete Organization

`DELETE /api/v1/organizations/:id`

Requires `owner` org role.

**Response** `204 No Content`.

**Error** `403 Forbidden` — caller is not the organization `owner`.

---

### List Members

`GET /api/v1/organizations/:id/members`

Returns all members of the organization with their roles.

Requires at minimum `member` org role.

**Response** `200 OK`

```json
[
  {
    "userId": "uuid",
    "username": "john.doe",
    "role": "admin",
    "joinedAt": "2026-03-17T00:00:00.000Z"
  },
  {
    "userId": "uuid-2",
    "username": "jane.smith",
    "role": "member",
    "joinedAt": "2026-03-17T00:00:00.000Z"
  }
]
```

---

### Add Member

`POST /api/v1/organizations/:id/members`

Requires `admin` or `owner` org role.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `userId` | UUID | Yes | ID of the user to add |
| `role` | string | Yes | Role to assign: `owner`, `admin`, or `member` |

**Example request:**

```bash
curl -X POST http://localhost:3000/api/v1/organizations/<org-id>/members \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "userId": "<user-uuid>", "role": "member" }'
```

**Response** `201 Created` — the MemberResponse object.

**Error** `400 Bad Request` — invalid role value.

**Error** `403 Forbidden` — caller does not have sufficient privileges to assign the requested role (e.g., an `admin` trying to assign `owner`).

**Error** `404 Not Found` — user or organization does not exist.

**Error** `409 Conflict` — user is already a member of this organization.

---

### Update Member Role

`PATCH /api/v1/organizations/:id/members/:userId/role`

Requires `admin` or `owner` org role.

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `role` | string | Yes | New role: `owner`, `admin`, or `member` |

**Example request:**

```bash
curl -X PATCH http://localhost:3000/api/v1/organizations/<org-id>/members/<user-id>/role \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{ "role": "admin" }'
```

**Response** `200 OK` — the updated MemberResponse object.

**Error** `400 Bad Request` — invalid role value, or target user already has `owner` role (immutable).

**Error** `403 Forbidden` — caller is an `admin` trying to modify another `admin`, or trying to assign `owner` without being `owner`.

**Error** `404 Not Found` — user is not a member of this organization.

---

### Remove Member

`DELETE /api/v1/organizations/:id/members/:userId`

Requires `admin` or `owner` org role.

**Example request:**

```bash
curl -X DELETE http://localhost:3000/api/v1/organizations/<org-id>/members/<user-id> \
  -H "Authorization: Bearer <token>"
```

**Response** `204 No Content`.

**Error** `403 Forbidden` — caller is an `admin` trying to remove another `admin`, or trying to remove the `owner`.

**Error** `404 Not Found` — user is not a member of this organization.



