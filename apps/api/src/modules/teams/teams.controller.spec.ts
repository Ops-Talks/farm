import { Test, TestingModule } from "@nestjs/testing";
import { TeamsController } from "./teams.controller";
import { TeamsService } from "./teams.service";
import { TeamType } from "./entities/team.entity";
import { PaginatedResponseDto } from "../../common/dto";

describe("TeamsController", () => {
  let controller: TeamsController;
  let service: TeamsService;

  const mockTeam = {
    id: "team-uuid-1",
    name: "platform-team",
    displayName: "Platform Engineering",
    description: "Platform team",
    type: TeamType.PLATFORM,
    contactEmail: "platform@example.com",
    slackChannel: "#platform",
    metadata: null,
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser = {
    id: "user-uuid-1",
    username: "john_doe",
    email: "john@example.com",
    displayName: "John Doe",
    roles: ["admin"],
  };

  const mockComponent = {
    id: "comp-uuid-1",
    name: "user-service",
    owner: "platform-team",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TeamsController],
      providers: [
        {
          provide: TeamsService,
          useValue: {
            create: jest.fn().mockResolvedValue(mockTeam),
            findAll: jest.fn().mockResolvedValue([[mockTeam], 1]),
            findOne: jest.fn().mockResolvedValue(mockTeam),
            update: jest.fn().mockResolvedValue(mockTeam),
            remove: jest.fn().mockResolvedValue(undefined),
            addMember: jest
              .fn()
              .mockResolvedValue({ ...mockTeam, members: [mockUser] }),
            removeMember: jest.fn().mockResolvedValue(mockTeam),
            getMembers: jest.fn().mockResolvedValue([mockUser]),
            getComponents: jest.fn().mockResolvedValue([mockComponent]),
          },
        },
      ],
    }).compile();

    controller = module.get<TeamsController>(TeamsController);
    service = module.get<TeamsService>(TeamsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should create a team", async () => {
    const result = await controller.create({
      name: "platform-team",
      displayName: "Platform Engineering",
      type: TeamType.PLATFORM,
    });
    expect(result).toEqual(mockTeam);
    expect(service.create).toHaveBeenCalled();
  });

  it("should return all teams with pagination", async () => {
    const result = await controller.findAll({ skip: 0, take: 20 });
    expect(result).toBeInstanceOf(PaginatedResponseDto);
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
    expect(result.skip).toBe(0);
    expect(result.take).toBe(20);
    expect(service.findAll).toHaveBeenCalledWith(0, 20);
  });

  it("should return one team", async () => {
    const result = await controller.findOne("team-uuid-1");
    expect(result).toEqual(mockTeam);
    expect(service.findOne).toHaveBeenCalledWith("team-uuid-1");
  });

  it("should update a team", async () => {
    const result = await controller.update("team-uuid-1", {
      displayName: "Updated",
    });
    expect(result).toEqual(mockTeam);
    expect(service.update).toHaveBeenCalled();
  });

  it("should remove a team", async () => {
    await controller.remove("team-uuid-1");
    expect(service.remove).toHaveBeenCalledWith("team-uuid-1");
  });

  it("should get team members", async () => {
    const result = await controller.getMembers("team-uuid-1");
    expect(result).toHaveLength(1);
    expect(service.getMembers).toHaveBeenCalledWith("team-uuid-1");
  });

  it("should add a member to a team", async () => {
    const result = await controller.addMember("team-uuid-1", "user-uuid-1");
    expect(result.members).toHaveLength(1);
    expect(service.addMember).toHaveBeenCalledWith(
      "team-uuid-1",
      "user-uuid-1",
    );
  });

  it("should remove a member from a team", async () => {
    const result = await controller.removeMember("team-uuid-1", "user-uuid-1");
    expect(result).toEqual(mockTeam);
    expect(service.removeMember).toHaveBeenCalledWith(
      "team-uuid-1",
      "user-uuid-1",
    );
  });

  it("should get team components", async () => {
    const result = await controller.getComponents("team-uuid-1");
    expect(result).toHaveLength(1);
    expect(service.getComponents).toHaveBeenCalledWith("team-uuid-1");
  });
});
