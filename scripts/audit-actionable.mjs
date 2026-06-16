#!/usr/bin/env node
/**
 * audit-actionable.mjs
 *
 * Runs `npm audit --json --omit=dev --workspace=<workspace>` and exits non-zero
 * only when there are HIGH/CRITICAL vulnerabilities that are NOT in the
 * upstream-unfixable allowlist.
 *
 * Upstream-unfixable advisories (path-to-regexp pinned by @nestjs/core@11):
 *   - GHSA-j3q9-mxjg-w52f
 *   - GHSA-27v5-c462-wpq7
 *
 * Usage: node scripts/audit-actionable.mjs <workspace>
 *   e.g. node scripts/audit-actionable.mjs apps/api
 */

import { spawnSync } from "node:child_process";
import { exit } from "node:process";

const UPSTREAM_UNFIXABLE = new Set([
  "GHSA-j3q9-mxjg-w52f",
  "GHSA-27v5-c462-wpq7",
  "GHSA-96hv-2xvq-fx4p", // ws: Memory exhaustion DoS — upstream via socket.io/engine.io (ws@8.21+ not yet in chain)
  "GHSA-hmw2-7cc7-3qxx", // form-data: CRLF injection — upstream via @kubernetes/client-node, axios, supertest
  "GHSA-f38q-mgvj-vph7", // protobufjs: Schema-derived names shadowing — upstream via @grpc/grpc-js, @kubernetes/client-node
  "GHSA-wcpc-wj8m-hjx6", // protobufjs: DoS via unbounded Any expansion — upstream via @grpc/grpc-js, @kubernetes/client-node
  "GHSA-8988-4f7v-96qf", // @opentelemetry/core: Unbounded memory in W3C Baggage — moderate severity, requires major upgrade (0.x -> 2.x) with breaking changes
]);

const workspace = process.argv[2];
if (!workspace) {
  console.error("Usage: node scripts/audit-actionable.mjs <workspace>");
  exit(2);
}

// `npm audit` exits non-zero when any vulnerability is reported. We still need
// the JSON output to filter, so capture stdout regardless of the exit code.
const proc = spawnSync(
  "npm",
  ["audit", "--json", "--omit=dev", `--workspace=${workspace}`],
  { encoding: "utf8" },
);

const auditJson = proc.stdout || "";
let audit;
try {
  audit = JSON.parse(auditJson);
} catch (err) {
  console.error("Failed to parse npm audit JSON:", err.message);
  console.error("Raw output:\n", auditJson);
  console.error("Stderr:\n", proc.stderr || "");
  exit(2);
}

const isUnfixable = (via) => {
  if (typeof via === "string") return false;
  const id = via.url ? via.url.split("/").pop() : "";
  return UPSTREAM_UNFIXABLE.has(id);
};

const vulns = Object.values(audit.vulnerabilities || {});

const actionable = vulns.filter((v) => {
  if (!["high", "critical"].includes(v.severity)) return false;
  return v.via.some((via) => typeof via !== "string" && !isUnfixable(via));
});

if (actionable.length > 0) {
  console.error("Actionable high/critical vulnerabilities found:");
  for (const v of actionable) {
    console.error(` - ${v.name} (${v.severity})`);
  }
  exit(1);
}

const skipped = vulns.filter(
  (v) =>
    ["high", "critical"].includes(v.severity) &&
    v.via.every((via) => typeof via === "string" || isUnfixable(via)),
);

if (skipped.length > 0) {
  console.log(
    "Skipped upstream-unfixable:",
    skipped.map((v) => v.name).join(", "),
  );
}

console.log(
  `No actionable high/critical vulnerabilities found in ${workspace}.`,
);
