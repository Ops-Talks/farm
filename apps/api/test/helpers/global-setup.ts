import { execSync } from "node:child_process";
import { networkInterfaces } from "node:os";

import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { Client } from "pg";

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer | null;
}

function getIPv4Loopback(): string {
  const lo = networkInterfaces().lo;
  if (lo) {
    const v4 = lo.find((addr) => addr.family === "IPv4" && !addr.internal);
    if (v4) return v4.address;
    const internal = lo.find((addr) => addr.family === "IPv4");
    if (internal) return internal.address;
  }
  return "[IP_ADDRESS]";
}

function cleanupStaleContainers() {
  try {
    execSync(
      "docker rm -f $(docker ps -aq -f label=org.testcontainers=true -f ancestor=postgres:16-alpine) 2>/dev/null || true",
      { stdio: "ignore" },
    );
  } catch {
    // no stale containers
  }
}

async function waitForPostgres(
  host: string,
  port: number,
  user: string,
  password: string,
  database: string,
  maxRetries = 15,
  delayMs = 2000,
): Promise<void> {
  let lastError = "";

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const client = new Client({
      host,
      port,
      user,
      password,
      database,
      connectionTimeoutMillis: 3000,
    });
    try {
      await client.connect();
      await client.query("SELECT 1");
      await client.end();
      return;
    } catch (error) {
      lastError =
        error instanceof Error
          ? `[${(error as NodeJS.ErrnoException).code ?? "unknown"}] ${error.message}`
          : String(error);
      await client.end().catch(() => undefined);
    }
    if (attempt < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw new Error(
    `PostgreSQL not reachable at ${host}:${port} after ${maxRetries} retries. ` +
      `Last error: ${lastError}`,
  );
}

export default async function globalSetup(): Promise<void> {
  cleanupStaleContainers();

  try {
    const container = await new PostgreSqlContainer("postgres:16-alpine")
      .withDatabase("farm_test")
      .withUsername("farm_test")
      .withPassword("farm_test")
      .start();

    const reportedHost = container.getHost();
    const port = container.getMappedPort(5432);

    // Docker publishes IPv4-only. Node resolves 'localhost' → ::1 first
    // on dual-stack hosts, causing ECONNREFUSED or timeouts.
    const host =
      reportedHost === "localhost" || reportedHost === "::1"
        ? getIPv4Loopback()
        : reportedHost;

    await waitForPostgres(
      host,
      port,
      container.getUsername(),
      container.getPassword(),
      container.getDatabase(),
    );

    process.env.DATABASE_TYPE = "postgres";
    process.env.DATABASE_HOST = host;
    process.env.DATABASE_PORT = String(port);
    process.env.DATABASE_USER = container.getUsername();
    process.env.DATABASE_PASSWORD = container.getPassword();
    process.env.DATABASE_NAME = container.getDatabase();
    process.env.DATABASE_SYNC = "true";
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "e2e-test-secret-that-is-at-least-32-characters";

    global.__PG_CONTAINER__ = container;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    global.__PG_CONTAINER__ = null;
    throw new Error(`E2E globalSetup failed: ${message}`);
  }
}
