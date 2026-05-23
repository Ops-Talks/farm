import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { HttpService } from "@nestjs/axios";
import { of } from "rxjs";
import { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { ArgoCDService, ArgoCDApplication } from "./argocd.service";
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
const ARGOCD_URL = "https://argocd.example.com";
const TOKEN = "my-argocd-token";

const CREDENTIAL_PAYLOAD = JSON.stringify({ url: ARGOCD_URL, token: TOKEN });

const SAMPLE_APP: ArgoCDApplication = {
  metadata: { name: "my-app", namespace: "argocd" },
  status: { health: { status: "Healthy" } },
};

describe("ArgoCDService", () => {
  let service: ArgoCDService;
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
        ArgoCDService,
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

    service = module.get<ArgoCDService>(ArgoCDService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // listApplications
  // ---------------------------------------------------------------------------
  describe("listApplications", () => {
    it("should return applications when credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc-data",
        type: IntegrationType.ARGOCD,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ items: [SAMPLE_APP] })),
      );

      const result = await service.listApplications(ORG_ID);

      expect(result).toEqual([SAMPLE_APP]);
      expect(mockHttpGet).toHaveBeenCalledWith(
        `${ARGOCD_URL}/api/v1/applications`,
        expect.objectContaining({
          headers: { Authorization: `Bearer ${TOKEN}` },
        }),
      );
    });

    it("should return empty array when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      const result = await service.listApplications(ORG_ID);

      expect(result).toEqual([]);
      expect(mockHttpGet).not.toHaveBeenCalled();
    });

    it("should return empty array when response items field is null", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc-data",
        type: IntegrationType.ARGOCD,
      });
      mockHttpGet.mockReturnValue(
        of(makeAxiosResponse({ items: null as unknown as never[] })),
      );

      const result = await service.listApplications(ORG_ID);
      expect(result).toEqual([]);
    });
  });

  // ---------------------------------------------------------------------------
  // getApplication
  // ---------------------------------------------------------------------------
  describe("getApplication", () => {
    it("should return a single application by name", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc-data",
        type: IntegrationType.ARGOCD,
      });
      mockHttpGet.mockReturnValue(of(makeAxiosResponse(SAMPLE_APP)));

      const result = await service.getApplication(ORG_ID, "my-app");

      expect(result).toEqual(SAMPLE_APP);
      expect(mockHttpGet).toHaveBeenCalledWith(
        `${ARGOCD_URL}/api/v1/applications/my-app`,
        expect.anything(),
      );
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.getApplication(ORG_ID, "my-app")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // syncApplication
  // ---------------------------------------------------------------------------
  describe("syncApplication", () => {
    it("should trigger a sync and return the response", async () => {
      mockCredentialService.findByType.mockResolvedValue({
        encryptedValue: "enc-data",
        type: IntegrationType.ARGOCD,
      });
      const syncResponse = { operation: { sync: {} } };
      mockHttpPost.mockReturnValue(of(makeAxiosResponse(syncResponse)));

      const result = await service.syncApplication(ORG_ID, "my-app");

      expect(result).toEqual(syncResponse);
      expect(mockHttpPost).toHaveBeenCalledWith(
        `${ARGOCD_URL}/api/v1/applications/my-app/sync`,
        {},
        expect.objectContaining({
          headers: { Authorization: `Bearer ${TOKEN}` },
        }),
      );
    });

    it("should throw NotFoundException when no credential is configured", async () => {
      mockCredentialService.findByType.mockResolvedValue(null);

      await expect(service.syncApplication(ORG_ID, "my-app")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
