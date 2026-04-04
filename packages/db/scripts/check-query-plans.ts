import prisma from "./prisma-script-client";

type ExplainPlanNode = {
  "Node Type"?: string;
  Plans?: ExplainPlanNode[];
  "Relation Name"?: string;
  "Index Name"?: string;
};

type ExplainRow = {
  "QUERY PLAN"?: Array<{ Plan?: ExplainPlanNode }>;
};

type ExplainClient = {
  $queryRawUnsafe: <T = unknown>(
    query: string,
    ...params: unknown[]
  ) => Promise<T>;
  $executeRawUnsafe: (query: string, ...params: unknown[]) => Promise<unknown>;
};

type QueryPlanCheck = {
  name: string;
  sql: string;
  params: unknown[];
  blockedSeqScanTable: string;
  requiredIndexes: string[];
};

function collectPlanNodes(node: ExplainPlanNode | undefined): ExplainPlanNode[] {
  if (!node) return [];
  const nested = node.Plans?.flatMap((plan) => collectPlanNodes(plan)) ?? [];
  return [node, ...nested];
}

function collectIndexNames(nodes: ExplainPlanNode[]): Set<string> {
  const names = new Set<string>();
  for (const node of nodes) {
    if (node["Index Name"]) {
      names.add(node["Index Name"]);
    }
  }
  return names;
}

async function explain(
  client: ExplainClient,
  sql: string,
  params: unknown[],
): Promise<ExplainPlanNode | undefined> {
  const result = await client.$queryRawUnsafe<ExplainRow[]>(
    `EXPLAIN (FORMAT JSON, COSTS OFF, SUMMARY OFF, TIMING OFF) ${sql}`,
    ...params,
  );

  return result?.[0]?.["QUERY PLAN"]?.[0]?.Plan;
}

async function getExistingIndexes(
  client: ExplainClient,
  indexNames: string[],
): Promise<Set<string>> {
  if (indexNames.length === 0) {
    return new Set<string>();
  }

  const rows = await client.$queryRawUnsafe<Array<{ indexname: string }>>(
    `SELECT indexname
     FROM pg_indexes
     WHERE schemaname = 'public'
       AND indexname = ANY($1)`,
    indexNames,
  );

  return new Set(rows.map((row) => row.indexname));
}

async function run(): Promise<void> {
  const checks: QueryPlanCheck[] = [
    {
      name: "appointment-clinic-status-start-time",
      sql: `SELECT id
            FROM "Appointment"
            WHERE "clinicId" = $1
              AND "status" = $2
            ORDER BY "startTime" DESC, id DESC
            LIMIT 50`,
      params: ["clinic-plan-check", "SCHEDULED"],
      blockedSeqScanTable: "Appointment",
      requiredIndexes: [
        "Appointment_clinicId_status_startTime_idx",
        "Appointment_clinicId_startTime_id_idx",
      ],
    },
    {
      name: "patient-portal-appointments-patient-clinic-start-time",
      sql: `SELECT id
            FROM "Appointment"
            WHERE "patientId" = $1
              AND "clinicId" = $2
            ORDER BY "startTime" DESC
            LIMIT 50`,
      params: ["patient-plan-check", "clinic-plan-check"],
      blockedSeqScanTable: "Appointment",
      requiredIndexes: ["Appointment_patientId_clinicId_startTime_idx"],
    },
    {
      name: "user-admin-lookup-clinic-role-created-at",
      sql: `SELECT id
            FROM "User"
            WHERE "clinicId" = $1
              AND role = $2
            ORDER BY "createdAt" ASC
            LIMIT 20`,
      params: ["clinic-plan-check", "ADMIN"],
      blockedSeqScanTable: "User",
      requiredIndexes: ["User_clinicId_role_createdAt_idx"],
    },
    {
      name: "staff-notification-unread",
      sql: `SELECT id
            FROM "StaffNotification"
            WHERE "userId" = $1
              AND "deletedAt" IS NULL
              AND "isRead" = false
            ORDER BY priority DESC, "createdAt" DESC
            LIMIT 20`,
      params: ["user-plan-check"],
      blockedSeqScanTable: "StaffNotification",
      requiredIndexes: ["StaffNotification_unread_priority_idx"],
    },
    {
      name: "subscription-reminder-dedupe",
      sql: `SELECT id
            FROM "SubscriptionReminder"
            WHERE "clinicId" = $1
              AND type = $2
              AND channel = $3
              AND "createdAt" >= $4
              AND "createdAt" <= $5
            ORDER BY "createdAt" DESC
            LIMIT 1`,
      params: [
        "clinic-plan-check",
        "usage_consultations_80_2026-01",
        "IN_APP",
        new Date("2026-01-01T00:00:00.000Z"),
        new Date("2026-01-31T23:59:59.999Z"),
      ],
      blockedSeqScanTable: "SubscriptionReminder",
      requiredIndexes: ["SubscriptionReminder_clinicId_type_channel_createdAt_idx"],
    },
  ];

  let hasFailure = false;

  await prisma.$transaction(async (tx) => {
    const explainClient: ExplainClient = tx;
    await explainClient.$executeRawUnsafe("SET LOCAL enable_seqscan = off");
    await explainClient.$executeRawUnsafe("SET LOCAL enable_sort = off");
    await explainClient.$executeRawUnsafe("SET LOCAL enable_bitmapscan = off");

    const requiredIndexNames = Array.from(
      new Set(checks.flatMap((check) => check.requiredIndexes)),
    );
    const existingIndexes = await getExistingIndexes(
      explainClient,
      requiredIndexNames,
    );

    for (const check of checks) {
      const plan = await explain(explainClient, check.sql, check.params);
      const nodes = collectPlanNodes(plan);
      const indexNames = collectIndexNames(nodes);
      const missingRequiredIndexes = check.requiredIndexes.filter(
        (name) => !existingIndexes.has(name),
      );
      const hasSeqScan = nodes.some(
        (node) =>
          node["Node Type"] === "Seq Scan" &&
          node["Relation Name"] === check.blockedSeqScanTable,
      );
      const hasIndexAccess = nodes.some((node) => {
        const nodeType = node["Node Type"] ?? "";
        const usesIndexNode =
          nodeType === "Index Scan" ||
          nodeType === "Index Only Scan" ||
          nodeType === "Bitmap Heap Scan" ||
          nodeType === "Bitmap Index Scan";
        if (!usesIndexNode) return false;

        return (
          node["Relation Name"] === check.blockedSeqScanTable ||
          typeof node["Index Name"] === "string"
        );
      });

      const pass =
        missingRequiredIndexes.length === 0 && hasIndexAccess && !hasSeqScan;
      process.stdout.write(`${check.name}: ${pass ? "PASS" : "FAIL"}\n`);

      if (!pass) {
        hasFailure = true;
        process.stdout.write(`  required indexes: ${check.requiredIndexes.join(", ")}\n`);
        process.stdout.write(
          `  missing required: ${missingRequiredIndexes.length > 0 ? missingRequiredIndexes.join(", ") : "none"}\n`,
        );
        process.stdout.write(
          `  used indexes: ${indexNames.size > 0 ? Array.from(indexNames).join(", ") : "none"}\n`,
        );
        process.stdout.write(`  has indexed access: ${hasIndexAccess}\n`);
        process.stdout.write(
          `  seq scan on ${check.blockedSeqScanTable}: ${hasSeqScan}\n`,
        );
      }
    }
  });

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
