import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import { blankJsComments } from "../lib/check-runner.mjs";
import {
  PLACEHOLDER_CLINIC_VALUES,
  findPlaceholderClinicBindings,
  findPlaceholderClinicPaths,
} from "./check-placeholder-clinic-scope.mjs";

/** The bug that shipped: a literal "current" in a real clinics path. */
const SHIPPED = `
  export const complianceApi = {
    getSummary: <T>() => api.get<T>(\`/clinics/current/compliance\`),
    getRecentAuditLogs: <T>() => api.get<T>("/audit/recent?limit=5"),
    getDataSubjectRequests: <T>() =>
      api.get<T>(\`/clinics/current/data-subject-requests\`),
    createDataSubjectRequest: <T>(data: unknown) =>
      api.post<T>(\`/clinics/current/data-subject-requests\`, data),
    updateDataSubjectRequestStatus: <T>(requestId: string, status: string) =>
      api.patch<T>(\`/clinics/current/data-subject-requests/\${requestId}\`, {
        status,
      }),
  };
`;

test("findPlaceholderClinicPaths: reports every shipped placeholder path", () => {
  const findings = findPlaceholderClinicPaths(blankJsComments(SHIPPED));
  assert.equal(findings.length, 4);
  assert.ok(findings.every((f) => f.rule === "placeholder-clinic-path"));
  assert.match(findings[0].detail, /sends the literal "current"/);
  assert.match(findings[0].detail, /403/);
});

test("findPlaceholderClinicPaths: leaves a real clinic id alone", () => {
  const source = `
    api.get(\`/clinics/\${clinicId}/compliance\`);
    api.validate("/clinics/clinic-7/data-subject-requests", schema);
  `;
  assert.deepEqual(findPlaceholderClinicPaths(blankJsComments(source)), []);
});

test("findPlaceholderClinicPaths: does not report a longer word in that segment", () => {
  // `currentPatient` is a legitimate id-shaped value; only the bare placeholder
  // counts, which is why the pattern is anchored on segment boundaries.
  const source = `api.get("/clinics/currentPatient/stats");`;
  assert.deepEqual(findPlaceholderClinicPaths(blankJsComments(source)), []);
});

test("findPlaceholderClinicPaths: ignores a placeholder outside a clinics path", () => {
  const source = `
    api.get("/patients/current/timeline");
    api.get("/settings/view");
  `;
  assert.deepEqual(findPlaceholderClinicPaths(blankJsComments(source)), []);
});

test("findPlaceholderClinicPaths: ignores a placeholder outside an API helper", () => {
  // A negative assertion names the bug on purpose. Only literals inside a
  // recognized helper are read, so this stays silent.
  const source = `
    expect(String(call[0])).not.toContain("/clinics/current");
    navigate("/clinics/current");
  `;
  assert.deepEqual(findPlaceholderClinicPaths(blankJsComments(source)), []);
});

test("findPlaceholderClinicPaths: ignores the bug quoted in a comment", () => {
  const source = `
    /**
     * getSummary: <T>() => api.get<T>(\`/clinics/current/compliance\`)
     */
    export const x = 1;
  `;
  assert.deepEqual(findPlaceholderClinicPaths(blankJsComments(source)), []);
});

test("findPlaceholderClinicPaths: accepts a query string on a placeholder segment", () => {
  const findings = findPlaceholderClinicPaths(
    blankJsComments(`api.get("/clinics/current/compliance?tab=sla");`),
  );
  assert.equal(findings.length, 1);
});

test("findPlaceholderClinicBindings: reports the shipped binding", () => {
  const findings = findPlaceholderClinicBindings(
    blankJsComments('export function Panel() {\n  const clinicId = "current";\n}'),
  );
  assert.equal(findings.length, 1);
  assert.equal(findings[0].rule, "placeholder-clinic-binding");
  assert.match(findings[0].detail, /take the real id from the session/);
  assert.equal(findings[0].line, 2);
});

test("findPlaceholderClinicBindings: catches an interpolated path the path rule cannot see", () => {
  // The path rule reads literals; this one catches the id the path is built
  // from. Either rule alone misses this shape.
  const source = `
    const clinicId = "current";
    api.get(\`/clinics/\${clinicId}/compliance\`);
  `;
  const blanked = blankJsComments(source);
  assert.deepEqual(findPlaceholderClinicPaths(blanked), []);
  assert.equal(findPlaceholderClinicBindings(blanked).length, 1);
});

test("findPlaceholderClinicBindings: ignores a placeholder on an unrelated name", () => {
  const source = `
    const active = "current";
    const status = "me";
    let label = "self";
  `;
  assert.deepEqual(findPlaceholderClinicBindings(blankJsComments(source)), []);
});

test("findPlaceholderClinicBindings: ignores a real id on a clinic name", () => {
  const source = `
    const clinicId = user.clinicId;
    const clinicName = "Sunrise";
  `;
  assert.deepEqual(findPlaceholderClinicBindings(blankJsComments(source)), []);
});

test("findPlaceholderClinicBindings: reads a typed declaration", () => {
  const findings = findPlaceholderClinicBindings(
    blankJsComments('const clinicId: string = "current";'),
  );
  assert.equal(findings.length, 1);
});

test("findPlaceholderClinicBindings: covers every placeholder word", () => {
  for (const value of PLACEHOLDER_CLINIC_VALUES) {
    const findings = findPlaceholderClinicBindings(
      blankJsComments(`const clinicId = "${value}";`),
    );
    assert.equal(findings.length, 1, `expected "${value}" to be reported`);
  }
});

test("repo tree: no client file ships a placeholder clinic id", () => {
  // Reads the real source rather than fixtures, so a re-introduced
  // `const clinicId = "current"` fails here as well as in the check output.
  const api = readFileSync("apps/app/src/features/settings/api/settings.api.ts", "utf8");
  const blanked = blankJsComments(api);
  assert.deepEqual(findPlaceholderClinicPaths(blanked), []);
  assert.deepEqual(findPlaceholderClinicBindings(blanked), []);
  assert.doesNotMatch(blanked, /clinics\/current/);
});