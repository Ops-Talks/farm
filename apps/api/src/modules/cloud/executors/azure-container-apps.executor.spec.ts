import { Test, TestingModule } from "@nestjs/testing";
import {
  AzureContainerAppsExecutor,
  AzureContainerAppsDeployConfig,
} from "./azure-container-apps.executor";
import { AzureService } from "../azure/azure.service";

const mockAzureService = { deployToContainerApps: jest.fn() };

const BASE_CONFIG: AzureContainerAppsDeployConfig = {
  engine: "azure-container-apps",
  orgId: "org-123",
  resourceGroup: "my-rg",
  appName: "my-app",
  image: "my-registry.azurecr.io/my-image:latest",
};

describe("AzureContainerAppsExecutor", () => {
  let executor: AzureContainerAppsExecutor;
  const logFn = jest.fn();

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AzureContainerAppsExecutor,
        { provide: AzureService, useValue: mockAzureService },
      ],
    }).compile();

    executor = module.get<AzureContainerAppsExecutor>(
      AzureContainerAppsExecutor,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(executor).toBeDefined();
  });

  it("should return success when Container Apps deploy succeeds", async () => {
    mockAzureService.deployToContainerApps.mockResolvedValue({
      success: true,
      output: "Container App updated",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(true);
    expect(logFn).toHaveBeenCalled();
    expect(mockAzureService.deployToContainerApps).toHaveBeenCalledWith(
      "org-123",
      {
        resourceGroup: "my-rg",
        appName: "my-app",
        image: "my-registry.azurecr.io/my-image:latest",
      },
    );
  });

  it("should return failure when Container Apps deploy fails", async () => {
    mockAzureService.deployToContainerApps.mockResolvedValue({
      success: false,
      output: "App not found",
    });

    const result = await executor.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
  });

  it("should return failure when Azure service is not available", async () => {
    const moduleNoAzure: TestingModule = await Test.createTestingModule({
      providers: [AzureContainerAppsExecutor],
    }).compile();
    const executorNoAzure = moduleNoAzure.get<AzureContainerAppsExecutor>(
      AzureContainerAppsExecutor,
    );

    const result = await executorNoAzure.execute(BASE_CONFIG, logFn);

    expect(result.success).toBe(false);
    expect(result.output).toContain("not available");
  });
});
