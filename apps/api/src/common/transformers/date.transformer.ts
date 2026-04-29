import { ValueTransformer } from "typeorm";

/**
 * TypeORM column transformer that ensures timestamp/datetime columns are
 * always returned as `Date` instances on read, regardless of the underlying
 * database driver.
 *
 * Postgres returns `timestamp`/`timestamptz` columns as `Date` natively, but
 * SQLite (used in the in-memory test database) returns them as ISO strings.
 * Without this transformer, code that calls `.getTime()` or other Date methods
 * on the field will throw at runtime in tests.
 */
export const dateTransformer: ValueTransformer = {
  to: (
    value: Date | string | null | undefined,
  ): Date | string | null | undefined => value,
  from: (value: Date | string | null | undefined): Date | null => {
    if (value == null) return null;
    if (value instanceof Date) return value;
    return new Date(value);
  },
};
