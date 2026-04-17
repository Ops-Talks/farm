import { timingSafeEqual } from "crypto";
import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ConfigService } from "@nestjs/config";
import { IacStack } from "./entities/iac-stack.entity";
import { IacResource } from "./entities/iac-resource.entity";
import { IacResourceDependency } from "./entities/iac-resource-dependency.entity";
import { IngestResourcesDto } from "./dto/ingest-resources.dto";
import { ResourceMapDto } from "./dto/resource-map.dto";

/**
 * Service responsible for IaC resource topology ingest and retrieval.
 * Resources are pushed by Cultivator and are read-only from the Farm portal.
 */
@Injectable()
export class IacResourceService {
  private readonly logger = new Logger(IacResourceService.name);

  constructor(
    @InjectRepository(IacStack)
    private readonly stackRepository: Repository<IacStack>,
    @InjectRepository(IacResource)
    private readonly resourceRepository: Repository<IacResource>,
    @InjectRepository(IacResourceDependency)
    private readonly depRepository: Repository<IacResourceDependency>,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Validates the static bearer token used by machine-to-machine ingest
   * endpoints. Uses constant-time comparison to prevent timing attacks.
   * @throws UnauthorizedException when the provided token does not match.
   */
  private validateIngestToken(token: string): void {
    const expected =
      this.configService.get<string>("iac.ingestToken") ||
      this.configService.get<string>("IAC_INGEST_TOKEN");
    if (!expected || expected.length === 0) {
      throw new UnauthorizedException("Invalid ingest token");
    }
    if (!token || token.length === 0 || token.length !== expected.length) {
      throw new UnauthorizedException("Invalid ingest token");
    }
    const tokenBuffer = Buffer.from(token, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");
    if (!timingSafeEqual(tokenBuffer, expectedBuffer)) {
      throw new UnauthorizedException("Invalid ingest token");
    }
  }

  /**
   * Atomically replaces the full resource topology for a stack.
   * Deletes all existing IacResource and IacResourceDependency records for
   * the stack, then inserts the new topology in a single transaction.
   *
   * @param stackId - Target IacStack UUID
   * @param dto - New resource topology payload
   * @param token - Static bearer token to authenticate the request
   * @throws UnauthorizedException when token is invalid
   * @throws NotFoundException when the stack does not exist
   */
  async ingestResources(
    stackId: string,
    dto: IngestResourcesDto,
    token: string,
  ): Promise<void> {
    this.validateIngestToken(token);

    const stack = await this.stackRepository.findOne({
      where: { id: stackId },
    });
    if (!stack) {
      throw new NotFoundException(`IacStack ${stackId} not found`);
    }

    await this.resourceRepository.manager.transaction(async (em) => {
      await em.delete(IacResource, { stackId });
      await em.delete(IacResourceDependency, { stackId });

      if (dto.resources.length > 0) {
        const resources = dto.resources.map((r) =>
          this.resourceRepository.create({ ...r, stackId }),
        );
        await em.save(resources);
      }

      if (dto.dependencies.length > 0) {
        const deps = dto.dependencies.map((d) =>
          this.depRepository.create({
            stackId,
            sourceAddress: d.source,
            targetAddress: d.target,
          }),
        );
        await em.save(deps);
      }
    });

    this.logger.log(
      `Ingested ${dto.resources.length} resources and ` +
        `${dto.dependencies.length} dependencies for stack ${stackId}`,
    );
  }

  /**
   * Returns the full resource topology (nodes and edges) for a stack.
   *
   * @param stackId - Target IacStack UUID
   * @returns ResourceMapDto with resources and dependencies arrays
   * @throws NotFoundException when the stack does not exist
   */
  async getResources(stackId: string): Promise<ResourceMapDto> {
    const stack = await this.stackRepository.findOne({
      where: { id: stackId },
    });
    if (!stack) {
      throw new NotFoundException(`IacStack ${stackId} not found`);
    }

    const [resources, dependencies] = await Promise.all([
      this.resourceRepository.find({
        where: { stackId },
        order: { address: "ASC" },
      }),
      this.depRepository.find({ where: { stackId } }),
    ]);

    return {
      resources: resources.map((r) => ({
        address: r.address,
        resourceType: r.resourceType,
        resourceName: r.resourceName,
        provider: r.provider,
      })),
      dependencies: dependencies.map((d) => ({
        source: d.sourceAddress,
        target: d.targetAddress,
      })),
    };
  }
}
