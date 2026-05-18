// Import incident-update.entity before incident.entity so the circular
// reference between the two files resolves the IncidentStatus enum before
// the decorator in incident-update.entity.ts evaluates it.
import "./entities/incident-update.entity";

import { Test, TestingModule } from "@nestjs/testing";
import { IncidentController } from "./incident.controller";
import { IncidentService } from "./incident.service";
import { IncidentUpdateService } from "./incident-update.service";
import { IncidentSeverity, IncidentStatus } from "./entities/incident.entity";
import { PaginatedResponseDto } from "../../common/dto";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { OrgRequiredGuard } from "../../common/guards/org-required.guard";

describe("IncidentController", () => {
  let controller: IncidentController;
  let incidentService: IncidentService;
  let incidentUpdateService: IncidentUpdateService;

  const mockIncident = {
    id: "incident-uuid-1",
    title: "Database outage",
    description: "Connection pool exhausted",
    severity: IncidentSeverity.P1,
    status: IncidentStatus.OPEN,
    commanderUserId: "user-uuid-1",
    organizationId: "org-uuid-1",
    resolvedAt: null,
    affectedComponents: [],
    affectedEnvironments: [],
    updates: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTimelineEntry = {
    id: "update-uuid-1",
    incidentId: "incident-uuid-1",
    authorId: "user-uuid-1",
    message: "Scaling replicas",
    previousStatus: null,
    newStatus: null,
    createdAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidentController],
      providers: [
        {
          provide: IncidentService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockIncident),
            findAll: jest.fn().mockResolvedValue([[mockIncident], 1]),
            findOne: jest.fn().mockResolvedValue(mockIncident),
            update: jest.fn().mockResolvedValue(mockIncident),
            updateStatus: jest.fn().mockResolvedValue({
              ...mockIncident,
              status: IncidentStatus.INVESTIGATING,
            }),
            remove: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: IncidentUpdateService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockTimelineEntry),
            findByIncident: jest.fn().mockResolvedValue([mockTimelineEntry]),
          },
        },
      ],
    })
      .overrideGuard(OrgRequiredGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<IncidentController>(IncidentController);
    incidentService = module.get<IncidentService>(IncidentService);
    incidentUpdateService = module.get<IncidentUpdateService>(
      IncidentUpdateService,
    );
  });

  it("should create an incident with org context", async () => {
    const dto = {
      title: "Database outage",
      severity: IncidentSeverity.P1,
    };
    const req = {
      user: { userId: "user-uuid-1" },
      organizationId: "org-uuid-1",
    };

    const result = await controller.create(req as any, dto);

    expect(result).toEqual(mockIncident);
    expect(incidentService.create).toHaveBeenCalledWith(dto, "org-uuid-1");
  });

  it("should list incidents with pagination", async () => {
    const query = { skip: 0, take: 20 };

    const result = await controller.findAll(query);

    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(incidentService.findAll).toHaveBeenCalledWith(query);
  });

  it("should get incident by ID", async () => {
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
    const result = await controller.findOne("incident-uuid-1", mockReq);

    expect(result).toEqual(mockIncident);
    expect(incidentService.findOne).toHaveBeenCalledWith(
      "incident-uuid-1",
      "org-uuid",
    );
  });

  it("should update incident", async () => {
    const dto = { title: "Updated title" };
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;

    const result = await controller.update("incident-uuid-1", dto, mockReq);

    expect(result).toEqual(mockIncident);
    expect(incidentService.update).toHaveBeenCalledWith(
      "incident-uuid-1",
      dto,
      "org-uuid",
    );
  });

  it("should update incident status with user context", async () => {
    const dto = { status: IncidentStatus.INVESTIGATING };
    const req = { user: { userId: "user-uuid-1" } };

    const result = await controller.updateStatus(
      req as any,
      "incident-uuid-1",
      dto,
    );

    expect(result.status).toBe(IncidentStatus.INVESTIGATING);
    expect(incidentService.updateStatus).toHaveBeenCalledWith(
      "incident-uuid-1",
      dto,
      "user-uuid-1",
    );
  });

  it("should delete incident", async () => {
    const mockReq = { organizationId: "org-uuid" } as RequestWithOrg;
    await controller.remove("incident-uuid-1", mockReq);

    expect(incidentService.remove).toHaveBeenCalledWith(
      "incident-uuid-1",
      "org-uuid",
    );
  });

  it("should create manual timeline entry", async () => {
    const dto = { message: "Scaling replicas" };
    const req = { user: { userId: "user-uuid-1" } };

    const result = await controller.createUpdate(
      req as any,
      "incident-uuid-1",
      dto,
    );

    expect(result).toEqual(mockTimelineEntry);
    expect(incidentUpdateService.create).toHaveBeenCalledWith(
      "incident-uuid-1",
      dto,
      "user-uuid-1",
    );
  });

  it("should get timeline", async () => {
    const result = await controller.getTimeline("incident-uuid-1");

    expect(result).toEqual([mockTimelineEntry]);
    expect(incidentUpdateService.findByIncident).toHaveBeenCalledWith(
      "incident-uuid-1",
    );
  });
});
