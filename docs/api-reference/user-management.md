# User Management (Phase 37)

REST endpoints powering the platform user-management dashboard.

Base path: `/api/v1/users`. All endpoints require a JWT.

## Permission model

- **Platform admin** (`roles` includes `admin`) sees every user and can suspend,
  reset passwords, or delete accounts globally.
- **Org `ADMIN` / `OWNER`** sees users that share at least one of their
  organizations and can change roles within those orgs.
- Self-mutating actions (suspend, delete, demote last `OWNER`) are blocked.

## Endpoints

### `GET /api/v1/users`

Query parameters: `orgId`, `search`, `role`, `page`, `pageSize`.

Returns:

```json
{
  "users": [
    {
      "id": "uuid",
      "username": "alice",
      "email": "alice@example.com",
      "displayName": "Alice",
      "roles": ["user"],
      "suspended": false,
      "lastLogin": "2026-04-25T12:00:00.000Z",
      "createdAt": "2026-04-01T00:00:00.000Z",
      "memberships": [{ "organizationId": "uuid", "role": "MEMBER" }]
    }
  ],
  "total": 42,
  "page": 1,
  "pageSize": 25
}
```

### `GET /api/v1/users/:id`

Single user view, same shape as the list entry.

### `PATCH /api/v1/users/:id/role`

Body: `{ "orgId": "uuid", "role": "ADMIN" }`. Updates the membership role
within the given org. Demoting the last `OWNER` is rejected with `400`.

### `PATCH /api/v1/users/:id/suspend`

Platform admin only. Body: `{ "suspended": true }`. Suspended users cannot log
in and have their refresh tokens cleared.

### `POST /api/v1/users/:id/reset-password`

Platform admin only. Generates a 12-character temporary password, persists its
hash on the user, and queues a `password-reset` email. When SMTP is not
configured the response includes the plaintext temp password as a fallback:

```json
{
  "tempPasswordExpiresAt": "2026-04-28T12:00:00.000Z",
  "tempPassword": "abCD12efGH34",
  "fallback": true
}
```

### `DELETE /api/v1/users/:id?orgId=uuid`

Without `orgId` the user is deleted globally (platform admin). With `orgId`
the membership row is removed only. Self-delete and removing the last `OWNER`
are blocked.

### `GET /api/v1/users/:id/audit-trail`

Returns up to 200 audit log entries with `resourceType="User"` and
`resourceId=:id`. Subject to the same authorization check as `GET /:id`.
