import {
  constants,
  openSync,
  fstatSync,
  readFileSync,
  closeSync,
  lstatSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";

export function validateTarget(raw) {
  const match =
    typeof raw === "string" &&
    raw.trim() === raw &&
    /^(https?):\/\/(127\.0\.0\.1|\[::1\]):([1-9]\d{0,4})\/?$/.exec(raw);
  if (!match || Number(match[3]) > 65_535) {
    throw new Error(
      "Target must be an explicit-port literal 127.0.0.1 or [::1] HTTP(S) origin, without path, credentials, query or fragment.",
    );
  }
  return new URL(raw).origin;
}

function exactKeys(value, keys) {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

/** JWT claims are a declaration; only the target API can verify signature and current DB membership. */
export function validateCredentials(
  document,
  { now = Date.now(), minValidityMs = 0 } = {},
) {
  const invalid = () =>
    new Error(
      "Credentials must declare 25 distinct local staff users/clinics, with matching unexpired signed-JWT claims and canonical clinic aliases.",
    );
  if (
    !exactKeys(document, ["version", "environment", "tenants"]) ||
    document.version !== 1 ||
    document.environment !== "isolated-local" ||
    !Array.isArray(document.tenants) ||
    document.tenants.length !== 25
  )
    throw invalid();
  const aliases = new Set();
  const clinics = new Set();
  const subjects = new Set();
  const tokens = new Set();
  const staffRoles = new Set([
    "DOCTOR",
    "ADMIN_DOCTOR",
    "ADMIN",
    "NURSE",
    "RECEPTIONIST",
    "LAB",
  ]);
  const normalized = document.tenants.map((entry) => {
    if (
      !exactKeys(entry, ["alias", "clinicId", "bearerToken"]) ||
      !/^clinic-(0[1-9]|1\d|2[0-5])$/.test(entry.alias) ||
      typeof entry.clinicId !== "string" ||
      !/^[A-Za-z0-9_-]{1,120}$/.test(entry.clinicId) ||
      typeof entry.bearerToken !== "string" ||
      entry.bearerToken.length > 8_192 ||
      !/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(
        entry.bearerToken,
      )
    )
      throw invalid();
    let header;
    let payload;
    try {
      const [encodedHeader, encodedPayload] = entry.bearerToken.split(".");
      header = JSON.parse(
        Buffer.from(encodedHeader, "base64url").toString("utf8"),
      );
      payload = JSON.parse(
        Buffer.from(encodedPayload, "base64url").toString("utf8"),
      );
    } catch {
      throw invalid();
    }
    if (
      !header ||
      !["HS256", "RS256", "ES256"].includes(header.alg) ||
      !payload ||
      payload.clinicId !== entry.clinicId ||
      !staffRoles.has(payload.role) ||
      typeof payload.sub !== "string" ||
      !payload.sub ||
      !Number.isFinite(payload.exp) ||
      payload.exp * 1_000 <= now + minValidityMs ||
      aliases.has(entry.alias) ||
      clinics.has(entry.clinicId) ||
      subjects.has(payload.sub) ||
      tokens.has(entry.bearerToken)
    )
      throw invalid();
    aliases.add(entry.alias);
    clinics.add(entry.clinicId);
    subjects.add(payload.sub);
    tokens.add(entry.bearerToken);
    return {
      alias: entry.alias,
      clinicId: entry.clinicId,
      bearerToken: entry.bearerToken,
    };
  });
  return normalized.sort((left, right) =>
    left.alias.localeCompare(right.alias),
  );
}

function requireIgnoredIfInGit(filename) {
  const found = spawnSync(
    "git",
    ["-C", path.dirname(filename), "rev-parse", "--show-toplevel"],
    { encoding: "utf8" },
  );
  if (found.status !== 0) return;
  const root = found.stdout.trim();
  const relative = path.relative(root, filename);
  const ignored = spawnSync("git", [
    "-C",
    root,
    "check-ignore",
    "-q",
    "--",
    relative,
  ]);
  const tracked = spawnSync("git", [
    "-C",
    root,
    "ls-files",
    "--error-unmatch",
    "--",
    relative,
  ]);
  if (ignored.status !== 0 || tracked.status === 0)
    throw new Error(
      "Credential files inside any Git repository must be ignored and untracked.",
    );
}

export function loadCredentials(filename, options) {
  let descriptor;
  try {
    if (!path.isAbsolute(filename) || lstatSync(filename).isSymbolicLink())
      throw new Error("Invalid file.");
    requireIgnoredIfInGit(filename);
    descriptor = openSync(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
    const stat = fstatSync(descriptor);
    if (
      !stat.isFile() ||
      stat.size > 262_144 ||
      stat.size === 0 ||
      (stat.mode & 0o077) !== 0 ||
      (typeof process.getuid === "function" && stat.uid !== process.getuid())
    )
      throw new Error("Invalid file.");
    return validateCredentials(
      JSON.parse(readFileSync(descriptor, "utf8")),
      options,
    );
  } catch {
    // Never echo parser excerpts, input paths or credential material.
    throw new Error(
      "Credential file rejected: use a private, owned, regular mode-0600 JSON file with 25 valid local tenant credentials; keep it ignored/untracked.",
    );
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

export function validateRoute(route) {
  const paths = {
    "patient-list": /^\/api\/v1\/patients\?page=1&limit=20$/,
    "appointment-list":
      /^\/api\/v1\/appointments\?date=\d{4}-\d{2}-\d{2}&limit=20&page=1$/,
    "prescription-list": /^\/api\/v1\/prescriptions\?page=1&limit=20$/,
    "invoice-list": /^\/api\/v1\/invoices\?page=1&limit=20$/,
  };
  if (
    !route ||
    route.method !== "GET" ||
    route.expectedStatus !== 200 ||
    !Object.hasOwn(paths, route.id) ||
    !paths[route.id].test(route.path)
  )
    throw new Error(
      "Only the four canonical bounded GET routes are permitted.",
    );
  return route;
}
