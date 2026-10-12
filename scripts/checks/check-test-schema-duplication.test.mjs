import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  collectObjectLiterals,
  findDuplicatedSchemas,
  isHelperPath,
  readObjectKeys,
} from "./check-test-schema-duplication.mjs";

test("readObjectKeys: reads top-level keys", () => {
  assert.deepEqual(readObjectKeys("{ orderId: z.string(), amountCents: z.number() }"), [
    "orderId",
    "amountCents",
  ]);
});

test("readObjectKeys: ignores keys inside a nested object", () => {
  const keys = readObjectKeys(
    "{ a: z.string(), nested: z.object({ b: z.string(), c: z.number() }) }",
  );
  assert.deepEqual(keys, ["a", "nested"]);
});

test("readObjectKeys: reads quoted keys", () => {
  assert.deepEqual(readObjectKeys('{ "a-b": z.string(), c: z.string() }'), ["a-b", "c"]);
});

test("readObjectKeys: does not split on a comma inside a nested literal", () => {
  const keys = readObjectKeys(
    "{ a: z.object({ x: z.string(), y: z.string() }), b: z.number() }",
  );
  assert.deepEqual(keys, ["a", "b"]);
});

test("collectObjectLiterals: skips nested z.object literals", () => {
  // Regression guard. The first run reported `followUpSchema`'s inline
  // `patient: z.object({id, firstName, lastName})` as a duplicate of a shared
  // contract. A nested object inside a bespoke outer shape is ordinary
  // composition, and any 2-3 field object collides with something somewhere.
  const literals = collectObjectLiterals(`
    const followUpSchema = z.object({
      id: z.string(),
      patient: z.object({ id: z.string(), firstName: z.string() }),
    });
  `);
  assert.deepEqual(literals.map((l) => l.keys), [["id", "patient"]]);
});

test("collectObjectLiterals: names the literal from its const binding", () => {
  const literals = collectObjectLiterals(
    `const checkoutSchema = z.object({ orderId: z.string() });`,
  );
  assert.equal(literals[0].name, "checkoutSchema");
  assert.equal(literals[0].line, 1);
});

test("collectObjectLiterals: ignores schemas quoted inside a comment", () => {
  // A doc block that shows the forbidden shape is the natural way to explain
  // why something is wrong; scanning it would report a defect that does not
  // exist.
  const literals = collectObjectLiterals(`
    /**
     * This used to be:
     *   const bad = z.object({ orderId: z.string() });
     */
    export const good = 1;
  `);
  assert.deepEqual(literals, []);
});

test("isHelperPath: accepts test helper locations", () => {
  assert.equal(isHelperPath("apps/app/e2e/utils/patient-helpers.ts"), true);
  assert.equal(isHelperPath("apps/api/test/helpers/setup.ts"), true);
  assert.equal(isHelperPath("apps/app/src/lib/some-helper.ts"), true);
});

test("isHelperPath: rejects product code and spec files", () => {
  assert.equal(isHelperPath("apps/app/src/features/x/api.ts"), false);
  // A spec asserting a shape inline is the point of the assertion.
  assert.equal(isHelperPath("apps/app/e2e/subscription.spec.ts"), false);
  assert.equal(isHelperPath("apps/app/src/foo.test.ts"), false);
});

test("findDuplicatedSchemas: flags an exact key-set match", () => {
  const contracts = new Map([
    ["orderId|amountCents|currency|razorpayKeyId", [
      "orderId",
      "amountCents",
      "currency",
      "razorpayKeyId",
    ]],
  ]);
  const helpers = [
    {
      file: "e2e/helpers.ts",
      literals: [
        { name: "checkoutSchema", keys: ["orderId", "amountCents", "currency", "razorpayKeyId"], line: 12 },
      ],
    },
  ];
  const findings = findDuplicatedSchemas(helpers, contracts);
  assert.equal(findings.length, 1);
  assert.match(findings[0], /e2e\/helpers\.ts:12 checkoutSchema/);
});

test("findDuplicatedSchemas: leaves a non-matching key set alone", () => {
  const contracts = new Map([["a|b", ["a", "b"]]]);
  const helpers = [
    {
      file: "e2e/helpers.ts",
      literals: [{ name: "other", keys: ["a", "b", "c"], line: 3 }],
    },
  ];
  assert.deepEqual(findDuplicatedSchemas(helpers, contracts), []);
});

test("findDuplicatedSchemas: ignores a single-field projection on either side", () => {
  // Regression guard. The required-keys subset pass legitimately yields a
  // one-key set — `contracts/appointments.ts` and `patient/metrics.ts` both
  // have `{id}` as their only required field — so a bare
  // `z.object({ id: z.string() })` helper projection matched them and the
  // check reported it. Those projections are ubiquitous and correct.
  const contracts = new Map([["id", ["id"]]]);
  const helpers = [
    {
      file: "e2e/helpers.ts",
      literals: [{ name: "idOnly", keys: ["id"], line: 7 }],
    },
  ];
  assert.deepEqual(findDuplicatedSchemas(helpers, contracts), []);
});

test("findDuplicatedSchemas: ignores a two-field helper against a one-field contract", () => {
  const contracts = new Map([["a|b", ["a"]]]);
  const helpers = [
    { file: "e2e/helpers.ts", literals: [{ name: "ab", keys: ["a", "b"], line: 2 }] },
  ];
  assert.deepEqual(findDuplicatedSchemas(helpers, contracts), []);
});

// --- repo-tree invariants -------------------------------------------------

test("repo tree: the check classifies a non-trivial helper population", () => {
  const output = execFileSync(
    "node",
    [join("scripts/checks", "check-test-schema-duplication.mjs")],
    { encoding: "utf8", cwd: process.cwd() },
  );
  const literals = Number(output.match(/compared (\d+) helper schema literal/)[1]);
  const files = Number(output.match(/across (\d+) helper file/)[1]);
  const sets = Number(output.match(/against (\d+) contract key set/)[1]);

  assert.ok(literals > 3, `expected real helper schemas, got ${literals}`);
  assert.ok(files > 2, `expected real helper files, got ${files}`);
  assert.ok(sets > 100, `expected the contract corpus, got ${sets}`);
  assert.ok(output.includes("passed"), "repo tree must be clean");
});

test("repo tree: the e2e helpers read the shared contracts", () => {
  // Reads the real files rather than fixtures, so a re-introduced inline copy
  // fails here as well as in the check output.
  const portal = readFileSync("apps/app/e2e/utils/portal-helpers.ts", "utf8");
  assert.match(portal, /tokenIssueResponseSchema/);
  assert.doesNotMatch(portal, /const portalVerifyOtpResponseSchema = z\.object/);

  const patients = readFileSync("apps/app/e2e/utils/patient-helpers.ts", "utf8");
  assert.match(patients, /onboardingCheckoutResponseSchema/);
});