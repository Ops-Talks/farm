# Authentication

Farm provides user authentication and management capabilities to control access to the platform.

## Overview

The authentication system in Farm supports:

- User registration
- User login with session tokens
- User listing for administration

## User Properties

Each user in Farm has the following properties:

| Property | Description |
|----------|-------------|
| `id` | Unique identifier (UUID) |
| `username` | Unique username |
| `email` | Email address |
| `displayName` | Display name for the user |
| `roles` | Array of role strings |
| `createdAt` | Timestamp when the user was created |
| `updatedAt` | Timestamp when the user was last updated |

## User Operations

### Registering a User

To create a new user account:

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "email": "john.doe@example.com",
    "password": "securepassword123",
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

To authenticate and receive a session token:

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "securepassword123"
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
  "token": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
}
```

### Listing Users

To retrieve all registered users:

```bash
curl http://localhost:3000/api/auth/users
```

## Error Handling

### Registration Errors

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| Username or email already in use | 409 Conflict | The username or email is already registered |
| Validation error | 400 Bad Request | Required fields are missing or invalid |

### Login Errors

| Error | HTTP Status | Description |
|-------|-------------|-------------|
| Invalid username or password | 401 Unauthorized | The credentials are incorrect |
| Validation error | 400 Bad Request | Required fields are missing or invalid |

## Security Considerations

### Password Requirements

- Passwords should be at least 8 characters long
- Use a mix of uppercase, lowercase, numbers, and special characters
- Never share passwords or store them in plain text

### Session Tokens

- Store tokens securely on the client side
- Do not expose tokens in URLs or logs
- Tokens should be used for authenticating subsequent requests

### Best Practices

- Use HTTPS in production environments
- Implement rate limiting to prevent brute force attacks
- Regularly audit user accounts and access
