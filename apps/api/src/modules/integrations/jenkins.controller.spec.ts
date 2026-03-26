import { Test, TestingModule } from "@nestjs/testing";
import { JenkinsController } from "./jenkins.controller";
import { JenkinsService } from "./jenkins.service";

describe("JenkinsController", () => {
  let controller: JenkinsController;
  let jenkinsService: {
    listJobs: jest.Mock;
    getBuildHistory: jest.Mock;
    triggerBuild: jest.Mock;
  };

  const mockJob = {
    name: "my-job",
    url: "http://jenkins/job/my-job",
    lastBuild: null,
  };
  const mockBuild = {
    number: 1,
    result: "SUCCESS",
    timestamp: 1700000000,
    duration: 5000,
    url: "http://jenkins/job/my-job/1/",
  };
  const mockRequest = { organizationId: "org-uuid-1" };

  beforeEach(async () => {
    jenkinsService = {
      listJobs: jest.fn().mockResolvedValue([mockJob]),
      getBuildHistory: jest.fn().mockResolvedValue([mockBuild]),
      triggerBuild: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [JenkinsController],
      providers: [{ provide: JenkinsService, useValue: jenkinsService }],
    }).compile();

    controller = module.get<JenkinsController>(JenkinsController);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("listJobs", () => {
    it("should return jobs using orgId from request when no query param is given", async () => {
      const result = await controller.listJobs(undefined, mockRequest as never);
      expect(result).toEqual([mockJob]);
      expect(jenkinsService.listJobs).toHaveBeenCalledWith("org-uuid-1");
    });

    it("should use explicit orgId query param over request org", async () => {
      const result = await controller.listJobs(
        "explicit-org",
        mockRequest as never,
      );
      expect(result).toEqual([mockJob]);
      expect(jenkinsService.listJobs).toHaveBeenCalledWith("explicit-org");
    });

    it("should fall back to empty string when neither orgId nor request org exist", async () => {
      await controller.listJobs(undefined, undefined);
      expect(jenkinsService.listJobs).toHaveBeenCalledWith("");
    });
  });

  describe("getBuildHistory", () => {
    it("should return builds using defaults when no limit or orgId provided", async () => {
      const result = await controller.getBuildHistory(
        "my-job",
        undefined,
        undefined,
        mockRequest as never,
      );
      expect(result).toEqual([mockBuild]);
      expect(jenkinsService.getBuildHistory).toHaveBeenCalledWith(
        "org-uuid-1",
        "my-job",
        10,
      );
    });

    it("should parse limit when provided as string", async () => {
      await controller.getBuildHistory(
        "my-job",
        "5",
        "org-2",
        mockRequest as never,
      );
      expect(jenkinsService.getBuildHistory).toHaveBeenCalledWith(
        "org-2",
        "my-job",
        5,
      );
    });

    it("should fall back to empty string when neither orgId param nor req org exist", async () => {
      await controller.getBuildHistory(
        "my-job",
        undefined,
        undefined,
        undefined,
      );
      expect(jenkinsService.getBuildHistory).toHaveBeenCalledWith(
        "",
        "my-job",
        10,
      );
    });
  });

  describe("triggerBuild", () => {
    it("should trigger a build using request org when no orgId is given", async () => {
      await controller.triggerBuild("my-job", undefined, mockRequest as never);
      expect(jenkinsService.triggerBuild).toHaveBeenCalledWith(
        "org-uuid-1",
        "my-job",
      );
    });

    it("should use explicit orgId over request org", async () => {
      await controller.triggerBuild(
        "my-job",
        "explicit-org",
        mockRequest as never,
      );
      expect(jenkinsService.triggerBuild).toHaveBeenCalledWith(
        "explicit-org",
        "my-job",
      );
    });

    it("should fall back to empty string when request is absent", async () => {
      await controller.triggerBuild("my-job", undefined, undefined);
      expect(jenkinsService.triggerBuild).toHaveBeenCalledWith("", "my-job");
    });
  });
});
