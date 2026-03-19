import {
  Controller,
  Get,
  Post,
  Query,
  Param,
  Body,
  UseGuards,
  Logger,
  HttpCode,
  HttpStatus,
  Optional,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "../../common/guards/jwt-auth.guard";
import { CloudResourceService } from "./cloud-resource.service";
import { CloudCostService } from "./cloud-cost.service";
import { CloudSecretsService } from "./cloud-secrets.service";
import { DiscoverResourcesDto } from "./dto/discover-resources.dto";
import { CloudCostDto } from "./dto/cloud-cost.dto";
import { ResolveSecretDto } from "./dto/resolve-secret.dto";
import { CloudResource } from "./interfaces/cloud-resource.interface";

/**
 * Controller that exposes cloud resource discovery, cost, and secret
 * resolution endpoints. All routes are protected with JWT authentication.
 */
@ApiTags("Cloud")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("api/v1/cloud")
export class CloudResourceController {
  private readonly logger = new Logger(CloudResourceController.name);

  constructor(
    @Optional() private readonly cloudResourceService?: CloudResourceService,
    @Optional() private readonly cloudCostService?: CloudCostService,
    @Optional() private readonly cloudSecretsService?: CloudSecretsService,
  ) {}

  /**
   * Discovers cloud resources for an organization across all or a specific
   * cloud provider.
   */
  @Get("resources")
  @ApiOperation({
    summary: "Discover cloud resources",
    description:
      "Returns cloud resources tagged with farm:component or farm.io/component. " +
      "Specify provider to limit to a single cloud.",
  })
  @ApiQuery({ name: "orgId", required: true, type: String })
  @ApiQuery({
    name: "provider",
    required: false,
    enum: ["aws", "gcp", "azure"],
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of discovered cloud resources",
  })
  async discoverResources(
    @Query() query: DiscoverResourcesDto,
  ): Promise<CloudResource[]> {
    if (!this.cloudResourceService) {
      this.logger.warn("CloudResourceService not available");
      return [];
    }

    if (query.provider) {
      return this.cloudResourceService.discoverByProvider(
        query.orgId,
        query.provider,
      );
    }
    return this.cloudResourceService.discoverAll(query.orgId);
  }

  /**
   * Returns aggregated cost data for an organization from all configured
   * cloud providers.
   */
  @Get("cost")
  @ApiOperation({
    summary: "Get cloud cost data",
    description:
      "Returns cost data for the organization from all configured cloud providers.",
  })
  @ApiQuery({ name: "orgId", required: true, type: String })
  @ApiQuery({ name: "days", required: false, type: Number, example: 30 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Aggregated cost entries per provider",
  })
  async getCost(@Query() query: CloudCostDto): Promise<unknown[]> {
    if (!this.cloudCostService) {
      this.logger.warn("CloudCostService not available");
      return [];
    }
    const days = query.days ?? 30;
    return this.cloudCostService.getAggregatedCost(query.orgId, days);
  }

  /**
   * Resolves a cloud secret reference to its plain-text value.
   */
  @Post("secrets/resolve")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Resolve a cloud secret reference",
    description:
      "Resolves AWS Secrets Manager, GCP Secret Manager, or Azure Key Vault references.",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "Resolved secret value",
    schema: { type: "object", properties: { value: { type: "string" } } },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: "Unsupported secret ref format",
  })
  async resolveSecret(
    @Body() dto: ResolveSecretDto,
  ): Promise<{ value: string }> {
    if (!this.cloudSecretsService) {
      throw new Error("CloudSecretsService not available");
    }
    const value = await this.cloudSecretsService.resolve(dto.ref, dto.orgId);
    return { value };
  }

  /**
   * Lists which cloud providers are connected (have credentials) for an org.
   */
  @Get("providers/:orgId")
  @ApiOperation({
    summary: "List connected cloud providers",
    description:
      "Returns the list of cloud providers that have credentials configured for the organization.",
  })
  @ApiParam({ name: "orgId", description: "Organization UUID" })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "List of connected provider identifiers",
    schema: {
      type: "object",
      properties: {
        providers: { type: "array", items: { type: "string" } },
      },
    },
  })
  async listConnectedProviders(
    @Param("orgId") orgId: string,
  ): Promise<{ providers: string[] }> {
    if (!this.cloudResourceService) {
      return { providers: [] };
    }
    const providers =
      await this.cloudResourceService.listConnectedProviders(orgId);
    return { providers };
  }
}
