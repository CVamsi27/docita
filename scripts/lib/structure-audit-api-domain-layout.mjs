import {
  listTrackedFiles,
  readText,
} from "./structure-audit-file-system.mjs";

function lineCount(file) {
  return readText(file).split("\n").length;
}

function domainControllerLocationIssue(file) {
  if (!/controller\.(ts|js)$/.test(file) || !/^apps\/api\/src\/domains\//.test(file) || file.includes("/presentation/")) return [];
  return [{
    file,
    severity: "move",
    message: "domain controller should live under presentation/controllers",
  }];
}

function largeControllerIssue(file) {
  const lines = lineCount(file);
  if (!/controller\.(ts|js)$/.test(file) || lines <= 260) return [];
  return [{
    file,
    severity: "split",
    message: `controller is ${lines} lines; keep controllers thin`,
  }];
}

function domainServiceLocationIssue(file) {
  if (!/service\.(ts|js)$/.test(file) || !/^apps\/api\/src\/domains\//.test(file) || file.includes("/application/") || file.includes("/core/")) return [];
  return [{
    file,
    severity: "move",
    message: "domain service should live under application/services, application/use-cases, or core",
  }];
}

function prismaBoundaryIssue(file) {
  const isPresentationOrApplication = /^apps\/api\/src\/domains\/.*\/(presentation|application)\//.test(file);
  if (/\.(test|spec)\.(ts|js)$/.test(file) || !isPresentationOrApplication) return [];
  if (!/@prisma\/client|PrismaService|\bprisma\./.test(readText(file))) return [];
  return [{
    file,
    severity: "move",
    message: "Prisma/DB imports should stay in infrastructure repositories or packages/db",
  }];
}

const apiDomainRules = [
  domainControllerLocationIssue,
  largeControllerIssue,
  domainServiceLocationIssue,
  prismaBoundaryIssue,
];

export function collectApiDomainLayoutFindings() {
  const files = listTrackedFiles().filter((file) =>
    /^apps\/api\/src\/domains\/.*\.(ts|js)$/.test(file),
  );
  return files.flatMap((file) =>
    apiDomainRules.flatMap((rule) => rule(file)),
  );
}
