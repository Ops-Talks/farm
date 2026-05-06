import type { KnipConfig } from 'knip';

/**
 * Knip dead-code analysis configuration for the Farm monorepo.
 *
 * Knip is a static analysis tool that finds unused files, exports, and
 * dependencies across workspace boundaries. It complements ESLint (which only
 * sees within-file scope) by detecting orphaned code at the module level.
 *
 * Workspace-level documentation:
 * - apps/api  : NestJS 11 + TypeORM — many files are loaded via runtime DI,
 *               decorator patterns, or the TypeORM CLI. Entry patterns are
 *               deliberately broad to suppress false positives for classes
 *               that are never directly imported but are registered at runtime.
 * - apps/web  : Next.js 16 App Router — special files (page, layout, route,
 *               etc.) are discovered by the framework, not by direct imports.
 * - packages/* : internal shared packages exported as barrel modules.
 */
const config: KnipConfig = {
  workspaces: {
    // ── Root workspace ──────────────────────────────────────────────────────
    '.': {
      entry: [],
      project: [],
      ignoreDependencies: [
        // class-transformer and class-validator must live in the root
        // package.json devDependencies so npm hoists them to the root
        // node_modules. This allows @nestjs/common (resolved from root) to
        // find them at runtime. They are not directly imported from the root
        // workspace entry, so Knip incorrectly flags them as unused.
        'class-transformer',
        'class-validator',
      ],
      ignoreBinaries: [
        // tsc is invoked in .github/actions/setup-monorepo/action.yml to
        // compile packages/types. The binary is provided by the workspace-level
        // typescript devDependency, not by a root-level package.
        'tsc',
      ],
    },

    // ── apps/api (NestJS 11 + TypeORM) ──────────────────────────────────────
    'apps/api': {
      entry: [
        // Application entry point
        'src/main.ts',

        // TypeORM CLI data source — loaded from dist/ by the typeorm CLI, not
        // by any source import.
        'src/config/typeorm-cli.config.ts',

        // Standalone seed runner — executed as a Node script, not imported.
        'src/database/seeds/seed-runner.ts',

        // Jest helper loaded by jest.config.js setupFilesAfterFramework, not
        // imported by any spec file.
        'src/jest-helper-patch.js',

        // ── NestJS DI-registered file patterns ──────────────────────────────
        // These files are registered in @Module() decorator arrays and wired
        // by the NestJS runtime. Knip cannot statically trace decorator
        // arguments, so they are marked as entry points to prevent false
        // positives on their exported classes and functions.

        // Core NestJS building blocks
        'src/**/*.module.ts',
        'src/**/*.controller.ts',
        'src/**/*.service.ts',
        'src/**/*.guard.ts',
        'src/**/*.interceptor.ts',
        'src/**/*.pipe.ts',
        'src/**/*.filter.ts',
        'src/**/*.middleware.ts',

        // Custom parameter/class decorators (factory functions are exported
        // and consumed by caller files, but the factories themselves may
        // appear unresolvable to Knip).
        'src/**/*.decorator.ts',

        // Passport strategies extend PassportStrategy and are registered as
        // providers in @Module(); @nestjs/passport resolves them at runtime.
        'src/**/*.strategy.ts',

        // BullMQ processors are decorated with @Processor() and wired into
        // the queue system by @nestjs/bullmq — never imported directly.
        'src/**/*.processor.ts',

        // Cron schedulers are decorated with @Cron() / @Interval() and
        // registered as providers — Knip cannot follow @nestjs/schedule wiring.
        'src/**/*.scheduler.ts',

        // TypeORM event subscribers are decorated with @EventSubscriber() and
        // loaded via autoLoadEntities / explicit subscriber arrays.
        'src/**/*.subscriber.ts',

        // TypeORM entities are loaded dynamically via autoLoadEntities or
        // explicit entity arrays in the DataSource config.
        'src/**/*.entity.ts',
      ],
      project: ['src/**/*.ts', 'src/**/*.js'],
      ignore: [
        // TypeORM migration files are generated and loaded dynamically by the
        // TypeORM CLI from the compiled dist/. They are never imported.
        'src/migrations/**',

        // Test files — excluded globally; Jest already owns their analysis.
        'src/**/*.spec.ts',
        'test/**',
      ],
      ignoreDependencies: [
        // @nestjs/swagger re-exports PartialType and related helpers from
        // @nestjs/mapped-types internally. @nestjs/mapped-types is a required
        // peer dependency but is not directly imported by application code.
        '@nestjs/mapped-types',

        // express is a peer dependency of @nestjs/platform-express and is used
        // directly in filter/guard/middleware files for type-safe Request and
        // Response references, and in main.ts for body-parser configuration.
        // It is provided transitively and does not need to be listed separately.
        'express',

        // supertest and its types are used exclusively inside test/ which is
        // excluded from Knip's project files. They are legitimate test-only deps.
        'supertest',
        '@types/supertest',
      ],
      ignoreMembers: [
        // GenderEnum members FEMALE and NON_BINARY are legitimate validation
        // values validated at runtime by class-validator's @IsEnum(GenderEnum).
        // They are never accessed via GenderEnum.FEMALE in TypeScript source,
        // but they are functional API values that must remain in the enum.
        'FEMALE',
        'NON_BINARY',
      ],
    },

    // ── apps/web (Next.js 16 App Router) ────────────────────────────────────
    'apps/web': {
      entry: [
        // Next.js App Router special segment files — discovered by the
        // framework file-system router, not imported from other modules.
        'src/app/**/{page,layout,route,loading,error,not-found,template,default}.{ts,tsx}',

        // Next.js root-level global error boundary — replaces the entire root
        // layout on unhandled errors; loaded by the framework, not imported.
        'src/app/global-error.tsx',

        // OpenTelemetry instrumentation hook — loaded by Next.js via the
        // instrumentationHook experimental config option.
        'src/instrumentation.ts',

        // Next.js configuration
        'next.config.ts',

        // Middleware (loaded by Next.js Edge runtime)
        'src/middleware.ts',
      ],
      project: ['src/**/*.{ts,tsx}'],
      ignore: [
        // Unit test files — owned by Vitest.
        'src/**/*.test.{ts,tsx}',
        'src/test/**',

        // Storybook stories — not imported in production code.
        'src/**/*.stories.{ts,tsx}',
        '.storybook/**',

        // Playwright E2E tests
        'e2e/**',
        'playwright.config.ts',

        // shadcn/ui component files export a comprehensive component API by
        // design. They are scaffolded files maintained by `npx shadcn add`
        // and their export surface should not be subject to dead-code analysis.
        'src/components/ui/**',
      ],
      ignoreDependencies: [
        // Tailwind 4 CSS-based dependencies — referenced via @import and
        // @plugin directives in globals.css, which Knip does not parse.
        'tailwindcss',
        'tw-animate-css',
        '@tailwindcss/typography',

        // shadcn is a CLI-only tool used to scaffold UI components; it also
        // provides a tailwind CSS preset loaded via `@import "shadcn/tailwind.css"`
        // in globals.css. Neither usage is visible to static TS analysis.
        'shadcn',

        // OTel Node SDK packages loaded via dynamic import() inside function
        // bodies in tracing.server.ts to prevent webpack bundling. Knip
        // cannot trace those runtime import() calls, so they are excluded
        // from dead-code analysis.
        '@opentelemetry/sdk-node',
        '@opentelemetry/auto-instrumentations-node',

        // winston-daily-rotate-file is imported as a side-effect in
        // logger.server.ts to register DailyRotateFile with the winston
        // transport registry for optional file logging deployments.
        'winston-daily-rotate-file',
      ],
    },

    // ── packages/types ───────────────────────────────────────────────────────
    'packages/types': {
      entry: ['src/index.ts'],
      project: ['src/**/*.ts'],
      // Report unused exports even from the entry (public API barrel).
      // This surfaces enum values and interfaces that no workspace imports.
      includeEntryExports: true,
      // Enum members accessed only via Object.values(Enum) or z.nativeEnum()
      // are not resolved by Knip's cross-workspace static analysis.
      // Listing them here suppresses false-positive "unused enum member" reports.
      ignoreMembers: [
        'LIBRARY', 'WEBSITE', 'API', 'COMPONENT', 'SYSTEM', 'DOMAIN',
        'RESOURCE', 'PIPELINE', 'QUEUE', 'DATABASE', 'STORAGE', 'CLUSTER',
        'NETWORK', 'DATASET', 'DATA_PIPELINE', 'ML_MODEL', 'SECRET', 'POLICY',
        'CERTIFICATE',
      ],
    },
  },
};

export default config;
