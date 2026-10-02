import assert from "node:assert/strict";
import test from "node:test";
import { applyProductionBranchScope } from "../workflow/production-branch-scope.mjs";

const detected = {
  api: false,
  worker: true,
  app: true,
  internal: false,
  landing: true,
  db: false,
};
test("the authorized dashboard branch releases API and internal without unrelated apps", () => {
  assert.deepEqual(
    applyProductionBranchScope(
      detected,
      "refs/heads/fix/actual-operational-metrics",
    ),
    {
      api: true,
      worker: false,
      app: false,
      internal: true,
      landing: false,
      db: false,
    },
  );
});
test("main retains path-based deployment targets", () => {
  assert.deepEqual(
    applyProductionBranchScope(detected, "refs/heads/main"),
    detected,
  );
});
test("branch scoping never hides database changes", () => {
  assert.equal(
    applyProductionBranchScope(
      { ...detected, db: true },
      "refs/heads/fix/actual-operational-metrics",
    ).db,
    true,
  );
});
