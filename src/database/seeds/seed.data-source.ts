import { DataSource } from "typeorm";
import { config } from "dotenv";

config();

/**
 * Standalone TypeORM DataSource for seeding operations.
 * Reuses the same connection config as the CLI data source.
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
  synchronize: process.env.DATABASE_SYNC === "true",
});
