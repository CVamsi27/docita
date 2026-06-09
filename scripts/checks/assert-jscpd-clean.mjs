import { readFileSync } from "node:fs";

const reportPath = ".jscpd-report/jscpd-report.json";
const report = JSON.parse(readFileSync(reportPath, "utf8"));
const total = report.statistics?.total;
const clones = Number(total?.clones ?? report.duplicates?.length ?? 0);
const duplicatedLines = Number(total?.duplicatedLines ?? 0);
const percentage = Number(total?.percentage ?? 0);

if (clones !== 0 || duplicatedLines !== 0 || percentage !== 0) {
  console.error(
    [
      "jscpd duplication gate failed:",
      `  clones: ${clones}`,
      `  duplicated lines: ${duplicatedLines}`,
      `  percentage: ${percentage}`,
      `  report: ${reportPath}`,
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`jscpd duplication gate: 0 clones (${reportPath})`);
