import { readText } from "./structure-audit-file-system.mjs";

const runtimeDirPattern =
  /(^|\/)(node_modules|\.next|\.turbo|\.wrangler|\.astro|dist|coverage|playwright-report|test-results|accessibility-reports|uploads)(\/|$)|^logs\//;

const textFilePattern =
  /\.(ts|tsx|js|jsx|mjs|cjs|json|jsonc|md|mdx|css|scss|yml|yaml|prisma|sql|toml|env|example)$/;

function countLines(text) {
  if (!text) return 0;
  return text.split("\n").length;
}

const classificationRules = [
  {
    type: "test",
    matches: (file, base) => /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(base) || file.includes("/test/") || file.includes("/tests/") || file.includes("/e2e/"),
  },
  {
    type: "route",
    matches: (_file, base) => ["page.tsx", "layout.tsx", "route.ts", "middleware.ts"].includes(base),
  },
  { type: "controller", matches: (_file, base) => /controller\.(ts|js)$/.test(base) },
  { type: "service", matches: (_file, base) => /service\.(ts|js)$/.test(base) },
  { type: "hook", matches: (_file, base) => /use-[\w-]+\.(ts|tsx)$/.test(base) || /^use[A-Z]/.test(base) },
  { type: "repository", matches: (_file, base) => /repository|repo/.test(base) },
  { type: "schema", matches: (_file, base) => /dto|schema|contract/.test(base) },
  { type: "module", matches: (_file, base) => /module\.(ts|js)$/.test(base) },
  { type: "processor", matches: (_file, base) => /processor\.(ts|js)$/.test(base) },
  { type: "queue", matches: (_file, base) => /queue/.test(base) },
  { type: "component", matches: (_file, base) => /\.(tsx|jsx)$/.test(base) },
  { type: "config", matches: (_file, base) => /\.(json|jsonc|toml|yml|yaml)$/.test(base) },
  { type: "asset", matches: (_file, base) => /\.(png|jpg|jpeg|svg|webp|ico|woff2?|ttf)$/.test(base) },
];

function classifyByName(file) {
  const base = file.split("/").at(-1) ?? file;
  return classificationRules.find((rule) => rule.matches(file, base))?.type ?? "script";
}

const severityStatus = [
  ["move", "move"],
  ["split", "split"],
  ["delete", "delete"],
];

export function statusForIssues(issues) {
  return (
    severityStatus.find(([severity]) => issues.some((issue) => issue.severity === severity))?.[1] ??
    (issues.length > 0 ? "review" : "keep")
  );
}

export function createRecord(file, targetForFile) {
  const content = textFilePattern.test(file) ? readText(file) : "";
  const type = classifyByName(file);
  const lines = countLines(content);
  const issues = [];
  const target = targetForFile(file, type);

  if (runtimeDirPattern.test(file)) {
    issues.push({
      file,
      severity: "delete",
      message: "tracked generated/runtime artifact should be removed or explicitly allowlisted",
    });
  }

  return { file, type, target, status: "keep", issues, lines, content };
}
