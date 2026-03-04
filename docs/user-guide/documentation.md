# Managing Documentation

Farm provides a documentation management system that allows you to associate technical documentation with components in your catalog.

## Overview

Documentation in Farm is designed to:

- Keep documentation close to the components it describes
- Enable easy discovery of relevant documentation
- Support versioning for documentation entries
- Allow filtering documentation by component

## Documentation Properties

Each documentation entry has the following properties:

| Property | Description | Required |
|----------|-------------|----------|
| `title` | Title of the documentation | Yes |
| `content` | The documentation content | Yes |
| `componentId` | ID of the associated component | Yes |
| `author` | Author of the documentation | Yes |
| `version` | Version string | No (defaults to `1.0.0`) |

## Managing Documentation

### Creating Documentation

To create a new documentation entry:

```bash
curl -X POST http://localhost:3000/api/docs \
  -H "Content-Type: application/json" \
  -d '{
    "title": "User Service API Guide",
    "content": "# User Service API\n\nThis guide covers the User Service API...",
    "componentId": "{component-id}",
    "author": "platform-team",
    "version": "1.0.0"
  }'
```

### Listing Documentation

To retrieve all documentation entries:

```bash
curl http://localhost:3000/api/docs
```

### Filtering by Component

To get documentation for a specific component:

```bash
curl "http://localhost:3000/api/docs?componentId={component-id}"
```

### Getting Specific Documentation

To retrieve a documentation entry by ID:

```bash
curl http://localhost:3000/api/docs/{doc-id}
```

### Updating Documentation

To update an existing documentation entry:

```bash
curl -X PATCH http://localhost:3000/api/docs/{doc-id} \
  -H "Content-Type: application/json" \
  -d '{
    "content": "# Updated Content\n\nThis is the updated documentation...",
    "version": "1.1.0"
  }'
```

### Deleting Documentation

To remove a documentation entry:

```bash
curl -X DELETE http://localhost:3000/api/docs/{doc-id}
```

## Best Practices

### Documentation Organization

- Create separate documentation entries for different topics (e.g., API guides, deployment guides, architecture docs)
- Use clear and descriptive titles
- Link documentation entries to the appropriate component

### Content Guidelines

- Write documentation in Markdown format for easy rendering
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
