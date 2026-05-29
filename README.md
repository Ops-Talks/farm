# Farm

[![CI](https://github.com/Ops-Talks/farm/actions/workflows/ci.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/ci.yml)
[![Web CI](https://github.com/Ops-Talks/farm/actions/workflows/web-ci.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/web-ci.yml)
[![codecov](https://codecov.io/gh/Ops-Talks/farm/graph/badge.svg)](https://codecov.io/gh/Ops-Talks/farm)
[![SAST](https://github.com/Ops-Talks/farm/actions/workflows/sast.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/sast.yml)
[![DAST](https://github.com/Ops-Talks/farm/actions/workflows/dast.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/dast.yml)
[![Secret Scanning](https://github.com/Ops-Talks/farm/actions/workflows/secret-scan.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/secret-scan.yml)
[![Container Security](https://github.com/Ops-Talks/farm/actions/workflows/trivy.yml/badge.svg)](https://github.com/Ops-Talks/farm/actions/workflows/trivy.yml)
[![License: AGPL v3](https://img.shields.io/badge/License-AGPL%20v3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D26-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-11-E0234E?logo=nestjs&logoColor=white)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Docker](https://img.shields.io/badge/Docker-ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Helm Chart](https://img.shields.io/badge/dynamic/yaml?url=https%3A%2F%2Fraw.githubusercontent.com%2FOps-Talks%2Ffarm%2Fmain%2Fdeploy%2Fhelm%2Ffarm%2FChart.yaml&query=%24.version&label=helm%20chart&logo=helm&logoColor=white&color=0F1689)](deploy/helm/farm/)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/farm)](https://artifacthub.io/packages/search?repo=farm)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/farm-observability)](https://artifacthub.io/packages/search?repo=farm-observability)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

Farm is an open-source full stack portal providing a centralized hub for managing software components, technical documentation, and team infrastructure.

Full documentation: **[https://ops-talks.github.io/farm/](https://ops-talks.github.io/farm/)**

## Quick Start

```bash
make up-all         # start the Farm Stack
make down-all       # Delete anything
make seed           # Populates the Postgres DB with users 
make healthcheck    # verify the API is up
```

API: `http://localhost:3000/api` — Swagger UI: `http://localhost:3000/api/docs`

## Development

```bash
npm install         # install all workspace dependencies
npm run start:dev   # API in watch mode (apps/api)
npm run dev         # web in watch mode  (apps/web)
make check          # lint + format + unit tests + e2e
```

See the [Developer Guide](https://ops-talks.github.io/farm/developer-guide/setup/) for full setup instructions, environment variables, and migration commands.

## License

[AGPL v3](LICENSE)
