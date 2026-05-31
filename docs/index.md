# Farm

<p align="center">
  <img src="img/farm01.svg" alt="Farm Logo" width="600">
</p>

## What is Farm?

Farm is an open-source full-stack portal providing a centralized hub for managing software components, technical documentation, team infrastructure, and cloud-native operations.

Farm helps engineering teams organize, discover, and manage their software ecosystem through:

- **Component Catalog**: Unified registry of services, libraries, APIs, websites, and infrastructure resources
- **Documentation**: Associate and discover technical documentation linked to each component
- **Observability**: Monitor metrics, traces, and logs from Prometheus, Jaeger, and Loki
- **Pipelines**: Define and execute multi-stage pipelines with real-time WebSocket log streaming
- **Environments**: Track deployments and manage self-service environment provisioning
- **Cost Management**: Monitor infrastructure spend per component and team via OpenCost integration
- **SLOs and Alerting**: Define Service Level Objectives with error budget tracking and alert rules
- **Cloud Discovery**: Import and manage resources from AWS, GCP, and Azure
- **Security and Compliance**: Enforce tag policies, evaluate OPA policies, and track Kyverno violations

For the complete feature list, see the [User Guide](user-guide/index.md).

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

Farm is built with modern technologies. Versions listed are current as of **v0.25.10**:

| Layer | Technology | Purpose |
|---|---|---|
| **Backend** | [NestJS 11](https://docs.nestjs.com) | Progressive Node.js framework for building scalable server-side applications |
| **Backend** | [TypeORM](https://typeorm.io) | ORM for database access, migrations, and entity management |
| **Backend** | [PostgreSQL 16](https://www.postgresql.org) | Primary relational database |
| **Backend** | [BullMQ](https://docs.bullmq.io) | Redis-backed queue for background job processing (pipelines, notifications) |
| **Backend** | [Socket.IO](https://socket.io) | WebSocket gateway for real-time event broadcasting |
| **Frontend** | [Next.js 16](https://nextjs.org) | React framework with App Router and server components |
| **Frontend** | [React 19](https://react.dev) | UI component model |
| **Frontend** | [Tailwind CSS](https://tailwindcss.com) | Utility-first CSS framework |
| **Frontend** | [shadcn/ui](https://ui.shadcn.com) | Accessible component library built on Radix UI |
| **Shared** | [TypeScript](https://www.typescriptlang.org) | Strongly typed language for both frontend and backend |
| **Shared** | [@farm/types](https://github.com/Ops-Talks/farm) | Internal package for shared enums, types, and events |
| **Observability** | [Prometheus](https://prometheus.io) | Metrics collection and PromQL proxy |
| **Observability** | [Jaeger / Grafana Tempo](https://www.jaegertracing.io) | Distributed trace storage and waterfall viewer |
| **Observability** | [Loki](https://grafana.com/oss/loki) | Log aggregation and LogQL proxy |
| **Infrastructure** | [Docker / Docker Compose](https://docs.docker.com) | Container runtime and local development environment |
| **Infrastructure** | [Redis](https://redis.io) | Queue broker (BullMQ) and optional HTTP cache layer |

## Quick Start

The fastest way to get Farm running is using Docker and Docker Compose. This starts both the API and a PostgreSQL database.

```bash
# Clone the repository
git clone https://github.com/Ops-Talks/farm.git
cd farm

# Start the entire environment (API + Database)
make up-docker

# Check if everything is healthy
make healthcheck
```

The API server starts on port 3000 by default. You can access:

- **Health Endpoint**: `http://localhost:3000/api/health`
- **Interactive API Documentation (Swagger)**: `http://localhost:3000/api/docs`
- **Web UI**: `http://localhost:3001`

## License

Farm is licensed under the [GNU Affero General Public License v3.0](https://github.com/Ops-Talks/farm/blob/main/LICENSE).
