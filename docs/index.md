# Farm

Farm is an open-source developer portal platform. It provides a centralized hub for managing software components, technical documentation, and team infrastructure.

## What is Farm?

Farm enables engineering teams to:

- **Track Software Components**: Maintain a unified catalog of all software components including services, libraries, APIs, and websites
- **Manage Documentation**: Associate technical documentation with each component for easy discovery and maintenance
- **Handle Authentication**: Manage user access with role-based authentication
- **Discover and Understand**: Provide visibility into the software ecosystem within your organization

## Who is this documentation for?

This documentation is divided into sections targeting different audiences:

### End Users

If you are an end user looking to use Farm in your organization, start with the [User Guide](user-guide/index.md). This section covers:

- Getting started with Farm
- Using the component catalog
- Managing documentation
- Authentication and user management

### Developers and Contributors

If you are a developer looking to contribute to Farm or deploy it in your environment, check out the [Developer Guide](developer-guide/index.md). This section includes:

- Development environment setup
- Architecture overview
- Contribution guidelines
- Testing strategies

## Technology Stack

Farm is built with modern technologies:

| Technology | Purpose |
|------------|---------|
| [NestJS](https://docs.nestjs.com) | Progressive Node.js framework for building server-side applications |
| TypeScript | Typed superset of JavaScript for enhanced developer experience |
| REST API | HTTP-based API following REST principles |

## Quick Start

```bash
# Clone the repository
git clone https://github.com/Ops-Talks/farm.git

# Install dependencies
npm install

# Start the development server
npm run start:dev
```

The API server starts on port 3000 by default. Access the health endpoint at `http://localhost:3000/api/health`.

## License

Farm is licensed under the [GNU Affero General Public License v3.0](https://github.com/Ops-Talks/farm/blob/main/LICENSE).
