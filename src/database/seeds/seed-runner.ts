import dataSource from "./seed.data-source";
import { runInitialSeed } from "./initial-seed";

const ALLOWED_ENVIRONMENTS = ["development", "test", undefined];

async function run(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;

  if (!ALLOWED_ENVIRONMENTS.includes(nodeEnv)) {
    console.error(`ERROR: Seeding is not allowed in "${nodeEnv}" environment.`);
    console.error(
      "Seeding is restricted to development and test environments.",
    );
    process.exit(1);
  }

  console.log(
    `Starting database seeding (NODE_ENV=${nodeEnv || "undefined"})...`,
  );

  try {
    await dataSource.initialize();
    console.log("Database connection established.");

    await dataSource.runMigrations();
    console.log("Migrations applied.");

    await runInitialSeed(dataSource);

    console.log("Seeding completed successfully.");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

void run();
