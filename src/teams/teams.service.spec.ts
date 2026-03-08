import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { TeamsService } from "./teams.service";
import { Team, TeamType } from "./entities/team.entity";
import { User } from "../auth/entities/user.entity";
import { Component } from "../catalog/entities/component.entity";

describe("TeamsService", () => {
  let service: TeamsService;
  let teamRepo: Record<string, jest.Mock>;
  let userRepo: Record<string, jest.Mock>;
  let componentRepo: Record<string, jest.Mock>;

  const mockTeam: Partial<Team> = {
    id: "team-uuid-1",
    name: "platform-team",
    displayName: "Platform Engineering",
    description: "Platform team description",
    type: TeamType.PLATFORM,
    contactEmail: "platform@example.com",
    slackChannel: "#platform",
    metadata: null as unknown as Record<string, unknown>,
    members: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockUser: Partial<User> = {
    id: "user-uuid-1",
    username: "john_doe",
    email: "john@example.com",
    displayName: "John Doe",
    roles: ["admin"],
  };

  const mockComponent: Partial<Component> = {
    id: "comp-uuid-1",
    name: "user-service",
    owner: "platform-team",
  };

  beforeEach(async () => {
    teamRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      merge: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn(),
    };

    userRepo = {
      findOne: jest.fn(),
    };

    componentRepo = {
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TeamsService,
        { provide: getRepositoryToken(Team), useValue: teamRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Component), useValue: componentRepo },
      ],
    }).compile();

    service = module.get<TeamsService>(TeamsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a team", async () => {
      teamRepo.findOne.mockResolvedValue(null);
      teamRepo.create.mockReturnValue(mockTeam);
      teamRepo.save.mockResolvedValue(mockTeam);

      const result = await service.create({
        name: "platform-team",
        displayName: "Platform Engineering",
        type: TeamType.PLATFORM,
      });

      expect(result).toEqual(mockTeam);
      expect(teamRepo.create).toHaveBeenCalled();
    });

    it("should throw ConflictException if team name exists", async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);

      await expect(
        service.create({
          name: "platform-team",
          displayName: "Platform Engineering",
          type: TeamType.PLATFORM,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findAll", () => {
    it("should return all teams", async () => {
      teamRepo.find.mockResolvedValue([mockTeam]);
      const result = await service.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe("findOne", () => {
    it("should return a team by ID", async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      const result = await service.findOne("team-uuid-1");
      expect(result).toEqual(mockTeam);
    });

    it("should throw NotFoundException if team not found", async () => {
      teamRepo.findOne.mockResolvedValue(null);
      await expect(service.findOne("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("update", () => {
    it("should update a team", async () => {
      const updated = { ...mockTeam, displayName: "Updated Name" };
      teamRepo.findOne.mockResolvedValue(mockTeam);
      teamRepo.merge.mockReturnValue(updated);
      teamRepo.save.mockResolvedValue(updated);

      const result = await service.update("team-uuid-1", {
        displayName: "Updated Name",
      });

      expect(result.displayName).toBe("Updated Name");
    });

    it("should throw ConflictException on duplicate name", async () => {
      teamRepo.findOne.mockResolvedValueOnce(mockTeam).mockResolvedValueOnce({
        ...mockTeam,
        id: "other-uuid",
        name: "other-team",
      });

      await expect(
        service.update("team-uuid-1", { name: "other-team" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("should remove a team", async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      teamRepo.remove.mockResolvedValue(mockTeam);

      await service.remove("team-uuid-1");
      expect(teamRepo.remove).toHaveBeenCalledWith(mockTeam);
    });
  });

  describe("addMember", () => {
    it("should add a user to a team", async () => {
      const teamWithMembers = { ...mockTeam, members: [] };
      teamRepo.findOne.mockResolvedValue(teamWithMembers);
      userRepo.findOne.mockResolvedValue(mockUser);
      teamRepo.save.mockResolvedValue({
        ...teamWithMembers,
        members: [mockUser],
      });

      const result = await service.addMember("team-uuid-1", "user-uuid-1");
      expect(teamRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it("should not duplicate an existing member", async () => {
      const teamWithMembers = { ...mockTeam, members: [mockUser] };
      teamRepo.findOne.mockResolvedValue(teamWithMembers);
      userRepo.findOne.mockResolvedValue(mockUser);

      await service.addMember("team-uuid-1", "user-uuid-1");
      expect(teamRepo.save).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException if user not found", async () => {
      teamRepo.findOne.mockResolvedValue({ ...mockTeam, members: [] });
      userRepo.findOne.mockResolvedValue(null);

      await expect(
        service.addMember("team-uuid-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("removeMember", () => {
    it("should remove a user from a team", async () => {
      const teamWithMembers = { ...mockTeam, members: [mockUser] };
      teamRepo.findOne.mockResolvedValue(teamWithMembers);
      teamRepo.save.mockResolvedValue({ ...teamWithMembers, members: [] });

      const result = await service.removeMember("team-uuid-1", "user-uuid-1");
      expect(teamRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe("getMembers", () => {
    it("should return team members", async () => {
      teamRepo.findOne.mockResolvedValue({
        ...mockTeam,
        members: [mockUser],
      });

      const result = await service.getMembers("team-uuid-1");
      expect(result).toHaveLength(1);
      expect(result[0].username).toBe("john_doe");
    });
  });

  describe("findByUser", () => {
    it("should return teams for a user", async () => {
      userRepo.findOne.mockResolvedValue(mockUser);
      const qb = {
        innerJoin: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTeam]),
      };
      teamRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findByUser("user-uuid-1");
      expect(result).toHaveLength(1);
    });

    it("should throw NotFoundException if user not found", async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.findByUser("nonexistent")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getComponents", () => {
    it("should return components owned by a team", async () => {
      teamRepo.findOne.mockResolvedValue(mockTeam);
      componentRepo.find.mockResolvedValue([mockComponent]);

      const result = await service.getComponents("team-uuid-1");
      expect(result).toHaveLength(1);
      expect(componentRepo.find).toHaveBeenCalledWith({
        where: { owner: "platform-team" },
        order: { name: "ASC" },
      });
    });
  });
});
