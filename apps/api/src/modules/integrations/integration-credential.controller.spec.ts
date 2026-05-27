import { Test, TestingModule } from "@nestjs/testing";
import { IntegrationCredentialController } from "./integration-credential.controller";
import { IntegrationCredentialService } from "./integration-credential.service";
import { IntegrationType } from "./entities/integration-credential.entity";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";
import { PermissionGuard } from "../../common/guards/permission.guard";

describe("IntegrationCredentialController", () => {
  let controller: IntegrationCredentialController;
  let credentialService: {
    create: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    update: jest.Mock;
    remove: jest.Mock;
  };

  const mockCredential = {
    id: "cred-uuid-1",
    orgId: "org-uuid-1",
    type: IntegrationType.JENKINS,
    name: "my-jenkins",
    encryptedValue: "encrypted",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRequest = { organizationId: "org-uuid-1" };

  beforeEach(async () => {
    credentialService = {
      create: jest.fn().mockResolvedValue(mockCredential),
      findAll: jest.fn().mockResolvedValue([mockCredential]),
      findOne: jest.fn().mockResolvedValue(mockCredential),
      update: jest.fn().mockResolvedValue(mockCredential),
      remove: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationCredentialController],
      providers: [
        { provide: IntegrationCredentialService, useValue: credentialService },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IntegrationCredentialController>(
      IntegrationCredentialController,
    );
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("create", () => {
    it("should create a credential and return it", async () => {
      const dto = {
        orgId: "org-uuid-1",
        type: IntegrationType.JENKINS,
        name: "my-jenkins",
        plainValue: "secret",
      };
      const result = await controller.create(dto);
      expect(result).toEqual(mockCredential);
      expect(credentialService.create).toHaveBeenCalledWith(dto);
    });
  });

  describe("findAll", () => {
    it("should return credentials using request org when no orgId query param", async () => {
      const result = await controller.findAll(undefined, mockRequest);
      expect(result).toEqual([mockCredential]);
      expect(credentialService.findAll).toHaveBeenCalledWith("org-uuid-1");
    });

    it("should use explicit orgId query param", async () => {
      const result = await controller.findAll("org-explicit", mockRequest);
      expect(result).toEqual([mockCredential]);
      expect(credentialService.findAll).toHaveBeenCalledWith("org-explicit");
    });

    it("should pass undefined when neither orgId nor request are provided", async () => {
      await controller.findAll(undefined, undefined);
      expect(credentialService.findAll).toHaveBeenCalledWith(undefined);
    });
  });

  describe("findOne", () => {
    it("should return a single credential by id", async () => {
      const result = await controller.findOne("cred-uuid-1", mockRequest);
      expect(result).toEqual(mockCredential);
      expect(credentialService.findOne).toHaveBeenCalledWith(
        "cred-uuid-1",
        "org-uuid-1",
      );
    });
  });

  describe("update", () => {
    it("should update a credential and return the updated entity", async () => {
      const dto = { name: "updated-jenkins" };
      const result = await controller.update("cred-uuid-1", dto, mockRequest);
      expect(result).toEqual(mockCredential);
      expect(credentialService.update).toHaveBeenCalledWith(
        "cred-uuid-1",
        "org-uuid-1",
        dto,
      );
    });
  });

  describe("remove", () => {
    it("should delete a credential", async () => {
      await controller.remove("cred-uuid-1", mockRequest);
      expect(credentialService.remove).toHaveBeenCalledWith(
        "cred-uuid-1",
        "org-uuid-1",
      );
    });
  });
});
