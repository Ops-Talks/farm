# Frequently Asked Questions

This page answers common questions about Farm.

## General Questions

### What is Farm?

Farm is an open-source developer portal platform designed as an alternative to Backstage. It provides a centralized hub for managing software components, technical documentation, and user authentication.

### How is Farm different from Backstage?

While Farm shares similar goals with Backstage, it differs in several ways:

- **Simpler architecture**: Farm focuses on core functionality without complex plugin systems
- **Lighter footprint**: Fewer dependencies and easier deployment
- **NestJS-based**: Built on NestJS for a familiar Node.js experience
- **REST-first**: Uses REST APIs instead of GraphQL

### Is Farm production-ready?

Farm is currently in early development (version 0.1.0). While it provides core functionality, additional features and hardening are ongoing.

### What license does Farm use?

Farm is licensed under the GNU Affero General Public License v3.0 (AGPL-3.0).

## Installation and Setup

### What are the system requirements?

- Node.js 18 or higher
- npm 9 or higher

### How do I change the default port?

Set the `PORT` environment variable before starting the application:

```bash
PORT=8080 npm run start:dev
```

### Does Farm require a database?

In the current version, Farm uses in-memory storage. Data does not persist across restarts. Database integration is planned for future releases.

## Catalog

### What types of components can I add?

Farm supports the following component kinds:

- `service` - Backend services and microservices
- `library` - Shared libraries and packages
- `website` - Frontend websites and applications
- `api` - API definitions and gateways
- `component` - Generic software components

### How do I organize components?

Use the following strategies:

- **Tags**: Add tags to group related components
- **Owners**: Assign owners to indicate responsibility
- **Lifecycle**: Use lifecycle stages to indicate maturity
- **Metadata**: Store custom information in the metadata field

### Can I import components from existing systems?

Currently, components must be added manually via the API. Import functionality is planned for future releases.

## Documentation

### What format should documentation content use?

Documentation content supports Markdown format, allowing you to include headings, code blocks, links, and other formatting.

### Can I link documentation to multiple components?

Each documentation entry is associated with a single component via the `componentId` field. To document multiple components, create separate entries for each.

### How do I version documentation?

Use the `version` field when creating or updating documentation. Follow semantic versioning (e.g., `1.0.0`, `1.1.0`).

## Authentication

### How are passwords stored?

Passwords are hashed using SHA-256 before storage. In production environments, consider using a more secure hashing algorithm like bcrypt.

### How do session tokens work?

Upon successful login, Farm returns a UUID token. This token should be stored securely and included in subsequent authenticated requests.

### Can I integrate with external identity providers?

Integration with external identity providers (OAuth, SAML) is planned for future releases.

## Troubleshooting

### The application fails to start

Check the following:

1. Ensure Node.js 18 or higher is installed
2. Run `npm install` to install dependencies
3. Check for port conflicts on port 3000

### API requests return 404

Ensure you are using the `/api` prefix for all endpoints. For example:

- Correct: `http://localhost:3000/api/health`
- Incorrect: `http://localhost:3000/health`

### I get a validation error

Validation errors occur when request data is invalid. Check that:

- All required fields are provided
- Field values match expected types and formats
- JSON syntax is correct

## Getting Help

### Where can I report issues?

Report issues on the [GitHub Issues page](https://github.com/Ops-Talks/farm/issues).

### How can I contribute?

See the [Contributing Guide](../developer-guide/contributing.md) for information on contributing to Farm.
