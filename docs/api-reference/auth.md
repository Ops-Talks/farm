# Authentication API

The Authentication API provides endpoints for user registration, login, token refresh, user management, and profile management.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Endpoints

### POST /api/v1/auth/register

Registers a new user account.

**Rate limit:** 5 requests per minute.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | Unique username, 3-50 chars, only `a-z`, `A-Z`, `0-9`, `_`, `-` |
| email | string | Yes | Valid email address |
| password | string | Yes | Password (min 8 chars, must contain uppercase, lowercase, and digit) |
| displayName | string | Yes | Human-readable display name (1-100 chars) |

**Responses:**

- `201 Created` — User registered successfully. Returns the user object.
- `400 Bad Request` — Validation failed (weak password, missing fields, etc.).
- `409 Conflict` — Username or email already exists.
- `429 Too Many Requests` — Rate limit exceeded.

---

### POST /api/v1/auth/login

Authenticates a user and returns an access token along with a refresh token.

**Rate limit:** 5 requests per minute.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | The user's username |
| password | string | Yes | The user's password |

**Responses:**

- `200 OK` — Returns `{ user, token, refreshToken }`.
- `401 Unauthorized` — Invalid credentials.
- `429 Too Many Requests` — Rate limit exceeded.

---

### POST /api/v1/auth/refresh

Refreshes an access token using a valid refresh token. The refresh token is rotated on each use.

**Rate limit:** 10 requests per minute.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| username | string | Yes | The user's username |
| refreshToken | string | Yes | The current refresh token |

**Responses:**

- `200 OK` — Returns `{ token, refreshToken }` with a new access token and rotated refresh token.
- `401 Unauthorized` — Invalid or expired refresh token.
- `429 Too Many Requests` — Rate limit exceeded.

---

### GET /api/v1/auth/users

Returns all registered users. Requires the `admin` role.

**Authentication:** Bearer JWT token with `admin` role.

**Responses:**

- `200 OK` — Array of user objects.
- `401 Unauthorized` — Missing or invalid token.
- `403 Forbidden` — Authenticated user does not have the `admin` role.

---

### GET /api/v1/auth/profile

Returns the profile of the currently authenticated user.

**Authentication:** Bearer JWT token.

**Responses:**

- `200 OK` — The authenticated user's profile object.
- `401 Unauthorized` — Missing or invalid token.

**Example response:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "username": "john_doe",
  "email": "john@example.com",
  "displayName": "John Doe",
  "firstName": "John",
  "lastName": "Doe",
  "gender": "male",
  "roles": ["user"],
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

---

### PATCH /api/v1/auth/profile

Updates the profile of the currently authenticated user. All fields are optional; only provided fields are updated.

**Authentication:** Bearer JWT token.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| firstName | string | No | First name (max 100 characters) |
| lastName | string | No | Last name (max 100 characters) |
| email | string | No | New email address |
| gender | string | No | One of `male`, `female`, `non_binary` |

**Responses:**

- `200 OK` — Returns the updated user profile object.
- `400 Bad Request` — Validation failed.
- `401 Unauthorized` — Missing or invalid token.
- `409 Conflict` — The provided email is already used by another account.

---

### PATCH /api/v1/auth/profile/password

Changes the password of the currently authenticated user. All existing sessions are invalidated on success by clearing the stored refresh token.

**Authentication:** Bearer JWT token.

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| currentPassword | string | Yes | The user's current password |
| newPassword | string | Yes | New password (min 8, max 128 characters) |
| confirmPassword | string | Yes | Must match `newPassword` exactly |

**Responses:**

- `204 No Content` — Password changed successfully.
- `400 Bad Request` — `newPassword` and `confirmPassword` do not match.
- `401 Unauthorized` — Missing or invalid token, or `currentPassword` is incorrect.

---

## Security Notes

### Password Storage

Passwords are hashed using **bcrypt** before storage. Registration enforces password strength rules requiring at least one lowercase letter, one uppercase letter, and one digit, with a minimum length of 8 characters.

### JWT Tokens

Authentication uses JSON Web Tokens (JWT). A successful login returns an access token and a refresh token. Include the access token in subsequent authenticated requests via the `Authorization: Bearer <token>` header.

### Refresh Tokens

Refresh tokens are 40 random bytes (hex-encoded), stored as bcrypt hashes. The `POST /api/v1/auth/refresh` endpoint accepts a valid refresh token and returns a new access token along with a rotated refresh token. Old refresh tokens are invalidated on each use to prevent replay attacks.

### Rate Limiting

Authentication endpoints are rate-limited to prevent brute force attacks:

- **Login**: 5 requests per minute
- **Register**: 5 requests per minute
- **Refresh**: 10 requests per minute

### Best Practices

- Use HTTPS in production
- Set a strong `JWT_SECRET` (minimum 32 characters, enforced in production)
- Configure `ALLOWED_ORIGINS` for CORS instead of using the wildcard default
- Use strong passwords with a mix of characters
- Never expose tokens in URLs or logs
