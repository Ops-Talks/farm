import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import * as crypto from "crypto";
import { CircleCIService, CircleCIPipeline } from "./circleci.service";
import { IntegrationCredentialService } from "./integration-credential.service";
import { CircuitBreakerService } from "../../common/circuit-breaker/circuit-breaker.service";
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
const API_TOKEN = "my-circleci-token";
const CREDENTIAL_PAYLOAD = JSON.stringify({ apiToken: API_TOKEN });

const SAMPLE_PIPELINE: CircleCIPipeline = {
  id: "pipeline-uuid-1",
  project_slug: "gh/org/repo",
  state: "created",
  created_at: "2024-01-01T00:00:00Z",
  vcs: { origin_repository_url: "https://github.com/org/repo" },
};

describe("CircleCIService", () => {
  let service: CircleCIService;
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
        CircleCIService,
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

    service = module.get<CircleCIService>(CircleCIService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // listPipelines
  // ---------------------------------------------------------------------------
  describe("listPipelines", () => {
    it("should return all pipelines when no vcsUrl filter is given", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.CIRCLECI,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ items: [SAMPLE_PIPELINE] })),
      );

      const result = await service.listPipelines(ORG_ID);

      expect(result).toEqual([SAMPLE_PIPELINE]);
      expect(mockHttpGet).toHaveBeenCalledWith(
        "https://circleci.com/api/v2/pipeline",
        expect.objectContaining({
          headers: { "x-circleci-token": API_TOKEN },
        }),
      );
    });

    it("should filter pipelines by vcsUrl when provided", async () => {
      const otherPipeline: CircleCIPipeline = {
        ...SAMPLE_PIPELINE,
        id: "pipeline-uuid-2",
        vcs: { origin_repository_url: "https://github.com/org/other" },
      };
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.CIRCLECI,
      });
      mockHttpGet.mockReturnValue(
        of(
          makeAxiosResponse({
            items: [SAMPLE_PIPELINE, otherPipeline],
          }),
        ),
      );

      const result = await service.listPipelines(
        ORG_ID,
        "https://github.com/org/repo",
      );

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("pipeline-uuid-1");
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.listPipelines(ORG_ID)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // triggerPipeline
  // ---------------------------------------------------------------------------
  describe("triggerPipeline", () => {
    it("should trigger a pipeline and return the response", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.CIRCLECI,
      });
      mockHttpPost.mockReturnValue(of(makeAxiosResponse(SAMPLE_PIPELINE)));

      const result = await service.triggerPipeline(
        ORG_ID,
        "gh/org/repo",
        "main",
      );

      expect(result).toEqual(SAMPLE_PIPELINE);
      expect(mockHttpPost).toHaveBeenCalledWith(
        "https://circleci.com/api/v2/project/gh/org/repo/pipeline",
        { branch: "main" },
        expect.anything(),
      );
    });

    it("should not include branch in body when branch is not provided", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc",
        type: IntegrationType.CIRCLECI,
      });
      mockHttpPost.mockReturnValue(of(makeAxiosResponse(SAMPLE_PIPELINE)));

      await service.triggerPipeline(ORG_ID, "gh/org/repo");

      const postArgs = mockHttpPost.mock.calls[0] as [
        string,
        Record<string, unknown>,
        unknown,
      ];
      expect(postArgs[1]["branch"]).toBeUndefined();
    });
  });

  // ---------------------------------------------------------------------------
  // verifyWebhookSignature
  // ---------------------------------------------------------------------------
  describe("verifyWebhookSignature", () => {
    it("should return true for a valid signature", () => {
      const secret = "webhook-secret";
      const payload = '{"type":"workflow-completed"}';
      const expectedSig = crypto
        .createHmac("sha256", secret)
        .update(payload, "utf8")
        .digest("hex");

      expect(service.verifyWebhookSignature(payload, expectedSig, secret)).toBe(
        true,
      );
    });

    it("should return false for an invalid signature", () => {
      expect(
        service.verifyWebhookSignature(
          '{"type":"workflow-completed"}',
          "badsignature",
          "secret",
        ),
      ).toBe(false);
    });
  });
});
