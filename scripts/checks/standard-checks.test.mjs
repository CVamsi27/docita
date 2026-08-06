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
        "apps/app/src/features/settings/bad.ts": `export const facility = z.enum(["CLINIC", "HOSPITAL"]);`,
      }),
      "check-facility-type-ssot.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/settings/good.ts": `import { facilityTypeSchema } from "@workspace/types"; export const facility = facilityTypeSchema;`,
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
        "apps/app/src/features/patients/components/bad.tsx": `export async function load() { return fetch("/api/patients"); }`,
      }),
      "check-frontend-fetch.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/patients/api/patients.api.ts": `export async function load() { return fetch("/api/patients"); }`,
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
        "apps/app/src/features/dashboard/panel.ts": `import { x } from "@/features/follow-ups/lib/private"; export { x };`,
      }),
      "check-feature-boundaries.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/dashboard/panel.ts": `import { x } from "@/features/follow-ups"; export { x };`,
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
    "apps/app/src/features/x/Page.tsx":
      "export function Page() { return <div>Hello world</div>; }\n",
    "apps/internal/src/features/y/Panel.tsx":
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
    "apps/app/src/features/x/Page.tsx",
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

test("i18n translation-key check skips when no next-intl apps are registered", () => {
  // Vite apps use i18next/react-i18next, not next-intl, and APP_TO_MESSAGES
  // is now empty. The check should pass with no findings.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/x/Comp.tsx":
          `import { useTranslation } from "react-i18next";\nexport function Comp() { const { t } = useTranslation(); return t("X.missing"); }\n`,
      }),
      "check-i18n-translation-keys.mjs",
      ["--enforce"],
    ),
  );
});

test("button-primitive check blocks raw <button> in Vite features", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/raw.tsx":
          `export function Raw() { return <button onClick={() => {}}>Save</button>; }\n`,
      }),
      "check-button-primitive.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/good.tsx":
          `import { Button } from "@workspace/ui/components/form/button";\nexport function Good() { return <Button onClick={() => {}}>Save</Button>; }\n`,
      }),
      "check-button-primitive.mjs",
      ["--enforce"],
    ),
  );
});

test("i18next-parity check fails on missing hi keys or dead hi-only keys", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en.json":
          `{\n  "Demo": {\n    "title": "Title",\n    "subtitle": "Subtitle"\n  }\n}\n`,
        "apps/app/src/messages/hi.json":
          `{\n  "Demo": {\n    "title": "शीर्षक"\n  }\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en.json":
          `{\n  "Demo": {\n    "title": "Title"\n  }\n}\n`,
        "apps/app/src/messages/hi.json":
          `{\n  "Demo": {\n    "title": "शीर्षक",\n    "deadKey": "मृत कुंजी"\n  }\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en.json":
          `{\n  "Demo": {\n    "title": "Title",\n    "subtitle": "Subtitle"\n  }\n}\n`,
        "apps/app/src/messages/hi.json":
          `{\n  "Demo": {\n    "title": "शीर्षक",\n    "subtitle": "उपशीर्षक"\n  }\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
});

test("i18n-coverage check requires useTranslation in every Vite feature", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/index.ts":
          `export const label = "Hardcoded";\n`,
      }),
      "check-i18n-coverage.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/index.ts":
          `import { useTranslation } from "react-i18next";\nexport function Demo() { const { t } = useTranslation("Demo"); return t("title"); }\n`,
      }),
      "check-i18n-coverage.mjs",
      ["--enforce"],
    ),
  );
});

test("error-boundary-coverage check requires ErrorBoundary in functional layouts", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/components/layout/demo-layout.tsx":
          `export function DemoLayout() { return <div>content</div>; }\n`,
      }),
      "check-error-boundary-coverage.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/components/layout/demo-layout.tsx":
          `import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";\nexport function DemoLayout() { return <ErrorBoundary><div>content</div></ErrorBoundary>; }\n`,
      }),
      "check-error-boundary-coverage.mjs",
      ["--enforce"],
    ),
  );
});

test("zod-interface-parity check flags interface colliding with packages/types schema", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/types/src/demo/widget.ts":
          `import { z } from "zod";\nexport const widgetSchema = z.object({ name: z.string() });\n`,
        "apps/app/src/features/demo/types.ts":
          `export interface Widget { name: string }\n`,
      }),
      "check-zod-interface-parity.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "packages/types/src/demo/widget.ts":
          `import { z } from "zod";\nexport const widgetSchema = z.object({ name: z.string() });\n`,
        "apps/app/src/features/demo/types.ts":
          `export interface WidgetRow { name: string }\n`,
      }),
      "check-zod-interface-parity.mjs",
      ["--enforce"],
    ),
  );
});

test("native-ui-affordances check blocks browser dialogs and allows shadowed confirm hook", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/dialogs.ts":
          `export function confirmDelete() {\n  return window.confirm("Delete?");\n}\nexport function warn() {\n  return alert("Heads up");\n}\nexport function ask() {\n  return prompt("Name");\n}\n`,
      }),
      "check-native-ui-affordances.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/hook.tsx":
          `import { useConfirm } from "@/hooks/use-confirm";\nexport function UseConfirmDemo() {\n  const { confirm } = useConfirm();\n  return <button onClick={() => confirm({ title: "Remove?" })}>Remove</button>;\n}\n`,
      }),
      "check-native-ui-affordances.mjs",
    ),
  );
});

test("accessible-name check flags icon-only links and allows text-labeled ones", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/icon-only.tsx":
          `import { Link } from "react-router";\nexport function IconOnly() {\n  return <Link to="/x"><Icon aria-hidden /></Link>;\n}\n`,
      }),
      "check-accessible-name.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/good.tsx":
          `import { Link } from "react-router";\nexport function Good() {\n  return <Link to="/x" aria-label="Open settings"><Icon aria-hidden /></Link>;\n}\n`,
      }),
      "check-accessible-name.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/text.tsx":
          `import { Link } from "react-router";\nexport function Text() {\n  return <Link to="/x">View all</Link>;\n}\n`,
      }),
      "check-accessible-name.mjs",
      ["--enforce"],
    ),
  );
});

test("webhook CSRF exemption check accepts the canonical scoped exemption and rejects widening", () => {
  const canonicalInterceptor = `import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from "@nestjs/common";
import { Observable } from "rxjs";
import { Response, Request } from "express";

@Injectable()
export class CsrfInterceptor implements NestInterceptor {
  private isSafeMethod(method: string): boolean {
    return ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase());
  }

  /** Public browser RUM beacons do not carry CSRF headers. */
  private isPublicWebVitalsPost(request: Request): boolean {
    if (request.method?.toUpperCase() !== "POST") {
      return false;
    }
    return /^\\/api\\/v\\d+\\/monitoring\\/web-vitals$/i.test(request.url ?? "");
  }

  /** Unauthenticated online booking (may be cross-site; no session CSRF cookie). */
  private isPublicBookingWrite(request: Request): boolean {
    const method = request.method?.toUpperCase() ?? "";
    if (method !== "POST") return false;
    return /^\\/api(?:\\/v\\d+)?\\/public\\/booking\\/clinics\\//i.test(request.url ?? "");
  }

  private isWebhookIngress(request: Request): boolean {
    const method = request.method?.toUpperCase() ?? "";
    if (method !== "POST") return false;
    const path = (request.url ?? "").split("?")[0];
    return /^\\/(?:api(?:\\/v\\d+)?\\/)?webhooks\\//i.test(path);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();
    if (!this.isSafeMethod(request.method)) {
      if (
        this.isPublicWebVitalsPost(request) ||
        this.isPublicBookingWrite(request) ||
        this.isWebhookIngress(request)
      ) {
        return next.handle();
      }
      throw new Error("INVALID_CSRF_TOKEN");
    }
    return next.handle();
  }
}
`;

  // Widened exemption: bare /webhooks match (no anchor, no api-prefix group).
  const widenedInterceptor = canonicalInterceptor.replace(
    '/^\\/(?:api(?:\\/v\\d+)?\\/)?webhooks\\//i',
    '/webhooks/i',
  );

  // Dropped exemption: the isWebhookIngress call is removed from the branch.
  const droppedInterceptor = canonicalInterceptor.replace(
    /\|\|\s*this\.isWebhookIngress\(request\)/,
    "",
  );

  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/common/interceptors/csrf.interceptor.ts":
          canonicalInterceptor,
      }),
      "check-webhook-csrf-exemption.mjs",
    ),
  );

  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/common/interceptors/csrf.interceptor.ts":
          widenedInterceptor,
      }),
      "check-webhook-csrf-exemption.mjs",
    ),
  );

  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/common/interceptors/csrf.interceptor.ts":
          droppedInterceptor,
      }),
      "check-webhook-csrf-exemption.mjs",
    ),
  );
});

test("API latency budget accepts a compliant baseline and fails an over-tolerance p95", () => {
  const compliantBaseline = {
    "artifacts/api-latency-baseline.json": JSON.stringify({
      generatedAt: "2026-08-06T00:00:00.000Z",
      endpoints: {
        auth: { p95: 120 },
        crud: { p95: 180, p99: 410 },
        search: { p95: 220 },
        reports: { p95: 900 },
        webhooks: { p95: 40 },
      },
    }),
  };

  expectPass(
    runCheck(
      makeGitFixture(compliantBaseline),
      "check-api-latency-budget.mjs",
      ["--enforce"],
    ),
  );

  const violatingBaseline = {
    "artifacts/api-latency-baseline.json": JSON.stringify({
      generatedAt: "2026-08-06T00:00:00.000Z",
      endpoints: {
        auth: { p95: 500 },
        crud: { p95: 180, p99: 410 },
        search: { p95: 220 },
        reports: { p95: 900 },
        webhooks: { p95: 40 },
      },
    }),
  };

  expectFail(
    runCheck(
      makeGitFixture(violatingBaseline),
      "check-api-latency-budget.mjs",
      ["--enforce"],
    ),
  );

  // Without --enforce the same violation reports but exits 0 (ratchet
  // semantics: fail closed only in the merge gate).
  expectPass(
    runCheck(
      makeGitFixture(violatingBaseline),
      "check-api-latency-budget.mjs",
    ),
  );
});
