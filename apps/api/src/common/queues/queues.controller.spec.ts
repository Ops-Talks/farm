import { Test, TestingModule } from "@nestjs/testing";
import { QueuesController } from "./queues.controller";
import { QueuesService } from "./queues.service";

describe("QueuesController", () => {
  let controller: QueuesController;

  const mockQueuesService = {
    listQueues: jest.fn().mockResolvedValue([
      {
        name: "catalog-discovery",
        isPaused: false,
        jobCounts: {
          active: 0,
          completed: 5,
          failed: 1,
          delayed: 0,
          waiting: 0,
          paused: 0,
          prioritized: 0,
        },
      },
    ]),
    getQueueInfo: jest.fn().mockResolvedValue({
      name: "catalog-discovery",
      isPaused: false,
      jobCounts: {
        active: 0,
        completed: 5,
        failed: 1,
        delayed: 0,
        waiting: 0,
        paused: 0,
        prioritized: 0,
      },
    }),
    listJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn().mockResolvedValue({
      id: "1",
      queueName: "catalog-discovery",
      name: "__default__",
      status: "completed",
      data: {},
      attemptsMade: 1,
      progress: 100,
      timestamp: 1709913600000,
    }),
    retryJob: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [QueuesController],
      providers: [
        {
          provide: QueuesService,
          useValue: mockQueuesService,
        },
      ],
    }).compile();

    controller = module.get<QueuesController>(QueuesController);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listQueues", () => {
    it("should return all queues", async () => {
      const result = await controller.listQueues();

      expect(result).toHaveLength(1);
      expect(mockQueuesService.listQueues).toHaveBeenCalled();
    });
  });

  describe("getQueue", () => {
    it("should return queue info by name", async () => {
      const result = await controller.getQueue("catalog-discovery");

      expect(result.name).toBe("catalog-discovery");
      expect(mockQueuesService.getQueueInfo).toHaveBeenCalledWith(
        "catalog-discovery",
      );
    });
  });

  describe("listJobs", () => {
    it("should list jobs with default pagination", async () => {
      await controller.listJobs("catalog-discovery");

      expect(mockQueuesService.listJobs).toHaveBeenCalledWith(
        "catalog-discovery",
        undefined,
        0,
        20,
      );
    });

    it("should pass status filter and pagination params", async () => {
      await controller.listJobs("catalog-discovery", "failed", "10", "50");

      expect(mockQueuesService.listJobs).toHaveBeenCalledWith(
        "catalog-discovery",
        "failed",
        10,
        50,
      );
    });
  });

  describe("getJob", () => {
    it("should return job detail", async () => {
      const result = await controller.getJob("catalog-discovery", "1");

      expect(result.id).toBe("1");
      expect(mockQueuesService.getJob).toHaveBeenCalledWith(
        "catalog-discovery",
        "1",
      );
    });
  });

  describe("retryJob", () => {
    it("should call retryJob on service", async () => {
      await controller.retryJob("catalog-discovery", "42");

      expect(mockQueuesService.retryJob).toHaveBeenCalledWith(
        "catalog-discovery",
        "42",
      );
    });
  });
});
