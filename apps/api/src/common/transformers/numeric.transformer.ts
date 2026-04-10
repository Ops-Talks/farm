import { ValueTransformer } from "typeorm";

/**
 * TypeORM column transformer that converts Postgres `decimal`/`numeric`
 * string values to JavaScript numbers on read.
 *
 * Postgres returns decimal columns as strings to preserve precision.
 * This transformer ensures the API consistently exposes `number` values
 * rather than leaking string representations.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined): number | null | undefined => value,
  from: (value: string | null | undefined): number | null => {
    if (value == null) return null;
    const parsed = parseFloat(value);
    return isNaN(parsed) ? null : parsed;
  },
};
