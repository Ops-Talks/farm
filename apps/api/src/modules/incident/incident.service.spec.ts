// Import incident-update.entity before incident.entity so the circular
// reference between the two files resolves the IncidentStatus enum before
// the decorator in incident-update.entity.ts evaluates it.
import { IncidentUpdate } from "./entities/incident-update.entity";

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, BadRequestException } from "@nestjs/common";
import { IncidentService } from "./incident.service";
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "./entities/incident.entity";
import { Component } from "../catalog/entities/component.entity";
import { Environment } from "../environments/entities/environment.entity";
import { EventsGateway } from "../../common/events/events.gateway";

describe("IncidentService", () => {
  let service: IncidentService;
  let mockIncidentRepo: Record<string, jest.Mock>;
  let mockIncidentUpdateRepo: Record<string, jest.Mock>;
  let mockComponentRepo: Record<string, jest.Mock>;
  let mockEnvironmentRepo: Record<string, jest.Mock>;
  let mockEventsGateway: Record<string, jest.Mock>;

  const mockIncident: Partial<Incident> = {
    id: "incident-uuid-1",
    title: "Database connection pool exhaustion",
    description: "All connections saturated",
    severity: IncidentSeverity.P1,
    status: IncidentStatus.OPEN,
    commanderUserId: "user-uuid-1",
    organizationId: "org-uuid-1",
    resolvedAt: null as unknown as Date,
    affectedComponents: [],
    affectedEnvironments: [],
    updates: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockComponent: Partial<Component> = {
    id: "comp-uuid-1",
    name: "user-service",
  };

  const mockEnvironment: Partial<Environment> = {
    id: "env-uuid-1",
    name: "production",
  };

  const createQueryBuilderMock = () => {
    const qb: Record<string, jest.Mock> = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
    };
    return qb;
  };

  beforeEach(async () => {
    mockIncidentRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
      findBy: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(createQueryBuilderMock()),
    };

    mockIncidentUpdateRepo = {
      create: jest.fn(),
      save: jest.fn(),
    };

    mockComponentRepo = {
      findBy: jest.fn(),
    };

    mockEnvironmentRepo = {
      findBy: jest.fn(),
    };

    mockEventsGateway = {
      emitIncidentCreated: jest.fn(),
      emitIncidentStatusChanged: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentService,
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepo,
        },
        {
          provide: getRepositoryToken(IncidentUpdate),
          useValue: mockIncidentUpdateRepo,
        },
        {
          provide: getRepositoryToken(Component),
          useValue: mockComponentRepo,
        },
        {
          provide: getRepositoryToken(Environment),
          useValue: mockEnvironmentRepo,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
      ],
    }).compile();

    service = module.get<IncidentService>(IncidentService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("should create an incident with affected components and environments", async () => {
      const dto = {
        title: "Database outage",
        description: "Connection pool exhausted",
        severity: IncidentSeverity.P1,
        affectedComponentIds: ["comp-uuid-1"],
        affectedEnvironmentIds: ["env-uuid-1"],
      };

      const created = {
        ...mockIncident,
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        affectedComponents: [mockComponent],
        affectedEnvironments: [mockEnvironment],
      };

      mockIncidentRepo.create.mockReturnValue(created);
      mockComponentRepo.findBy.mockResolvedValue([mockComponent]);
      mockEnvironmentRepo.findBy.mockResolvedValue([mockEnvironment]);
      mockIncidentRepo.save.mockResolvedValue(created);

      const result = await service.create(dto, "org-uuid-1");

      expect(result).toEqual(created);
      expect(mockIncidentRepo.create).toHaveBeenCalledWith({
        title: dto.title,
        description: dto.description,
        severity: dto.severity,
        commanderUserId: undefined,
        organizationId: "org-uuid-1",
      });
      expect(mockComponentRepo.findBy).toHaveBeenCalled();
      expect(mockEnvironmentRepo.findBy).toHaveBeenCalled();
      expect(mockIncidentRepo.save).toHaveBeenCalledWith(created);
    });

    it("should create an incident without relations", async () => {
      const dto = {
        title: "Minor alert",
        severity: IncidentSeverity.P4,
      };

      const created = {
        ...mockIncident,
        title: dto.title,
        severity: dto.severity,
      };
      mockIncidentRepo.create.mockReturnValue(created);
      mockIncidentRepo.save.mockResolvedValue(created);

      const result = await service.create(dto);

      expect(result).toEqual(created);
      expect(mockComponentRepo.findBy).not.toHaveBeenCalled();
      expect(mockEnvironmentRepo.findBy).not.toHaveBeenCalled();
    });

    it("should emit WebSocket event on create", async () => {
      const dto = {
        title: "Service down",
        severity: IncidentSeverity.P1,
      };

      const saved = {
        ...mockIncident,
        id: "new-id",
        title: dto.title,
        severity: dto.severity,
      };
      mockIncidentRepo.create.mockReturnValue(saved);
      mockIncidentRepo.save.mockResolvedValue(saved);

      await service.create(dto);

      expect(mockEventsGateway.emitIncidentCreated).toHaveBeenCalledWith(
        expect.objectContaining({
          id: saved.id,
          title: saved.title,
          severity: saved.severity,
          status: saved.status,
        }),
      );
    });
  });

  describe("findAll", () => {
    it("should findAll with no filters", async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[mockIncident], 1]);
      mockIncidentRepo.createQueryBuilder.mockReturnValue(qb);

      const [data, total] = await service.findAll({});

      expect(data).toEqual([mockIncident]);
      expect(total).toBe(1);
      expect(qb.leftJoinAndSelect).toHaveBeenCalledTimes(2);
      expect(qb.orderBy).toHaveBeenCalledWith("incident.createdAt", "DESC");
      expect(qb.skip).toHaveBeenCalledWith(0);
      expect(qb.take).toHaveBeenCalledWith(20);
    });

    it("should findAll with severity filter", async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockIncidentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ severity: IncidentSeverity.P1 });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "incident.severity = :severity",
        { severity: IncidentSeverity.P1 },
      );
    });

    it("should findAll with organizationId filter", async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockIncidentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ organizationId: "org-uuid-1" });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "incident.organizationId = :organizationId",
        { organizationId: "org-uuid-1" },
      );
    });

    it("should findAll with componentId filter", async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockIncidentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ componentId: "comp-uuid-1" });

      expect(qb.andWhere).toHaveBeenCalledWith("component.id = :componentId", {
        componentId: "comp-uuid-1",
      });
    });

    it("should findAll with environmentId filter", async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockIncidentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ environmentId: "env-uuid-1" });

      expect(qb.andWhere).toHaveBeenCalledWith(
        "environment.id = :environmentId",
        { environmentId: "env-uuid-1" },
      );
    });

    it("should findAll with status filter", async () => {
      const qb = createQueryBuilderMock();
      qb.getManyAndCount.mockResolvedValue([[], 0]);
      mockIncidentRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll({ status: IncidentStatus.OPEN });

      expect(qb.andWhere).toHaveBeenCalledWith("incident.status = :status", {
        status: IncidentStatus.OPEN,
      });
    });
  });

  describe("findOne", () => {
    it("should findOne with relations", async () => {
      mockIncidentRepo.findOne.mockResolvedValue(mockIncident);

      const result = await service.findOne("incident-uuid-1");

      expect(result).toEqual(mockIncident);
      expect(mockIncidentRepo.findOne).toHaveBeenCalledWith({
        where: { id: "incident-uuid-1" },
        relations: {
          affectedComponents: true,
          affectedEnvironments: true,
          updates: true,
        },
      });
    });

    it("should throw NotFoundException when not found", async () => {
      mockIncidentRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update an incident and replace affected components", async () => {
      const existing = {
        ...mockIncident,
        affectedComponents: [mockComponent],
      };
      mockIncidentRepo.findOne.mockResolvedValue(existing);

      const newComponent = { id: "comp-uuid-2", name: "order-service" };
      mockComponentRepo.findBy.mockResolvedValue([newComponent]);

      const merged = {
        ...existing,
        title: "Updated title",
        affectedComponents: [newComponent],
      };
      mockIncidentRepo.merge.mockReturnValue(merged);
      mockIncidentRepo.save.mockResolvedValue(merged);

      const result = await service.update("incident-uuid-1", {
        title: "Updated title",
        affectedComponentIds: ["comp-uuid-2"],
      });

      expect(result.title).toBe("Updated title");
      expect(result.affectedComponents).toEqual([newComponent]);
      expect(mockIncidentRepo.save).toHaveBeenCalledWith(merged);
    });

    it("should update an incident and replace affected environments", async () => {
      const existing = {
        ...mockIncident,
        affectedEnvironments: [mockEnvironment],
      };
      mockIncidentRepo.findOne.mockResolvedValue(existing);

      const newEnvironment = { id: "env-uuid-2", name: "staging" };
      mockEnvironmentRepo.findBy.mockResolvedValue([newEnvironment]);

      const merged = {
        ...existing,
        title: "Updated title",
        affectedEnvironments: [newEnvironment],
      };
      mockIncidentRepo.merge.mockReturnValue(merged);
      mockIncidentRepo.save.mockResolvedValue(merged);

      const result = await service.update("incident-uuid-1", {
        title: "Updated title",
        affectedEnvironmentIds: ["env-uuid-2"],
      });

      expect(result.affectedEnvironments).toEqual([newEnvironment]);
      expect(mockEnvironmentRepo.findBy).toHaveBeenCalled();
      expect(mockIncidentRepo.save).toHaveBeenCalledWith(merged);
    });
  });

  describe("updateStatus", () => {
    it("should updateStatus from open to investigating (valid transition)", async () => {
      const incident = {
        ...mockIncident,
        status: IncidentStatus.OPEN,
      };
      mockIncidentRepo.findOne.mockResolvedValue(incident);
      mockIncidentRepo.save.mockResolvedValue(incident);

      const timelineEntry = {
        id: "update-uuid-1",
        incidentId: incident.id,
        message: 'Status changed from "open" to "investigating"',
        previousStatus: IncidentStatus.OPEN,
        newStatus: IncidentStatus.INVESTIGATING,
      };
      mockIncidentUpdateRepo.create.mockReturnValue(timelineEntry);
      mockIncidentUpdateRepo.save.mockResolvedValue(timelineEntry);

      const result = await service.updateStatus(
        "incident-uuid-1",
        { status: IncidentStatus.INVESTIGATING },
        "user-uuid-1",
      );

      expect(result.status).toBe(IncidentStatus.INVESTIGATING);
      expect(mockIncidentUpdateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          incidentId: "incident-uuid-1",
          authorId: "user-uuid-1",
          previousStatus: IncidentStatus.OPEN,
          newStatus: IncidentStatus.INVESTIGATING,
        }),
      );
    });

    it("should updateStatus to resolved and set resolvedAt", async () => {
      const incident = {
        ...mockIncident,
        status: IncidentStatus.IDENTIFIED,
      };
      mockIncidentRepo.findOne.mockResolvedValue(incident);
      mockIncidentRepo.save.mockResolvedValue(incident);

      const timelineEntry = {
        id: "update-uuid-2",
        incidentId: incident.id,
        previousStatus: IncidentStatus.IDENTIFIED,
        newStatus: IncidentStatus.RESOLVED,
      };
      mockIncidentUpdateRepo.create.mockReturnValue(timelineEntry);
      mockIncidentUpdateRepo.save.mockResolvedValue(timelineEntry);

      const result = await service.updateStatus("incident-uuid-1", {
        status: IncidentStatus.RESOLVED,
      });

      expect(result.status).toBe(IncidentStatus.RESOLVED);
      expect(result.resolvedAt).toBeInstanceOf(Date);
    });

    it("should throw BadRequestException for invalid transition (resolved -> open)", async () => {
      const incident = {
        ...mockIncident,
        status: IncidentStatus.RESOLVED,
      };
      mockIncidentRepo.findOne.mockResolvedValue(incident);

      await expect(
        service.updateStatus("incident-uuid-1", {
          status: IncidentStatus.OPEN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should throw BadRequestException when status is already the target", async () => {
      const incident = {
        ...mockIncident,
        status: IncidentStatus.OPEN,
      };
      mockIncidentRepo.findOne.mockResolvedValue(incident);

      await expect(
        service.updateStatus("incident-uuid-1", {
          status: IncidentStatus.OPEN,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it("should emit WebSocket event on status change", async () => {
      const incident = {
        ...mockIncident,
        status: IncidentStatus.OPEN,
      };
      mockIncidentRepo.findOne.mockResolvedValue(incident);
      mockIncidentRepo.save.mockResolvedValue(incident);

      const timelineEntry = { id: "update-uuid-3" };
      mockIncidentUpdateRepo.create.mockReturnValue(timelineEntry);
      mockIncidentUpdateRepo.save.mockResolvedValue(timelineEntry);

      await service.updateStatus("incident-uuid-1", {
        status: IncidentStatus.INVESTIGATING,
      });

      expect(mockEventsGateway.emitIncidentStatusChanged).toHaveBeenCalledWith(
        expect.objectContaining({
          id: incident.id,
          title: incident.title,
          previousStatus: IncidentStatus.OPEN,
          newStatus: IncidentStatus.INVESTIGATING,
        }),
      );
    });
  });

  describe("remove", () => {
    it("should remove an incident", async () => {
      mockIncidentRepo.findOne.mockResolvedValue(mockIncident);
      mockIncidentRepo.remove.mockResolvedValue(mockIncident);

      await service.remove("incident-uuid-1");

      expect(mockIncidentRepo.remove).toHaveBeenCalledWith(mockIncident);
    });
  });
});
