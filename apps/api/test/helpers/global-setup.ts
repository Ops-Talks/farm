import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer | null;
}

export default async function globalSetup(): Promise<void> {
  try {
    const container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("farm_test")
      .withUsername("farm_test")
      .withPassword("farm_test")
      .start();

    process.env.DATABASE_TYPE = "postgres";
    process.env.DATABASE_HOST = container.getHost();
    process.env.DATABASE_PORT = String(container.getMappedPort(5432));
    process.env.DATABASE_USER = container.getUsername();
    process.env.DATABASE_PASSWORD = container.getPassword();
    process.env.DATABASE_NAME = container.getDatabase();
    process.env.DATABASE_SYNC = "true";
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "e2e-test-secret-that-is-at-least-32-characters";

    global.__PG_CONTAINER__ = container;
  } catch {
    console.warn(
      "testcontainers: could not start PostgreSQL container — e2e tests will be skipped.",
    );
    global.__PG_CONTAINER__ = null;
    process.env.SKIP_E2E = "true";
  }
}
