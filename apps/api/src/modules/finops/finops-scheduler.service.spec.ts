import { Test, TestingModule } from "@nestjs/testing";
import { getQueueToken } from "@nestjs/bullmq";
import { FinOpsScheduler } from "./finops-scheduler.service";
import { QUEUE_NAMES } from "../../common/queues/queue-names";

describe("FinOpsScheduler", () => {
  let scheduler: FinOpsScheduler;
  let mockQueue: { add: jest.Mock };

  beforeEach(async () => {
    mockQueue = { add: jest.fn().mockResolvedValue({}) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FinOpsScheduler,
        {
          provide: getQueueToken(QUEUE_NAMES.COST_SYNC),
          useValue: mockQueue,
        },
      ],
    }).compile();

    scheduler = module.get<FinOpsScheduler>(FinOpsScheduler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("scheduleCostSync()", () => {
    it("enqueues a sync job on the cost-sync queue", async () => {
      await scheduler.scheduleCostSync();

      expect(mockQueue.add).toHaveBeenCalledTimes(1);
      expect(mockQueue.add).toHaveBeenCalledWith("sync", {});
    });

    it("enqueues a new job on each call", async () => {
      await scheduler.scheduleCostSync();
      await scheduler.scheduleCostSync();

      expect(mockQueue.add).toHaveBeenCalledTimes(2);
    });
  });
});
