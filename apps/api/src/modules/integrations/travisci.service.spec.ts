import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { TravisCIService, TravisCIBuild } from "./travisci.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";

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
const API_TOKEN = "my-travis-token";
const CREDENTIAL_PAYLOAD = JSON.stringify({ apiToken: API_TOKEN });

const SAMPLE_BUILD: TravisCIBuild = {
  id: 1234,
  number: "42",
  state: "passed",
  started_at: "2024-01-01T00:00:00Z",
  finished_at: "2024-01-01T00:05:00Z",
  repository: { slug: "owner/repo" },
};

describe("TravisCIService", () => {
  let service: TravisCIService;
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
        TravisCIService,
        {
          provide: HttpService,
          useValue: { get: mockHttpGet, post: mockHttpPost },
        },
        {
          provide: IntegrationCredentialService,
          useValue: mockCredentialService,
        },
      ],
    }).compile();

    service = module.get<TravisCIService>(TravisCIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // listBuilds
  // ---------------------------------------------------------------------------
  describe("listBuilds", () => {
    it("should list all builds when no repoSlug is given", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.TRAVISCI,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ builds: [SAMPLE_BUILD] })),
      );

      const result = await service.listBuilds(ORG_ID);

      expect(result).toEqual([SAMPLE_BUILD]);
      const [url, opts] = mockHttpGet.mock.calls[0] as [
        string,
        { headers: Record<string, string> },
      ];
      expect(url).toBe("https://api.travis-ci.com/builds");
      expect(opts.headers.Authorization).toBe(`token ${API_TOKEN}`);
    });

    it("should use the repo-scoped endpoint when repoSlug is given", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.TRAVISCI,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ builds: [SAMPLE_BUILD] })),
      );

      await service.listBuilds(ORG_ID, "owner/repo");

      const [url] = mockHttpGet.mock.calls[0] as [string];
      expect(url).toContain("owner%2Frepo");
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.listBuilds(ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // restartBuild
  // ---------------------------------------------------------------------------
  describe("restartBuild", () => {
    it("should trigger a build restart and return the response", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.TRAVISCI,
      });
      const restartResponse = { "@type": "pending", build: {} };
      mockHttpPost.mockReturnValue(of(makeAxiosResponse(restartResponse)));

      const result = await service.restartBuild(ORG_ID, "1234");

      expect(result).toEqual(restartResponse);
      const [url] = mockHttpPost.mock.calls[0] as [string];
      expect(url).toBe("https://api.travis-ci.com/build/1234/restart");
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.restartBuild(ORG_ID, "1234")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
