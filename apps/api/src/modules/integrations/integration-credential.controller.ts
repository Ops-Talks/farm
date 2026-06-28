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
  Req,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { IntegrationCredentialService } from "./integration-credential.service";
import { CreateIntegrationCredentialDto } from "./dto/create-integration-credential.dto";
import { UpdateIntegrationCredentialDto } from "./dto/update-integration-credential.dto";
import { IntegrationCredential } from "./entities/integration-credential.entity";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import type { RequestWithOrg } from "../../common/interfaces/request-with-org.interface";
import { ErrorResponseDto } from "../../common/dto/error-response.dto";

/**
 * Controller for managing integration credentials.
 * CRUD operations on encrypted CI/CD integration secrets.
 */
@ApiTags("Integration Credentials")
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Controller("integrations/credentials")
@ApiResponse({
  status: HttpStatus.UNAUTHORIZED,
  description: "Unauthorized - Authentication token is missing or invalid.",
  type: ErrorResponseDto,
})
@ApiResponse({
  status: HttpStatus.FORBIDDEN,
  description: "Forbidden - Insufficient permissions.",
  type: ErrorResponseDto,
})
export class IntegrationCredentialController {
  constructor(
    private readonly credentialService: IntegrationCredentialService,
  ) {}

  /**
   * Creates a new integration credential.
   * The plain-text value is encrypted before persisting.
   *
   * @param dto - Credential creation payload
   * @returns The created credential entity
   */
  @Post()
  @Roles("admin")
  @ApiOperation({ summary: "Create a new integration credential" })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Credential created successfully.",
    type: IntegrationCredential,
  })
  async create(
    @Body() dto: CreateIntegrationCredentialDto,
  ): Promise<IntegrationCredential> {
    return this.credentialService.create(dto);
  }

  /**
   * Returns all integration credentials, optionally filtered by organization.
   *
   * @param orgId - Optional organization UUID query parameter
   * @returns Array of credential entities
   */
  @Get()
  @ApiOperation({ summary: "List all integration credentials" })
  @ApiQuery({
    name: "orgId",
    required: false,
    description: "Filter credentials by organization UUID",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns matching credentials.",
    type: [IntegrationCredential],
  })
  async findAll(
    @Query("orgId") orgId?: string,
    @Req() req?: RequestWithOrg,
  ): Promise<IntegrationCredential[]> {
    const effectiveOrgId = orgId ?? req?.organizationId;
    return this.credentialService.findAll(effectiveOrgId);
  }

  /**
   * Returns a single integration credential by id.
   *
   * @param id - Credential UUID
   * @param req - Request object carrying resolved organization context
   * @returns The found credential entity
   */
  @Get(":id")
  @ApiOperation({ summary: "Get a single integration credential" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Returns the credential.",
    type: IntegrationCredential,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Credential not found.",
    type: ErrorResponseDto,
  })
  async findOne(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<IntegrationCredential> {
    return this.credentialService.findOne(id, req.organizationId);
  }

  /**
   * Updates an existing integration credential.
   *
   * @param id - Credential UUID
   * @param dto - Fields to update
   * @param req - Request object carrying resolved organization context
   * @returns The updated credential entity
   */
  @Patch(":id")
  @Roles("admin")
  @ApiOperation({ summary: "Update an integration credential" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Credential updated successfully.",
    type: IntegrationCredential,
  })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateIntegrationCredentialDto,
    @Req() req: RequestWithOrg,
  ): Promise<IntegrationCredential> {
    return this.credentialService.update(id, req.organizationId, dto);
  }

  /**
   * Deletes an integration credential.
   *
   * @param id - Credential UUID
   * @param req - Request object carrying resolved organization context
   */
  @Delete(":id")
  @Roles("admin")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Delete an integration credential" })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: "Credential deleted successfully.",
  })
  async remove(
    @Param("id") id: string,
    @Req() req: RequestWithOrg,
  ): Promise<void> {
    return this.credentialService.remove(id, req.organizationId);
  }
}
