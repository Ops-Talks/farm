# Getting Started

This guide will help you get Farm up and running quickly.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js**: Version 18 or higher
- **npm**: Version 9 or higher

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/Ops-Talks/farm.git
cd farm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Application

For development:

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

## Example: Registering Your First User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "email": "admin@example.com",
    "password": "securepassword123",
    "displayName": "Admin User"
  }'
```

## Example: Adding Your First Component

```bash
curl -X POST http://localhost:3000/api/catalog/components \
  -H "Content-Type: application/json" \
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
