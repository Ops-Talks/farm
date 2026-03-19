# Keycloak SSO

Farm integrates with Keycloak to provide enterprise SSO login, automatic team synchronization, and Keycloak client credentials as a secret source in pipeline stages.

## Overview

FARM-E41 delivers three capabilities:

| Story | Feature |
|-------|---------|
| S153 | Per-org Keycloak OIDC login via `passport-openidconnect` |
| S154 | Hourly group sync — Keycloak Groups map to Farm Teams |
| S155 | `keycloak://realm/client` URI scheme as pipeline secret resolver |

## Prerequisites

- A running Keycloak instance (version 21+)
- A Keycloak realm configured for Farm
- A client with `client_credentials` grant enabled (for group sync and pipeline secrets)
- A second client (or the same) with `Authorization Code` flow enabled (for OIDC login)

## Setup

### 1. Configure the Integration

Navigate to **Integrations → Keycloak SSO** and fill in:

| Field | Description |
|-------|-------------|
| Name | Friendly label (e.g., "Production Keycloak") |
| Keycloak URL | Base URL, e.g., `https://keycloak.example.com` |
| Realm | Realm name, e.g., `farm-prod` |
| Client ID | OAuth2 client ID for Farm |
| Client Secret | OAuth2 client secret |

Only one Keycloak credential per organization is supported.

### 2. OIDC Login

Once configured, users can log in via Keycloak SSO from the login page. Share this deep-link with your team:

```
https://your-farm-instance.com/login?keycloakOrgId={orgId}
```

The Organisation ID is shown in the **Login URL** card on the Keycloak integration page.

On login:
1. Farm redirects the browser to `GET /api/v1/auth/keycloak?orgId={orgId}`
2. Keycloak handles authentication and redirects back to the Farm callback
3. Farm finds the user by email or creates a new account
4. A JWT access token and refresh token are issued (same as local login)

If a user already has a Farm account with the same email, accounts are merged on first SSO login.

### 3. Group Sync

Farm syncs Keycloak Groups to Farm Teams automatically every hour. Groups without a matching Farm Team are created automatically. Users are matched by email.

To trigger a manual sync, click **Sync Now** on the Keycloak integration page (admin only), or call:

```
POST /api/v1/auth/keycloak/sync/:orgId
```

### 4. Pipeline Client Credentials

Reference a Keycloak service account token in pipeline stage configs using the `keycloak://` URI scheme:

```yaml
stages:
  - name: deploy
    type: script
    config:
      MY_TOKEN: "keycloak://my-realm/my-service-client"
```

At execution time, Farm fetches a `client_credentials` grant for `my-service-client` in `my-realm` and substitutes the access token. Tokens are cached in-memory until 30 seconds before expiry.

## Environment Variables

No additional server-side environment variables are required — Keycloak config is stored per-organization in the database (encrypted via AES-256-GCM).

The frontend login button is always visible. To pre-fill the org ID in the deep-link, append `?keycloakOrgId={orgId}` to the login URL.
