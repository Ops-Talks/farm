import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpCode,
  HttpStatus,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiNoContentResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { TeamsService } from "./teams.service";
import { CreateTeamDto } from "./dto/create-team.dto";
import { UpdateTeamDto } from "./dto/update-team.dto";
import { Team } from "./entities/team.entity";
import { User } from "../auth/entities/user.entity";
import { Component } from "../catalog/entities/component.entity";
import { ErrorResponseDto } from "../common/dto/error-response.dto";
import {
  PaginationQueryDto,
  PaginatedResponseDto,
} from "../common/dto";
import { JwtAuthGuard } from "../common/guards/jwt-auth.guard";
import { RolesGuard } from "../common/guards/roles.guard";
import { Roles } from "../common/decorators/roles.decorator";

/**
 * Controller for managing organizational teams and their membership.
 */
@ApiTags("Teams")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller("teams")
@ApiResponse({
  status: HttpStatus.BAD_REQUEST,
  description: "Bad Request - Validation failed.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - User does not have sufficient permissions.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.INTERNAL_SERVER_ERROR,
  description: "Internal Server Error.",
  type: ErrorResponseDto,
})
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  /**
   * Creates a new team.
   * @param createTeamDto - The data for the new team
   * @returns The created team
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @Roles("admin")
  @ApiOperation({ summary: "Create a new team" })
  @ApiCreatedResponse({
    description: "The team has been successfully created.",
    type: Team,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A team with this name already exists.",
    type: ErrorResponseDto,
  })
  async create(@Body() createTeamDto: CreateTeamDto): Promise<Team> {
    return await this.teamsService.create(createTeamDto);
  }

  /**
   * Retrieves all teams.
   * @returns An array of all teams
   */
  @Get()
  @ApiOperation({ summary: "List all teams" })
  @ApiOkResponse({
    description: "Successfully retrieved team list.",
    type: PaginatedResponseDto,
  })
  async findAll(
    @Query() pagination: PaginationQueryDto,
  ): Promise<PaginatedResponseDto<Team>> {
    const [data, total] = await this.teamsService.findAll(
      pagination.skip,
      pagination.take,
    );
    return new PaginatedResponseDto(
      data,
      total,
      pagination.skip ?? 0,
      pagination.take ?? 20,
    );
  }

  /**
   * Retrieves a single team by ID.
   * @param id - The UUID of the team
   * @returns The team with the specified ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get team by ID" })
  @ApiParam({ name: "id", description: "The UUID of the team" })
  @ApiOkResponse({
    description: "The team was found.",
    type: Team,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async findOne(@Param("id") id: string): Promise<Team> {
    return await this.teamsService.findOne(id);
  }

  /**
   * Updates an existing team.
   * @param id - The UUID of the team to update
   * @param updateTeamDto - Fields to update
   * @returns The updated team
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update a team" })
  @ApiParam({ name: "id", description: "The UUID of the team to update" })
  @ApiOkResponse({
    description: "The team has been successfully updated.",
    type: Team,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: "A team with this name already exists.",
    type: ErrorResponseDto,
  })
  async update(
    @Param("id") id: string,
    @Body() updateTeamDto: UpdateTeamDto,
  ): Promise<Team> {
    return await this.teamsService.update(id, updateTeamDto);
  }

  /**
   * Removes a team.
   * @param id - The UUID of the team to remove
   */
  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles("admin")
  @ApiOperation({ summary: "Delete a team" })
  @ApiParam({ name: "id", description: "The UUID of the team to remove" })
  @ApiNoContentResponse({ description: "Team successfully removed." })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async remove(@Param("id") id: string): Promise<void> {
    await this.teamsService.remove(id);
  }

  /**
   * Retrieves all members of a team.
   * @param id - The UUID of the team
   * @returns An array of users in the team
   */
  @Get(":id/members")
  @ApiOperation({ summary: "List team members" })
  @ApiParam({ name: "id", description: "The UUID of the team" })
  @ApiOkResponse({
    description: "Successfully retrieved team members.",
    type: [User],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async getMembers(@Param("id") id: string): Promise<User[]> {
    return await this.teamsService.getMembers(id);
  }

  /**
   * Adds a user to a team.
   * @param id - The UUID of the team
   * @param userId - The UUID of the user to add
   * @returns The updated team with members
   */
  @Post(":id/members/:userId")
  @HttpCode(HttpStatus.OK)
  @Roles("admin")
  @ApiOperation({ summary: "Add a member to a team" })
  @ApiParam({ name: "id", description: "The UUID of the team" })
  @ApiParam({ name: "userId", description: "The UUID of the user to add" })
  @ApiOkResponse({
    description: "Member added successfully.",
    type: Team,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Team or user not found.",
    type: ErrorResponseDto,
  })
  async addMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
  ): Promise<Team> {
    return await this.teamsService.addMember(id, userId);
  }

  /**
   * Removes a user from a team.
   * @param id - The UUID of the team
   * @param userId - The UUID of the user to remove
   * @returns The updated team with members
   */
  @Delete(":id/members/:userId")
  @Roles("admin")
  @ApiOperation({ summary: "Remove a member from a team" })
  @ApiParam({ name: "id", description: "The UUID of the team" })
  @ApiParam({
    name: "userId",
    description: "The UUID of the user to remove",
  })
  @ApiOkResponse({
    description: "Member removed successfully.",
    type: Team,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Team not found.",
    type: ErrorResponseDto,
  })
  async removeMember(
    @Param("id") id: string,
    @Param("userId") userId: string,
  ): Promise<Team> {
    return await this.teamsService.removeMember(id, userId);
  }

  /**
   * Retrieves all components owned by a team.
   * @param id - The UUID of the team
   * @returns An array of components owned by the team
   */
  @Get(":id/components")
  @ApiOperation({ summary: "List components owned by a team" })
  @ApiParam({ name: "id", description: "The UUID of the team" })
  @ApiOkResponse({
    description: "Successfully retrieved team components.",
    type: [Component],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Not Found.",
    type: ErrorResponseDto,
  })
  async getComponents(@Param("id") id: string): Promise<Component[]> {
    return await this.teamsService.getComponents(id);
  }
}
