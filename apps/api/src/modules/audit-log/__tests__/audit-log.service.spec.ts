import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { AuditLogService } from "../audit-log.service";
import { AuditLog } from "../entities/audit-log.entity";
import { CreateAuditLogDto } from "../dto/create-audit-log.dto";
import { EventsGateway } from "../../../common/events/events.gateway";
import { FarmEvent } from "../../../common/events/events.interfaces";

describe("AuditLogService", () => {
  let service: AuditLogService;
  let repo: Record<string, jest.Mock>;
  let mockEventsGateway: { server: { emit: jest.Mock } };

  const mockEntry: CreateAuditLogDto = {
    action: "CREATE",
    resourceType: "Component",
    resourceId: "comp-uuid-1",
    actorId: "user-uuid-1",
    actorUsername: "jane_doe",
    payload: { name: "my-service" },
  };

  const mockAuditLog: AuditLog = {
    id: "audit-uuid-1",
    action: "CREATE",
    resourceType: "Component",
    resourceId: "comp-uuid-1",
    actorId: "user-uuid-1",
    actorUsername: "jane_doe",
    payload: { name: "my-service" },
    createdAt: new Date("2024-01-01T00:00:00Z"),
  };

  beforeEach(async () => {
    repo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockEventsGateway = {
      server: { emit: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        { provide: getRepositoryToken(AuditLog), useValue: repo },
        { provide: EventsGateway, useValue: mockEventsGateway },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
  });

  afterEach(() => jest.clearAllMocks());

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("log", () => {
    it("should save and return the audit log entity", async () => {
      repo.create.mockReturnValue(mockAuditLog);
      repo.save.mockResolvedValue(mockAuditLog);

      const result = await service.log(mockEntry);

      expect(repo.create).toHaveBeenCalledWith(mockEntry);
      expect(repo.save).toHaveBeenCalledWith(mockAuditLog);
      expect(result).toEqual(mockAuditLog);
    });

    it("should emit AUDIT_LOG_CREATED event after saving", async () => {
      repo.create.mockReturnValue(mockAuditLog);
      repo.save.mockResolvedValue(mockAuditLog);

      await service.log(mockEntry);

      expect(mockEventsGateway.server.emit).toHaveBeenCalledWith(
        FarmEvent.AUDIT_LOG_CREATED,
        mockAuditLog,
      );
    });

    it("should not throw when eventsGateway is not provided", async () => {
      repo.create.mockReturnValue(mockAuditLog);
      repo.save.mockResolvedValue(mockAuditLog);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AuditLogService,
          { provide: getRepositoryToken(AuditLog), useValue: repo },
        ],
      }).compile();

      const serviceWithoutGateway =
        module.get<AuditLogService>(AuditLogService);
      await expect(serviceWithoutGateway.log(mockEntry)).resolves.toEqual(
        mockAuditLog,
      );
    });
  });

  describe("findAll", () => {
    it("should use default limit of 100 and no where clause when called with no options", async () => {
      repo.find.mockResolvedValue([mockAuditLog]);

      const result = await service.findAll();

      expect(repo.find).toHaveBeenCalledWith({
        where: {},
        order: { createdAt: "DESC" },
        take: 100,
      });
      expect(result).toEqual([mockAuditLog]);
    });

    it("should apply resourceType, resourceId, actorId, and limit when all options are provided", async () => {
      repo.find.mockResolvedValue([mockAuditLog]);

      const result = await service.findAll({
        resourceType: "Component",
        resourceId: "comp-uuid-1",
        actorId: "user-uuid-1",
        limit: 10,
      });

      expect(repo.find).toHaveBeenCalledWith({
        where: {
          resourceType: "Component",
          resourceId: "comp-uuid-1",
          actorId: "user-uuid-1",
        },
        order: { createdAt: "DESC" },
        take: 10,
      });
      expect(result).toEqual([mockAuditLog]);
    });

    it("should apply only provided filters and leave others out of where clause", async () => {
      repo.find.mockResolvedValue([mockAuditLog]);

      await service.findAll({ resourceType: "Team" });

      expect(repo.find).toHaveBeenCalledWith({
        where: { resourceType: "Team" },
        order: { createdAt: "DESC" },
        take: 100,
      });
    });
  });
});
