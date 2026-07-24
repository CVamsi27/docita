import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const NODE = process.execPath;

function script(name) {
  return path.join(REPO_ROOT, "scripts/checks", name);
}

function write(root, file, content) {
  const target = path.join(root, file);
  mkdirSync(path.dirname(target), { recursive: true });
  writeFileSync(target, content);
}

function makeGitFixture(files) {
  const root = mkdtempSync(path.join(tmpdir(), "docita-check-"));
  execFileSync("git", ["init", "-q"], { cwd: root });
  for (const [file, content] of Object.entries(files)) {
    write(root, file, content);
  }
  execFileSync("git", ["add", "."], { cwd: root });
  return root;
}

function runCheck(root, name, args = [], env = {}) {
  return spawnSync(NODE, [script(name), ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, DOCITA_CHECK_ROOT: root, ...env },
  });
}

function expectPass(result) {
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function expectFail(result) {
  assert.notEqual(result.status, 0, "expected check to fail");
}

test("facility type SSOT accepts canonical schema and rejects duplicate literals", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/features/settings/bad.ts": `export const facility = z.enum(["CLINIC", "HOSPITAL"]);`,
      }),
      "check-facility-type-ssot.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/features/settings/good.ts": `import { facilityTypeSchema } from "@workspace/types"; export const facility = facilityTypeSchema;`,
      }),
      "check-facility-type-ssot.mjs",
    ),
  );
});

test("support contact SSOT rejects hardcoded support email outside canonical exports", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/landing/src/pages/contact.ts": `export const email = "support@docita.work";`,
      }),
      "check-support-contact-ssot.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/landing/src/pages/contact.ts": `import { SUPPORT_EMAIL } from "@workspace/types"; export const email = SUPPORT_EMAIL;`,
      }),
      "check-support-contact-ssot.mjs",
    ),
  );
});

test("frontend fetch boundary blocks feature fetches but allows API adapters", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/features/patients/components/bad.tsx": `export async function load() { return fetch("/api/patients"); }`,
      }),
      "check-frontend-fetch.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/features/patients/api/patients.api.ts": `export async function load() { return fetch("/api/patients"); }`,
      }),
      "check-frontend-fetch.mjs",
      ["--enforce"],
    ),
  );
});

test("feature-boundary check blocks feature internals and permits public roots", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/features/dashboard/panel.ts": `import { x } from "@/features/follow-ups/lib/private"; export { x };`,
      }),
      "check-feature-boundaries.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/features/dashboard/panel.ts": `import { x } from "@/features/follow-ups"; export { x };`,
      }),
      "check-feature-boundaries.mjs",
      ["--enforce"],
    ),
  );
});

test("repository DI token check accepts token providers and rejects concrete-only repositories", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": `export class PrismaDemoRepository {} export const providers = [PrismaDemoRepository];`,
      }),
      "check-repository-di-tokens.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": `export class PrismaDemoRepository {} export const DEMO_REPOSITORY_TOKEN = "IDemoRepository"; export const providers = [{ provide: DEMO_REPOSITORY_TOKEN, useClass: PrismaDemoRepository }];`,
      }),
      "check-repository-di-tokens.mjs",
      ["--enforce"],
    ),
  );
});

test("form-schema check requires base derivation or reviewable exception metadata", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/types/src/forms/bad-form.ts": `import { z } from "zod"; export const badFormSchema = z.object({ name: z.string() });`,
      }),
      "check-form-schema-extends.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "packages/types/src/forms/good-form.ts": `import { z } from "zod";\n// allow-no-base-schema: owner=forms reason=ui-only review=2026-09-30\nexport const goodFormSchema = z.object({ name: z.string() });`,
      }),
      "check-form-schema-extends.mjs",
      ["--enforce"],
    ),
  );
});

test("use-case LOC check enforces orchestration size budget", () => {
  const oversizedBody = Array.from(
    { length: 151 },
    (_, index) => `const value${index} = ${index};`,
  ).join("\n");
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/application/use-cases/large.use-case.ts":
          oversizedBody,
      }),
      "check-use-case-loc.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/application/use-cases/small.use-case.ts": `export class SmallUseCase { execute() { return true; } }`,
      }),
      "check-use-case-loc.mjs",
      ["--enforce"],
    ),
  );
});

test("env/globalEnv check fails when env examples are absent from turbo cache env", () => {
  const badRoot = mkdtempSync(path.join(tmpdir(), "docita-env-check-"));
  write(badRoot, ".env.example", "DOCITA_NEW_ENV=value\n");
  write(badRoot, "turbo.json", JSON.stringify({ globalEnv: [], tasks: {} }));
  expectFail(
    runCheck(REPO_ROOT, "check-env-vs-globalenv.mjs", ["--enforce"], {
      DOCITA_CHECK_ROOT: badRoot,
    }),
  );

  const goodRoot = mkdtempSync(path.join(tmpdir(), "docita-env-check-"));
  write(goodRoot, ".env.example", "DOCITA_NEW_ENV=value\n");
  write(
    goodRoot,
    "turbo.json",
    JSON.stringify({ globalEnv: ["DOCITA_NEW_ENV"], tasks: {} }),
  );
  expectPass(
    runCheck(REPO_ROOT, "check-env-vs-globalenv.mjs", ["--enforce"], {
      DOCITA_CHECK_ROOT: goodRoot,
    }),
  );
});

test("standard gate wiring check requires all mandatory standards checks", () => {
  const requiredScripts = [
    "test:standards-checks",
    "check:api-domain-layout",
    "check:feature-boundaries",
    "check:package-boundaries",
    "check:facility-type-ssot",
    "check:support-contact-ssot",
    "check:repository-di-tokens",
    "check:form-schema-extends",
    "check:client-storage-usage",
    "check:env-vs-globalenv",
    "check:use-case-loc",
  ];
  expectFail(
    runCheck(
      makeGitFixture({
        "package.json": JSON.stringify({
          scripts: { "verify:standard": "pnpm check:api-domain-layout" },
        }),
      }),
      "check-standard-gate-wiring.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "package.json": JSON.stringify({
          scripts: {
            "verify:standard": requiredScripts
              .map((name) => `pnpm ${name}`)
              .join(" && "),
          },
        }),
      }),
      "check-standard-gate-wiring.mjs",
    ),
  );
});

test("jsx literal density ratchet: baseline write, growth fails --enforce, refresh passes", () => {
  // Build a tiny fixture repo with two .tsx files containing one literal each.
  const root = makeGitFixture({
    "apps/app/features/x/Page.tsx":
      "export function Page() { return <div>Hello world</div>; }\n",
    "apps/internal/features/y/Panel.tsx":
      "export function Panel() { return <p>One literal</p>; }\n",
  });
  // Initialise the baseline.
  expectPass(
    runCheck(root, "check-jsx-literal-density.mjs", ["--baseline"]),
  );
  // Baseline-only run should pass without --enforce.
  expectPass(runCheck(root, "check-jsx-literal-density.mjs"));
  // Adding a literal must fail under --enforce.
  write(
    root,
    "apps/app/features/x/Page.tsx",
    "export function Page() { return <div><span>Hello world</span><span>Extra</span></div>; }\n",
  );
  execFileSync("git", ["add", "."], { cwd: root });
  expectFail(
    runCheck(root, "check-jsx-literal-density.mjs", ["--enforce"]),
  );
  // Refresh baseline, growth becomes the new floor and --enforce passes.
  expectPass(
    runCheck(root, "check-jsx-literal-density.mjs", ["--baseline"]),
  );
  expectPass(
    runCheck(root, "check-jsx-literal-density.mjs", ["--enforce"]),
  );
});

test("i18n translation-key check fails on missing namespace and passes on present", () => {
  const files = {
    "apps/app/messages/en.json": JSON.stringify({ X: { present: "yes" } }),
    "apps/app/messages/hi.json": JSON.stringify({ X: { present: "yes" } }),
    "apps/internal/messages/en.json": JSON.stringify({}),
    "apps/internal/messages/hi.json": JSON.stringify({}),
    "apps/app/features/x/Comp.tsx":
      `import { useTranslations } from "next-intl";\nexport function Comp() { return useTranslations("X.missing"); }\n`,
  };

  // UseTranslations references "X.missing" but the JSON only has "X".
  expectFail(
    runCheck(
      makeGitFixture(files),
      "check-i18n-translation-keys.mjs",
      ["--enforce"],
    ),
  );

  // UseTranslations references "X.present.leaf" — the namespace resolves
  // to an object so the check passes (we don't validate leaf keys).
  expectPass(
    runCheck(
      makeGitFixture({
        ...files,
        "apps/app/messages/en.json": JSON.stringify({ X: { present: { leaf: "yes" } } }),
        "apps/app/messages/hi.json": JSON.stringify({ X: { present: { leaf: "yes" } } }),
        "apps/app/features/x/Comp.tsx":
          `import { useTranslations } from "next-intl";\nexport function Comp() { const t = useTranslations("X.present"); return t("leaf"); }\n`,
      }),
      "check-i18n-translation-keys.mjs",
      ["--enforce"],
    ),
  );
});
