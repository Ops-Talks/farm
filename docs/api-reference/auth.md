# Authentication API

The Authentication API provides endpoints for user registration, login, and user management.

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Register a new user |
| POST | /api/auth/login | Authenticate a user |
| GET | /api/auth/users | List all users |

## Data Types

### User

| Field | Type | Description |
|-------|------|-------------|
| id | string | Unique identifier (UUID) |
| username | string | Unique username |
| email | string | Email address |
| displayName | string | Display name |
| roles | string[] | User roles |
| createdAt | string (ISO 8601) | Creation timestamp |
| updatedAt | string (ISO 8601) | Last update timestamp |

### Login Response

| Field | Type | Description |
|-------|------|-------------|
| user | User | The authenticated user |
| token | string | Session token (UUID) |

## Register User

Create a new user account.

```
POST /api/auth/register
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Unique username |
| email | string | Yes | Email address |
| password | string | Yes | User password |
| displayName | string | Yes | Display name |

### Response

**Status Code**: 201 Created

Returns the created user (without password).

**Error**: 409 Conflict if the username or email is already in use.

### Example

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

### Error Response

**Status Code**: 409 Conflict

```json
{
  "statusCode": 409,
  "message": "Username or email is already in use",
  "error": "Conflict"
}
```

## Login

Authenticate a user and receive a session token.

```
POST /api/auth/login
```

### Request Body

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Username |
| password | string | Yes | Password |

### Response

**Status Code**: 200 OK

Returns the user and a session token.

**Error**: 401 Unauthorized if the credentials are invalid.

### Example

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

### Error Response

**Status Code**: 401 Unauthorized

```json
{
  "statusCode": 401,
  "message": "Invalid username or password",
  "error": "Unauthorized"
}
```

## List Users

Retrieve all registered users.

```
GET /api/auth/users
```

### Response

**Status Code**: 200 OK

Returns an array of all users (without passwords).

### Example

```bash
curl http://localhost:3000/api/auth/users
```

Response:

```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "username": "johndoe",
    "email": "john.doe@example.com",
    "displayName": "John Doe",
    "roles": ["user"],
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:30:00.000Z"
  },
  {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "username": "janedoe",
    "email": "jane.doe@example.com",
    "displayName": "Jane Doe",
    "roles": ["user"],
    "createdAt": "2024-01-15T11:00:00.000Z",
    "updatedAt": "2024-01-15T11:00:00.000Z"
  }
]
```

## Security Notes

### Password Storage

Passwords are hashed using SHA-256 before storage. In production environments, consider using bcrypt or a similar secure hashing algorithm.

### Session Tokens

Session tokens are UUIDs generated upon successful login. Store tokens securely and include them in subsequent authenticated requests.

### Best Practices

- Use HTTPS in production
- Implement rate limiting to prevent brute force attacks
- Use strong passwords with a mix of characters
- Never expose tokens in URLs or logs
