import { spawnSync } from "node:child_process";

const result = spawnSync(
  "pnpm",
  [
    "exec",
    "fallow",
    "--skip",
    "health",
    "--summary",
    "--format",
    "json",
  ],
  {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (result.stderr) {
  process.stderr.write(result.stderr);
}

if (result.status !== 0) {
  process.stdout.write(result.stdout);
  process.exit(result.status ?? 1);
}

const jsonStart = result.stdout.indexOf("{");
if (jsonStart === -1) {
  console.error("Fallow did not emit a JSON report.");
  process.exit(1);
}

const report = JSON.parse(result.stdout.slice(jsonStart));
const deadCodeIssues = Number(report.check?.summary?.total_issues ?? 0);
const cloneGroups = Number(report.dupes?.summary?.clone_groups ?? 0);
const duplicatedLines = Number(report.dupes?.summary?.duplicated_lines ?? 0);
const duplicationRate = Number(report.dupes?.summary?.duplication_rate ?? 0);

if (deadCodeIssues !== 0 || cloneGroups !== 0 || duplicatedLines !== 0 || duplicationRate !== 0) {
  console.error(
    [
      "Fallow gate failed:",
      `  dead-code issues: ${deadCodeIssues}`,
      `  clone groups: ${cloneGroups}`,
      `  duplicated lines: ${duplicatedLines}`,
      `  duplication rate: ${duplicationRate}`,
    ].join("\n"),
  );
  process.exit(1);
}

console.log("Fallow gate score: 100");
console.log("Fallow gate: no dead-code issues and no actionable duplication");
