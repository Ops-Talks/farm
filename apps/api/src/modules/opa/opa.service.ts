import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { OpaResult } from "./entities/opa-result.entity";

/**
 * Shape of the raw response body returned by the OPA /v1/data/:path endpoint.
 * The result field may be a plain boolean or an object with allow/violations.
 */
interface OpaDataResponse {
  result?:
    | boolean
    | {
        allow?: boolean;
        allowed?: boolean;
        violations?: string[];
      };
}

/**
 * Service for communicating with a standalone Open Policy Agent server and
 * persisting evaluation results to the database.
 *
 * All network calls use globalThis.fetch so they can be intercepted in tests.
 */
@Injectable()
export class OpaService {
  private readonly logger = new Logger(OpaService.name);
  private readonly opaUrl: string;

  constructor(
    private readonly configService: ConfigService,
    @InjectRepository(OpaResult)
    private readonly opaResultRepository: Repository<OpaResult>,
  ) {
    this.opaUrl =
      this.configService.get<string>("opa.url") ?? "http://localhost:8181";
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Returns the configured OPA server URL for use in status responses.
   */
  getOpaUrl(): string {
    return this.opaUrl;
  }

  /**
   * Checks whether the OPA server is reachable by calling its /health endpoint.
   *
   * @returns true when the server responds with HTTP 200, false otherwise
   */
  async isReachable(): Promise<boolean> {
    try {
      const response = await globalThis.fetch(`${this.opaUrl}/health`);
      return response.status === 200;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.debug(`OPA health check failed: ${message}`);
      return false;
    }
  }

  /**
   * Evaluates an OPA policy at the given path with the provided input document.
   *
   * OPA returns either:
   * - `{ result: boolean }` for simple allow/deny rules
   * - `{ result: { allow: boolean, violations?: string[] } }` for structured rules
   *
   * @param policyPath - OPA policy path, e.g. "app/rbac/allow"
   * @param input - Arbitrary input document
   * @returns Evaluation result with allowed flag and optional violations list
   */
  async evaluate(
    policyPath: string,
    input: Record<string, unknown>,
  ): Promise<{ allowed: boolean; violations: string[] }> {
    const url = `${this.opaUrl}/v1/data/${policyPath}`;
    const response = await globalThis.fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ input }),
    });

    const body = (await response.json()) as OpaDataResponse;
    const result = body.result;

    let allowed: boolean;
    let violations: string[] = [];

    if (typeof result === "boolean") {
      allowed = result;
    } else if (result !== undefined && result !== null) {
      allowed = result.allow ?? result.allowed ?? false;
      violations = result.violations ?? [];
    } else {
      allowed = false;
    }

    return { allowed, violations };
  }

  /**
   * Persists an OPA evaluation result to the database.
   *
   * @param componentId - Catalog component UUID the evaluation is scoped to
   * @param policyPath - OPA policy path that was evaluated
   * @param result - The evaluation outcome to persist
   * @returns The saved OpaResult entity
   */
  async saveResult(
    componentId: string,
    policyPath: string,
    result: { allowed: boolean; violations: string[] },
  ): Promise<OpaResult> {
    const entity = this.opaResultRepository.create({
      componentId,
      policyPath,
      allowed: result.allowed,
      violations: result.violations,
      evaluatedAt: new Date(),
    });
    return this.opaResultRepository.save(entity);
  }

  /**
   * Returns all stored OPA evaluation results for the given component.
   *
   * @param componentId - Catalog component UUID to filter by
   * @returns Array of OpaResult entities ordered by evaluation time descending
   */
  async listResults(componentId: string): Promise<OpaResult[]> {
    return this.opaResultRepository.find({
      where: { componentId },
      order: { evaluatedAt: "DESC" },
    });
  }
}
