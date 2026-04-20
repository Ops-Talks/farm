import { Test, TestingModule } from "@nestjs/testing";
import { ServiceUnavailableException } from "@nestjs/common";
import { HealthController } from "./health.controller";
import {
  HealthCheckService,
  TypeOrmHealthIndicator,
  MemoryHealthIndicator,
  DiskHealthIndicator,
  HealthCheckResult,
} from "@nestjs/terminus";
import { ConfigService } from "@nestjs/config";

describe("HealthController", () => {
  let controller: HealthController;
  let healthService: HealthCheckService;
  let dbIndicator: TypeOrmHealthIndicator;
  let memoryIndicator: MemoryHealthIndicator;
  let diskIndicator: DiskHealthIndicator;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthCheckService,
          useValue: {
            check: jest.fn(),
          },
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: {
            pingCheck: jest.fn(),
          },
        },
        {
          provide: MemoryHealthIndicator,
          useValue: {
            checkHeap: jest.fn(),
            checkRSS: jest.fn(),
          },
        },
        {
          provide: DiskHealthIndicator,
          useValue: {
            checkStorage: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "version") return "0.2.4";
              if (key === "health.heapThresholdMb") return 512;
              if (key === "health.rssThresholdMb") return 1024;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthCheckService>(HealthCheckService);
    dbIndicator = module.get<TypeOrmHealthIndicator>(TypeOrmHealthIndicator);
    memoryIndicator = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);
    diskIndicator = module.get<DiskHealthIndicator>(DiskHealthIndicator);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should call healthService.check", async () => {
    await controller.check();
    expect(healthService.check).toHaveBeenCalled();
  });

  it("returns the health check result when all indicators pass", async () => {
    const mockResult: HealthCheckResult = {
      status: "ok",
      info: {},
      error: {},
      details: {},
    };
    (healthService.check as jest.Mock).mockResolvedValue(mockResult);

    const result = await controller.check();

    expect(result).toEqual(mockResult);
  });

  it("propagates ServiceUnavailableException when a health indicator fails", async () => {
    const error = new ServiceUnavailableException({
      status: "error",
      info: {},
      error: { database: { status: "down" } },
      details: { database: { status: "down" } },
    });
    (healthService.check as jest.Mock).mockRejectedValue(error);

    await expect(controller.check()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });

  it("passes five indicator functions to healthService.check", async () => {
    (healthService.check as jest.Mock).mockResolvedValue({
      status: "ok",
      info: {},
      error: {},
      details: {},
    });

    await controller.check();

    const [indicators] = (healthService.check as jest.Mock).mock.calls[0] as [
      Array<() => unknown>,
    ];
    expect(indicators).toHaveLength(5);
    indicators.forEach((fn) => expect(typeof fn).toBe("function"));
  });

  it("calls db.pingCheck for the database indicator", async () => {
    (healthService.check as jest.Mock).mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        await indicators[0]();
        return { status: "ok", info: {}, error: {}, details: {} };
      },
    );

    await controller.check();

    expect(dbIndicator.pingCheck).toHaveBeenCalledWith("database");
  });

  it("calls memory.checkHeap for the memory_heap indicator", async () => {
    (healthService.check as jest.Mock).mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        await indicators[1]();
        return { status: "ok", info: {}, error: {}, details: {} };
      },
    );

    await controller.check();

    expect(memoryIndicator.checkHeap).toHaveBeenCalledWith(
      "memory_heap",
      512 * 1024 * 1024,
    );
  });

  it("calls memory.checkRSS for the memory_rss indicator", async () => {
    (healthService.check as jest.Mock).mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        await indicators[2]();
        return { status: "ok", info: {}, error: {}, details: {} };
      },
    );

    await controller.check();

    expect(memoryIndicator.checkRSS).toHaveBeenCalledWith(
      "memory_rss",
      1024 * 1024 * 1024,
    );
  });

  it("calls disk.checkStorage for the storage indicator", async () => {
    (healthService.check as jest.Mock).mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        await indicators[3]();
        return { status: "ok", info: {}, error: {}, details: {} };
      },
    );

    await controller.check();

    expect(diskIndicator.checkStorage).toHaveBeenCalledWith("storage", {
      path: "/",
      thresholdPercent: 0.9,
    });
  });

  it("version custom indicator returns correct shape with status 'up'", async () => {
    (healthService.check as jest.Mock).mockImplementation(
      (indicators: Array<() => unknown>) => {
        const result = indicators[4]() as {
          version: { status: string; version: string };
        };
        return result;
      },
    );

    const result = (await controller.check()) as {
      version: { status: string; version: string };
    };

    expect(result).toEqual({
      version: {
        status: "up",
        version: "0.2.4",
      },
    });
  });

  it("version indicator uses fallback '0.2.4' when config returns undefined", async () => {
    // Override ConfigService to return undefined so the || fallback is used.
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck: jest.fn() } },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn(), checkRSS: jest.fn() },
        },
        { provide: DiskHealthIndicator, useValue: { checkStorage: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "health.heapThresholdMb") return 512;
              if (key === "health.rssThresholdMb") return 1024;
              return undefined;
            }),
          },
        },
      ],
    }).compile();

    const ctrl = module.get<HealthController>(HealthController);
    const hs = module.get<HealthCheckService>(HealthCheckService);

    (hs.check as jest.Mock).mockImplementation(
      (indicators: Array<() => unknown>) => {
        return indicators[4]();
      },
    );

    const result = (await ctrl.check()) as {
      version: { status: string; version: string };
    };

    expect(result.version.version).toBe("0.2.4");
  });

  it("uses default heap threshold of 512 when config returns undefined", async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        { provide: HealthCheckService, useValue: { check: jest.fn() } },
        { provide: TypeOrmHealthIndicator, useValue: { pingCheck: jest.fn() } },
        {
          provide: MemoryHealthIndicator,
          useValue: { checkHeap: jest.fn(), checkRSS: jest.fn() },
        },
        { provide: DiskHealthIndicator, useValue: { checkStorage: jest.fn() } },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string) => {
              if (key === "version") return "1.0.0";
              return undefined; // both heap and rss thresholds undefined
            }),
          },
        },
      ],
    }).compile();

    const ctrl = module.get<HealthController>(HealthController);
    const hs = module.get<HealthCheckService>(HealthCheckService);
    const mem = module.get<MemoryHealthIndicator>(MemoryHealthIndicator);

    (hs.check as jest.Mock).mockImplementation(
      async (indicators: Array<() => Promise<unknown>>) => {
        await indicators[1](); // heap check
        await indicators[2](); // rss check
        return { status: "ok", info: {}, error: {}, details: {} };
      },
    );

    await ctrl.check();

    expect(mem.checkHeap).toHaveBeenCalledWith(
      "memory_heap",
      512 * 1024 * 1024,
    );
    expect(mem.checkRSS).toHaveBeenCalledWith("memory_rss", 1024 * 1024 * 1024);
  });
});
