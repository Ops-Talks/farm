# Signing up

The signup form (`/signup`) accepts a username, email, display name and
password. Validation rules:

- **Username** — 3-50 characters, only `a-z`, `A-Z`, `0-9`, `_` and `-`.
- **Email** — must be a valid RFC 5322 address.
- **Password** — at least 8 characters with uppercase, lowercase and a digit.
- **Display name** — 1-100 characters.

After registration you are returned to the login page. If your account was
created in response to an organization invitation, follow the invitation link
in your email after logging in to join the organization.
