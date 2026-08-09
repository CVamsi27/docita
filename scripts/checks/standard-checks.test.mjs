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
    "check:workflow-script-refs",
    "check:jsx-escape-literals",
    "check:api-conformance",
    "check:route-shadowing",
    "check:openai-client-singleton",
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
        "apps/app/src/messages/en/Demo.json":
          `{\n  "title": "Title",\n  "subtitle": "Subtitle"\n}\n`,
        "apps/app/src/messages/hi/Demo.json":
          `{\n  "title": "शीर्षक"\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en/Demo.json":
          `{\n  "title": "Title"\n}\n`,
        "apps/app/src/messages/hi/Demo.json":
          `{\n  "title": "शीर्षक",\n  "deadKey": "मृत कुंजी"\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en/Demo.json":
          `{\n  "title": "Title",\n  "subtitle": "Subtitle"\n}\n`,
        "apps/app/src/messages/hi/Demo.json":
          `{\n  "title": "शीर्षक",\n  "subtitle": "उपशीर्षक"\n}\n`,
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

test("workflow script refs check fails on missing deploy scripts and unknown packages", () => {
  const fixture = {
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "packages/*"\n',
    "package.json": JSON.stringify({
      scripts: { "verify:standard": "pnpm check:workflow-script-refs" },
    }),
    "apps/app/package.json": JSON.stringify({
      name: "@docita/app",
      scripts: { build: "vite build" },
    }),
    "apps/internal/package.json": JSON.stringify({
      name: "@docita/internal",
      scripts: { build: "vite build" },
    }),
    ".github/workflows/deploy.yml": `name: deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter @docita/internal run deploy:cloudflare:production
      - run: pnpm --filter @workspace/missing run build
`,
  };

  expectFail(
    runCheck(makeGitFixture(fixture), "check-workflow-script-refs.mjs"),
  );

  // Both failures fixed: the script exists and the package exists. Also locks
  // in the skip-logic: pnpm builtins (install/exec) and valid refs must not be
  // flagged as script runs.
  const fixed = {
    ...fixture,
    "apps/internal/package.json": JSON.stringify({
      name: "@docita/internal",
      scripts: {
        build: "vite build",
        "deploy:cloudflare:production": "wrangler deploy --env production",
      },
    }),
    "packages/missing/package.json": JSON.stringify({
      name: "@workspace/missing",
      scripts: { build: "echo build" },
    }),
    ".github/workflows/deploy.yml": `name: deploy
on: [push]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - run: pnpm --filter @docita/internal run deploy:cloudflare:production
      - run: pnpm --filter @workspace/missing run build
      - run: pnpm install && pnpm --filter @docita/app run build
      - run: pnpm --filter @docita/app exec playwright test
      - run: pnpm verify:standard
`,
  };
  expectPass(
    runCheck(makeGitFixture(fixed), "check-workflow-script-refs.mjs"),
  );
});

test("JSX escape literal check fails on unprocessed escapes and passes on JS positions", () => {
  // Attribute strings and children text: escapes are NOT processed in JSX.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/internal/src/features/demo/page.tsx":
          `export function Page() {\n  return (\n    <>\n      <LoadingState message="Loading\\u2026" />\n      <div>Loading\\u2026</div>\n    </>\n  );\n}\n`,
      }),
      "check-jsx-escape-literals.mjs",
    ),
  );

  // JS-string escapes (processed), fixed JSX, and a .ts file are all fine.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/internal/src/features/demo/page.tsx":
          `const s = "\\u2026";\nconst re = /[\\u00a0]/;\nconst t = \`x\\u00b7\${y}\`;\nexport function Page() {\n  return (\n    <>\n      <LoadingState message="Loading…" />\n      <div>Loading…</div>\n      <div>{hasAccess ? "\\u2713" : "\\u2717"}</div>\n    </>\n  );\n}\n`,
        "apps/app/src/features/demo/not-jsx.ts": `export const s = "\\u2026";\n`,
      }),
      "check-jsx-escape-literals.mjs",
    ),
  );
});

test("route shadowing check flags literal routes registered after a matching :param route", () => {
  const paramController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics')
export class ParamController {
  @Get(':id')
  getClinic() {
    return {};
  }
}
`;
  const literalController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics/referral')
export class LiteralController {
  @Get()
  getStatus() {
    return {};
  }
}
`;
  const moduleWithHazard = `import { Module } from '@nestjs/common';
import { ParamController } from './presentation/controllers/param.controller';
import { LiteralController } from './presentation/controllers/literal.controller';

@Module({
  controllers: [ParamController, LiteralController],
})
export class DemoModule {}
`;
  const moduleOrdered = moduleWithHazard.replace(
    "controllers: [ParamController, LiteralController]",
    "controllers: [LiteralController, ParamController]",
  );

  // Param route registered first -> literal /clinics/referral is shadowed.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": moduleWithHazard,
        "apps/api/src/domains/demo/presentation/controllers/param.controller.ts": paramController,
        "apps/api/src/domains/demo/presentation/controllers/literal.controller.ts": literalController,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // Literal registered first -> no shadowing.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": moduleOrdered,
        "apps/api/src/domains/demo/presentation/controllers/param.controller.ts": paramController,
        "apps/api/src/domains/demo/presentation/controllers/literal.controller.ts": literalController,
      }),
      "check-route-shadowing.mjs",
    ),
  );
});

test("route shadowing check flags within-controller literal handlers declared after a matching :param", () => {
  const sameController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics')
export class ClinicsController {
  @Get(':id')
  getClinic() {
    return {};
  }

  @Get('referral')
  getReferral() {
    return {};
  }
}
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": `import { Module } from '@nestjs/common';
import { ClinicsController } from './presentation/controllers/clinics.controller';

@Module({
  controllers: [ClinicsController],
})
export class DemoModule {}
`,
        "apps/api/src/domains/demo/presentation/controllers/clinics.controller.ts": sameController,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // Reordered: literal handler declared before the :param handler passes.
  const reordered = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics')
export class ClinicsController {
  @Get('referral')
  getReferral() {
    return {};
  }

  @Get(':id')
  getClinic() {
    return {};
  }
}
`;
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": `import { Module } from '@nestjs/common';
import { ClinicsController } from './presentation/controllers/clinics.controller';

@Module({
  controllers: [ClinicsController],
})
export class DemoModule {}
`,
        "apps/api/src/domains/demo/presentation/controllers/clinics.controller.ts": reordered,
      }),
      "check-route-shadowing.mjs",
    ),
  );
});

test("route shadowing check flags cross-module literal-after-param via import-graph order", () => {
  const paramController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics')
export class ParamController {
  @Get(':id')
  getClinic() {
    return {};
  }
}
`;
  const literalController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics/referral')
export class LiteralController {
  @Get()
  getStatus() {
    return {};
  }
}
`;
  const appModule = (order) => `import { Module } from '@nestjs/common';
import { SharedModule } from './shared/shared.module';
import { LiteralModule } from './domains/literal/literal.module';

@Module({
  imports: [${order}],
})
export class AppModule {}
`;
  const sharedModule = `import { Module } from '@nestjs/common';
import { ParamModule } from '../domains/param/param.module';

@Module({
  imports: [ParamModule],
})
export class SharedModule {}
`;
  const paramModule = `import { Module } from '@nestjs/common';
import { ParamController } from './presentation/controllers/param.controller';

@Module({
  controllers: [ParamController],
})
export class ParamModule {}
`;
  const literalModule = `import { Module } from '@nestjs/common';
import { LiteralController } from './presentation/controllers/literal.controller';

@Module({
  controllers: [LiteralController],
})
export class LiteralModule {}
`;

  const baseFiles = {
    "apps/api/src/shared/shared.module.ts": sharedModule,
    "apps/api/src/domains/param/param.module.ts": paramModule,
    "apps/api/src/domains/param/presentation/controllers/param.controller.ts": paramController,
    "apps/api/src/domains/literal/literal.module.ts": literalModule,
    "apps/api/src/domains/literal/presentation/controllers/literal.controller.ts": literalController,
  };

  // SharedModule (which pulls ParamModule into the container) is listed
  // before LiteralModule in app.module imports, so the /clinics/:id route
  // registers before /clinics/referral even though LiteralModule is a direct
  // top-level import — only the import-graph DFS walk can see this.
  expectFail(
    runCheck(
      makeGitFixture({
        ...baseFiles,
        "apps/api/src/app.module.ts": appModule("SharedModule, LiteralModule"),
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // LiteralModule listed first in the DFS order: no shadowing.
  expectPass(
    runCheck(
      makeGitFixture({
        ...baseFiles,
        "apps/api/src/app.module.ts": appModule("LiteralModule, SharedModule"),
      }),
      "check-route-shadowing.mjs",
    ),
  );
});

test("route shadowing check parses multi-line controllers/imports arrays (bracket-aware)", () => {
  // Regression lock for the gatherBracketBlock fix: real modules format
  // `controllers: [` / `imports: [` across multiple lines (16 modules plus
  // app.module.ts), which the original paren-only gatherer silently dropped.
  // The multi-line forms below must be fully parsed — the hazard must fail
  // and the reordered pass must pass.
  const paramController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics')
export class ParamController {
  @Get(':id')
  getClinic() {
    return {};
  }
}
`;
  const literalController = `import { Controller, Get } from '@nestjs/common';

@Controller('clinics/referral')
export class LiteralController {
  @Get()
  getStatus() {
    return {};
  }
}
`;
  const paramModule = `import { Module } from '@nestjs/common';
import { ParamController } from './presentation/controllers/param.controller';

@Module({
  // multi-line controllers array with a comment and trailing comma
  controllers: [
    // first controller, then the :id shadow
    ParamController,
  ],
})
export class ParamModule {}
`;
  const literalModule = `import { Module } from '@nestjs/common';
import { LiteralController } from './presentation/controllers/literal.controller';

@Module({
  controllers: [
    LiteralController,
  ],
})
export class LiteralModule {}
`;
  const appModule = `import { Module } from '@nestjs/common';
import { ParamModule } from './domains/param/param.module';
import { LiteralModule } from './domains/literal/literal.module';

@Module({
  // multi-line imports array mirroring app.module.ts (nested brackets too)
  imports: [
    ConfigModule.forRoot({ envFilePath: ['.env'] }),
    ParamModule,
    LiteralModule,
  ],
})
export class AppModule {}
`;
  const fixture = {
    "apps/api/src/app.module.ts": appModule,
    "apps/api/src/domains/param/param.module.ts": paramModule,
    "apps/api/src/domains/param/presentation/controllers/param.controller.ts": paramController,
    "apps/api/src/domains/literal/literal.module.ts": literalModule,
    "apps/api/src/domains/literal/presentation/controllers/literal.controller.ts": literalController,
  };

  // Multi-line ParamModule before LiteralModule: literal is shadowed.
  expectFail(
    runCheck(makeGitFixture(fixture), "check-route-shadowing.mjs"),
  );

  // Same multi-line arrays, LiteralModule first: no shadowing.
  const reordered = {
    ...fixture,
    "apps/api/src/app.module.ts": appModule.replace(
      "ParamModule,\n    LiteralModule,",
      "LiteralModule,\n    ParamModule,",
    ),
  };
  expectPass(
    runCheck(makeGitFixture(reordered), "check-route-shadowing.mjs"),
  );
});

test("route shadowing check scans worker Nest controllers (multi-root coverage)", () => {
  // The worker boots via createApplicationContext (no HTTP adapter) and has
  // zero controllers today, but the check scans apps/worker/src so a future
  // controller addition is covered — a literal-after-:param in a worker
  // module must fail just like in the API.
  const workerModule = `import { Module } from '@nestjs/common';
import { WorkerParamController } from './presentation/controllers/param.controller';
import { WorkerLiteralController } from './presentation/controllers/literal.controller';

@Module({
  controllers: [WorkerParamController, WorkerLiteralController],
})
export class WorkerThingModule {}
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/worker/src/domains/thing/worker-thing.module.ts": workerModule,
        "apps/worker/src/domains/thing/presentation/controllers/param.controller.ts": `import { Controller, Get } from '@nestjs/common';

@Controller('jobs')
export class WorkerParamController {
  @Get(':id')
  getJob() {
    return {};
  }
}
`,
        "apps/worker/src/domains/thing/presentation/controllers/literal.controller.ts": `import { Controller, Get } from '@nestjs/common';

@Controller('jobs/running')
export class WorkerLiteralController {
  @Get()
  listRunning() {
    return [];
  }
}
`,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // Literal first: no shadowing, even in the worker tree.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/worker/src/domains/thing/worker-thing.module.ts": workerModule.replace(
          "controllers: [WorkerParamController, WorkerLiteralController]",
          "controllers: [WorkerLiteralController, WorkerParamController]",
        ),
        "apps/worker/src/domains/thing/presentation/controllers/param.controller.ts": `import { Controller, Get } from '@nestjs/common';

@Controller('jobs')
export class WorkerParamController {
  @Get(':id')
  getJob() {
    return {};
  }
}
`,
        "apps/worker/src/domains/thing/presentation/controllers/literal.controller.ts": `import { Controller, Get } from '@nestjs/common';

@Controller('jobs/running')
export class WorkerLiteralController {
  @Get()
  listRunning() {
    return [];
  }
}
`,
      }),
      "check-route-shadowing.mjs",
    ),
  );
});

test("route shadowing check flags Hono literal-after-wildcard and exact duplicates", () => {
  // Hono matches by REGISTRATION ORDER, not specificity (verified against
  // hono@4.13.0: SmartRouter caches RegExpRouter or falls back to
  // TrieRouter, and both are first-match-in-registration-order; a `*` spans
  // segment boundaries). A literal registered AFTER a wildcard that matches
  // it is unreachable — the same hazard class as Express/Nest.
  const literalAfterWildcard = `import { Hono } from "hono";
const app = new Hono();
app.get("/api/v1/*", async (c) => c.text("fallback"));
app.get("/api/v1/health", async (c) => c.json({ ok: true }));
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": literalAfterWildcard,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // The safe pattern: the literal registers BEFORE the wildcard it must win.
  const literalBeforeWildcard = `import { Hono } from "hono";
const app = new Hono();
app.get("/api/v1/health", async (c) => c.json({ ok: true }));
app.get("/api/v1/*", async (c) => c.text("fallback"));
export default app;
`;
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": literalBeforeWildcard,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // A narrower wildcard after a broader one is equally swallowed: /api/v1/*
  // registered after /api/* is unreachable for every v1 request.
  const narrowerAfterBroader = `import { Hono } from "hono";
const app = new Hono();
app.all("/api/*", async (c) => c.text("broad"));
app.all("/api/v1/*", async (c) => c.text("v1"));
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": narrowerAfterBroader,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // But a narrower wildcard after a :param at the same depth is NOT fully
  // shadowed (/api/v1/* still serves /api/v1/a/b), so it must not be flagged.
  const paramThenNarrowerWildcard = `import { Hono } from "hono";
const app = new Hono();
app.get("/api/v1/:id", async (c) => c.text("param"));
app.all("/api/v1/*", async (c) => c.text("wildcard"));
export default app;
`;
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": paramThenNarrowerWildcard,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // Same method + identical path registered twice: first registration wins,
  // the later one is unreachable.
  const duplicateHono = `import { Hono } from "hono";
const app = new Hono();
app.all("/api/v1/*", async (c) => c.text("v1"));
app.all("/api/v1/*", async (c) => c.text("unreachable"));
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": duplicateHono,
      }),
      "check-route-shadowing.mjs",
    ),
  );
});

test("route shadowing check covers multi-line registrations and route() mounts", () => {
  // Multi-line registrations: the path sits on the line after the opener.
  // Two of them registering the same method+path is a duplicate the old
  // single-line-only regex could not see.
  const multiLineDuplicate = `import { Hono } from "hono";
const app = new Hono();
app.all(
  "/api/v1/*",
  async (c) => c.text("v1"),
);
app.all(
  "/api/v1/*",
  async (c) => c.text("unreachable"),
);
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": multiLineDuplicate,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // A single-line registration duplicated by a multi-line one is equally
  // flagged (mixed forms resolve to the same effective table).
  const mixedDuplicate = `import { Hono } from "hono";
const app = new Hono();
app.get("/api/v1/health", async (c) => c.json({ ok: true }));
app.get(
  "/api/v1/health",
  async (c) => c.json({ ok: true }),
);
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": mixedDuplicate,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // A route() mount that duplicates a direct registration is unreachable:
  // sub's GET /v1/health mounts at /api and collides with app's own.
  const routeMountDuplicate = `import { Hono } from "hono";
const app = new Hono();
const sub = new Hono();
app.get("/api/v1/health", async (c) => c.json({ ok: true }));
sub.get("/v1/health", async (c) => c.json({ ok: true }));
app.route("/api", sub);
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": routeMountDuplicate,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // A clean route() mount — unique path, nothing shadowed — passes.
  const cleanRouteMount = `import { Hono } from "hono";
const app = new Hono();
const sub = new Hono();
sub.get("/v1/status", async (c) => c.text("ok"));
app.route("/api", sub);
export default app;
`;
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": cleanRouteMount,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // Shadowing across forms: a multi-line literal after a wildcard is dead.
  const multiLineLiteralAfterWildcard = `import { Hono } from "hono";
const app = new Hono();
app.all("/api/*", async (c) => c.text("fallback"));
app.get(
  "/api/v1/health",
  async (c) => c.json({ ok: true }),
);
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": multiLineLiteralAfterWildcard,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // A mounted literal under an earlier wildcard is equally shadowed once the
  // mount is expanded into the effective table.
  const mountShadowedByWildcard = `import { Hono } from "hono";
const app = new Hono();
const sub = new Hono();
app.all("/api/*", async (c) => c.text("fallback"));
sub.get("/v1/health", async (c) => c.json({ ok: true }));
app.route("/api", sub);
export default app;
`;
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": mountShadowedByWildcard,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // The mirror image: a mount BEFORE a later wildcard registers the literal
  // first, so it WINS and must not be flagged. Mount expansion preserves
  // source order (Hono copies sub routes into the parent at the route() call
  // site), so this ordering is safe.
  const mountBeforeWildcard = `import { Hono } from "hono";
const app = new Hono();
const sub = new Hono();
sub.get("/v1/health", async (c) => c.json({ ok: true }));
app.route("/api", sub);
app.all("/api/*", async (c) => c.text("fallback"));
export default app;
`;
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/api/index.ts": mountBeforeWildcard,
      }),
      "check-route-shadowing.mjs",
    ),
  );
});

test("API conformance check rejects embedded api/v1 controller prefixes", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/presentation/controllers/prefix.controller.ts": `import { Controller, Get } from '@nestjs/common';

@Controller('api/v1/patients')
export class PrefixController {
  @Get()
  list() {
    return [];
  }
}
`,
      }),
      "check-api-conformance.mjs",
    ),
  );

  // Object-form (version-neutral) controllers and clean plural paths pass.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/presentation/controllers/ok.controller.ts": `import { Controller, Get } from '@nestjs/common';
import { VERSION_NEUTRAL } from '@nestjs/common';

@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  @Get()
  health() {
    return { status: 'ok' };
  }
}

@Controller('patients')
export class PatientsController {
  @Get()
  list() {
    return [];
  }
}
`,
      }),
      "check-api-conformance.mjs",
    ),
  );
});

test("API conformance check rejects 200-documented action POSTs without @HttpCode", () => {
  // Multi-line @ApiResponse with status 200 and no @HttpCode -> Nest returns 201.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/presentation/controllers/action.controller.ts": `import { Controller, Post, ApiResponse } from '@nestjs/common';

@Controller('reminders')
export class ActionController {
  @Post('send')
  @ApiResponse({
    status: 200,
    description: 'ok',
  })
  send() {
    return { ok: true };
  }
}
`,
      }),
      "check-api-conformance.mjs",
    ),
  );

  // Action POSTs with @HttpCode(200) and creates with @HttpCode(201) pass.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/presentation/controllers/good.controller.ts": `import { Controller, Get, Post, HttpCode, HttpStatus, ApiResponse } from '@nestjs/common';

@Controller('patients')
export class GoodController {
  @Get()
  list() {
    return [];
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({ status: 201 })
  create() {
    return {};
  }

  @Post('sync')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({ status: 200 })
  sync() {
    return { ok: true };
  }
}
`,
      }),
      "check-api-conformance.mjs",
    ),
  );

  // Allowlisted legacy violations (audit 2026-08-08) do not fail the gate.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/patient-portal/presentation/controllers/patient-portal-auth.controller.ts": `import { Controller, Post, ApiResponse } from '@nestjs/common';

@Controller('patient-portal/auth')
export class PatientPortalAuthController {
  @Post('request-otp')
  @ApiResponse({ status: 200, description: 'OTP sent' })
  requestOtp() {
    return {};
  }
}
`,
      }),
      "check-api-conformance.mjs",
    ),
  );
});

test("OpenAI client singleton check permits the allowed file and rejects client construction elsewhere", () => {
  // The one allowed site constructs the client and value-imports the package.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/modules/ai/openai.service.ts": `import OpenAI from 'openai';
export class OpenaiService {
  constructor() {
    if (this.enabled) {
      this.openai = new OpenAI({ apiKey: process.env.AI_API_KEY });
    }
  }
}
`,
        "apps/api/src/shared/modules/ai/openai.service.spec.ts": `import type OpenAI from 'openai';
`,
        "apps/worker/src/main.ts": `import { NestFactory } from '@nestjs/core';
`,
      }),
      "check-openai-client-singleton.mjs",
    ),
  );

  // Constructing the client outside the allowed file fails the gate.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/modules/ai/openai.service.ts": `import OpenAI from 'openai';
`,
        "apps/api/src/shared/modules/other/llm.client.ts": `import OpenAI from 'openai';
const client = new OpenAI({ apiKey: process.env.AI_API_KEY });
`,
        // A block comment prefix must not exempt a line that still constructs.
        "apps/api/src/shared/modules/other/inline.client.ts": `/* legacy bypass */ new OpenAI({ apiKey: process.env.AI_API_KEY });
`,
      }),
      "check-openai-client-singleton.mjs",
    ),
  );

  // A value import (or require) elsewhere fails even without construction.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/modules/ai/openai.service.ts": `import OpenAI from 'openai';
`,
        "apps/api/src/domains/patients/application/services/medical-history.service.ts": `import OpenAI from 'openai';
`,
        "apps/worker/src/jobs/llm.job.ts": `const OpenAI = require('openai');
`,
      }),
      "check-openai-client-singleton.mjs",
    ),
  );
});
