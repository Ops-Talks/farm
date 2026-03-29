// Import incident-update.entity before incident.entity so the circular
// reference between the two files resolves the IncidentStatus enum before
// the decorator in incident-update.entity.ts evaluates it.
import "./entities/incident-update.entity";

import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException } from "@nestjs/common";
import { PostMortemController } from "./post-mortem.controller";
import { PostMortemService } from "./post-mortem.service";

describe("PostMortemController", () => {
  let controller: PostMortemController;
  let postMortemService: PostMortemService;

  const mockPostMortem = {
    id: "pm-uuid-1",
    incidentId: "incident-uuid-1",
    rootCause: "Connection pool misconfiguration",
    contributingFactors: ["Missing monitoring"],
    actionItems: [{ title: "Add alerts", assignee: "john", done: false }],
    body: "## Summary",
    approvedBy: null as string | null,
    approvedAt: null as Date | null,
    organizationId: "org-uuid-1",
    incident: { id: "incident-uuid-1", title: "Database outage" },
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PostMortemController],
      providers: [
        {
          provide: PostMortemService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockPostMortem),
            findOne: jest.fn().mockResolvedValue(mockPostMortem),
            findByIncident: jest.fn().mockResolvedValue(mockPostMortem),
            update: jest.fn().mockResolvedValue({
              ...mockPostMortem,
              rootCause: "Updated root cause",
            }),
            approve: jest.fn().mockResolvedValue({
              ...mockPostMortem,
              approvedBy: "user-uuid-1",
              approvedAt: new Date(),
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<PostMortemController>(PostMortemController);
    postMortemService = module.get<PostMortemService>(PostMortemService);
  });

  it("should create a post-mortem with org context", async () => {
    const dto = {
      incidentId: "incident-uuid-1",
      rootCause: "Connection pool misconfiguration",
    };
    const req = { user: { userId: "user-uuid-1" }, organizationId: "org-uuid-1" };

    const result = await controller.create(req as any, dto);

    expect(result).toEqual(mockPostMortem);
    expect(postMortemService.create).toHaveBeenCalledWith(dto, "org-uuid-1");
  });

  it("should get post-mortem by ID", async () => {
    const result = await controller.findOne("pm-uuid-1");

    expect(result).toEqual(mockPostMortem);
    expect(postMortemService.findOne).toHaveBeenCalledWith("pm-uuid-1");
  });

  it("should get post-mortem by incident ID", async () => {
    const result = await controller.findByIncident("incident-uuid-1");

    expect(result).toEqual(mockPostMortem);
    expect(postMortemService.findByIncident).toHaveBeenCalledWith(
      "incident-uuid-1",
    );
  });

  it("should throw 404 when no post-mortem exists for incident", async () => {
    jest.spyOn(postMortemService, "findByIncident").mockResolvedValue(null);

    await expect(controller.findByIncident("incident-uuid-1")).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should update a post-mortem", async () => {
    const dto = { rootCause: "Updated root cause" };

    const result = await controller.update("pm-uuid-1", dto);

    expect(result.rootCause).toBe("Updated root cause");
    expect(postMortemService.update).toHaveBeenCalledWith("pm-uuid-1", dto);
  });

  it("should approve a post-mortem with user context", async () => {
    const req = { user: { userId: "user-uuid-1" } };

    const result = await controller.approve(req as any, "pm-uuid-1");

    expect(result.approvedBy).toBe("user-uuid-1");
    expect(result.approvedAt).toBeDefined();
    expect(postMortemService.approve).toHaveBeenCalledWith(
      "pm-uuid-1",
      "user-uuid-1",
    );
  });
});
