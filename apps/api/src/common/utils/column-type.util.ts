/**
 * Returns the appropriate TypeORM column type for timestamp columns,
 * depending on the active database driver.
 *
 * PostgreSQL: "timestamp" (TIMESTAMP WITHOUT TIME ZONE, consistent with existing migrations)
 * SQLite / better-sqlite3: "datetime" (the only supported date+time type)
 */
export const dateColumnType = (): "timestamp" | "datetime" => {
  const dbType = process.env.DATABASE_TYPE ?? "postgres";
  return dbType === "postgres" ? "timestamp" : "datetime";
};
