import assert from "node:assert/strict";
import test from "node:test";
import { chmodSync, symlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { credentialFixture, privateFixture } from "./test/test-helpers.mjs";
import {
  validateTarget,
  validateCredentials,
  loadCredentials,
  validateRoute,
} from "./safety.mjs";

test("only explicit-port literal loopback origins are accepted", () => {
  assert.equal(
    validateTarget("http://127.0.0.1:3001"),
    "http://127.0.0.1:3001",
  );
  assert.equal(validateTarget("http://[::1]:3001/"), "http://[::1]:3001");
  for (const target of [
    "https://api.docita.work",
    "http://localhost:3001",
    "http://127.1:3001",
    "http://2130706433:3001",
    "http://127.0.0.1.example.com:3001",
    "http://127.0.0.1:3001/api",
    "http://127.0.0.1:3001?token=secret",
    "http://u:p@127.0.0.1:3001",
    "http://127.0.0.1",
    "http://127.0.0.1:0",
    "http://127.0.0.1:65536",
    "file:///tmp/api",
    "http://127.0.0.1:3001\n",
  ])
    assert.throws(() => validateTarget(target));
});

test("credentials require 25 distinct staff subjects and clinics with matching JWT claims", () => {
  const fixture = credentialFixture();
  const credentials = validateCredentials(fixture);
  assert.equal(credentials.length, 25);
  assert.equal(credentials[0].alias, "clinic-01");
  assert.equal(credentials[0].bearerToken, fixture.tenants[0].bearerToken);
  const variants = [
    { ...fixture, environment: "production" },
    { ...fixture, tenants: fixture.tenants.slice(0, 24) },
    { ...fixture, unexpected: "token" },
  ];
  const duplicate = structuredClone(fixture);
  duplicate.tenants[1] = { ...duplicate.tenants[0], alias: "clinic-02" };
  variants.push(duplicate);
  const mismatch = structuredClone(fixture);
  mismatch.tenants[0].clinicId = "another-clinic";
  variants.push(mismatch);
  const expired = credentialFixture(Date.now() - 7_200_000);
  variants.push(expired);
  const expiresDuringRun = credentialFixture(Date.now() - 3_000_000);
  assert.throws(() =>
    validateCredentials(expiresDuringRun, { minValidityMs: 900_000 }),
  );
  for (const value of variants) assert.throws(() => validateCredentials(value));
});

test("internal-role bypass, unsigned JWT and a reused subject cannot pretend to cover clinics", () => {
  for (const change of [
    (header, payload) => {
      header.alg = "none";
    },
    (header, payload) => {
      payload.role = "INTERNAL";
    },
    (header, payload) => {
      payload.sub = "synthetic-user-2";
    },
  ]) {
    const fixture = credentialFixture();
    const parts = fixture.tenants[0].bearerToken.split(".");
    const header = JSON.parse(Buffer.from(parts[0], "base64url"));
    const payload = JSON.parse(Buffer.from(parts[1], "base64url"));
    change(header, payload);
    fixture.tenants[0].bearerToken = `${Buffer.from(JSON.stringify(header)).toString("base64url")}.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.${parts[2]}`;
    assert.throws(() => validateCredentials(fixture));
  }
});

test("private regular credential files load; public modes, symlinks and invalid JSON fail without payload leakage", (t) => {
  const fixture = credentialFixture();
  const { directory, filename } = privateFixture(t, fixture);
  assert.equal(loadCredentials(filename).length, 25);
  chmodSync(filename, 0o644);
  assert.throws(() => loadCredentials(filename));
  chmodSync(filename, 0o600);
  const link = path.join(directory, "linked.json");
  symlinkSync(filename, link);
  assert.throws(() => loadCredentials(link));
  writeFileSync(filename, "secret-token-invalid-json");
  assert.throws(
    () => loadCredentials(filename),
    (error) => !error.message.includes("secret-token"),
  );
});

test("only the four canonical bounded GET paths can carry credentials", () => {
  assert.equal(
    validateRoute({
      id: "patient-list",
      method: "GET",
      expectedStatus: 200,
      path: "/api/v1/patients?page=1&limit=20",
    }).id,
    "patient-list",
  );
  for (const route of [
    {
      id: "patient-list",
      method: "POST",
      path: "/api/v1/patients?page=1&limit=20",
    },
    { id: "patient-list", method: "GET", path: "https://example.com" },
    {
      id: "patient-list",
      method: "GET",
      path: "/api/v1/patients?token=secret",
    },
    {
      id: "webhook",
      method: "GET",
      path: "/api/v1/webhooks/payments/razorpay",
    },
  ])
    assert.throws(() => validateRoute(route));
});
