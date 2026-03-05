# Authentication API

The Authentication API provides endpoints for user registration, login, and user management.

For interactive documentation, including all available endpoints, data models, and request/response examples, please refer to the [Swagger UI](/api/docs).

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
