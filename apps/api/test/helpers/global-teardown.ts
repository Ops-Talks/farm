import { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

declare global {
  var __PG_CONTAINER__: StartedPostgreSqlContainer;
}

export default async function globalTeardown(): Promise<void> {
  await global.__PG_CONTAINER__?.stop();
}
