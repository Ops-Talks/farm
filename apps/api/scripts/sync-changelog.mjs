import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const conventionalCommitPattern =
  /^(?<type>[a-z]+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?: (?<description>.+)$/i;
const releaseNoisePatterns = [/^chore: release v/i, /^bump to v/i];
const sectionByType = {
  feat: "Added",
  fix: "Fixed",
  perf: "Changed",
  refactor: "Changed",
  docs: "Changed",
  style: "Changed",
  test: "Changed",
  chore: "Changed",
  build: "Changed",
  ci: "Changed",
};
const orderedSections = ["Added", "Changed", "Fixed"];

const currentFilePath = fileURLToPath(import.meta.url);
const scriptsDirectory = path.dirname(currentFilePath);
const repoRoot = path.resolve(scriptsDirectory, "../../..");
const changelogPath = path.join(repoRoot, "CHANGELOG.md");
const changelogHeading = "## [Unreleased]";

function runGitCommand(args) {
  return execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getLatestVersionTag() {
  try {
    return runGitCommand(["describe", "--tags", "--match", "v[0-9]*", "--abbrev=0"]);
  } catch {
    return null;
  }
}

function getCommitSubjects(range) {
  const gitArgs = ["log", "--no-merges", "--pretty=format:%s"];

  if (range) {
    gitArgs.splice(1, 0, range);
  }

  const output = runGitCommand(gitArgs);

  if (!output) {
    return [];
  }

  return output
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function isReleaseNoise(subject) {
  return releaseNoisePatterns.some((pattern) => pattern.test(subject));
}

function ensureSentence(text) {
  const trimmedText = text.trim();

  if (!trimmedText) {
    return trimmedText;
  }

  if (/[.!?]$/.test(trimmedText)) {
    return trimmedText;
  }

  return `${trimmedText}.`;
}

function formatEntry(scope, description, isBreakingChange) {
  const normalizedDescription = ensureSentence(description);

  if (scope) {
    const breakingSuffix = isBreakingChange ? " (breaking)" : "";
    return `- **${scope}**: ${normalizedDescription}${breakingSuffix}`;
  }

  if (isBreakingChange) {
    return `- ${normalizedDescription} (breaking)`;
  }

  return `- ${normalizedDescription}`;
}

function groupCommitSubjects(subjects) {
  const sections = new Map();

  for (const sectionName of orderedSections) {
    sections.set(sectionName, []);
  }

  for (const subject of subjects) {
    const match = subject.match(conventionalCommitPattern);

    if (!match?.groups) {
      sections.get("Changed").push(`- ${ensureSentence(subject)}`);
      continue;
    }

    const type = match.groups.type.toLowerCase();
    const sectionName = sectionByType[type] ?? "Changed";
    const entry = formatEntry(
      match.groups.scope,
      match.groups.description,
      Boolean(match.groups.breaking),
    );

    sections.get(sectionName).push(entry);
  }

  return sections;
}

function renderUnreleasedSection(subjects, latestVersionTag) {
  const normalizedSubjects = subjects.filter(Boolean);
  const groupedEntries = groupCommitSubjects(normalizedSubjects);
  const renderedSections = orderedSections
    .map((sectionName) => {
      const entries = groupedEntries.get(sectionName) ?? [];

      if (entries.length === 0) {
        return null;
      }

      return `### ${sectionName}\n${entries.join("\n")}`;
    })
    .filter(Boolean);

  if (renderedSections.length === 0) {
    const tagLabel = latestVersionTag ?? "the repository start";
    renderedSections.push(
      `### Changed\n- No release notes could be derived automatically from commits since ${tagLabel}.`,
    );
  }

  return `${changelogHeading}\n\n${renderedSections.join("\n\n")}`;
}

function replaceOrInsertUnreleasedSection(changelogContent, unreleasedSection) {
  if (changelogContent.includes(changelogHeading)) {
    return changelogContent.replace(
      /## \[Unreleased\][\s\S]*?(?=\n## \[|$)/,
      unreleasedSection,
    );
  }

  const firstReleaseIndex = changelogContent.indexOf("\n## [");

  if (firstReleaseIndex === -1) {
    return `${changelogContent.trimEnd()}\n\n${unreleasedSection}\n`;
  }

  const beforeReleases = changelogContent.slice(0, firstReleaseIndex).trimEnd();
  const releases = changelogContent.slice(firstReleaseIndex).trimStart();

  return `${beforeReleases}\n\n${unreleasedSection}\n\n${releases}`;
}

const latestVersionTag = getLatestVersionTag();
const range = latestVersionTag ? `${latestVersionTag}..HEAD` : null;
const commitSubjects = getCommitSubjects(range);
const releasableSubjects = commitSubjects.filter((subject) => !isReleaseNoise(subject));
const subjectsToRender =
  releasableSubjects.length > 0 ? releasableSubjects : commitSubjects;
const changelogContent = readFileSync(changelogPath, "utf8");
const unreleasedSection = renderUnreleasedSection(subjectsToRender, latestVersionTag);
const nextChangelogContent = replaceOrInsertUnreleasedSection(
  changelogContent,
  unreleasedSection,
);

writeFileSync(changelogPath, nextChangelogContent);
