import assert from "node:assert/strict";
import test from "node:test";

import {
  collectPrismaEnumMembers,
  findDriftedKeys,
  findUpperSnakeRecordMaps,
} from "./check-enum-map-drift.mjs";

const SCHEMA = `
enum LabTestOrderStatus {
  ORDERED
  SAMPLE_COLLECTED
  PENDING
  RESULT_READY
  COMPLETED
  CANCELLED
}

enum Role {
  DOCTOR
  ADMIN
  ADMIN_DOCTOR
}
`;

test("collectPrismaEnumMembers: collects every member across enums", () => {
  const members = collectPrismaEnumMembers(SCHEMA);
  assert.ok(members.has("SAMPLE_COLLECTED"));
  assert.ok(members.has("ADMIN_DOCTOR"));
  assert.ok(members.has("ORDERED"));
});

test("collectPrismaEnumMembers: ignores comments and @@map lines", () => {
  const members = collectPrismaEnumMembers(`
enum X {
  // COMMENTED
  REAL
  @@map("other")
}
`);
  assert.deepEqual([...members], ["REAL"]);
});

test("collectPrismaEnumMembers: keeps the token when a member carries a default", () => {
  const members = collectPrismaEnumMembers(`
enum Y {
  QUEUED
  SENT @default(QUEUED)
}
`);
  assert.ok(members.has("SENT"));
  assert.ok(members.has("QUEUED"));
});

test("collectPrismaEnumMembers: empty when the schema declares no enum", () => {
  assert.equal(collectPrismaEnumMembers("model A { id String }").size, 0);
});

test("findUpperSnakeRecordMaps: selects an annotated UPPER_SNAKE map", () => {
  const maps = findUpperSnakeRecordMaps(
    'const V: Record<string, "outline"> = {\n  ORDERED: "outline",\n  COMPLETED: "default",\n};',
  );
  assert.equal(maps.length, 1);
  assert.deepEqual(maps[0].keys, ["ORDERED", "COMPLETED"]);
});

test("findUpperSnakeRecordMaps: skips a map with no Record annotation", () => {
  assert.deepEqual(
    findUpperSnakeRecordMaps('const V = {\n  ORDERED: "outline",\n};'),
    [],
  );
});

test("findUpperSnakeRecordMaps: skips a map with any camelCase key", () => {
  assert.deepEqual(
    findUpperSnakeRecordMaps(
      'const R: Record<string, string> = {\n  patient: "/p",\n  APPOINTMENT: "/a",\n};',
    ),
    [],
  );
});

test("findUpperSnakeRecordMaps: every key must qualify, not just the first", () => {
  // Guards against a weaker `UPPER_SNAKE.test(keys[0])`. That variant still
  // passes on today's tree only because no such map happens to lead with an
  // enum-like key; requiring all of them is what keeps precision.
  assert.deepEqual(
    findUpperSnakeRecordMaps(
      'const R: Record<string, string> = {\n  ORDERED: "/o",\n  getPatient: "/p",\n};',
    ),
    [],
  );
});

test("findUpperSnakeRecordMaps: skips a lowercase-keyed map", () => {
  assert.deepEqual(
    findUpperSnakeRecordMaps(
      'const L: Record<string, string> = {\n  admin: "Clinic Admin",\n};',
    ),
    [],
  );
});

test("findUpperSnakeRecordMaps: skips an empty map body", () => {
  assert.deepEqual(
    findUpperSnakeRecordMaps("const E: Record<string, string> = {};"),
    [],
  );
});

test("findUpperSnakeRecordMaps: handles a multi-line Record annotation", () => {
  const maps = findUpperSnakeRecordMaps(
    'const V: Record<\n  "ORDERED" | "COMPLETED",\n  string\n> = {\n  ORDERED: "a",\n  COMPLETED: "b",\n};',
  );
  assert.equal(maps.length, 1);
  assert.deepEqual(maps[0].keys, ["ORDERED", "COMPLETED"]);
});

test("findUpperSnakeRecordMaps: reports the declaration line", () => {
  const source =
    'const a = 1;\n\nconst V: Record<string, string> = {\n  ORDERED: "x",\n};';
  assert.equal(findUpperSnakeRecordMaps(source)[0].line, 3);
});

test("findDriftedKeys: flags a non-member key (the shipped LabsTab bug)", () => {
  const drifted = findDriftedKeys(
    'const V: Record<string, string> = {\n  ORDERED: "a",\n  COLLECTED: "b",\n};',
    collectPrismaEnumMembers(SCHEMA),
  );
  assert.deepEqual(drifted, [{ map: "V", line: 1, key: "COLLECTED" }]);
});

test("findDriftedKeys: nothing when every key is a member", () => {
  assert.deepEqual(
    findDriftedKeys(
      'const V: Record<string, string> = {\n  ORDERED: "a",\n  SAMPLE_COLLECTED: "b",\n};',
      collectPrismaEnumMembers(SCHEMA),
    ),
    [],
  );
});

test("findDriftedKeys: flags every stray key in a multi-key map", () => {
  const drifted = findDriftedKeys(
    'const V: Record<string, string> = {\n  IN_PROGRESS: "a",\n  COLLECTED: "b",\n  ORDERED: "c",\n};',
    collectPrismaEnumMembers(SCHEMA),
  );
  assert.deepEqual(
    drifted.map((d) => d.key),
    ["IN_PROGRESS", "COLLECTED"],
  );
});

test("findDriftedKeys: an empty enum set flags everything rather than passing", () => {
  const drifted = findDriftedKeys(
    'const V: Record<string, string> = {\n  ORDERED: "a",\n};',
    new Set(),
  );
  assert.deepEqual(
    drifted.map((d) => d.key),
    ["ORDERED"],
  );
});
