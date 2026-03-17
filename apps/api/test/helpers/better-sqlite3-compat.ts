/**
 * TypeORM better-sqlite3 column-type compatibility shim for E2E tests.
 *
 * TypeORM's EntityMetadataValidator rejects the "timestamp" column type for
 * SQLite-family drivers because it does not appear in their supportedDataTypes
 * list. The SQLite equivalent is "datetime" (both are stored as ISO-8601 text
 * strings and behave identically at runtime).
 *
 * Production entities intentionally declare @Column({ type: "timestamp" }) for
 * full PostgreSQL compatibility. This shim makes those entities work with the
 * better-sqlite3 in-memory database used for E2E tests by normalizing
 * "timestamp" to "datetime" inside the driver — without modifying any
 * production entity, service, or module file.
 *
 * The patch is applied once per worker process when Jest loads this file via
 * setupFilesAfterEnv, so it is in place before any NestJS TestingModule is
 * compiled in beforeEach / beforeAll blocks.
 */

// CommonJS require is intentional: Jest runs ts-jest in CommonJS mode and the
// TypeORM driver module is not re-exported from the public API surface.
/* eslint-disable @typescript-eslint/no-require-imports */
const bsDriverModule =
  require("typeorm/driver/better-sqlite3/BetterSqlite3Driver") as {
    BetterSqlite3Driver: {
      prototype: { normalizeType: (column: { type: unknown }) => string };
    };
  };
/* eslint-enable @typescript-eslint/no-require-imports */

const originalNormalizeType =
  bsDriverModule.BetterSqlite3Driver.prototype.normalizeType;

bsDriverModule.BetterSqlite3Driver.prototype.normalizeType = function (column: {
  type: unknown;
}): string {
  // Map "timestamp" to "datetime" so the EntityMetadataValidator accepts it.
  // Both types are stored identically in SQLite; no data fidelity is lost.
  if (column.type === "timestamp") {
    return "datetime";
  }
  return originalNormalizeType.call(this, column);
};
