/**
 * Returns the appropriate TypeORM column type for timestamp columns,
 * depending on the active database driver.
 *
 * PostgreSQL: "timestamptz" (TIMESTAMP WITH TIME ZONE)
 * SQLite / better-sqlite3: "datetime" (the only supported date+time type)
 */
export const dateColumnType = (): "timestamptz" | "datetime" => {
  const dbType = process.env.DATABASE_TYPE ?? "postgres";
  return dbType === "postgres" ? "timestamptz" : "datetime";
};
