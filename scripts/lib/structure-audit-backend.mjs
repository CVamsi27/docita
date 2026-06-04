import {
  listTrackedFiles,
} from "./structure-audit-file-system.mjs";
import {
  createRecord,
  statusForIssues,
} from "./structure-audit-record.mjs";

const apiDomainTargets = {
  controller: "apps/api/src/domains/<domain>/presentation/controllers",
  repository: "apps/api/src/domains/<domain>/infrastructure/repositories",
  schema: "apps/api/src/domains/<domain>/application/dto",
  service: "apps/api/src/domains/<domain>/application/services or use-cases",
};

const workerDomainTargets = {
  processor: "apps/worker/src/domains/<domain>/processors",
  queue: "apps/worker/src/domains/<domain>/queues",
};

const backendTargets = [
  {
    prefix: "apps/api/src/domains/",
    target: (type) => apiDomainTargets[type] ?? "apps/api/src/domains/<domain>",
  },
  {
    prefix: "apps/api/src/shared/modules/",
    target: () => "apps/api/src/shared/modules",
  },
  {
    prefix: "apps/api/src/shared/common/",
    target: () => "apps/api/src/shared/common (migrated from legacy src/common/)",
  },
  {
    prefix: "apps/api/src/test-utils/",
    target: () => "apps/api/src/test-utils",
  },
  {
    prefix: "apps/worker/src/domains/",
    target: (type) => workerDomainTargets[type] ?? "apps/worker/src/domains/<domain>",
  },
  {
    prefix: "apps/worker/src/shared/",
    target: () => "apps/worker/src/shared",
  },
];

function backendTarget(file, type) {
  return backendTargets.find(({ prefix }) => file.startsWith(prefix))?.target(type) ?? "backend canonical structure";
}

function domainControllerLocationIssue(file, record) {
  if (record.type !== "controller" || !/^apps\/api\/src\/domains\//.test(file) || file.includes("/presentation/")) return [];
  return [{
    file,
    severity: "move",
    message: "domain controller should live under presentation/controllers",
  }];
}

function largeControllerIssue(file, record) {
  if (record.type !== "controller" || record.lines <= 260) return [];
  return [{
    file,
    severity: "split",
    message: `controller is ${record.lines} lines; keep controllers thin`,
  }];
}

function domainServiceLocationIssue(file, record) {
  if (record.type !== "service" || !/^apps\/api\/src\/domains\//.test(file) || file.includes("/application/") || file.includes("/core/")) return [];
  return [{
    file,
    severity: "move",
    message: "domain service should live under application/services, application/use-cases, or core",
  }];
}

function prismaBoundaryIssue(file, record) {
  const isPresentationOrApplication = /^apps\/api\/src\/domains\/.*\/(presentation|application)\//.test(file);
  const hasPrismaAccess = /@prisma\/client|PrismaService|\bprisma\./.test(record.content);
  if (record.type === "test" || !isPresentationOrApplication || !hasPrismaAccess) return [];
  return [{
    file,
    severity: "move",
    message: "Prisma/DB imports should stay in infrastructure repositories or packages/db",
  }];
}

function workerRetryPolicyIssue(file, record) {
  if (record.type !== "processor" || !/^apps\/worker\//.test(file) || /attempts|backoff|lockDuration|idempot/i.test(record.content)) return [];
  return [{
    file,
    severity: "review",
    message: "worker processor should document retry/backoff, lockDuration, idempotency, and DLQ behavior",
  }];
}

function workerControllerIssue(file) {
  if (!/^apps\/worker\/src\/.*controller\.(ts|js)$/.test(file)) return [];
  return [{
    file,
    severity: "move",
    message: "HTTP controller logic does not belong in worker",
  }];
}

const backendRules = [
  domainControllerLocationIssue,
  largeControllerIssue,
  domainServiceLocationIssue,
  prismaBoundaryIssue,
  workerRetryPolicyIssue,
  workerControllerIssue,
];

export function collectBackendAudit() {
  const files = listTrackedFiles().filter((file) =>
    /^(apps\/api|apps\/worker)\//.test(file),
  );
  const records = [];
  const issues = [];

  for (const file of files) {
    const record = createRecord(file, backendTarget);
    record.issues.push(...backendRules.flatMap((rule) => rule(file, record)));

    record.status = statusForIssues(record.issues);
    records.push(record);
    issues.push(...record.issues);
  }

  return { records, issues };
}
