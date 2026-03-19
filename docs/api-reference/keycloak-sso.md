# Keycloak SSO API

Base path: `/api/v1`

All endpoints require authentication via `Authorization: Bearer {token}` unless noted.

## OIDC Login Flow

### Initiate Keycloak Login

```
GET /auth/keycloak?orgId={orgId}
```

Redirects the browser to the Keycloak authorization endpoint for the organization's configured realm. No authentication token required.

If the organization has no Keycloak credential configured, redirects to `/?error=keycloak_not_configured`.

### Keycloak Callback

```
GET /auth/keycloak/callback
```

Handles the OIDC redirect from Keycloak. On success, returns:

```json
{
  "user": {
    "id": "uuid",
    "username": "jdoe",
    "email": "jdoe@example.com",
    "roles": ["user"]
  },
  "token": "eyJ...",
  "refreshToken": "abc123..."
}
```

## Group Sync

### Trigger Manual Sync

```
POST /auth/keycloak/sync/:orgId
```

Requires admin role. Enqueues a `keycloak-sync` BullMQ job for the organization.

**Response:**
```json
{ "queued": true }
```

The sync job:
1. Fetches all Keycloak Groups via the Admin REST API
2. Creates Farm Teams for groups that do not already exist (matched by `externalId`)
3. Fetches group members and adds matching Farm users (matched by email) to each team

## Keycloak Credential Management

Keycloak credentials are managed through the standard Integration Credentials API:

### List Keycloak Credentials

```
GET /integrations/credentials?orgId={orgId}&type=keycloak
```

### Create Keycloak Credential

```
POST /integrations/credentials
```

**Body:**
```json
{
  "orgId": "uuid",
  "type": "keycloak",
  "name": "Production Keycloak",
  "encryptedValue": "{\"keycloakUrl\":\"https://keycloak.example.com\",\"realm\":\"farm-prod\",\"clientId\":\"farm-client\",\"clientSecret\":\"secret\"}"
}
```

The `encryptedValue` field is a JSON string containing the Keycloak connection details. Farm encrypts it at rest using AES-256-GCM.

### Delete Keycloak Credential

```
DELETE /integrations/credentials/:id
```

Requires admin role.

## Pipeline Secret URI Scheme

Pipeline stage configs may reference Keycloak client credentials using the `keycloak://` URI scheme:

```
keycloak://{realm}/{clientId}
```

At pipeline execution time, Farm:
1. Loads the org's Keycloak credential
2. Calls `POST {keycloakUrl}/realms/{realm}/protocol/openid-connect/token` with `grant_type=client_credentials`
3. Caches the resulting access token until 30 seconds before expiry
4. Substitutes the token value into the stage config

**Example stage config:**
```json
{
  "MY_SERVICE_TOKEN": "keycloak://farm-prod/my-service-client"
}
```
