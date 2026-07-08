import { fileURLToPath } from "url";
import path from "path";
import { DataSource } from "typeorm";
import { config } from "dotenv";
import { SnakeNamingStrategy } from "../../common/database/snake-naming.strategy";

const __filename = fileURLToPath(import.meta.url);

// Compiled output lives at apps/api/dist/database/seeds/.
// Search for .env in apps/api/ first, then monorepo root as fallback.
// dotenv silently ignores missing files, so order matters: more specific first.
config({ path: path.resolve(path.dirname(__filename), "../../../.env") });
config({
  path: path.resolve(path.dirname(__filename), "../../../../../.env"),
  override: false,
});

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
  namingStrategy: new SnakeNamingStrategy(),
  synchronize: process.env.DATABASE_SYNC === "true",
});
