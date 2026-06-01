import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

export function findRepoRoot(startDirectory = process.cwd()): string {
  let current = resolve(startDirectory);

  while (true) {
    if (existsSync(resolve(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = resolve(current, "..");
    if (parent === current) {
      throw new Error(
        `Unable to locate pnpm-workspace.yaml from ${startDirectory}`,
      );
    }
    current = parent;
  }
}

export function readRepoDatabaseUrl(): string | null {
  const fromEnv = process.env["DATABASE_URL"]?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const envPath = resolve(findRepoRoot(), ".env");
  if (!existsSync(envPath)) {
    return null;
  }

  const file = readFileSync(envPath, "utf8");
  for (const line of file.split(/\r?\n/)) {
    if (!line.startsWith("DATABASE_URL=")) continue;
    const value = line.slice("DATABASE_URL=".length).trim();
    if (!value) break;
    return value.replace(/^"(.*)"$/, "$1");
  }

  return null;
}

export function requireRepoDatabaseUrl(): string {
  const databaseUrl = readRepoDatabaseUrl();
  if (databaseUrl) {
    return databaseUrl;
  }

  throw new Error(
    "DATABASE_URL was not found in process.env or the repository .env file.",
  );
}
