# Development Setup

This guide walks you through setting up a development environment for Farm.

## Prerequisites

### Required Software

| Software | Version | Purpose |
|----------|---------|---------|
| Node.js | 18+ | JavaScript runtime |
| npm | 9+ | Package manager |
| Docker | 20+ | Containerization and environment isolation |
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

#### Option A: Local Development (Node.js)

```bash
npm run start:dev
```

The development server starts with hot-reload enabled. Changes to source files will automatically restart the server.

#### Option B: Containerized Development (Docker + Make)

```bash
make up-docker
```

This command builds the production image and starts the API in a container. To run the documentation server:

```bash
make docs-up
```

## Project Structure

```
farm/
  src/
    app.module.ts          # Root application module
    app.controller.ts      # Health check controller
    app.service.ts         # Application service
    main.ts                # Application entry point
    auth/                  # Authentication module
      auth.controller.ts
      auth.service.ts
      auth.module.ts
      dto/                 # Data Transfer Objects
      entities/            # Entity definitions
    catalog/               # Catalog module
      catalog.controller.ts
      catalog.service.ts
      catalog.module.ts
      dto/
      entities/
    documentation/         # Documentation module
      documentation.controller.ts
      documentation.service.ts
      documentation.module.ts
      dto/
      entities/
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
| `make docs-up` | Start the documentation server (MkDocs) |
| `make docs-down` | Stop and remove documentation container |
| `make docs-build` | Build static documentation site |
| `make test-docker` | Execute project tests in a Docker container |
| `make up-docker` | Start the Farm API in a Docker container |
| `make down-docker` | Stop the Farm API container |
| `make healthcheck` | Query the local API health endpoint |

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
| `PORT` | 3000 | HTTP server port |
| `npm_package_version` | 0.1.0 | Application version (set automatically) |

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
