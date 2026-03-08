# Teams API

The Teams API manages team ownership and membership within the Farm platform.

## Base Path

`/api/teams`

## Endpoints

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| `POST` | `/teams` | Create a new team | Admin |
| `GET` | `/teams` | List all teams | User |
| `GET` | `/teams/:id` | Get team by ID | User |
| `PATCH` | `/teams/:id` | Update a team | Admin |
| `DELETE` | `/teams/:id` | Delete a team | Admin |
| `POST` | `/teams/:id/members/:userId` | Add member to team | Admin |
| `DELETE` | `/teams/:id/members/:userId` | Remove member from team | Admin |
| `GET` | `/teams/:id/members` | List team members | User |
| `GET` | `/teams/:id/components` | List team's components | User |

## Team Types

Teams are categorized by type:

| Type | Description |
|------|-------------|
| `dev` | Development team |
| `infra` | Infrastructure / SRE team |
| `security` | Security team |
| `data` | Data engineering team |
| `platform` | Platform engineering team |
| `other` | Other team type |

## Create Team

```http
POST /api/teams
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "platform-engineering",
  "displayName": "Platform Engineering",
  "type": "platform",
  "description": "Core platform team",
  "contactEmail": "platform@example.com",
  "slackChannel": "#platform-eng"
}
```

### Response (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440010",
  "name": "platform-engineering",
  "displayName": "Platform Engineering",
  "type": "platform",
  "description": "Core platform team",
  "contactEmail": "platform@example.com",
  "slackChannel": "#platform-eng",
  "metadata": null,
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## List All Teams

Supports pagination via `skip` and `take` query parameters (defaults: `skip=0`, `take=20`, max `take=100`).

```http
GET /api/teams?skip=0&take=20
Authorization: Bearer <token>
```

### Paginated Response (200)

```json
{
  "data": [
    {
      "id": "550e8400-e29b-41d4-a716-446655440010",
      "name": "platform-engineering",
      "displayName": "Platform Engineering",
      "type": "platform"
    }
  ],
  "total": 5,
  "skip": 0,
  "take": 20
}
```

## Get Team by ID

```http
GET /api/teams/:id
Authorization: Bearer <token>
```

## Update Team

```http
PATCH /api/teams/:id
Content-Type: application/json
Authorization: Bearer <token>

{
  "description": "Updated description"
}
```

## Delete Team

```http
DELETE /api/teams/:id
Authorization: Bearer <token>
```

Returns `204 No Content` on success.

## Member Management

### Add Member

```http
POST /api/teams/:id/members/:userId
Authorization: Bearer <token>
```

Returns `201 Created` with the updated team (including members).

### Remove Member

```http
DELETE /api/teams/:id/members/:userId
Authorization: Bearer <token>
```

Returns `204 No Content` on success.

### List Members

```http
GET /api/teams/:id/members
Authorization: Bearer <token>
```

Returns an array of user objects belonging to the team.

## Team Components

```http
GET /api/teams/:id/components
Authorization: Bearer <token>
```

Returns all catalog components owned by the team (matched by `component.owner` = `team.name`).

## Component Ownership

Components can be assigned to a team via the `teamId` field:

```http
POST /api/catalog
Content-Type: application/json
Authorization: Bearer <token>

{
  "name": "my-service",
  "kind": "service",
  "owner": "platform-engineering",
  "teamId": "550e8400-e29b-41d4-a716-446655440010",
  "lifecycle": "production"
}
```

When a team is deleted, the `teamId` on associated components is set to `NULL` (components are not deleted).
