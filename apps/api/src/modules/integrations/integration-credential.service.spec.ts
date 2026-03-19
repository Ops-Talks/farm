import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { NotFoundException } from "@nestjs/common";
import { IntegrationCredentialService } from "./integration-credential.service";
import {
  IntegrationCredential,
  IntegrationType,
} from "./entities/integration-credential.entity";
import { CreateIntegrationCredentialDto } from "./dto/create-integration-credential.dto";
import { UpdateIntegrationCredentialDto } from "./dto/update-integration-credential.dto";

describe("IntegrationCredentialService", () => {
  let service: IntegrationCredentialService;
  let mockRepo: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  const ORG_ID = "550e8400-e29b-41d4-a716-446655440100";

  function buildCredential(
    overrides: Partial<IntegrationCredential> = {},
  ): IntegrationCredential {
    return {
      id: "cred-uuid-1",
      orgId: ORG_ID,
      type: IntegrationType.ARGOCD,
      name: "production-argocd",
      encryptedValue: "encrypted-stub",
      metadata: null,
      createdAt: new Date("2024-01-01"),
      updatedAt: new Date("2024-01-01"),
      ...overrides,
    };
  }

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IntegrationCredentialService,
        {
          provide: getRepositoryToken(IntegrationCredential),
          useValue: mockRepo,
        },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "auth.jwtSecret")
                return "test-secret-key-for-unit-tests-32b";
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get<IntegrationCredentialService>(
      IntegrationCredentialService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // ---------------------------------------------------------------------------
  // Encryption / Decryption
  // ---------------------------------------------------------------------------
  describe("encrypt / decrypt", () => {
    it("should encrypt and decrypt a plain value correctly", () => {
      const plain =
        '{"token":"my-api-token","url":"https://argocd.example.com"}';
      const encrypted = service.encrypt(plain);
      expect(encrypted).not.toBe(plain);
      const decrypted = service.decrypt(encrypted);
      expect(decrypted).toBe(plain);
    });

    it("should produce different ciphertext for the same plaintext each time (random IV)", () => {
      const plain = "same-secret";
      const enc1 = service.encrypt(plain);
      const enc2 = service.encrypt(plain);
      expect(enc1).not.toBe(enc2);
    });
  });

  // ---------------------------------------------------------------------------
  // create
  // ---------------------------------------------------------------------------
  describe("create", () => {
    it("should encrypt the plainValue and save the credential", async () => {
      const dto: CreateIntegrationCredentialDto = {
        orgId: ORG_ID,
        type: IntegrationType.ARGOCD,
        name: "production-argocd",
        plainValue: '{"token":"abc123"}',
      };

      const entity = buildCredential();
      mockRepo.create.mockReturnValue(entity);
      mockRepo.save.mockResolvedValue(entity);

      const result = await service.create(dto);

      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          name: dto.name,
          type: dto.type,
          orgId: ORG_ID,
        }),
      );
      // Ensure the encrypted value is not the plain value.
      const createCalls = mockRepo.create.mock.calls as Array<
        [{ encryptedValue: string }]
      >;
      const createArg = createCalls[0][0];
      expect(createArg.encryptedValue).not.toBe(dto.plainValue);
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual(entity);
    });
  });

  // ---------------------------------------------------------------------------
  // findAll
  // ---------------------------------------------------------------------------
  describe("findAll", () => {
    it("should return all credentials filtered by orgId", async () => {
      const creds = [buildCredential()];
      mockRepo.find.mockResolvedValue(creds);

      const result = await service.findAll(ORG_ID);

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: ORG_ID } }),
      );
      expect(result).toEqual(creds);
    });

    it("should return all credentials when orgId is undefined", async () => {
      const creds = [buildCredential()];
      mockRepo.find.mockResolvedValue(creds);

      const result = await service.findAll(undefined);

      expect(mockRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
      expect(result).toEqual(creds);
    });
  });

  // ---------------------------------------------------------------------------
  // findOne
  // ---------------------------------------------------------------------------
  describe("findOne", () => {
    it("should return a credential when found", async () => {
      const cred = buildCredential();
      mockRepo.findOne.mockResolvedValue(cred);

      const result = await service.findOne("cred-uuid-1", ORG_ID);
      expect(result).toEqual(cred);
    });

    it("should throw NotFoundException when credential is not found", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ---------------------------------------------------------------------------
  // findByType
  // ---------------------------------------------------------------------------
  describe("findByType", () => {
    it("should return the first credential of the given type", async () => {
      const cred = buildCredential();
      mockRepo.findOne.mockResolvedValue(cred);

      const result = await service.findByType(ORG_ID, IntegrationType.ARGOCD);
      expect(result).toEqual(cred);
    });

    it("should return null when no credential of the given type exists", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const result = await service.findByType(ORG_ID, IntegrationType.CIRCLECI);
      expect(result).toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // update
  // ---------------------------------------------------------------------------
  describe("update", () => {
    it("should update the credential name", async () => {
      const cred = buildCredential();
      mockRepo.findOne.mockResolvedValue(cred);
      mockRepo.save.mockResolvedValue({ ...cred, name: "updated-name" });

      const dto: UpdateIntegrationCredentialDto = { name: "updated-name" };
      const result = await service.update("cred-uuid-1", ORG_ID, dto);

      expect(mockRepo.save).toHaveBeenCalled();
      expect(result.name).toBe("updated-name");
    });

    it("should re-encrypt when plainValue is provided", async () => {
      const cred = buildCredential();
      mockRepo.findOne.mockResolvedValue(cred);
      mockRepo.save.mockImplementation((c: IntegrationCredential) =>
        Promise.resolve(c),
      );

      const dto: UpdateIntegrationCredentialDto = {
        plainValue: '{"token":"new-token"}',
      };
      await service.update("cred-uuid-1", ORG_ID, dto);

      const saveCalls = mockRepo.save.mock.calls as Array<
        [IntegrationCredential]
      >;
      const savedArg = saveCalls[0][0];
      expect(savedArg.encryptedValue).not.toBe("encrypted-stub");
      expect(savedArg.encryptedValue).not.toBe(dto.plainValue);
    });
  });

  // ---------------------------------------------------------------------------
  // remove
  // ---------------------------------------------------------------------------
  describe("remove", () => {
    it("should remove the credential", async () => {
      const cred = buildCredential();
      mockRepo.findOne.mockResolvedValue(cred);
      mockRepo.remove.mockResolvedValue(undefined);

      await service.remove("cred-uuid-1", ORG_ID);

      expect(mockRepo.remove).toHaveBeenCalledWith(cred);
    });

    it("should throw NotFoundException when credential does not exist", async () => {
      mockRepo.findOne.mockResolvedValue(null);

      await expect(service.remove("unknown-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
