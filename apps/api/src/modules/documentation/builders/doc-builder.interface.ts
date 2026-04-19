/**
 * Represents the outcome of a documentation build operation.
 */
export interface BuildResult {
  /**
   * Indicates whether the build completed successfully or not.
   */
  status: "ready" | "failed";

  /**
   * Absolute path to the directory containing the build artifacts.
   * Present only when status is 'ready'.
   */
  artifactsPath?: string;

  /**
   * Human-readable log output collected during the build.
   */
  buildLog?: string;
}

/**
 * Strategy interface for documentation builders.
 * Each concrete implementation handles a specific documentation toolchain.
 */
export interface DocBuilder {
  /**
   * Determines whether this builder can handle the repository at the given path.
   * @param repoPath - Absolute path to the locally cloned repository
   * @returns True when this builder is capable of building the repository
   */
  supports(repoPath: string): Promise<boolean>;

  /**
   * Executes the build for the given component repository.
   * @param componentId - Identifier of the component owning the documentation
   * @param repoUrl - Remote Git URL to clone
   * @param ref - Git branch or tag name to check out (full refs like refs/heads/main are normalized automatically)
   * @returns A BuildResult describing the outcome
   */
  build(
    componentId: string,
    repoUrl: string,
    ref: string,
  ): Promise<BuildResult>;
}
