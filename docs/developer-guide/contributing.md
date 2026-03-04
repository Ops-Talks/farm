# Contributing

Thank you for your interest in contributing to Farm. This guide explains how to contribute to the project.

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment for everyone.

## Getting Started

1. **Fork the repository** on GitHub
2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/farm.git
   cd farm
   ```
3. **Add upstream remote**:
   ```bash
   git remote add upstream https://github.com/Ops-Talks/farm.git
   ```
4. **Install dependencies**:
   ```bash
   npm install
   ```

## Development Workflow

### 1. Create a Branch

Create a new branch for your changes:

```bash
git checkout -b feature/your-feature-name
```

Use descriptive branch names:

- `feature/add-search-api` - For new features
- `fix/auth-token-validation` - For bug fixes
- `docs/update-api-reference` - For documentation changes
- `refactor/catalog-service` - For code refactoring

### 2. Make Changes

- Follow the existing code style
- Write clear, maintainable code
- Add or update tests as needed
- Update documentation if necessary

### 3. Test Your Changes

Run the test suite to ensure your changes work correctly:

```bash
# Run linting
npm run lint

# Run unit tests
npm run test

# Run end-to-end tests
npm run test:e2e
```

### 4. Commit Your Changes

Use conventional commit messages:

```bash
git commit -m "feat: add search functionality to catalog API"
```

**Commit Types:**

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Code style changes (formatting, etc.) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance tasks |

### 5. Push and Create Pull Request

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub.

## Pull Request Guidelines

### Before Submitting

- Ensure all tests pass
- Ensure code follows the project style
- Update documentation if needed
- Keep changes focused and atomic

### Pull Request Description

Include the following in your PR description:

- Summary of changes
- Related issue number (if applicable)
- Testing performed
- Screenshots (for UI changes)

### Review Process

- PRs require review before merging
- Address review feedback promptly
- Keep discussions focused and constructive

## Code Style

### TypeScript Guidelines

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Document public APIs with JSDoc comments

### File Organization

- One class per file
- Group related files in directories
- Use descriptive file names

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Classes | PascalCase | `CatalogService` |
| Interfaces | PascalCase | `ComponentLink` |
| Functions | camelCase | `findById()` |
| Variables | camelCase | `componentId` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_RESULTS` |
| Files | kebab-case | `catalog.service.ts` |

### Code Formatting

The project uses Prettier for code formatting:

```bash
# Format all files
npm run format

# Check formatting
npm run lint
```

## Adding New Features

### Module Structure

New features should follow the existing module structure:

```
src/
  new-feature/
    new-feature.module.ts
    new-feature.controller.ts
    new-feature.service.ts
    new-feature.service.spec.ts
    dto/
      create-new-feature.dto.ts
      update-new-feature.dto.ts
    entities/
      new-feature.entity.ts
```

### Controller Guidelines

- Use appropriate HTTP methods
- Apply HTTP status codes correctly
- Use DTOs for request validation
- Document endpoints with JSDoc comments

### Service Guidelines

- Contain business logic
- Keep methods focused
- Throw appropriate exceptions
- Write unit tests

## Reporting Issues

### Bug Reports

Include the following:

- Farm version
- Node.js version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Error messages or logs

### Feature Requests

Include the following:

- Clear description of the feature
- Use case or problem it solves
- Suggested implementation (optional)

## Getting Help

- Check existing issues and documentation
- Ask questions in issue discussions
- Be patient and respectful

## License

By contributing to Farm, you agree that your contributions will be licensed under the AGPL-3.0 license.
