import { Test, TestingModule } from "@nestjs/testing";
import { AuditLogController } from "../audit-log.controller";
import { AuditLogService } from "../audit-log.service";
import { AuditLog } from "../entities/audit-log.entity";
import type { RequestWithOrg } from "../../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../../common/guards/org-required.guard";
import { PermissionGuard } from "../../../common/guards/permission.guard";

describe("AuditLogController", () => {
  let controller: AuditLogController;
  let service: AuditLogService;

  const mockAuditLogs: AuditLog[] = [
    {
      id: "audit-uuid-1",
      action: "CREATE",
      resourceType: "Component",
      resourceId: "comp-uuid-1",
      actorId: "user-uuid-1",
      actorUsername: "jane_doe",
      payload: { name: "my-service" },
      organizationId: "org-uuid-1",
      createdAt: new Date("2024-01-02T00:00:00Z"),
    },
    {
      id: "audit-uuid-2",
      action: "UPDATE",
      resourceType: "Component",
      resourceId: "comp-uuid-1",
      actorId: "user-uuid-2",
      actorUsername: "john_doe",
      payload: { lifecycle: "production" },
      organizationId: "org-uuid-1",
      createdAt: new Date("2024-01-01T00:00:00Z"),
    },
  ];

  const mockAuditLogService = {
    findAll: jest.fn().mockResolvedValue(mockAuditLogs),
    log: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogController],
      providers: [
        {
          provide: AuditLogService,
          useValue: mockAuditLogService,
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<AuditLogController>(AuditLogController);
    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    it("should return audit log entries with no filters", async () => {
      const req = { organizationId: "org-uuid-1" } as RequestWithOrg;
      const result = await controller.findAll({}, req);

      expect(result).toEqual(mockAuditLogs);
      expect(service.findAll).toHaveBeenCalledWith({
        resourceType: undefined,
        resourceId: undefined,
        actorId: undefined,
        limit: undefined,
        organizationId: "org-uuid-1",
      });
    });

    it("should pass all query filters to the service", async () => {
      const req = { organizationId: "org-uuid-1" } as RequestWithOrg;
      const query = {
        resourceType: "Component",
        resourceId: "comp-uuid-1",
        actorId: "user-uuid-1",
        limit: 50,
      };

      await controller.findAll(query, req);

      expect(service.findAll).toHaveBeenCalledWith({
        resourceType: "Component",
        resourceId: "comp-uuid-1",
        actorId: "user-uuid-1",
        limit: 50,
        organizationId: "org-uuid-1",
      });
    });

    it("should convert string limit to number", async () => {
      const req = { organizationId: "org-uuid-1" } as RequestWithOrg;
      const query = { limit: "25" as unknown as number };

      await controller.findAll(query, req);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25 }),
      );
    });

    it("should pass undefined limit when limit is not provided", async () => {
      const req = { organizationId: undefined } as RequestWithOrg;
      await controller.findAll({}, req);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ limit: undefined }),
      );
    });

    it("should pass organizationId from request", async () => {
      const req = { organizationId: "different-org" } as RequestWithOrg;
      await controller.findAll({}, req);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: "different-org" }),
      );
    });

    it("should handle undefined organizationId in request", async () => {
      const req = { organizationId: undefined } as RequestWithOrg;
      await controller.findAll({}, req);

      expect(service.findAll).toHaveBeenCalledWith(
        expect.objectContaining({ organizationId: undefined }),
      );
    });

    it("should pass only resourceType when it is the sole filter", async () => {
      const req = { organizationId: "org-uuid-1" } as RequestWithOrg;
      await controller.findAll({ resourceType: "Team" }, req);

      expect(service.findAll).toHaveBeenCalledWith({
        resourceType: "Team",
        resourceId: undefined,
        actorId: undefined,
        limit: undefined,
        organizationId: "org-uuid-1",
      });
    });
  });
});
