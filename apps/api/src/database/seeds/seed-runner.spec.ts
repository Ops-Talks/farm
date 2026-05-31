/**
 * Tests for seed-runner.ts.
 *
 * Covers: environment guard (exits in non-allowed envs), SEED_FORCE bypass
 * (warns and continues), success path (initialize → runMigrations →
 * runInitialSeed → destroy), and error path (exits with code 1).
 *
 * Strategy: mock both external dependencies (seed.data-source and
 * initial-seed) so no real DB connection is needed. The run() function is
 * exported solely for testability; production entry runs via require.main guard.
 */

import { run } from "./seed-runner";
import dataSource from "./seed.data-source";
import { runInitialSeed } from "./initial-seed";

jest.mock("./seed.data-source", () => ({
  __esModule: true,
  default: {
    isInitialized: true,
    initialize: jest.fn().mockResolvedValue(undefined),
    runMigrations: jest.fn().mockResolvedValue([]),
    destroy: jest.fn().mockResolvedValue(undefined),
  },
}));

jest.mock("./initial-seed", () => ({
  runInitialSeed: jest.fn().mockResolvedValue(undefined),
}));

const mockedDs = dataSource as {
  isInitialized: boolean;
  initialize: jest.Mock;
  runMigrations: jest.Mock;
  destroy: jest.Mock;
};
const mockedRunInitialSeed = runInitialSeed as jest.Mock;

describe("seed-runner – run()", () => {
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let warnSpy: jest.SpyInstance;
  let logSpy: jest.SpyInstance;

  const origNodeEnv = process.env.NODE_ENV;

  beforeEach(() => {
    exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation(() => undefined as never);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env.NODE_ENV = origNodeEnv;
    delete process.env.SEED_FORCE;
    jest.restoreAllMocks();
  });

  describe("environment guard", () => {
    it("exits with code 1 when NODE_ENV=production and SEED_FORCE is not set", async () => {
      process.env.NODE_ENV = "production";
      delete process.env.SEED_FORCE;

      await run();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringContaining("Seeding is not allowed"),
      );
    });

    it("exits with code 1 when NODE_ENV=staging and SEED_FORCE is not set", async () => {
      process.env.NODE_ENV = "staging";
      delete process.env.SEED_FORCE;

      await run();

      expect(exitSpy).toHaveBeenCalledWith(1);
    });

    it("does not exit when NODE_ENV=development", async () => {
      process.env.NODE_ENV = "development";
      delete process.env.SEED_FORCE;

      await run();

      expect(exitSpy).not.toHaveBeenCalledWith(1);
    });

    it("does not exit when NODE_ENV=test", async () => {
      process.env.NODE_ENV = "test";
      delete process.env.SEED_FORCE;

      await run();

      expect(exitSpy).not.toHaveBeenCalledWith(1);
    });
  });

  describe("SEED_FORCE bypass", () => {
    it("bypasses the guard and warns when SEED_FORCE=true in production", async () => {
      process.env.NODE_ENV = "production";
      process.env.SEED_FORCE = "true";

      await run();

      expect(exitSpy).not.toHaveBeenCalledWith(1);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("SEED_FORCE=true"),
      );
    });

    it("does not warn when SEED_FORCE=true in development (allowed env)", async () => {
      process.env.NODE_ENV = "development";
      process.env.SEED_FORCE = "true";

      await run();

      expect(warnSpy).not.toHaveBeenCalled();
    });
  });

  describe("success path", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("initializes the data source", async () => {
      await run();
      expect(mockedDs.initialize).toHaveBeenCalledTimes(1);
    });

    it("runs migrations before seeding", async () => {
      await run();
      const initOrder = mockedDs.initialize.mock.invocationCallOrder[0];
      const migrOrder = mockedDs.runMigrations.mock.invocationCallOrder[0];
      const seedOrder = mockedRunInitialSeed.mock.invocationCallOrder[0];
      expect(migrOrder).toBeGreaterThan(initOrder);
      expect(seedOrder).toBeGreaterThan(migrOrder);
    });

    it("destroys the data source in the finally block", async () => {
      await run();
      expect(mockedDs.destroy).toHaveBeenCalledTimes(1);
    });

    it("logs completion on success", async () => {
      await run();
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining("Seeding completed successfully"),
      );
    });
  });

  describe("error path", () => {
    beforeEach(() => {
      process.env.NODE_ENV = "development";
    });

    it("exits with code 1 and logs the error when initialize throws", async () => {
      mockedDs.initialize.mockRejectedValueOnce(new Error("DB unreachable"));

      await run();

      expect(exitSpy).toHaveBeenCalledWith(1);
      expect(errorSpy).toHaveBeenCalledWith(
        "Seeding failed:",
        expect.any(Error),
      );
    });

    it("still destroys the data source when runInitialSeed throws", async () => {
      mockedRunInitialSeed.mockRejectedValueOnce(new Error("seed error"));

      await run();

      expect(mockedDs.destroy).toHaveBeenCalledTimes(1);
    });
  });
});
