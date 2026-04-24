import { Injectable } from "@nestjs/common";
import * as yaml from "js-yaml";

/**
 * A single change entry produced by the spec diff algorithm.
 */
export interface SpecDiffEntry {
  /** Whether the path was added, removed, or modified. */
  type: "added" | "removed" | "modified";
  /** Whether this change is considered breaking. */
  breaking: boolean;
  /** Human-readable path identifier, e.g. "GET /users/{id}" or channel name. */
  path: string;
  /** Human-readable description of what changed. */
  detail: string;
}

/**
 * Aggregated result of diffing two API specs.
 */
export interface SpecDiffResult {
  totalChanges: number;
  breakingChanges: number;
  entries: SpecDiffEntry[];
}

/**
 * Parsed representation of an OpenAPI document (simplified subset).
 */
interface OpenApiDoc {
  paths?: Record<string, Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Parsed representation of an AsyncAPI document (simplified subset).
 */
interface AsyncApiDoc {
  channels?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Service that computes a structural diff between two API spec documents.
 * Supports OpenAPI (paths) and AsyncAPI (channels) formats.
 */
@Injectable()
export class SpecDiffService {
  /**
   * Parses a YAML or JSON string into a plain object.
   */
  private parse(raw: string): Record<string, unknown> {
    return yaml.load(raw) as Record<string, unknown>;
  }

  /**
   * Computes the diff between two raw spec strings.
   * The format is inferred from the presence of a `channels` key (AsyncAPI)
   * or a `paths` key (OpenAPI).
   *
   * @param oldSpec - Raw YAML/JSON of the baseline spec
   * @param newSpec - Raw YAML/JSON of the newer spec
   * @returns Structured diff result
   */
  diff(oldSpec: string, newSpec: string): SpecDiffResult {
    const oldDoc = this.parse(oldSpec);
    const newDoc = this.parse(newSpec);

    const isAsyncApi =
      "channels" in newDoc || ("asyncapi" in newDoc && !("paths" in newDoc));

    const entries: SpecDiffEntry[] = isAsyncApi
      ? this.diffAsyncApi(oldDoc, newDoc)
      : this.diffOpenApi(oldDoc, newDoc);

    const breakingChanges = entries.filter((e) => e.breaking).length;
    return {
      totalChanges: entries.length,
      breakingChanges,
      entries,
    };
  }

  /**
   * Diffs two OpenAPI documents by comparing their `paths` objects.
   */
  private diffOpenApi(oldDoc: OpenApiDoc, newDoc: OpenApiDoc): SpecDiffEntry[] {
    const entries: SpecDiffEntry[] = [];
    const oldPaths = oldDoc.paths ?? {};
    const newPaths = newDoc.paths ?? {};

    const allPaths = new Set([
      ...Object.keys(oldPaths),
      ...Object.keys(newPaths),
    ]);

    const httpMethods = [
      "get",
      "post",
      "put",
      "patch",
      "delete",
      "head",
      "options",
    ];

    for (const pathKey of allPaths) {
      const inOld = pathKey in oldPaths;
      const inNew = pathKey in newPaths;

      if (!inOld && inNew) {
        entries.push({
          type: "added",
          breaking: false,
          path: pathKey,
          detail: `Path ${pathKey} was added`,
        });
        continue;
      }

      if (inOld && !inNew) {
        entries.push({
          type: "removed",
          breaking: true,
          path: pathKey,
          detail: `Path ${pathKey} was removed`,
        });
        continue;
      }

      // Path exists in both — compare operations
      const oldPathObj = oldPaths[pathKey] ?? {};
      const newPathObj = newPaths[pathKey] ?? {};

      for (const method of httpMethods) {
        const operationKey = `${method.toUpperCase()} ${pathKey}`;
        const oldOp = oldPathObj[method] as Record<string, unknown> | undefined;
        const newOp = newPathObj[method] as Record<string, unknown> | undefined;

        if (!oldOp && newOp) {
          entries.push({
            type: "added",
            breaking: false,
            path: operationKey,
            detail: `Operation ${operationKey} was added`,
          });
          continue;
        }

        if (oldOp && !newOp) {
          entries.push({
            type: "removed",
            breaking: true,
            path: operationKey,
            detail: `Operation ${operationKey} was removed`,
          });
          continue;
        }

        if (oldOp && newOp) {
          // Check for breaking parameter changes
          const oldParams = this.extractParamNames(oldOp);
          const newParams = this.extractParamNames(newOp);
          for (const param of oldParams) {
            if (!newParams.has(param)) {
              entries.push({
                type: "modified",
                breaking: true,
                path: operationKey,
                detail: `Required parameter "${param}" was removed from ${operationKey}`,
              });
            }
          }

          // Check for breaking requestBody changes
          const hadRequestBody = "requestBody" in oldOp;
          const hasRequestBody = "requestBody" in newOp;
          if (hadRequestBody && !hasRequestBody) {
            entries.push({
              type: "modified",
              breaking: true,
              path: operationKey,
              detail: `requestBody was removed from ${operationKey}`,
            });
          }

          // Check for breaking response schema changes
          const breakingResponseChanges = this.detectResponseBreaks(
            oldOp,
            newOp,
            operationKey,
          );
          entries.push(...breakingResponseChanges);
        }
      }
    }

    return entries;
  }

  /**
   * Extracts parameter names from an operation object.
   */
  private extractParamNames(operation: Record<string, unknown>): Set<string> {
    const params = (operation["parameters"] ?? []) as Array<
      Record<string, unknown>
    >;
    return new Set(params.map((p) => p["name"] as string).filter(Boolean));
  }

  /**
   * Detects breaking changes in response schemas between two operations.
   * Uses a simplified top-level key comparison.
   */
  private detectResponseBreaks(
    oldOp: Record<string, unknown>,
    newOp: Record<string, unknown>,
    operationKey: string,
  ): SpecDiffEntry[] {
    const entries: SpecDiffEntry[] = [];
    const oldResponses = (oldOp["responses"] ?? {}) as Record<string, unknown>;
    const newResponses = (newOp["responses"] ?? {}) as Record<string, unknown>;

    for (const statusCode of Object.keys(oldResponses)) {
      if (!(statusCode in newResponses)) {
        entries.push({
          type: "modified",
          breaking: true,
          path: operationKey,
          detail: `Response ${statusCode} was removed from ${operationKey}`,
        });
      }
    }

    return entries;
  }

  /**
   * Diffs two AsyncAPI documents by comparing their `channels` objects.
   */
  private diffAsyncApi(
    oldDoc: AsyncApiDoc,
    newDoc: AsyncApiDoc,
  ): SpecDiffEntry[] {
    const entries: SpecDiffEntry[] = [];
    const oldChannels = oldDoc.channels ?? {};
    const newChannels = newDoc.channels ?? {};

    const allChannels = new Set([
      ...Object.keys(oldChannels),
      ...Object.keys(newChannels),
    ]);

    for (const channel of allChannels) {
      const inOld = channel in oldChannels;
      const inNew = channel in newChannels;

      if (!inOld && inNew) {
        entries.push({
          type: "added",
          breaking: false,
          path: channel,
          detail: `Channel ${channel} was added`,
        });
      } else if (inOld && !inNew) {
        entries.push({
          type: "removed",
          breaking: true,
          path: channel,
          detail: `Channel ${channel} was removed`,
        });
      }
    }

    return entries;
  }
}
