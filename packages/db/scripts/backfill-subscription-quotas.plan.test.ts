import assert from "node:assert/strict";
import { test } from "node:test";
import type { ClinicTier } from "@prisma/client";
import {
  QUOTA_FIELDS,
  computeQuotaChanges,
  formatQuotaChange,
  type QuotaChange,
  type QuotaColumns,
  type QuotaPlan,
  type SubscriptionQuotaRow,
} from "./backfill-subscription-quotas.plan.ts";

function catalogTarget(overrides: Partial<QuotaColumns> = {}): QuotaColumns {
  return {
    includedPatients: 500,
    includedAppointments: 2000,
    includedStorageGB: 5,
    includedUsers: 5,
    ...overrides,
  };
}

function subscriptionRow(
  overrides: Partial<SubscriptionQuotaRow> = {},
): SubscriptionQuotaRow {
  return {
    id: "sub_1",
    clinicId: "clinic_1",
    plan: "STARTER",
    includedPatients: 500,
    includedAppointments: 2000,
    includedStorageGB: 5,
    includedUsers: 5,
    ...overrides,
  };
}

function applyPlan(
  rows: readonly SubscriptionQuotaRow[],
  plan: QuotaPlan,
): SubscriptionQuotaRow[] {
  const targetById = new Map(
    plan.changes.map((change) => [change.subscription.id, change.target]),
  );
  return rows.map((row) => {
    const target = targetById.get(row.id);
    return target ? { ...row, ...target } : row;
  });
}

test("plans field-level changes for rows whose quotas drifted from the catalog", () => {
  const targetByTier = new Map<ClinicTier, QuotaColumns>([
    ["STARTER", catalogTarget()],
    ["HOSPITAL", catalogTarget({ includedPatients: 10000 })],
  ]);
  const rows: SubscriptionQuotaRow[] = [
    subscriptionRow({
      id: "sub_drifted",
      includedPatients: 100,
      includedUsers: 3,
    }),
    subscriptionRow({ id: "sub_matching" }),
    subscriptionRow({
      id: "sub_hospital_drifted",
      plan: "HOSPITAL",
      includedPatients: 500,
    }),
  ];

  const plan = computeQuotaChanges(targetByTier, rows);

  assert.equal(plan.changes.length, 2);

  const drifted: QuotaChange | undefined = plan.changes.find(
    (c) => c.subscription.id === "sub_drifted",
  );
  assert.ok(drifted);
  assert.deepEqual(drifted.changedFields, [
    "includedPatients",
    "includedUsers",
  ]);
  assert.deepEqual(drifted.target, catalogTarget());

  const hospital = plan.changes.find(
    (c) => c.subscription.id === "sub_hospital_drifted",
  );
  assert.ok(hospital);
  assert.deepEqual(hospital.changedFields, ["includedPatients"]);

  assert.equal(plan.changesByTier.get("STARTER"), 1);
  assert.equal(plan.changesByTier.get("HOSPITAL"), 1);
  assert.equal(plan.changedRowsByField.get("includedPatients"), 2);
  assert.equal(plan.changedRowsByField.get("includedUsers"), 1);
  assert.equal(plan.changedRowsByField.get("includedAppointments"), undefined);
  assert.equal(plan.unmappedPlans.size, 0);
});

test("applying every planned target and re-planning yields zero changes", () => {
  const targetByTier = new Map<ClinicTier, QuotaColumns>([
    ["STARTER", catalogTarget()],
    ["PROFESSIONAL", catalogTarget({ includedAppointments: 5000 })],
  ]);
  const rows: SubscriptionQuotaRow[] = [
    subscriptionRow({ id: "sub_a", includedPatients: 0, includedUsers: 1 }),
    subscriptionRow({
      id: "sub_b",
      plan: "PROFESSIONAL",
      includedAppointments: 42,
    }),
    subscriptionRow({ id: "sub_c" }),
  ];

  const firstRun = computeQuotaChanges(targetByTier, rows);
  assert.equal(firstRun.changes.length, 2);

  const appliedRows = applyPlan(rows, firstRun);
  const secondRun = computeQuotaChanges(targetByTier, appliedRows);

  assert.equal(secondRun.changes.length, 0);
  assert.equal(secondRun.changesByTier.size, 0);
  assert.equal(secondRun.changedRowsByField.size, 0);
  assert.equal(secondRun.unmappedPlans.size, 0);

  const thirdRun = computeQuotaChanges(
    targetByTier,
    applyPlan(appliedRows, secondRun),
  );
  assert.equal(thirdRun.changes.length, 0);
});

test("rows with a tier missing from the catalog are counted, not planned or thrown", () => {
  const targetByTier = new Map<ClinicTier, QuotaColumns>([
    ["STARTER", catalogTarget()],
  ]);
  const rows: SubscriptionQuotaRow[] = [
    subscriptionRow({ id: "sub_known", includedPatients: 0 }),
    subscriptionRow({ id: "sub_unknown_a", plan: "ENTERPRISE" }),
    subscriptionRow({ id: "sub_unknown_b", plan: "ENTERPRISE" }),
  ];

  const plan = computeQuotaChanges(targetByTier, rows);

  assert.equal(plan.changes.length, 1);
  assert.equal(plan.changes[0]?.subscription.id, "sub_known");
  assert.equal(plan.unmappedPlans.get("ENTERPRISE"), 2);
  assert.equal(plan.changesByTier.get("ENTERPRISE"), undefined);
});

test("QUOTA_FIELDS covers every quota column exactly once", () => {
  assert.deepEqual([...QUOTA_FIELDS].sort(), [
    "includedAppointments",
    "includedPatients",
    "includedStorageGB",
    "includedUsers",
  ]);
  assert.equal(new Set(QUOTA_FIELDS).size, QUOTA_FIELDS.length);
});

test("formatQuotaChange lists only changed fields as current -> target", () => {
  const formatted = formatQuotaChange(
    {
      includedPatients: 1,
      includedAppointments: 2,
      includedStorageGB: 3,
      includedUsers: 4,
    },
    catalogTarget(),
    ["includedPatients", "includedUsers"],
  );
  assert.equal(formatted, "includedPatients: 1 -> 500, includedUsers: 4 -> 5");
});
