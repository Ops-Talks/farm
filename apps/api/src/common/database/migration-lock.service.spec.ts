import { Test, TestingModule } from "@nestjs/testing";
import { MigrationLockService } from "./migration-lock.service";
import { getDataSourceToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";

function buildMockDataSource(options: {
  hasPending?: boolean;
  queryError?: Error;
}) {
  return {
    query: jest.fn().mockImplementation(() => {
      if (options.queryError) return Promise.reject(options.queryError);
      return Promise.resolve();
    }),
    showMigrations: jest.fn().mockResolvedValue(options.hasPending ?? false),
    runMigrations: jest.fn().mockResolvedValue([]),
  };
}

describe("MigrationLockService", () => {
  async function build(
    dbType: string,
    dataSource: ReturnType<typeof buildMockDataSource>,
    synchronize = false,
  ) {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MigrationLockService,
        {
          provide: getDataSourceToken(),
          useValue: dataSource,
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === "database.type") return dbType;
              if (key === "database.synchronize") return synchronize;
              return undefined;
            }),
          },
        },
      ],
    }).compile();
    return module.get<MigrationLockService>(MigrationLockService);
  }

  it("is a no-op when the database type is not postgres", async () => {
    const ds = buildMockDataSource({});
    const svc = await build("other-db", ds);
    await svc.onModuleInit();
    expect(ds.query).not.toHaveBeenCalled();
    expect(ds.showMigrations).not.toHaveBeenCalled();
  });

  it("is a no-op when synchronize is true (test environment)", async () => {
    const ds = buildMockDataSource({});
    const svc = await build("postgres", ds, true);
    await svc.onModuleInit();
    expect(ds.query).not.toHaveBeenCalled();
    expect(ds.showMigrations).not.toHaveBeenCalled();
  });

  it("acquires the lock, runs pending migrations, and releases the lock", async () => {
    const ds = buildMockDataSource({ hasPending: true });
    const svc = await build("postgres", ds);
    await svc.onModuleInit();

    expect(ds.query).toHaveBeenCalledWith("SELECT pg_advisory_lock(4218428)");
    expect(ds.showMigrations).toHaveBeenCalledTimes(1);
    expect(ds.runMigrations).toHaveBeenCalledWith({ transaction: "each" });
    expect(ds.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(4218428)");
  });

  it("skips runMigrations when there are no pending migrations", async () => {
    const ds = buildMockDataSource({ hasPending: false });
    const svc = await build("postgres", ds);
    await svc.onModuleInit();

    expect(ds.runMigrations).not.toHaveBeenCalled();
    expect(ds.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(4218428)");
  });

  it("releases the lock even when runMigrations throws", async () => {
    const ds = buildMockDataSource({ hasPending: true });
    ds.runMigrations.mockRejectedValueOnce(new Error("migration failed"));
    const svc = await build("postgres", ds);

    await expect(svc.onModuleInit()).rejects.toThrow("migration failed");
    expect(ds.query).toHaveBeenCalledWith("SELECT pg_advisory_unlock(4218428)");
  });
});
