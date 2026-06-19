# @farm/types

Shared TypeScript types and enums for the Farm monorepo. Consumed by both `apps/api` and `apps/web` to ensure type consistency across the stack.

## Contents

- **Enums** — shared enumerations (e.g., `FarmEvent`, `Permission`, `OrgRole`)
- **DTOs** — request/response shapes shared between API and web
- **Interfaces** — common data structures (e.g., `HealthStatus`, `QueueInfo`, `PaginatedResponse`)

## Usage

```typescript
import { Permission, FarmEvent } from "@farm/types";
```

## Build

```bash
npm run build --workspace=packages/types
```

Types are referenced via workspace dependency in the root `package.json`. No runtime dependencies.
