import { readFileSync } from "fs";
import { globSync } from "glob";
import { resolve } from "path";

const ENTITIES_DIR = resolve(__dirname, "../src/modules");
const entityFiles = globSync(`${ENTITIES_DIR}/**/entities/*.entity.ts`);

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
