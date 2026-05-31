import dataSource from "./seed.data-source";
import { runInitialSeed } from "./initial-seed";

const ALLOWED_ENVIRONMENTS = ["development", "test", undefined];

async function run(): Promise<void> {
  const nodeEnv = process.env.NODE_ENV;
  const seedForce = process.env.SEED_FORCE === "true";

  if (!ALLOWED_ENVIRONMENTS.includes(nodeEnv) && !seedForce) {
    console.error(`ERROR: Seeding is not allowed in "${nodeEnv}" environment.`);
    console.error(
      "Set SEED_FORCE=true to bypass this check (e.g. in a Kubernetes seed Job).",
    );
    process.exit(1);
  }

  if (seedForce && !ALLOWED_ENVIRONMENTS.includes(nodeEnv)) {
    console.warn(
      `WARNING: SEED_FORCE=true — bypassing environment guard (NODE_ENV=${nodeEnv}).`,
    );
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
