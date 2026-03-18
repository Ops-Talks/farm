# Authentication

Farm provides user authentication and management capabilities to control access to the platform.

## Overview

The authentication system in Farm supports:

- User registration with password strength validation
- User login with JWT access tokens
- Refresh token rotation for session continuity
- User listing for administration

## User Properties

Each user in Farm has the following properties:

| Property | Description |
|----------|-------------|
| `id` | Unique identifier (UUID) |
| `username` | Unique username (2-50 characters) |
| `email` | Email address |
| `displayName` | Display name for the user |
| `roles` | Array of role strings |
| `createdAt` | Timestamp when the user was created |
| `updatedAt` | Timestamp when the user was last updated |

## User Operations

### Registering a User

To create a new user account:

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john.doe@example.com",
    "password": "SecurePass1",
    "displayName": "John Doe"
  }'
```

Response:

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "johndoe",
  "email": "john.doe@example.com",
  "displayName": "John Doe",
  "roles": ["user"],
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

### Logging In

To authenticate and receive a JWT access token and refresh token:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "SecurePass1"
  }'
```

Response:

```json
{
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "displayName": "John Doe",
    "roles": ["user"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "a1b2c3d4e5f6..."
}
```

Use the `token` value in the `Authorization` header for subsequent requests:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

### Refreshing a Token

When your access token expires, use the refresh token to obtain a new one without re-entering credentials:

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "refreshToken": "a1b2c3d4e5f6..."
  }'
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "f6e5d4c3b2a1..."
}
```

The refresh token is rotated on each use. The old refresh token is immediately invalidated.

### Listing Users

Retrieving all registered users requires a valid JWT with the `admin` role:

```bash
curl http://localhost:3000/api/v1/auth/users \
  -H "Authorization: Bearer <your-admin-token>"
```

## Error Handling

### Registration Errors

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| Username or email already in use | 409 Conflict | The username or email is already registered |
| Validation error | 400 Bad Request | Required fields are missing or invalid |
| Weak password | 400 Bad Request | Password does not meet strength requirements |
| Too many requests | 429 Too Many Requests | Rate limit exceeded (5 per minute) |

### Login Errors

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| Invalid username or password | 401 Unauthorized | The credentials are incorrect |
| Validation error | 400 Bad Request | Required fields are missing or invalid |
| Too many requests | 429 Too Many Requests | Rate limit exceeded (5 per minute) |

## Security Considerations

### Password Requirements

Passwords are validated with the following rules:

- Minimum 8 characters long
- Must contain at least one lowercase letter
- Must contain at least one uppercase letter
- Must contain at least one digit

### JWT Tokens

- Access tokens are short-lived (configurable via `JWT_EXPIRATION`, default 3600s)
- Store tokens securely on the client side
- Do not expose tokens in URLs or logs
- Include the token in the `Authorization: Bearer <token>` header

### Refresh Tokens

- Refresh tokens are long-lived and stored as bcrypt hashes in the database
- Each use rotates the token (old token is invalidated)
- If a previously used refresh token is reused, all refresh tokens for the user are invalidated (replay attack protection)

### Rate Limiting

Authentication endpoints are rate-limited to prevent brute force attacks:

- **Login**: 5 requests per minute
- **Register**: 5 requests per minute
- **Refresh**: 10 requests per minute

### Best Practices

- Use HTTPS in production environments
- Set a strong `JWT_SECRET` environment variable (minimum 32 characters, enforced in production)
- Configure `ALLOWED_ORIGINS` for CORS instead of using the wildcard default
- Regularly audit user accounts and access
