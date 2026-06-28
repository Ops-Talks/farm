import { readFileSync, readdirSync, statSync } from "fs";
import { extname, join, resolve } from "path";

const ENTITIES_DIR = resolve(__dirname, "../src/modules");

function findEntityFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findEntityFiles(full));
    } else if (entry.endsWith(".entity.ts")) {
      files.push(full);
    }
  }
  return files;
}

const entityFiles = findEntityFiles(ENTITIES_DIR);

let violations = 0;

for (const file of entityFiles) {
  const content = readFileSync(file, "utf-8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(
      /(?:@Column|@JoinColumn)\(\s*\{\s*name:\s*"([^"]+)"[^}]*}/,
    );
    if (match) {
      const dbName = match[1];
      if (!dbName.includes("_") && dbName !== dbName.toLowerCase()) {
        console.error(
          `${file}:${i + 1}: explicit name: "${dbName}" is camelCase — use snake_case or remove name:`,
        );
        violations++;
      }
    }
  }
}

if (violations > 0) {
  console.error(`\n${violations} column naming violation(s) found.`);
  process.exit(1);
}

console.log(
  `Column naming validation passed — ${entityFiles.length} entities, 0 camelCase explicit overrides.`,
);
