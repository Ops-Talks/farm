# Managing Documentation

Farm provides a documentation management system that allows you to associate technical documentation with components in your catalog.

## Overview

Documentation in Farm is designed to:

- Keep documentation close to the components it describes
- Enable easy discovery of relevant documentation
- Support versioning for documentation entries
- Allow filtering documentation by component
- Organize documentation into navigation trees with parent/child hierarchy
- Render Markdown content to sanitized HTML

## Documentation Properties

Each documentation entry has the following properties:

| Property | Description | Required |
|----------|-------------|----------|
| `title` | Title of the documentation | Yes |
| `sourceUrl` | URL pointing to a raw Markdown file | Yes |
| `componentId` | UUID of the associated component | Yes |
| `author` | Author of the documentation | Yes |
| `version` | Version string | No (defaults to `1.0.0`) |
| `parentId` | UUID of a parent documentation entry for tree hierarchy | No |
| `order` | Numeric sort order within the same parent level | No (defaults to `0`) |

## Authentication

All documentation endpoints require a valid JWT token and the `admin` role. Include the token in the `Authorization` header:

```bash
-H "Authorization: Bearer {token}"
```

## Managing Documentation

### Creating Documentation

To create a new documentation entry:

```bash
curl -X POST http://localhost:3000/api/docs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "User Service API Guide",
    "sourceUrl": "https://raw.githubusercontent.com/org/repo/main/docs/user-service.md",
    "componentId": "{component-id}",
    "author": "platform-team",
    "version": "1.0.0"
  }'
```

You can optionally nest the entry under a parent and control sort order:

```bash
curl -X POST http://localhost:3000/api/docs \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "title": "Authentication",
    "sourceUrl": "https://raw.githubusercontent.com/org/repo/main/docs/auth.md",
    "componentId": "{component-id}",
    "author": "platform-team",
    "parentId": "{parent-doc-id}",
    "order": 1
  }'
```

### Listing Documentation

To retrieve all documentation entries:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/docs
```

### Filtering by Component

To get documentation for a specific component:

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/docs?componentId={component-id}"
```

### Searching Documentation

To search documentation entries by title, with an optional component scope:

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/docs/search?q=api&componentId={component-id}"
```

### Getting the Navigation Tree

To retrieve a hierarchical navigation tree for a component's documentation:

```bash
curl -H "Authorization: Bearer {token}" \
  "http://localhost:3000/api/docs/tree?componentId={component-id}"
```

### Getting Documentation Metadata

To retrieve a documentation entry's metadata by ID:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/docs/{doc-id}
```

### Getting Raw Markdown Content

To fetch the raw Markdown content from the `sourceUrl`:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/docs/{doc-id}/content
```

### Getting Rendered HTML Content

To fetch the Markdown content rendered and sanitized as HTML:

```bash
curl -H "Authorization: Bearer {token}" \
  http://localhost:3000/api/docs/{doc-id}/rendered
```

### Updating Documentation

To update an existing documentation entry:

```bash
curl -X PATCH http://localhost:3000/api/docs/{doc-id} \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "sourceUrl": "https://raw.githubusercontent.com/org/repo/main/docs/user-service-v2.md",
    "version": "1.1.0"
  }'
```

### Deleting Documentation

To remove a documentation entry:

```bash
curl -X DELETE http://localhost:3000/api/docs/{doc-id} \
  -H "Authorization: Bearer {token}"
```

## Best Practices

### Documentation Organization

- Create separate documentation entries for different topics (e.g., API guides, deployment guides, architecture docs)
- Use clear and descriptive titles
- Link documentation entries to the appropriate component
- Use `parentId` and `order` to build logical navigation trees

### Content Guidelines

- Host documentation as Markdown files accessible via URL (e.g., in a Git repository)
- Include code examples where appropriate
- Keep documentation up to date with component changes
- Include version information when documenting versioned APIs

### Versioning

- Update the version field when making significant changes
- Use semantic versioning (e.g., `1.0.0`, `1.1.0`, `2.0.0`)
- Document breaking changes clearly

### Authorship

- Specify the team or individual author
- Update authorship when documentation ownership changes
- Consider using team names for shared documentation
