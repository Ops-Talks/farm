import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

/**
 * TypeORM Data Source configuration for CLI usage (migrations).
 * This file is used by the typeorm-cli to run migrations and sync operations.
 */
export default new DataSource({
  type: "postgres",
  host: process.env.DATABASE_HOST || "localhost",
  port: parseInt(process.env.DATABASE_PORT || "5432", 10),
  username: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD || "postgres",
  database: process.env.DATABASE_NAME || "farm",
  entities: ["dist/**/*.entity.js"],
  migrations: ["dist/migrations/*.js"],
  synchronize: false,
});
