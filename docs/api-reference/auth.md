# Authentication API

The Authentication API provides endpoints for user registration, login, token refresh, and user management.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

## Security Notes

### Password Storage

Passwords are hashed using **bcrypt** before storage. Registration enforces password strength rules requiring at least one lowercase letter, one uppercase letter, and one digit, with a minimum length of 8 characters.

### JWT Tokens

Authentication uses JSON Web Tokens (JWT). A successful login returns an access token and a refresh token. Include the access token in subsequent authenticated requests via the `Authorization: Bearer <token>` header.

### Refresh Tokens

Refresh tokens are 40 random bytes (hex-encoded), stored as bcrypt hashes. The `POST /auth/refresh` endpoint accepts a valid refresh token and returns a new access token along with a rotated refresh token. Old refresh tokens are invalidated on each use to prevent replay attacks.

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
