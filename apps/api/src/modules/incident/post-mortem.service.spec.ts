// Import incident-update.entity before incident.entity so the circular
// reference between the two files resolves the IncidentStatus enum before
// the decorator in incident-update.entity.ts evaluates it.
import "./entities/incident-update.entity";

import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException, ConflictException } from "@nestjs/common";
import { PostMortemService } from "./post-mortem.service";
import { PostMortem } from "./entities/post-mortem.entity";
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "./entities/incident.entity";

describe("PostMortemService", () => {
  let service: PostMortemService;
  let mockPostMortemRepo: Record<string, jest.Mock>;
  let mockIncidentRepo: Record<string, jest.Mock>;

  const mockIncident: Partial<Incident> = {
    id: "incident-uuid-1",
    title: "Database outage",
    severity: IncidentSeverity.P1,
    status: IncidentStatus.RESOLVED,
  };

  const mockPostMortem: Partial<PostMortem> = {
    id: "pm-uuid-1",
    incidentId: "incident-uuid-1",
    rootCause: "Connection pool max size was set to 5 instead of 50",
    contributingFactors: ["Missing monitoring", "No autoscaling"],
    actionItems: [
      { title: "Add connection pool alerts", assignee: "john", done: false },
    ],
    body: "## Summary\nFull post-mortem write-up",
    approvedBy: null as unknown as string,
    approvedAt: null as unknown as Date,
    organizationId: "org-uuid-1",
    incident: mockIncident as Incident,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    mockPostMortemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      merge: jest.fn(),
    };

    mockIncidentRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostMortemService,
        {
          provide: getRepositoryToken(PostMortem),
          useValue: mockPostMortemRepo,
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepo,
        },
      ],
    }).compile();

    service = module.get<PostMortemService>(PostMortemService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("should create a post-mortem", async () => {
      const dto = {
        incidentId: "incident-uuid-1",
        rootCause: "Connection pool misconfiguration",
        contributingFactors: ["Missing monitoring"],
        actionItems: [{ title: "Add alerts", assignee: "john", done: false }],
        body: "## Summary",
      };

      mockIncidentRepo.findOne.mockResolvedValue(mockIncident);
      mockPostMortemRepo.findOne.mockResolvedValue(null);
      mockPostMortemRepo.create.mockReturnValue(mockPostMortem);
      mockPostMortemRepo.save.mockResolvedValue(mockPostMortem);

      const result = await service.create(dto, "org-uuid-1");

      expect(result).toEqual(mockPostMortem);
      expect(mockIncidentRepo.findOne).toHaveBeenCalledWith({
        where: { id: dto.incidentId },
      });
      expect(mockPostMortemRepo.create).toHaveBeenCalledWith({
        ...dto,
        organizationId: "org-uuid-1",
      });
      expect(mockPostMortemRepo.save).toHaveBeenCalled();
    });

    it("should throw ConflictException when post-mortem already exists for incident", async () => {
      const dto = {
        incidentId: "incident-uuid-1",
        rootCause: "Duplicate attempt",
      };

      mockIncidentRepo.findOne.mockResolvedValue(mockIncident);
      mockPostMortemRepo.findOne.mockResolvedValue(mockPostMortem);

      await expect(service.create(dto)).rejects.toThrow(ConflictException);
    });

    it("should throw NotFoundException when incident does not exist", async () => {
      const dto = {
        incidentId: "nonexistent",
        rootCause: "Unknown",
      };

      mockIncidentRepo.findOne.mockResolvedValue(null);

      await expect(service.create(dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe("findOne", () => {
    it("should findOne", async () => {
      mockPostMortemRepo.findOne.mockResolvedValue(mockPostMortem);

      const result = await service.findOne("pm-uuid-1");

      expect(result).toEqual(mockPostMortem);
      expect(mockPostMortemRepo.findOne).toHaveBeenCalledWith({
        where: { id: "pm-uuid-1" },
        relations: ["incident"],
      });
    });

    it("should throw NotFoundException when not found", async () => {
      mockPostMortemRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("findByIncident", () => {
    it("should findByIncident", async () => {
      mockPostMortemRepo.findOne.mockResolvedValue(mockPostMortem);

      const result = await service.findByIncident("incident-uuid-1");

      expect(result).toEqual(mockPostMortem);
      expect(mockPostMortemRepo.findOne).toHaveBeenCalledWith({
        where: { incidentId: "incident-uuid-1" },
        relations: ["incident"],
      });
    });

    it("should return null when no post-mortem exists for the incident", async () => {
      mockPostMortemRepo.findOne.mockResolvedValue(null);

      const result = await service.findByIncident("incident-uuid-1");

      expect(result).toBeNull();
    });
  });

  describe("update", () => {
    it("should update a post-mortem", async () => {
      const updated = {
        ...mockPostMortem,
        rootCause: "Updated root cause",
      };

      // findOne is called internally by update()
      mockPostMortemRepo.findOne.mockResolvedValue(mockPostMortem);
      mockPostMortemRepo.merge.mockReturnValue(updated);
      mockPostMortemRepo.save.mockResolvedValue(updated);

      const result = await service.update("pm-uuid-1", {
        rootCause: "Updated root cause",
      });

      expect(result.rootCause).toBe("Updated root cause");
      expect(mockPostMortemRepo.merge).toHaveBeenCalledWith(mockPostMortem, {
        rootCause: "Updated root cause",
      });
      expect(mockPostMortemRepo.save).toHaveBeenCalledWith(updated);
    });
  });

  describe("approve", () => {
    it("should approve a post-mortem (sets approvedBy and approvedAt)", async () => {
      const postMortem = { ...mockPostMortem };
      mockPostMortemRepo.findOne.mockResolvedValue(postMortem);

      const approved = {
        ...postMortem,
        approvedBy: "admin-uuid-1",
        approvedAt: expect.any(Date) as Date,
      };
      mockPostMortemRepo.save.mockResolvedValue(approved);

      const result = await service.approve("pm-uuid-1", "admin-uuid-1");

      expect(result.approvedBy).toBe("admin-uuid-1");
      expect(mockPostMortemRepo.save).toHaveBeenCalled();
    });
  });
});
