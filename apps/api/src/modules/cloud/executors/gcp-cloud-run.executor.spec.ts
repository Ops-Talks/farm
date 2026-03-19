import { Test, TestingModule } from "@nestjs/testing";
import {
  GcpCloudRunExecutor,
  GcpCloudRunDeployConfig,
} from "./gcp-cloud-run.executor";
import { GcpService } from "../gcp/gcp.service";

const mockGcpService = { deployToCloudRun: jest.fn() };

const BASE_CONFIG: GcpCloudRunDeployConfig = {
  engine: "gcp-cloud-run",
  orgId: "org-123",
  service: "my-service",
  region: "us-central1",
  image: "gcr.io/my-project/my-image:latest",
};

describe("GcpCloudRunExecutor", () => {
  let executor: GcpCloudRunExecutor;
  const logFn = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GcpCloudRunExecutor,
        { provide: GcpService, useValue: mockGcpService },
      ],
    }).compile();

    executor = module.get<GcpCloudRunExecutor>(GcpCloudRunExecutor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(executor).toBeDefined();
  });

  it("should return success when Cloud Run deploy succeeds", async () => {
    mockGcpService.deployToCloudRun.mockResolvedValue({
      success: true,
      output: "Cloud Run service updated",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(true);
    expect(logFn).toHaveBeenCalled();
    expect(mockGcpService.deployToCloudRun).toHaveBeenCalledWith("org-123", {
      service: "my-service",
      region: "us-central1",
      image: "gcr.io/my-project/my-image:latest",
      projectId: undefined,
    });
  });

  it("should return failure when Cloud Run deploy fails", async () => {
    mockGcpService.deployToCloudRun.mockResolvedValue({
      success: false,
      output: "Service not found",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
  });

  it("should return failure when GCP service is not available", async () => {
    const moduleNoGcp: TestingModule = await Test.createTestingModule({
      providers: [GcpCloudRunExecutor],
    }).compile();
    const executorNoGcp =
      moduleNoGcp.get<GcpCloudRunExecutor>(GcpCloudRunExecutor);

    const result = await executorNoGcp.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
    expect(result.output).toContain("not available");
  });
});
