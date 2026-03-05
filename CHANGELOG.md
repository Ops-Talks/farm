# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.2] - 2026-03-04

### Added
- **Docs Branding Asset**: Added `docs/img/farm01.svg` and configured it as project favicon.
- **Dockerized Test Workflow**: Added multi-stage `Dockerfile` with dedicated `test` and `production` targets.
- **Container Build Optimization**: Added `.dockerignore` for faster Docker builds.
- **Developer Commands**: Added Makefile targets for API validation via Docker (`test-docker`, `up-docker`, `down-docker`, `healthcheck`).

### Changed
- **Documentation Theme Customization**: Updated MkDocs Material configuration to support custom color tokens.
- **Visual Identity**: Applied Electric Indigo (`#6F00FF`) and Neon Fuchsia (`#FE59C2`) in `docs/stylesheets/extra.css`.
- **Header Styling**: Added gradient styling for header and tabs in documentation.
- **Homepage Content**: Updated `docs/index.md` to render the Farm logo in the page body.

### Fixed
- **MkDocs Color Configuration**: Replaced invalid theme color configuration approach with proper CSS variable overrides.

## [0.2.1] - 2026-03-04

### Added
- **System Discovery Documentation**: New guide for users to understand platform capabilities.
- **Plugin System Guide**: Detailed technical documentation for developers on how to extend Farm.
- **Plugins API Reference**: Documentation for the new `/api/plugins` discovery endpoint.
- **NestJS Development Standards**: Integrated specialized development guidelines in `.github/nestjs_instructions.md`.

### Changed
- **Developer Experience**: Updated setup guides with Docker and Makefile instructions.
- **Localization**: Translated Makefile commands and help messages to EN_US.
- **Documentation Structure**: Refined MkDocs navigation and indices for better discoverability.

## [0.2.0] - 2026-03-04

### Added
- **Plugin Manager Architecture**: Introduced a dynamic plugin system for modular extensibility.
  - `PluginManagerModule`: Handles dynamic registration of modules.
  - `PluginManagerService`: Centralized registry for plugin discovery.
  - `PluginManagerController`: API endpoint (`GET /api/plugins`) to list active features.
- Registered core modules (`Catalog`, `Documentation`, `Auth`) as plugins.

## [0.1.0] - 2026-03-04

### Added
- Initial NestJS project structure for Farm developer portal.
- **Catalog Module**: CRUD for software components (services, libraries, APIs).
- **Documentation Module**: Management of technical docs associated with components.
- **Auth Module**: Basic user registration and login functionality.
- **MkDocs Integration**: Comprehensive technical documentation using Material theme.
- **Docker Support**: `Dockerfile` and `docker-compose.docs.yml` for containerized deployment.
- **CI/CD**: GitHub Actions workflow for automatic documentation publishing to GitHub Pages.
- **Makefile**: Automation scripts for common tasks (build, test, docker, docs).

### Fixed
- MkDocs loading issues in production environments.

