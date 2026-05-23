import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { JenkinsService, JenkinsJob, JenkinsBuild } from "./jenkins.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";

function makeAxiosResponse<T>(data: T): AxiosResponse<T> {
  return {
    data,
    status: 200,
    statusText: "OK",
    headers: {},
    config: {} as InternalAxiosRequestConfig,
  };
}

const ORG_ID = "org-uuid-1";
const JENKINS_URL = "https://jenkins.example.com";
const USER = "admin";
const API_TOKEN = "my-jenkins-token";
const CREDENTIAL_PAYLOAD = JSON.stringify({
  url: JENKINS_URL,
  user: USER,
  apiToken: API_TOKEN,
});

const EXPECTED_AUTH =
  "Basic " + Buffer.from(`${USER}:${API_TOKEN}`).toString("base64");

const SAMPLE_JOB: JenkinsJob = {
  name: "my-job",
  url: `${JENKINS_URL}/job/my-job`,
  color: "blue",
  lastBuild: {
    number: 42,
    result: "SUCCESS",
    timestamp: 1700000000000,
    duration: 30000,
  },
};

const SAMPLE_BUILD: JenkinsBuild = {
  number: 42,
  result: "SUCCESS",
  timestamp: 1700000000000,
  duration: 30000,
};

const CRUMB_RESPONSE = { crumbRequestField: "Jenkins-Crumb", crumb: "abc123" };

describe("JenkinsService", () => {
  let service: JenkinsService;
  let mockHttpGet: jest.Mock;
  let mockHttpPost: jest.Mock;
  let mockCredentialService: {
    findByType: jest.Mock;
    decrypt: jest.Mock;
  };

  beforeEach(async () => {
    mockHttpGet = jest.fn();
    mockHttpPost = jest.fn();
    mockCredentialService = {
      findByType: jest.fn(),
      decrypt: jest.fn().mockReturnValue(CREDENTIAL_PAYLOAD),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JenkinsService,
        {
          provide: HttpService,
          useValue: { get: mockHttpGet, post: mockHttpPost },
        },
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
        {
          provide: CircuitBreakerService,
          useValue: { fire: jest.fn((_, fn: () => unknown) => fn()) },
        },
      ],
    }).compile();

    service = module.get<JenkinsService>(JenkinsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // listJobs
  // ---------------------------------------------------------------------------
  describe("listJobs", () => {
    it("should return jobs using Basic auth", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.JENKINS,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ jobs: [SAMPLE_JOB] })),
      );

      const result = await service.listJobs(ORG_ID);

      expect(result).toEqual([SAMPLE_JOB]);
      const [url, opts] = mockHttpGet.mock.calls[0] as [
        string,
        { headers: Record<string, string> },
      ];
      expect(url).toContain("/api/json");
      expect(opts.headers.Authorization).toBe(EXPECTED_AUTH);
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.listJobs(ORG_ID)).rejects.toThrow(NotFoundException);
    });

    it("should return empty array when response jobs field is null", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.JENKINS,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ jobs: null as unknown as never[] })),
      );

      const result = await service.listJobs(ORG_ID);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getBuildHistory
  // ---------------------------------------------------------------------------
  describe("getBuildHistory", () => {
    it("should return builds for a job", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.JENKINS,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ builds: [SAMPLE_BUILD] })),
      );

      const result = await service.getBuildHistory(ORG_ID, "my-job");

      expect(result).toEqual([SAMPLE_BUILD]);
      const [url] = mockHttpGet.mock.calls[0] as [string];
      expect(url).toContain("/job/my-job/api/json");
    });

    it("should limit the number of builds by the limit parameter", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.JENKINS,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ builds: [SAMPLE_BUILD] })),
      );

      await service.getBuildHistory(ORG_ID, "my-job", 5);

      const [url] = mockHttpGet.mock.calls[0] as [string];
      expect(url).toContain("{0,5}");
    });

    it("should return empty array when response builds field is null", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.JENKINS,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ builds: null as unknown as never[] })),
      );

      const result = await service.getBuildHistory(ORG_ID, "my-job");
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // triggerBuild
  // ---------------------------------------------------------------------------
  describe("triggerBuild", () => {
    it("should fetch crumb and trigger build", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.JENKINS,
      });
      // First GET: crumb endpoint
      mockHttpGet.mockReturnValue(of(makeAxiosResponse(CRUMB_RESPONSE)));
      mockHttpPost.mockReturnValue(of(makeAxiosResponse(null)));

      await service.triggerBuild(ORG_ID, "my-job");

      expect(mockHttpGet).toHaveBeenCalledWith(
        `${JENKINS_URL}/crumbIssuer/api/json`,
        expect.anything(),
      );
      const postArgs = mockHttpPost.mock.calls[0] as [
        string,
        null,
        { headers: Record<string, string> },
      ];
      expect(postArgs[0]).toBe(`${JENKINS_URL}/job/my-job/build`);
      expect(postArgs[2].headers[CRUMB_RESPONSE.crumbRequestField]).toBe(
        CRUMB_RESPONSE.crumb,
      );
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.triggerBuild(ORG_ID, "my-job")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
