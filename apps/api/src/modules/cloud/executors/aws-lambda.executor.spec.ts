import { Test, TestingModule } from "@nestjs/testing";
import {
  AwsLambdaExecutor,
  AwsLambdaDeployConfig,
} from "./aws-lambda.executor";
import { AwsService } from "../aws/aws.service";

const mockAwsService = { deployToLambda: jest.fn() };

const BASE_CONFIG: AwsLambdaDeployConfig = {
  engine: "aws-lambda",
  orgId: "org-123",
  functionName: "my-lambda",
  imageUri: "123.dkr.ecr.us-east-1.amazonaws.com/my-image:latest",
};

describe("AwsLambdaExecutor", () => {
  let executor: AwsLambdaExecutor;
  const logFn = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AwsLambdaExecutor,
        { provide: AwsService, useValue: mockAwsService },
      ],
    }).compile();

    executor = module.get<AwsLambdaExecutor>(AwsLambdaExecutor);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(executor).toBeDefined();
  });

  it("should return success when Lambda deploy succeeds", async () => {
    mockAwsService.deployToLambda.mockResolvedValue({
      success: true,
      output: "Lambda function updated",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(true);
    expect(logFn).toHaveBeenCalled();
    expect(mockAwsService.deployToLambda).toHaveBeenCalledWith("org-123", {
      functionName: "my-lambda",
      imageUri: BASE_CONFIG.imageUri,
      s3Bucket: undefined,
      s3Key: undefined,
    });
  });

  it("should return failure when Lambda deploy fails", async () => {
    mockAwsService.deployToLambda.mockResolvedValue({
      success: false,
      output: "Function not found",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
  });

  it("should return failure when AWS service is not available", async () => {
    const moduleNoAws: TestingModule = await Test.createTestingModule({
      providers: [AwsLambdaExecutor],
    }).compile();
    const executorNoAws = moduleNoAws.get<AwsLambdaExecutor>(AwsLambdaExecutor);

    const result = await executorNoAws.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
    expect(result.output).toContain("not available");
  });
});
