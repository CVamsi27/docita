import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Fake signed-looking tokens for local stub tests; never API credentials. */
export function credentialFixture(now = Date.now()) {
  return {
    version: 1,
    environment: "isolated-local",
    tenants: Array.from({ length: 25 }, (_, index) => {
      const alias = `clinic-${String(index + 1).padStart(2, "0")}`;
      const clinicId = `synthetic-clinic-${index + 1}`;
      const encode = (value) =>
        Buffer.from(JSON.stringify(value)).toString("base64url");
      const bearerToken = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({
        sub: `synthetic-user-${index + 1}`,
        clinicId,
        role: "DOCTOR",
        exp: Math.floor(now / 1_000) + 3_600,
      })}.not-a-real-signature`;
      return { alias, clinicId, bearerToken };
    }),
  };
}

export function privateFixture(t, contents) {
  const directory = mkdtempSync(path.join(tmpdir(), "docita-capacity-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const filename = path.join(directory, "credentials.json");
  writeFileSync(filename, JSON.stringify(contents), { mode: 0o600 });
  return { directory, filename };
}
