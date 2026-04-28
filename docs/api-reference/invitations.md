# Invitations (Phase 37)

Token-based organization invitation API. Coexists with the legacy
`/organizations/:id/invitations` flow.

Base path: `/api/v1/invitations`

## Endpoints

### `POST /api/v1/invitations`

Create a batch of invitations (1-50). Requires `ADMIN` or `OWNER` role on the
target organization.

Request body:

```json
{
  "organizationId": "uuid",
  "emails": ["alice@example.com", "bob@example.com"],
  "role": "MEMBER",
  "message": "Welcome to the team!"
}
```

Response: array of `InvitationToken` (raw `token` is included so the admin can
share an out-of-band link if needed). Tokens are valid for 7 days.

Throttle: 10 requests per minute per IP.

### `GET /api/v1/invitations?organizationId=...&status=pending`

List invitations for an organization. Requires `MEMBER` role on the org.
`status` is one of `pending | accepted | revoked`.

### `GET /api/v1/invitations/by-token/:token`

Public invitation preview. Returns:

```json
{
  "orgName": "Acme",
  "role": "MEMBER",
  "invitedByName": "Admin",
  "expiresAt": "2026-05-04T00:00:00.000Z",
  "message": null
}
```

Returns `404` if the token is unknown.

### `POST /api/v1/invitations/by-token/:token/accept`

Public endpoint that accepts an invitation. The invited email must already
correspond to a registered user account. Idempotent on existing memberships.

Returns: `{ "organizationId", "role", "userId" }`.

### `PATCH /api/v1/invitations/:id/resend`

Re-queue the invitation email. Requires authentication.

### `DELETE /api/v1/invitations/:id`

Revoke a pending invitation. Requires authentication. Returns `204`.

## Background tasks

A scheduled job (every 6 hours) sweeps invitations whose `expiresAt` has
passed and marks them as `revoked`.

## Audit events

Emitted with `resourceType="Invitation"`:

- `INVITATION_SENT`
- `INVITATION_ACCEPTED`
- `INVITATION_REVOKED`
