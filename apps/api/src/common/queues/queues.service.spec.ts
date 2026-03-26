import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { getQueueToken } from "@nestjs/bullmq";
import { QueuesService } from "./queues.service";
import { QUEUE_NAMES } from "./queue-names";

describe("QueuesService", () => {
  let service: QueuesService;

  const mockCatalogQueue = {
    getJobCounts: jest.fn().mockResolvedValue({
      active: 1,
      completed: 10,
      failed: 2,
      delayed: 0,
      waiting: 3,
      paused: 0,
      prioritized: 0,
    }),
    isPaused: jest.fn().mockResolvedValue(false),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
  };

  const mockNotificationsQueue = {
    getJobCounts: jest.fn().mockResolvedValue({
      active: 0,
      completed: 5,
      failed: 0,
      delayed: 1,
      waiting: 0,
      paused: 0,
      prioritized: 0,
    }),
    isPaused: jest.fn().mockResolvedValue(false),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        {
          provide: getQueueToken(QUEUE_NAMES.CATALOG_DISCOVERY),
          useValue: mockCatalogQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.NOTIFICATIONS),
          useValue: mockNotificationsQueue,
        },
      ],
    }).compile();

    service = module.get<QueuesService>(QueuesService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("listQueues", () => {
    it("should return info for all registered queues", async () => {
      const result = await service.listQueues();

      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe(QUEUE_NAMES.CATALOG_DISCOVERY);
      expect(result[0]?.isPaused).toBe(false);
      expect(result[0]?.jobCounts.active).toBe(1);
      expect(result[0]?.jobCounts.completed).toBe(10);
      expect(result[1]?.name).toBe(QUEUE_NAMES.NOTIFICATIONS);
    });

    it("should handle queue errors gracefully", async () => {
      mockCatalogQueue.getJobCounts.mockRejectedValueOnce(
        new Error("Redis connection lost"),
      );

      const result = await service.listQueues();

      expect(result).toHaveLength(2);
      expect(result[0]?.jobCounts.active).toBe(0);
      expect(result[0]?.jobCounts.completed).toBe(0);
    });
  });

  describe("getQueueInfo", () => {
    it("should return info for a specific queue", async () => {
      const result = await service.getQueueInfo(QUEUE_NAMES.CATALOG_DISCOVERY);

      expect(result.name).toBe(QUEUE_NAMES.CATALOG_DISCOVERY);
      expect(result.isPaused).toBe(false);
      expect(result.jobCounts.failed).toBe(2);
    });

    it("should throw NotFoundException for unknown queue", async () => {
      await expect(service.getQueueInfo("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("listJobs", () => {
    it("should list jobs for a queue", async () => {
      const mockJob = {
        id: "1",
        name: "__default__",
        data: { url: "https://example.com" },
        returnvalue: 3,
        failedReason: undefined,
        attemptsMade: 1,
        progress: 100,
        timestamp: 1709913600000,
        processedOn: 1709913601000,
        finishedOn: 1709913602000,
        stacktrace: [],
        getState: jest.fn().mockResolvedValue("completed"),
      };

      mockCatalogQueue.getJobs.mockResolvedValueOnce([mockJob]);

      const result = await service.listJobs(QUEUE_NAMES.CATALOG_DISCOVERY);

      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("1");
      expect(result[0]?.status).toBe("completed");
      expect(result[0]?.data).toEqual({ url: "https://example.com" });
    });

    it("should pass status filter to getJobs", async () => {
      mockCatalogQueue.getJobs.mockResolvedValueOnce([]);

      await service.listJobs(QUEUE_NAMES.CATALOG_DISCOVERY, "failed");

      expect(mockCatalogQueue.getJobs).toHaveBeenCalledWith(["failed"], 0, 19);
    });

    it("should throw NotFoundException for unknown queue", async () => {
      await expect(service.listJobs("unknown")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getJob", () => {
    it("should return a single job", async () => {
      const mockJob = {
        id: "42",
        name: "__default__",
        data: { url: "https://example.com" },
        returnvalue: null,
        failedReason: "Connection refused",
        attemptsMade: 3,
        progress: 0,
        timestamp: 1709913600000,
        processedOn: undefined,
        finishedOn: undefined,
        stacktrace: ["Error: Connection refused"],
        getState: jest.fn().mockResolvedValue("failed"),
      };

      mockCatalogQueue.getJob.mockResolvedValueOnce(mockJob);

      const result = await service.getJob(QUEUE_NAMES.CATALOG_DISCOVERY, "42");

      expect(result.id).toBe("42");
      expect(result.status).toBe("failed");
      expect(result.failedReason).toBe("Connection refused");
    });

    it("should throw NotFoundException if job does not exist", async () => {
      mockCatalogQueue.getJob.mockResolvedValueOnce(null);

      await expect(
        service.getJob(QUEUE_NAMES.CATALOG_DISCOVERY, "999"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("retryJob", () => {
    it("should retry a failed job", async () => {
      const mockJob = {
        id: "42",
        getState: jest.fn().mockResolvedValue("failed"),
        retry: jest.fn().mockResolvedValue(undefined),
      };

      mockCatalogQueue.getJob.mockResolvedValueOnce(mockJob);

      await service.retryJob(QUEUE_NAMES.CATALOG_DISCOVERY, "42");

      expect(mockJob.retry).toHaveBeenCalledWith("failed");
    });

    it("should throw if job is not in failed state", async () => {
      const mockJob = {
        id: "42",
        getState: jest.fn().mockResolvedValue("completed"),
      };

      mockCatalogQueue.getJob.mockResolvedValueOnce(mockJob);

      await expect(
        service.retryJob(QUEUE_NAMES.CATALOG_DISCOVERY, "42"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw if job does not exist", async () => {
      mockCatalogQueue.getJob.mockResolvedValueOnce(null);

      await expect(
        service.retryJob(QUEUE_NAMES.CATALOG_DISCOVERY, "999"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("without queues (test mode)", () => {
    it("should return empty array when no queues are registered", async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [QueuesService],
      }).compile();

      const emptyService = module.get<QueuesService>(QueuesService);
      const result = await emptyService.listQueues();

      expect(result).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------
// QueuesService — additional branch coverage for ?? 0 fallbacks
// ---------------------------------------------------------------------------

describe("QueuesService — jobCounts ?? 0 fallback branches", () => {
  let service: QueuesService;
  let mockQueue: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockQueue = {
      getJobCounts: jest.fn().mockResolvedValue({}), // empty object → all counts use ?? 0
      isPaused: jest.fn().mockResolvedValue(true),
      getJobs: jest.fn().mockResolvedValue([]),
      getJob: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueuesService,
        {
          provide: getQueueToken(QUEUE_NAMES.CATALOG_DISCOVERY),
          useValue: mockQueue,
        },
      ],
    }).compile();

    service = module.get<QueuesService>(QueuesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("listQueues — missing job count keys use ?? 0 default", () => {
    it("should default all job counts to 0 when getJobCounts returns empty object", async () => {
      const result = await service.listQueues();

      expect(result[0].jobCounts.active).toBe(0);
      expect(result[0].jobCounts.completed).toBe(0);
      expect(result[0].jobCounts.failed).toBe(0);
      expect(result[0].jobCounts.delayed).toBe(0);
      expect(result[0].jobCounts.waiting).toBe(0);
      expect(result[0].jobCounts.paused).toBe(0);
      expect(result[0].jobCounts.prioritized).toBe(0);
    });
  });

  describe("getQueueInfo — missing job count keys use ?? 0 default", () => {
    it("should default all job counts to 0 when getJobCounts returns empty object", async () => {
      const result = await service.getQueueInfo(QUEUE_NAMES.CATALOG_DISCOVERY);

      expect(result.jobCounts.active).toBe(0);
      expect(result.jobCounts.completed).toBe(0);
      expect(result.jobCounts.failed).toBe(0);
      expect(result.jobCounts.delayed).toBe(0);
      expect(result.jobCounts.waiting).toBe(0);
      expect(result.jobCounts.paused).toBe(0);
      expect(result.jobCounts.prioritized).toBe(0);
    });
  });
});
