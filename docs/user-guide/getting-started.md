# Getting Started

This guide will help you get Farm up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 26 or higher
- **npm**: Version 11 or higher
- **Docker & Docker Compose**: For containerized environment (Recommended)

## Installation (Docker - Recommended)

The fastest way to get Farm running is using Docker Compose. This starts both the API and a PostgreSQL database.

### 1. Clone the Repository

```bash
git clone https://github.com/Ops-Talks/farm.git
cd farm
```

### 2. Start the Environment

```bash
make up-docker
```

This command will:
- Build the API production image
- Pull the PostgreSQL 16 image
- Start both containers in a shared network
- Wait for the database to be healthy before starting the API

## Installation (Local Development)

### 1. Install Dependencies

```bash
npm install
```

### 2. Database Setup

Ensure you have a PostgreSQL instance running. You can start just the database using Docker:

```bash
docker compose up -d postgres
```

### 3. Start the Application

For development with hot-reload:

```bash
npm run start:dev
```

For production:

```bash
npm run build
npm run start:prod
```

## Verifying the Installation

Once the application is running, verify it by accessing the following endpoints:

- **Health Status**: `http://localhost:3000/api/health`
- **Interactive Documentation**: `http://localhost:3000/api/docs`
- **Web UI**: `http://localhost:3001`

The Swagger UI provides a comprehensive and interactive view of all available REST API endpoints.

## Configuration

### Port Configuration

By default, Farm runs on port 3000. You can change this by setting the `PORT` environment variable:

```bash
PORT=8080 npm run start:dev
```

## First Steps

After installation, you can:

1. **Register a User**: Create your first user account using the authentication API
2. **Add Components**: Register software components in the catalog
3. **Create Documentation**: Add documentation entries for your components

## Example: Logging In

After seeding the database (see Development Setup), you can log in with the default admin account:

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Admin1234"
  }'
```

The response includes a JWT access token and a refresh token. Use the access token in subsequent requests:

```bash
curl -X GET http://localhost:3000/api/v1/catalog/components \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>"
```

Users are created via the database seed (development) or by an existing admin through the admin user management API (production).

## Example: Adding Your First Component

After logging in, register a component in the catalog:

```bash
curl -X POST http://localhost:3000/api/v1/catalog/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -H "X-Organization-Id: <org-id>" \
  -d '{
    "name": "my-first-service",
    "kind": "service",
    "description": "My first service in Farm",
    "owner": "platform-team",
    "lifecycle": "experimental"
  }'
```

## Next Steps

- Learn more about the [Catalog](catalog.md) to manage your software components
- Explore [Documentation Management](documentation.md) to organize technical docs
- Read about [Authentication](authentication.md) for user management



