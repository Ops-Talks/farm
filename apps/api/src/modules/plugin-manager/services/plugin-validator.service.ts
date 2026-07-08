import { Injectable } from "@nestjs/common";
import * as semver from "semver";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { PluginManifestV2 } from "../interfaces/plugin-manifest-v2.interface";

const _filename =
  typeof __filename !== "undefined"
    ? __filename
    : fileURLToPath(eval("import.meta.url") as string);

/**
 * Known permission scopes that plugins may declare.
 * Requests for scopes outside this set are rejected during validation.
 */
export const KNOWN_PERMISSION_SCOPES: readonly string[] = [
  "catalog:read",
  "catalog:write",
  "teams:read",
  "teams:write",
  "environments:read",
  "environments:write",
  "documentation:read",
  "documentation:write",
  "pipelines:read",
  "pipelines:write",
  "registry:read",
  "registry:write",
  "finops:read",
  "kubernetes:read",
  "analytics:read",
  "admin:read",
  "admin:write",
];

/**
 * Current Farm platform version used for farmMinVersion compatibility checks.
 * Loaded from the API package.json at startup.
 */
function readFarmVersion(): string {
  try {
    const pkgPath = path.resolve(
      path.dirname(_filename),
      "../../../../package.json",
    );
    const raw = fs.readFileSync(pkgPath, "utf-8");
    const pkg = JSON.parse(raw) as { version?: string };
    return pkg.version ?? "0.0.0";
  } catch {
    return "0.0.0";
  }
}

const FARM_VERSION: string = readFarmVersion();

/**
 * Validation result returned by PluginValidatorService.validate().
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Validates plugin manifests against the v2 schema rules before the manifest
 * is installed or published to the registry.
 */
@Injectable()
export class PluginValidatorService {
  /**
   * Validates a manifest v2 object against required-field rules, semver
   * format, farmMinVersion compatibility, and permission scope allowlist.
   *
   * @param manifest The manifest to validate
   * @returns An object containing `valid` flag and an array of error messages
   */
  validate(manifest: PluginManifestV2): ValidationResult {
    const errors: string[] = [];

    this.checkRequiredFields(manifest, errors);
    this.checkSemver(manifest, errors);
    this.checkFarmMinVersion(manifest, errors);
    this.checkPermissions(manifest, errors);

    return { valid: errors.length === 0, errors };
  }

  /**
   * Validates that all declared dependencies exist in a provided set of
   * registered plugin IDs. Called during install to enforce dependency
   * resolution before persisting the instance.
   *
   * @param manifest The manifest declaring dependsOn
   * @param registeredIds Set of plugin IDs currently in the registry
   * @returns Validation result with errors for each missing dependency
   */
  validateDependencies(
    manifest: PluginManifestV2,
    registeredIds: Set<string>,
  ): ValidationResult {
    const errors: string[] = [];

    if (manifest.dependsOn && manifest.dependsOn.length > 0) {
      for (const depId of manifest.dependsOn) {
        if (!registeredIds.has(depId)) {
          errors.push(
            `Dependency "${depId}" declared in dependsOn is not present in the registry`,
          );
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  private checkRequiredFields(
    manifest: PluginManifestV2,
    errors: string[],
  ): void {
    const required: Array<keyof PluginManifestV2> = [
      "id",
      "name",
      "version",
      "description",
      "entryPoint",
    ];

    for (const field of required) {
      const value = manifest[field];
      if (value === undefined || value === null || value === "") {
        errors.push(`Required field "${field}" is missing or empty`);
      }
    }
  }

  private checkSemver(manifest: PluginManifestV2, errors: string[]): void {
    if (!manifest.version) return;

    if (!semver.valid(manifest.version)) {
      errors.push(
        `Field "version" must be a valid semantic version (received "${manifest.version}")`,
      );
    }
  }

  private checkFarmMinVersion(
    manifest: PluginManifestV2,
    errors: string[],
  ): void {
    if (!manifest.farmMinVersion) return;

    if (!semver.valid(manifest.farmMinVersion)) {
      errors.push(
        `Field "farmMinVersion" must be a valid semantic version (received "${manifest.farmMinVersion}")`,
      );
      return;
    }

    if (semver.gt(manifest.farmMinVersion, FARM_VERSION)) {
      errors.push(
        `Plugin requires Farm >= ${manifest.farmMinVersion} but current version is ${FARM_VERSION}`,
      );
    }
  }

  private checkPermissions(manifest: PluginManifestV2, errors: string[]): void {
    if (!manifest.permissions || manifest.permissions.length === 0) return;

    for (const scope of manifest.permissions) {
      if (!KNOWN_PERMISSION_SCOPES.includes(scope)) {
        errors.push(
          `Permission scope "${scope}" is not recognized; allowed scopes: ${KNOWN_PERMISSION_SCOPES.join(", ")}`,
        );
      }
    }
  }
}
