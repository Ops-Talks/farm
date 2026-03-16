import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Team } from "./entities/team.entity";
import { User } from "../auth/entities/user.entity";
import { Component } from "../catalog/entities/component.entity";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";

/**
 * Service responsible for managing teams and team membership.
 */
@Injectable()
export class TeamsService {
  private readonly logger = new Logger(TeamsService.name);

  constructor(
    @InjectRepository(Team)
    private readonly teamRepository: Repository<Team>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Component)
    private readonly componentRepository: Repository<Component>,
  ) {}

  /**
   * Creates a new team.
   * @param createTeamDto - The team data
   * @returns The newly created team
   * @throws ConflictException if a team with the same name already exists
   */
  async create(createTeamDto: CreateTeamDto): Promise<Team> {
    const existing = await this.teamRepository.findOne({
      where: { name: createTeamDto.name },
    });
    if (existing) {
      throw new ConflictException(
        `Team with name "${createTeamDto.name}" already exists`,
      );
    }

    const team = this.teamRepository.create(createTeamDto);
    this.logger.log(`Creating team: ${createTeamDto.name}`);
    return await this.teamRepository.save(team);
  }

  /**
   * Retrieves all teams, optionally scoped to an organization.
   * @param skip - Number of records to skip
   * @param take - Number of records to take
   * @param organizationId - Optional organization UUID to scope results
   * @returns A tuple of [teams, total count]
   */
  async findAll(
    skip = 0,
    take = 20,
    organizationId?: string,
  ): Promise<[Team[], number]> {
    return await this.teamRepository.findAndCount({
      where: organizationId ? { organizationId } : {},
      order: { name: "ASC" },
      skip,
      take,
    });
  }

  /**
   * Retrieves a single team by ID.
   * @param id - The UUID of the team
   * @returns The team with the specified ID
   * @throws NotFoundException if no team with the given ID exists
   */
  async findOne(id: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id },
    });
    if (!team) {
      throw new NotFoundException(`Team with ID "${id}" not found`);
    }
    return team;
  }

  /**
   * Updates an existing team.
   * @param id - The UUID of the team to update
   * @param updateTeamDto - Fields to update
   * @returns The updated team
   * @throws NotFoundException if no team with the given ID exists
   * @throws ConflictException if the new name conflicts with an existing team
   */
  async update(id: string, updateTeamDto: UpdateTeamDto): Promise<Team> {
    const team = await this.findOne(id);

    if (updateTeamDto.name && updateTeamDto.name !== team.name) {
      const existing = await this.teamRepository.findOne({
        where: { name: updateTeamDto.name },
      });
      if (existing) {
        throw new ConflictException(
          `Team with name "${updateTeamDto.name}" already exists`,
        );
      }
    }

    const updated = this.teamRepository.merge(team, updateTeamDto);
    return await this.teamRepository.save(updated);
  }

  /**
   * Removes a team.
   * @param id - The UUID of the team to remove
   * @throws NotFoundException if no team with the given ID exists
   */
  async remove(id: string): Promise<void> {
    const team = await this.findOne(id);
    await this.teamRepository.remove(team);
    this.logger.log(`Removed team: ${team.name}`);
  }

  /**
   * Adds a user as a member of a team.
   * @param teamId - The UUID of the team
   * @param userId - The UUID of the user to add
   * @returns The updated team with members loaded
   * @throws NotFoundException if the team or user does not exist
   */
  async addMember(teamId: string, userId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ["members"],
    });
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found`);
    }

    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    const alreadyMember = team.members.some((m) => m.id === userId);
    if (!alreadyMember) {
      team.members.push(user);
      await this.teamRepository.save(team);
      this.logger.log(`Added user ${user.username} to team ${team.name}`);
    }

    return team;
  }

  /**
   * Removes a user from a team.
   * @param teamId - The UUID of the team
   * @param userId - The UUID of the user to remove
   * @returns The updated team with members loaded
   * @throws NotFoundException if the team does not exist
   */
  async removeMember(teamId: string, userId: string): Promise<Team> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ["members"],
    });
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found`);
    }

    team.members = team.members.filter((m) => m.id !== userId);
    await this.teamRepository.save(team);
    this.logger.log(`Removed user ${userId} from team ${team.name}`);
    return team;
  }

  /**
   * Retrieves all members of a team.
   * @param teamId - The UUID of the team
   * @returns An array of users that belong to the team
   * @throws NotFoundException if the team does not exist
   */
  async getMembers(teamId: string): Promise<User[]> {
    const team = await this.teamRepository.findOne({
      where: { id: teamId },
      relations: ["members"],
    });
    if (!team) {
      throw new NotFoundException(`Team with ID "${teamId}" not found`);
    }
    return team.members;
  }

  /**
   * Retrieves all teams a user belongs to.
   * @param userId - The UUID of the user
   * @returns An array of teams the user belongs to
   * @throws NotFoundException if the user does not exist
   */
  async findByUser(userId: string): Promise<Team[]> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`User with ID "${userId}" not found`);
    }

    return await this.teamRepository
      .createQueryBuilder("team")
      .innerJoin("team.members", "member", "member.id = :userId", { userId })
      .orderBy("team.name", "ASC")
      .getMany();
  }

  /**
   * Retrieves all components owned by a team.
   * @param teamId - The UUID of the team
   * @returns An array of components owned by the team
   * @throws NotFoundException if the team does not exist
   */
  async getComponents(teamId: string): Promise<Component[]> {
    const team = await this.findOne(teamId);
    return await this.componentRepository.find({
      where: { owner: team.name },
      order: { name: "ASC" },
    });
  }
}
