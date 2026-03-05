# Development Setup

This guide walks you through setting up a development environment for Farm.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 20+ | JavaScript runtime |
| npm | 10+ | Package manager |
| Docker | 24+ | Containerization and environment isolation |
| Docker Compose | 2.20+ | Multi-container orchestration |
| Make | 4+ | Task automation and simplified commands |
| Git | Latest | Version control |

### Recommended Tools

- **Visual Studio Code** with the following extensions:
  - ESLint
  - Prettier
  - TypeScript and JavaScript Language Features

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/Ops-Talks/farm.git
cd farm
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start the Development Server

#### Option A: Containerized Development (Recommended)

The easiest way to get started is to use the provided Makefile commands, which orchestrate the API and PostgreSQL database:

```bash
make up-docker
```

This command builds the API image and starts both the application and its database dependencies. To stop and clean up:

```bash
make down-docker
# Or to wipe database data as well:
make down-docker-clean
```

#### Option B: Local Development (Node.js)

For local development, you need a PostgreSQL instance running. You can start just the database using Docker:

```bash
docker compose up -d postgres
npm run start:dev
```

The development server starts with hot-reload enabled. Changes to source files will automatically restart the server.

Once the server is running, you can access the interactive API documentation (Swagger UI) at `http://localhost:3000/api/docs`.

#### Running Documentation Server

To run the MkDocs documentation server:

```bash
make docs-up
```

## Project Structure

```
farm/
  src/
    app.module.ts          # Root application module
    app.controller.ts      # Root controller
    app.service.ts         # Root service
    main.ts                # Application entry point
    common/                # Shared utilities and global layers
      filters/             # Global exception filters
      health/              # Terminus health check module
      logger/              # Winston structured logging
    config/                # Environment configuration
    migrations/            # TypeORM migrations
    auth/                  # Authentication module
    catalog/               # Catalog module
    documentation/         # Documentation module
  test/                    # End-to-end tests
  docs/                    # Documentation source files
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run start` | Start the application |
| `npm run start:dev` | Start with hot-reload |
| `npm run start:debug` | Start with debugging enabled |
| `npm run start:prod` | Start production build |
| `npm run build` | Build the application |
| `npm run lint` | Run ESLint |
| `npm run format` | Format code with Prettier |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:cov` | Run tests with coverage |
| `npm run test:e2e` | Run end-to-end tests |

## Makefile Targets

| Target | Description |
|--------|-------------|
| `make up-docker` | Build and start API and PostgreSQL database |
| `make down-docker` | Stop Docker containers |
| `make down-docker-clean` | Stop containers and remove database volumes |
| `make healthcheck` | Query the local API advanced health endpoint |
| `make docs-up` | Start the documentation server (MkDocs) |
| `make docs-down` | Stop and remove documentation container |
| `make docs-build` | Build static documentation site |
| `make test-docker` | Execute project tests in a clean container |
| `make check` | Run fmt, lint, and all tests |

## Development Workflow

### Making Changes

1. Create a new branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run linting and tests:
   ```bash
   npm run lint
   npm run test
   ```

4. Commit your changes:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

### Code Style

Farm uses ESLint and Prettier to maintain consistent code style:

- Run `npm run lint` to check for linting issues
- Run `npm run format` to automatically format code
- Most editors can be configured to format on save

### Debugging

#### Using VS Code

Create a `.vscode/launch.json` file:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Farm",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "start:debug"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

#### Using Command Line

```bash
npm run start:debug
```

Then attach your debugger to port 9229.

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Runtime environment (`development`, `production`, `test`) |
| `PORT` | `3000` | HTTP server port |
| `LOG_LEVEL` | `info` | Minimum log level for Winston |
| `DATABASE_TYPE` | `postgres` | Database engine (`postgres`, `sqlite`) |
| `DATABASE_HOST` | `localhost` | Hostname for database connection |
| `DATABASE_PORT` | `5432` | Port for database connection |
| `DATABASE_USER` | `postgres` | Database username |
| `DATABASE_PASSWORD` | `postgres` | Database password |
| `DATABASE_NAME` | `farm` | Database name |
| `DATABASE_SYNC` | `false` | Enable TypeORM auto-sync (use with caution) |

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, either stop the conflicting process or use a different port:

```bash
PORT=3001 npm run start:dev
```

### Dependency Issues

If you encounter dependency issues, try:

```bash
rm -rf node_modules package-lock.json
npm install
```

### TypeScript Errors

Ensure your TypeScript version matches the project requirements:

```bash
npm ls typescript
```
