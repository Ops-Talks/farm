import * as Joi from "joi";

/**
 * Configuration factory that maps environment variables to a configuration object.
 */
export const configuration = () => ({
  env: process.env.NODE_ENV || "development",
  port: parseInt(process.env.PORT ?? "3000", 10) || 3000,
  database: {
    type: process.env.DATABASE_TYPE || "postgres",
    host: process.env.DATABASE_HOST || "localhost",
    port: parseInt(process.env.DATABASE_PORT ?? "5432", 10) || 5432,
    username: process.env.DATABASE_USER || "postgres",
    password: process.env.DATABASE_PASSWORD || "postgres",
    name: process.env.DATABASE_NAME || "farm",
    synchronize: process.env.DATABASE_SYNC === "true",
  },
});

/**
 * Validation schema for environment variables using Joi.
 */
export const validationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid("development", "production", "test", "provision")
    .default("development"),
  PORT: Joi.number().default(3000),
  DATABASE_TYPE: Joi.string().valid("postgres", "sqlite").default("postgres"),
  DATABASE_HOST: Joi.string().default("localhost"),
  DATABASE_PORT: Joi.number().default(5432),
  DATABASE_USER: Joi.string().default("postgres"),
  DATABASE_PASSWORD: Joi.string().default("postgres"),
  DATABASE_NAME: Joi.string().default("farm"),
  DATABASE_SYNC: Joi.boolean().default(false),
});
