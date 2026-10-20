import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { parse } from "smol-toml";

const repo = fileURLToPath(new URL("../../", import.meta.url));

function build(app, mode, status = 0) {
  const root = mkdtempSync(join(tmpdir(), "docita-frontend-build-"));
  const appRoot = join(root, "apps", app);
  const bin = join(root, "bin");
  const manifest = JSON.parse(
    readFileSync(join(repo, "apps", app, "package.json"), "utf8"),
  );
  const config = parse(
    readFileSync(join(repo, "apps", app, "wrangler.toml"), "utf8"),
  );
  mkdirSync(appRoot, { recursive: true });
  mkdirSync(bin);
  cpSync(
    join(repo, "apps", app, "wrangler.toml"),
    join(appRoot, "wrangler.toml"),
  );
  cpSync(join(repo, "apps", app, "public"), join(appRoot, "public"), {
    recursive: true,
  });
  // The command in the actual manifest is used, so missing build wiring fails.
  const helper = join(root, "scripts/deploy");
  mkdirSync(helper, { recursive: true });
  writeFileSync(join(root, "package.json"), '{"type":"module"}');
  const candidate = join(repo, "scripts/deploy/build-cloudflare-frontend.mjs");
  try {
    cpSync(candidate, join(helper, "build-cloudflare-frontend.mjs"));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  // Resolve the repository's already-installed TOML parser from the copied helper.
  const helperModules = join(root, "node_modules");
  cpSync(
    join(repo, "node_modules/smol-toml"),
    join(helperModules, "smol-toml"),
    { recursive: true, dereference: true },
  );
  const vite = `#!${process.execPath}
import { cpSync, mkdirSync, writeFileSync } from 'node:fs';
mkdirSync('dist', { recursive: true });
cpSync('public/_headers', 'dist/_headers');
writeFileSync('dist/build-input.json', JSON.stringify({
  api: process.env.VITE_API_URL, app: process.env.VITE_APP_URL,
  socket: process.env.VITE_SOCKET_URL, mainApp: process.env.VITE_MAIN_APP_URL,
  dsn: process.env.VITE_SENTRY_DSN, turnstile: process.env.VITE_TURNSTILE_SITE_KEY,
  args: process.argv.slice(2), nodeEnv: process.env.NODE_ENV
}));
process.exit(${status});
`;
  writeFileSync(join(bin, "vite"), vite);
  writeFileSync(
    join(bin, "pnpm"),
    `#!/bin/sh\n[ "$1" = exec ] || exit 97\nshift\nexec "$@"\n`,
  );
  chmodSync(join(bin, "vite"), 0o755);
  chmodSync(join(bin, "pnpm"), 0o755);
  try {
    const args = mode ? ` --mode ${mode}` : "";
    const result = spawnSync(
      "/bin/sh",
      ["-c", manifest.scripts["build:cloudflare"] + args],
      {
        cwd: appRoot,
        encoding: "utf8",
        env: {
          PATH: `${bin}:${dirname(process.execPath)}:/usr/bin:/bin`,
          HOME: root,
          VITE_APP_URL: config.env.production.vars.VITE_APP_URL,
          VITE_SENTRY_DSN: "https://production-alert.invalid/1",
          VITE_TURNSTILE_SITE_KEY: "public-staging-widget-fixture",
        },
      },
    );
    const read = (file) => {
      try {
        return readFileSync(join(appRoot, "dist", file), "utf8");
      } catch (error) {
        if (error.code !== "ENOENT") throw error;
        return undefined;
      }
    };
    return {
      ...result,
      config,
      headers: read("_headers"),
      input: JSON.parse(read("build-input.json") || "null"),
    };
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

for (const app of ["app", "internal"]) {
  test(`${app}: staging build selects staging URLs and CSP despite inherited production values`, () => {
    const result = build(app, "staging");
    assert.equal(result.status, 0, result.stderr);
    const stage = result.config.env.staging.vars;
    const production = result.config.env.production.vars;
    assert.equal(result.input.app, stage.VITE_APP_URL);
    assert.equal(result.input.api, stage.VITE_API_URL);
    assert.equal(
      result.input.dsn,
      "",
      "staging must not send synthetic events to production alerts",
    );
    assert.equal(result.input.turnstile, "public-staging-widget-fixture");
    assert.equal(result.input.nodeEnv, "production");
    if (app === "app") assert.equal(result.input.socket, stage.VITE_SOCKET_URL);
    else assert.equal(result.input.mainApp, stage.VITE_MAIN_APP_URL);
    assert.ok(result.headers.includes(stage.API_PROXY_TARGET));
    assert.ok(
      result.headers.includes(stage.API_PROXY_TARGET.replace("https:", "wss:")),
    );
    assert.ok(!result.headers.includes(production.API_PROXY_TARGET));
    assert.ok(
      !result.headers.includes(
        production.API_PROXY_TARGET.replace("https:", "wss:"),
      ),
    );
    for (const source of [
      "https://challenges.cloudflare.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ]) {
      assert.ok(result.headers.includes(source));
    }
    assert.deepEqual(result.input.args, ["build", "--mode", "staging"]);
  });

  test(`${app}: default production build preserves production headers and URLs`, () => {
    const result = build(app);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.input.app,
      result.config.env.production.vars.VITE_APP_URL,
    );
    assert.equal(
      result.headers,
      readFileSync(join(repo, "apps", app, "public/_headers"), "utf8"),
    );
    assert.deepEqual(result.input.args, ["build", "--mode", "production"]);
  });

  test(`${app}: build failures propagate and unknown modes fail before bundling`, () => {
    assert.equal(build(app, "staging", 42).status, 42);
    const invalid = build(app, "preview");
    assert.notEqual(invalid.status, 0);
    assert.equal(invalid.input, null);
  });

  test(`${app}: staging deploy explicitly selects the staging build mode`, () => {
    const manifest = JSON.parse(
      readFileSync(join(repo, "apps", app, "package.json"), "utf8"),
    );
    assert.match(
      manifest.scripts["deploy:cloudflare:staging"],
      /build:cloudflare --mode staging && wrangler deploy .*--env staging/,
    );
  });
}

test("clinician HTML does not preconnect to the production API", () => {
  const html = readFileSync(join(repo, "apps/app/index.html"), "utf8");
  const config = parse(
    readFileSync(join(repo, "apps/app/wrangler.toml"), "utf8"),
  );
  assert.ok(!html.includes(config.env.production.vars.API_PROXY_TARGET));
});
