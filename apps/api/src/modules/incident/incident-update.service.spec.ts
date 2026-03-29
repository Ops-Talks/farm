import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { IncidentUpdateService } from "./incident-update.service";
import { IncidentUpdate } from "./entities/incident-update.entity";
import {
  Incident,
  IncidentSeverity,
  IncidentStatus,
} from "./entities/incident.entity";

describe("IncidentUpdateService", () => {
  let service: IncidentUpdateService;
  let mockIncidentUpdateRepo: Record<string, jest.Mock>;
  let mockIncidentRepo: Record<string, jest.Mock>;

  const mockIncident: Partial<Incident> = {
    id: "incident-uuid-1",
    title: "Database outage",
    severity: IncidentSeverity.P1,
    status: IncidentStatus.OPEN,
  };

  const mockUpdate: Partial<IncidentUpdate> = {
    id: "update-uuid-1",
    incidentId: "incident-uuid-1",
    authorId: "user-uuid-1",
    message: "Scaling database replicas from 2 to 5",
    previousStatus: null as unknown as IncidentStatus,
    newStatus: null as unknown as IncidentStatus,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    mockIncidentUpdateRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    };

    mockIncidentRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IncidentUpdateService,
        {
          provide: getRepositoryToken(IncidentUpdate),
          useValue: mockIncidentUpdateRepo,
        },
        {
          provide: getRepositoryToken(Incident),
          useValue: mockIncidentRepo,
        },
      ],
    }).compile();

    service = module.get<IncidentUpdateService>(IncidentUpdateService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("create", () => {
    it("should create a manual timeline entry", async () => {
      mockIncidentRepo.findOne.mockResolvedValue(mockIncident);
      mockIncidentUpdateRepo.create.mockReturnValue(mockUpdate);
      mockIncidentUpdateRepo.save.mockResolvedValue(mockUpdate);

      const result = await service.create(
        "incident-uuid-1",
        { message: "Scaling database replicas from 2 to 5" },
        "user-uuid-1",
      );

      expect(result).toEqual(mockUpdate);
      expect(mockIncidentRepo.findOne).toHaveBeenCalledWith({
        where: { id: "incident-uuid-1" },
      });
      expect(mockIncidentUpdateRepo.create).toHaveBeenCalledWith({
        incidentId: "incident-uuid-1",
        authorId: "user-uuid-1",
        message: "Scaling database replicas from 2 to 5",
      });
      expect(mockIncidentUpdateRepo.save).toHaveBeenCalledWith(mockUpdate);
    });

    it("should throw NotFoundException when incident does not exist", async () => {
      mockIncidentRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create("nonexistent", { message: "test" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByIncident", () => {
    it("should find updates by incident ordered by createdAt ASC", async () => {
      const updates = [
        { ...mockUpdate, id: "update-1", createdAt: new Date("2024-01-01") },
        { ...mockUpdate, id: "update-2", createdAt: new Date("2024-01-02") },
      ];
      mockIncidentUpdateRepo.find.mockResolvedValue(updates);

      const result = await service.findByIncident("incident-uuid-1");

      expect(result).toEqual(updates);
      expect(result).toHaveLength(2);
      expect(mockIncidentUpdateRepo.find).toHaveBeenCalledWith({
        where: { incidentId: "incident-uuid-1" },
        order: { createdAt: "ASC" },
      });
    });
  });
});
