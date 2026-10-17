import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import YAML from "yaml";

const source = new URL("../../.github/workflows/deploy.yml", import.meta.url);

for (const job of ["deploy-app", "deploy-internal"]) {
  test(`${job} supplies the public Turnstile key to its frontend build`, () => {
    const workflow = YAML.parse(readFileSync(source, "utf8"));
    const build = workflow.jobs[job].steps.find(
      (step) => step.name === "Build and deploy",
    );
    assert.equal(
      build?.env?.VITE_TURNSTILE_SITE_KEY,
      "${{ vars.VITE_TURNSTILE_SITE_KEY }}",
      "The frontend must render a challenge when API login requires its proof",
    );
    assert.equal(build?.env?.TURNSTILE_SECRET_KEY, undefined);
  });
}

for (const directive of ["script-src", "connect-src", "frame-src"]) {
  test(`internal CSP permits Turnstile only at its challenge origin for ${directive}`, () => {
    const headers = readFileSync(
      new URL("../../apps/internal/public/_headers", import.meta.url),
      "utf8",
    );
    const policy = headers.split("Content-Security-Policy:")[1]?.split("\n")[0];
    assert.ok(policy, "Internal static assets must declare their CSP");
    const sources = policy.split(";").map((part) => part.trim().split(/\s+/));
    const actual = sources.find(([name]) => name === directive);
    assert.ok(actual?.includes("https://challenges.cloudflare.com"));
    assert.ok(!actual.includes("*") && !actual.includes("'unsafe-eval'"));
  });
}
