import { Test, TestingModule } from "@nestjs/testing";
import { AwsEcsExecutor, AwsEcsDeployConfig } from "./aws-ecs.executor";
import { AwsService } from "../aws/aws.service";

const mockAwsService = { deployToEcs: jest.fn() };

const BASE_CONFIG: AwsEcsDeployConfig = {
  engine: "aws-ecs",
  orgId: "org-123",
  cluster: "my-cluster",
  service: "my-service",
  image: "my-image:latest",
};

describe("AwsEcsExecutor", () => {
  let executor: AwsEcsExecutor;
  const logFn = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsEcsExecutor,
        { provide: AwsService, useValue: mockAwsService },
      ],
    }).compile();

    executor = module.get<AwsEcsExecutor>(AwsEcsExecutor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(executor).toBeDefined();
  });

  it("should return success when ECS deploy succeeds", async () => {
    mockAwsService.deployToEcs.mockResolvedValue({
      success: true,
      output: "ECS service updated",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(true);
    expect(result.output).toBe("ECS service updated");
    expect(logFn).toHaveBeenCalled();
    expect(mockAwsService.deployToEcs).toHaveBeenCalledWith("org-123", {
      cluster: "my-cluster",
      service: "my-service",
      image: "my-image:latest",
    });
  });

  it("should return failure when ECS deploy fails", async () => {
    mockAwsService.deployToEcs.mockResolvedValue({
      success: false,
      output: "Cluster not found",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
    expect(result.output).toBe("Cluster not found");
  });

  it("should return failure when AWS service is not available", async () => {
    const moduleNoAws: TestingModule = await Test.createTestingModule({
      providers: [AwsEcsExecutor],
    }).compile();
    const executorNoAws = moduleNoAws.get<AwsEcsExecutor>(AwsEcsExecutor);

    const result = await executorNoAws.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
    expect(result.output).toContain("not available");
    expect(logFn).toHaveBeenCalledWith(
      expect.stringContaining("not available"),
    );
  });
});
