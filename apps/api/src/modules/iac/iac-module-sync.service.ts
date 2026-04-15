import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { execSync } from "child_process";
import { mkdtempSync, readFileSync, rmSync, existsSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { IacModule } from "./entities/iac-module.entity";
import { IacModuleVersion, IacModuleVariable, IacModuleOutput } from "./entities/iac-module-version.entity";

// ---------------------------------------------------------------------------
// HCL parser (regex-based, covers common variable and output patterns)
// ---------------------------------------------------------------------------

/**
 * Extracts the content of the outermost braces following a given pattern.
 * Used to isolate individual variable/output blocks from an HCL file.
 */
function extractBlocks(src: string, keyword: "variable" | "output"): { label: string; body: string }[] {
  const results: { label: string; body: string }[] = [];
  const headerRe = new RegExp(`${keyword}\\s+"([^"]+)"\\s*\\{`, "g");
  let match: RegExpExecArray | null;

  while ((match = headerRe.exec(src)) !== null) {
    const label = match[1];
    const start = headerRe.lastIndex;
    let depth = 1;
    let i = start;

    while (i < src.length && depth > 0) {
      if (src[i] === "{") depth++;
      else if (src[i] === "}") depth--;
      i++;
    }

    results.push({ label, body: src.slice(start, i - 1) });
  }

  return results;
}

/**
 * Extracts a single-line scalar attribute from an HCL block body.
 * Strips surrounding quotes.
 */
function attr(body: string, key: string): string | null {
  const re = new RegExp(`^\\s*${key}\\s*=\\s*"?([^"\\n]+?)"?\\s*$`, "m");
  const m = body.match(re);
  return m ? m[1].trim() : null;
}

/**
 * Returns true when a "default" attribute is absent from a variable block,
 * meaning the variable is required (no fallback value).
 */
function isRequired(body: string): boolean {
  return !/^\s*default\s*=/m.test(body);
}

/**
 * Extracts the raw default value (may be an HCL expression).
 */
function extractDefault(body: string): string | null {
  const m = body.match(/^\s*default\s*=\s*(.+)$/m);
  if (!m) return null;
  return m[1].trim().replace(/^"(.*)"$/, "$1");
}

/**
 * Parses a variable block body and returns a validation object when present.
 */
function extractValidation(body: string): { condition: string; errorMessage: string } | null {
  const valMatch = body.match(/validation\s*\{([^}]+)\}/s);
  if (!valMatch) return null;
  const vBody = valMatch[1];
  // condition can contain quotes (e.g. contains(["a","b"], var.x)), so match to end of line
  const condMatch = vBody.match(/^\s*condition\s*=\s*(.+)$/m);
  const condition = condMatch ? condMatch[1].trim() : null;
  const errorMessage = attr(vBody, "error_message");
  if (!condition || !errorMessage) return null;
  return { condition, errorMessage };
}

/**
 * Parses the content of a variables.tf file into typed variable declarations.
 */
export function parseVariables(src: string): IacModuleVariable[] {
  return extractBlocks(src, "variable").map(({ label, body }) => ({
    name: label,
    type: attr(body, "type"),
    description: attr(body, "description"),
    default: extractDefault(body),
    required: isRequired(body),
    validation: extractValidation(body),
  }));
}

/**
 * Parses the content of an outputs.tf file into typed output declarations.
 */
export function parseOutputs(src: string): IacModuleOutput[] {
  return extractBlocks(src, "output").map(({ label, body }) => ({
    name: label,
    description: attr(body, "description"),
    value: attr(body, "value"),
  }));
}

// ---------------------------------------------------------------------------
// Sync service
// ---------------------------------------------------------------------------

export interface SyncResult {
  newVersions: number;
  latestVersion: string | null;
}

/**
 * Discovers new semver tags from a module's source repository, shallow-clones
 * each new tag, parses the HCL variable and output declarations, and persists
 * the result as IacModuleVersion records.
 */
@Injectable()
export class IacModuleSyncService {
  private readonly logger = new Logger(IacModuleSyncService.name);

  constructor(
    @InjectRepository(IacModule)
    private readonly moduleRepository: Repository<IacModule>,
    @InjectRepository(IacModuleVersion)
    private readonly versionRepository: Repository<IacModuleVersion>,
  ) {}

  /**
   * Runs a full sync for the given module.
   * Steps:
   *  1. List remote tags via `git ls-remote --tags`
   *  2. Filter to semver tags not yet stored
   *  3. For each new tag: shallow clone, parse variables.tf + outputs.tf
   *  4. Persist as IacModuleVersion records
   *  5. Update module.latestVersion to the highest semver tag
   *
   * @param module - The IacModule to sync
   * @returns Counts of new versions added and the new latestVersion
   */
  async sync(module: IacModule): Promise<SyncResult> {
    const remoteTags = this.listRemoteTags(module.sourceRepoUrl);
    if (remoteTags.length === 0) {
      this.logger.log(`No semver tags found for module "${module.name}"`);
      return { newVersions: 0, latestVersion: module.latestVersion };
    }

    const existingVersions = await this.versionRepository.find({
      where: { moduleId: module.id },
      select: ["version"],
    });
    const existingSet = new Set(existingVersions.map((v) => v.version));

    const newTags = remoteTags.filter((t) => !existingSet.has(t));
    this.logger.log(
      `Module "${module.name}": ${remoteTags.length} remote tags, ${newTags.length} new`,
    );

    for (const tag of newTags) {
      const { variables, outputs } = this.cloneAndParse(module.sourceRepoUrl, tag);

      const version = this.versionRepository.create({
        moduleId: module.id,
        version: tag,
        variablesMeta: variables.length > 0 ? JSON.stringify(variables) : null,
        outputsMeta: outputs.length > 0 ? JSON.stringify(outputs) : null,
        syncedAt: new Date(),
      });

      await this.versionRepository.save(version);
    }

    const latestVersion = this.resolveLatest([...existingSet, ...newTags]);
    if (latestVersion !== module.latestVersion) {
      module.latestVersion = latestVersion;
      await this.moduleRepository.save(module);
    }

    return { newVersions: newTags.length, latestVersion };
  }

  /**
   * Runs `git ls-remote --tags` against the given URL and returns only
   * semver-like tags (v?X.Y.Z).
   */
  listRemoteTags(repoUrl: string): string[] {
    try {
      const output = execSync(`git ls-remote --tags "${repoUrl}"`, {
        timeout: 30_000,
        stdio: ["ignore", "pipe", "ignore"],
      }).toString();

      const tags: string[] = [];
      for (const line of output.split("\n")) {
        const ref = line.split("\t")[1];
        if (!ref) continue;
        // Skip peeled tag refs (^{})
        if (ref.endsWith("^{}")) continue;
        const tagName = ref.replace("refs/tags/", "");
        if (/^v?\d+\.\d+\.\d+/.test(tagName)) {
          tags.push(tagName);
        }
      }
      return tags;
    } catch {
      this.logger.warn(`Failed to list remote tags for "${repoUrl}"`);
      return [];
    }
  }

  /**
   * Shallow-clones a repository at a specific tag into a temporary directory,
   * reads variables.tf and outputs.tf, then removes the clone.
   */
  cloneAndParse(
    repoUrl: string,
    tag: string,
  ): { variables: IacModuleVariable[]; outputs: IacModuleOutput[] } {
    const tmpDir = mkdtempSync(join(tmpdir(), "farm-iac-sync-"));
    try {
      execSync(
        `git clone --depth 1 --branch "${tag}" "${repoUrl}" "${tmpDir}"`,
        { timeout: 120_000, stdio: ["ignore", "ignore", "ignore"] },
      );

      const variablesPath = join(tmpDir, "variables.tf");
      const outputsPath = join(tmpDir, "outputs.tf");

      const variables = existsSync(variablesPath)
        ? parseVariables(readFileSync(variablesPath, "utf8"))
        : [];

      const outputs = existsSync(outputsPath)
        ? parseOutputs(readFileSync(outputsPath, "utf8"))
        : [];

      return { variables, outputs };
    } catch {
      this.logger.warn(`Failed to clone "${repoUrl}" at tag "${tag}"`);
      return { variables: [], outputs: [] };
    } finally {
      rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  /**
   * Returns the highest semver tag from a collection, or null when empty.
   */
  resolveLatest(tags: string[]): string | null {
    if (tags.length === 0) return null;

    return tags.reduce<string | null>((best, tag) => {
      if (!best) return tag;
      return this.compareSemver(tag, best) > 0 ? tag : best;
    }, null);
  }

  /**
   * Compares two version strings lexicographically by major, minor, patch.
   * Returns positive when `a` is greater, negative when `b` is greater.
   */
  private compareSemver(a: string, b: string): number {
    const parse = (v: string): [number, number, number] => {
      const clean = v.startsWith("v") ? v.slice(1) : v;
      const parts = clean.split(".").map(Number);
      return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
    };

    const [aMajor, aMinor, aPatch] = parse(a);
    const [bMajor, bMinor, bPatch] = parse(b);

    if (aMajor !== bMajor) return aMajor - bMajor;
    if (aMinor !== bMinor) return aMinor - bMinor;
    return aPatch - bPatch;
  }
}
