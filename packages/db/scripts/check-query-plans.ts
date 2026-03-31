import prisma from "./prisma-script-client";

type ExplainPlanNode = {
  "Node Type"?: string;
  Plans?: ExplainPlanNode[];
  "Relation Name"?: string;
};

type ExplainResult = {
  PLAN?: ExplainPlanNode;
};

function collectPlanNodes(node: ExplainPlanNode | undefined): ExplainPlanNode[] {
  if (!node) return [];
  const nested = node.Plans?.flatMap((plan) => collectPlanNodes(plan)) ?? [];
  return [node, ...nested];
}

async function explain(sql: string, params: unknown[]): Promise<ExplainPlanNode | undefined> {
  const result = await prisma.$queryRawUnsafe<ExplainResult[]>(
    `EXPLAIN (FORMAT JSON) ${sql}`,
    ...params,
  );

  const top = result[0] as unknown as { "QUERY PLAN"?: Array<{ Plan?: ExplainPlanNode }> };
  return top?.["QUERY PLAN"]?.[0]?.Plan;
}

async function run(): Promise<void> {
  const checks = [
    {
      name: "appointment-clinic-status-startTime",
      sql: `SELECT id FROM "Appointment" WHERE "clinicId" = $1 AND "status" = $2 ORDER BY "startTime" DESC LIMIT 50`,
      params: ["clinic-plan-check", "SCHEDULED"],
      blockedSeqScanTable: "Appointment",
    },
    {
      name: "patient-clinic-createdAt",
      sql: `SELECT id FROM "Patient" WHERE "clinicId" = $1 ORDER BY "createdAt" DESC LIMIT 50`,
      params: ["clinic-plan-check"],
      blockedSeqScanTable: "Patient",
    },
  ];

  let hasFailure = false;

  for (const check of checks) {
    const plan = await explain(check.sql, check.params);
    const nodes = collectPlanNodes(plan);
    const hasSeqScan = nodes.some(
      (node) =>
        node["Node Type"] === "Seq Scan" &&
        node["Relation Name"] === check.blockedSeqScanTable,
    );

    process.stdout.write(
      `${check.name}: ${hasSeqScan ? "FAIL (sequential scan detected)" : "PASS"}\n`,
    );

    if (hasSeqScan) {
      hasFailure = true;
    }
  }

  if (hasFailure) {
    process.exit(1);
  }
}

run()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown query plan check error";
    process.stderr.write(`${message}\n`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
