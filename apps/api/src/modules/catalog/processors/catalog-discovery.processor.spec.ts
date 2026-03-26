import { Test, TestingModule } from "@nestjs/testing";
import {
  CatalogDiscoveryProcessor,
  CatalogDiscoveryJobData,
} from "./catalog-discovery.processor";
import { CatalogService } from "../catalog.service";
import { Job } from "bullmq";

const mockCatalogService = {
  discoverFromLocation: jest.fn(),
};

describe("CatalogDiscoveryProcessor", () => {
  let processor: CatalogDiscoveryProcessor;
  let service: typeof mockCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CatalogDiscoveryProcessor,
        { provide: CatalogService, useValue: mockCatalogService },
      ],
    }).compile();

    processor = module.get<CatalogDiscoveryProcessor>(
      CatalogDiscoveryProcessor,
    );
    service = module.get(CatalogService);
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(processor).toBeDefined();
  });

  it("should process a discovery job and return discovered count", async () => {
    service.discoverFromLocation.mockResolvedValue(3);
    const job = {
      id: "job-1",
      data: { url: "https://github.com/example/repo" },
    } as unknown as Job<CatalogDiscoveryJobData>;

    const result = await processor.process(job);

    expect(result).toBe(3);
    expect(service.discoverFromLocation).toHaveBeenCalledWith(
      "https://github.com/example/repo",
    );
  });

  it("should re-throw errors from the service", async () => {
    service.discoverFromLocation.mockRejectedValue(new Error("Clone failed"));
    const job = {
      id: "job-2",
      data: { url: "https://github.com/bad/repo" },
    } as unknown as Job<CatalogDiscoveryJobData>;

    await expect(processor.process(job)).rejects.toThrow("Clone failed");
  });

  it("should re-throw non-Error exceptions from the service", async () => {
    service.discoverFromLocation.mockRejectedValue("plain string error");
    const job = {
      id: "job-3",
      data: { url: "https://github.com/bad/repo" },
    } as unknown as Job<CatalogDiscoveryJobData>;

    await expect(processor.process(job)).rejects.toBe("plain string error");
  });
});
