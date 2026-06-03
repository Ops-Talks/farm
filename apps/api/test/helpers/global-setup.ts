import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer;
}

export default async function globalSetup(): Promise<void> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("farm_test")
    .withUsername("farm_test")
    .withPassword("farm_test")
    .start();

  // Pass connection info to test workers via environment variables.
  // Jest spawns worker processes after globalSetup completes, so env vars
  // set here are inherited by all worker processes.
  process.env.DATABASE_TYPE = "postgres";
  process.env.DATABASE_HOST = container.getHost();
  process.env.DATABASE_PORT = String(container.getMappedPort(5432));
  process.env.DATABASE_USER = container.getUsername();
  process.env.DATABASE_PASSWORD = container.getPassword();
  process.env.DATABASE_NAME = container.getDatabase();
  process.env.DATABASE_SYNC = "true";
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "e2e-test-secret-that-is-at-least-32-characters";

  // Store container reference for teardown. globalSetup and globalTeardown
  // run in the same parent process, so global variables are shared between them.
  global.__PG_CONTAINER__ = container;
}
