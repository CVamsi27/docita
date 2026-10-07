import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
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
    "check:script-name-refs",
    "check:suppression-ledger",
    "check:jsx-escape-literals",
    "check:api-conformance",
    "check:route-shadowing",
    "check:openai-client-singleton",
    "check:workflow-staleness",
    "check:workspace-resolution",
    "check:utc-instant-storage",
    "check:aria-naming-target",
    "check:user-facing-copy",
    "check:enum-map-drift",
    "check:unserved-endpoint",
    "check:inline-response-dto",
    "check:internal-only-client-call",
    "check:test-schema-duplication",
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
  expectPass(runCheck(root, "check-jsx-literal-density.mjs", ["--baseline"]));
  // Baseline-only run should pass without --enforce.
  expectPass(runCheck(root, "check-jsx-literal-density.mjs"));
  // Adding a literal must fail under --enforce.
  write(
    root,
    "apps/app/src/features/x/Page.tsx",
    "export function Page() { return <div><span>Hello world</span><span>Extra</span></div>; }\n",
  );
  execFileSync("git", ["add", "."], { cwd: root });
  expectFail(runCheck(root, "check-jsx-literal-density.mjs", ["--enforce"]));
  // Refresh baseline, growth becomes the new floor and --enforce passes.
  expectPass(runCheck(root, "check-jsx-literal-density.mjs", ["--baseline"]));
  expectPass(runCheck(root, "check-jsx-literal-density.mjs", ["--enforce"]));
});

test("jsx literal density counts multi-line text and ignores code-shaped decoys", () => {
  // Regression lock for the line-based scanner this replaced: it only ever saw
  // `>Text<` on one line, so the shape prettier produces for any button with an
  // icon scored zero and the ratchet was blind to it.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/Page.tsx": `import { useRef, useState } from "react";

export function Page() {
  const ref = useRef<HTMLDivElement>(null);
  const [items] = useState<Array<string>>([]);
  const bigger = items.length < 3 && ref.current !== null;
  return (
    <div className="p-4">
      <Button aria-label="Start next consultation: Asha Rao">
        Start next
      </Button>
      <p>{bigger ? "yes" : "no"}</p>
      {/* Prose in a JSX comment is not markup */}
      {/* <span aria-label="not real">text</span> */}
      {items.map((item) => (
        <span key={item}>{item}</span>
      ))}
    </div>
  );
}
`,
    }),
    "check-jsx-literal-density.mjs",
  );
  // Exactly one: "Start next". Generics, comparisons, strings and JSX comments
  // must not register.
  assert.match(result.stdout, /Current count: 1 across 1 files\./);
});

test("jsx literal density reads nested text but not TypeScript after a JSX element", () => {
  // A nested tag is preceded by the last letter of the text above it, which
  // looks identical to `useRef<HTMLDivElement>(null)`. Getting that wrong once
  // cost a whole file: the JSX depth never returned to zero, and the generic
  // signature below was read as an element whose "text" was a TypeScript
  // parameter list — seven literals of user-facing copy that do not exist.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/Typed.tsx": `export function Typed() {
  return (
    <Label>
      Doctor
      <span className="ml-1">(optional)</span>
    </Label>
  );
}

interface Props {
  isMarkingDone: boolean;
  canMarkDone: boolean;
}

export function pick<T>(value: T): T {
  return value;
}
`,
    }),
    "check-jsx-literal-density.mjs",
  );
  // Exactly two: "Doctor" and "(optional)".
  assert.match(result.stdout, /Current count: 2 across 1 files\./);
});

test("jsx literal density treats an apostrophe in JSX text as prose, not a string", () => {
  // Masking quotes naively turns `Doctor's clinic — don't wait` into an
  // unterminated string literal, which then swallows the rest of the element
  // and hides the strings that follow it. The repo writes `&apos;` today, so
  // this guards the scanner rather than an existing file.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/Prose.tsx": `export function Prose() {
  return (
    <div>
      <p>Doctor's clinic — don't wait</p>
      <p>Real follow-up copy</p>
    </div>
  );
}
`,
    }),
    "check-jsx-literal-density.mjs",
  );
  assert.match(result.stdout, /Current count: 2 across 1 files\./);
});

test("jsx literal density does not read quoted JSX text as a string literal", () => {
  // A run that opens with a double quote sits immediately after `>`, which
  // looks like a string literal. When a second quote closes it on the same
  // line the scan blanks the visible copy and the string disappears from the
  // ratchet entirely.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/Quoted.tsx": `export function Quoted() {
  return (
    <div>
      <p>"Pending"</p>
      <p>Confirmed</p>
    </div>
  );
}
`,
    }),
    "check-jsx-literal-density.mjs",
  );
  assert.match(result.stdout, /Current count: 2 across 1 files\./);
});

test("jsx literal density does not read a closing tag as a regular expression", () => {
  // `</span>` starts with a slash, and a slash after `<` looks exactly like
  // the start of a regex literal. Without the bail-out the scanner blanks from
  // the first `</span>` to the next slash on the line, taking the second
  // element's copy with it.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/Inline.tsx": `export function Inline() {
  return (
    <p><span>First half</span><span>Second half</span></p>
  );
}
`,
    }),
    "check-jsx-literal-density.mjs",
  );
  assert.match(result.stdout, /Current count: 2 across 1 files\./);
});

test("user-facing-copy ratchet: baseline write, growth fails --enforce, refresh passes", () => {
  // The layer check-jsx-literal-density structurally cannot see: display copy
  // in a pure .ts module, handed to a component that renders it.
  const root = makeGitFixture({
    "apps/app/src/features/demo/copy.ts":
      'export const notice = { title: "Your subscription has expired" };\n',
  });
  expectPass(runCheck(root, "check-user-facing-copy.mjs", ["--baseline"]));
  expectPass(runCheck(root, "check-user-facing-copy.mjs"));
  write(
    root,
    "apps/app/src/features/demo/copy.ts",
    'export const notice = { title: "Your subscription has expired", description: "Renew to restore full access." };\n',
  );
  execFileSync("git", ["add", "."], { cwd: root });
  expectFail(runCheck(root, "check-user-facing-copy.mjs", ["--enforce"]));
  expectPass(runCheck(root, "check-user-facing-copy.mjs", ["--baseline"]));
  expectPass(runCheck(root, "check-user-facing-copy.mjs", ["--enforce"]));
});

test("user-facing-copy flags display copy but not i18n keys, classes or tokens", () => {
  // Two findings: the two display-shaped prose bindings.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/copy.ts": `export const toastCopy = { title: "Payment recorded" };
export const alertCopy = { description: "Consider expediting consultations" };
`,
    }),
    "check-user-facing-copy.mjs",
  );
  assert.match(result.stdout, /Current count: 2 across 1 files\./);

  // Everything below is structural data, not copy. A detector that fires on
  // these turns a ratchet into noise, which is how gates get ignored.
  const clean = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/copy.ts": `export const translated = { title: "appointmentSection.preferredDay" };
export const styling = { description: "text-[length:var(--fs-sm)] font-medium" };
export const token = { label: "PAYMENT_RECORDED" };
export const endpoint = { message: "https://api.docita.work/v1/appointments" };
export const slug = { text: "scheduled" };
export const notDisplay = { filename: "consent-template-document-sections" };
export const isFlag = { isError: "Something long enough to read as prose" };
`,
    }),
    "check-user-facing-copy.mjs",
  );
  assert.match(clean.stdout, /Current count: 0 across 0 files\./);
});

test("user-facing-copy structural guards each have a fixture that exercises them", () => {
  // The whitespace/length gate alone already excludes keys, plain URLs and
  // bare tokens, so those guards would be unproven dead weight. These three
  // shapes DO contain whitespace and each one pins a specific guard.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/copy.ts": [
        // Guard: "--" excludes Tailwind / design-token class strings.
        'export const styling = { description: "text-[length:var(--fs-sm)] font-medium" };',
        // Guard: "^https?:" excludes URLs whose path segment carries spaces.
        'export const spacedUrl = { message: "https://api.docita.work/v1/ appointments" };',
        // Guard: the word/slug character class excludes multi-line slugs.
        // A real newline (not a literal backslash-n) is what makes this value
        // whitespace-bearing; a literal "\\n" is two ordinary characters and
        // would be skipped by the length/whitespace gate instead.
        "export const multilineSlug = { label: `scheduled\nvisits` };",
        // Guard: the whitespace requirement. Angle brackets put this value
        // outside the slug character class, so nothing else excludes it.
        'export const noSpace = { title: "<unknown-status>" };',
        // Guard: the length requirement. Short but whitespace-bearing.
        'export const short = { title: "Not set" };',
      ].join("\n"),
      // Guard: .tsx is the JSX density check's territory; this check only
      // scans the pure-module layer, so display copy here must be ignored.
      "apps/app/src/features/demo/Copy.tsx":
        'export const copy = { title: "Display copy in a tsx file" };\n',
    }),
    "check-user-facing-copy.mjs",
  );
  assert.match(result.stdout, /Current count: 0 across 0 files\./);

  // Control: removing any one guard turns at least one of the three into a
  // finding, so each is load-bearing rather than decorative.
  const control = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/copy.ts":
        'export const realCopy = { title: "Your subscription has expired" };\n',
    }),
    "check-user-facing-copy.mjs",
  );
  assert.match(control.stdout, /Current count: 1 across 1 files\./);
});

test("user-facing-copy skips allowlisted features and test files", () => {
  const result = runCheck(
    makeGitFixture({
      // English-only legal documents are an intentional exception.
      "scripts/checks/allowlists/user-facing-copy.json": JSON.stringify([
        { id: "legal", reason: "English-only legal text by design." },
      ]),
      "apps/app/src/features/legal/consent-content.ts":
        'export const copy = { title: "Data Privacy & Consent Notice" };\n',
      "apps/app/src/features/demo/copy.test.ts":
        'export const copy = { title: "Test fixture title copy" };\n',
    }),
    "check-user-facing-copy.mjs",
  );
  assert.match(result.stdout, /Current count: 0 across 0 files\./);
});

test("button-primitive check blocks raw <button> in Vite features", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/raw.tsx": `export function Raw() { return <button onClick={() => {}}>Save</button>; }\n`,
      }),
      "check-button-primitive.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/good.tsx": `import { Button } from "@workspace/ui/components/form/button";\nexport function Good() { return <Button onClick={() => {}}>Save</Button>; }\n`,
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
        "apps/app/src/messages/en/Demo.json": `{\n  "title": "Title",\n  "subtitle": "Subtitle"\n}\n`,
        "apps/app/src/messages/hi/Demo.json": `{\n  "title": "शीर्षक"\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en/Demo.json": `{\n  "title": "Title"\n}\n`,
        "apps/app/src/messages/hi/Demo.json": `{\n  "title": "शीर्षक",\n  "deadKey": "मृत कुंजी"\n}\n`,
      }),
      "check-i18next-parity.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/messages/en/Demo.json": `{\n  "title": "Title",\n  "subtitle": "Subtitle"\n}\n`,
        "apps/app/src/messages/hi/Demo.json": `{\n  "title": "शीर्षक",\n  "subtitle": "उपशीर्षक"\n}\n`,
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
        "apps/app/src/features/demo/index.ts": `export const label = "Hardcoded";\n`,
      }),
      "check-i18n-coverage.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/index.ts": `import { useTranslation } from "react-i18next";\nexport function Demo() { const { t } = useTranslation("Demo"); return t("title"); }\n`,
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
        "apps/app/src/components/layout/demo-layout.tsx": `export function DemoLayout() { return <div>content</div>; }\n`,
      }),
      "check-error-boundary-coverage.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/components/layout/demo-layout.tsx": `import { ErrorBoundary } from "@workspace/ui/components/feedback/error-boundary";\nexport function DemoLayout() { return <ErrorBoundary><div>content</div></ErrorBoundary>; }\n`,
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
        "packages/types/src/demo/widget.ts": `import { z } from "zod";\nexport const widgetSchema = z.object({ name: z.string() });\n`,
        "apps/app/src/features/demo/types.ts": `export interface Widget { name: string }\n`,
      }),
      "check-zod-interface-parity.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "packages/types/src/demo/widget.ts": `import { z } from "zod";\nexport const widgetSchema = z.object({ name: z.string() });\n`,
        "apps/app/src/features/demo/types.ts": `export interface WidgetRow { name: string }\n`,
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
        "apps/app/src/features/demo/components/dialogs.ts": `export function confirmDelete() {\n  return window.confirm("Delete?");\n}\nexport function warn() {\n  return alert("Heads up");\n}\nexport function ask() {\n  return prompt("Name");\n}\n`,
      }),
      "check-native-ui-affordances.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/hook.tsx": `import { useConfirm } from "@/hooks/use-confirm";\nexport function UseConfirmDemo() {\n  const { confirm } = useConfirm();\n  return <button onClick={() => confirm({ title: "Remove?" })}>Remove</button>;\n}\n`,
      }),
      "check-native-ui-affordances.mjs",
    ),
  );
});

test("accessible-name check flags icon-only links and allows text-labeled ones", () => {
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/icon-only.tsx": `import { Link } from "react-router";\nexport function IconOnly() {\n  return <Link to="/x"><Icon aria-hidden /></Link>;\n}\n`,
      }),
      "check-accessible-name.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/good.tsx": `import { Link } from "react-router";\nexport function Good() {\n  return <Link to="/x" aria-label="Open settings"><Icon aria-hidden /></Link>;\n}\n`,
      }),
      "check-accessible-name.mjs",
      ["--enforce"],
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/components/text.tsx": `import { Link } from "react-router";\nexport function Text() {\n  return <Link to="/x">View all</Link>;\n}\n`,
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
    "/^\\/(?:api(?:\\/v\\d+)?\\/)?webhooks\\//i",
    "/webhooks/i",
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
    runCheck(makeGitFixture(violatingBaseline), "check-api-latency-budget.mjs"),
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
  expectPass(runCheck(makeGitFixture(fixed), "check-workflow-script-refs.mjs"));
});

test("workflow script refs check fails on unparseable and jobless workflow files", () => {
  const base = {
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "packages/*"\n',
    "package.json": JSON.stringify({
      scripts: { "check:real": "node scripts/real.mjs" },
    }),
  };

  // Not-YAML content (the destroyed-ci.yml class): the line scanner finds
  // zero `run:` steps, so without the parse gate this fixture passes
  // vacuously. This is the exact prefix of the file that replaced ci.yml.
  const unparseable = {
    ...base,
    ".github/workflows/ci.yml":
      "# Docita improvement backlog and release evidence\n\nUpdated: **2 October 2026**. Scope: the reviewed Docita source.\n",
  };
  expectFail(
    runCheck(makeGitFixture(unparseable), "check-workflow-script-refs.mjs"),
  );

  // Parses as YAML but lost its jobs map (the zero-jobs signature).
  const jobless = {
    ...base,
    ".github/workflows/ci.yml": "name: ci\non: [push]\n",
  };
  expectFail(
    runCheck(makeGitFixture(jobless), "check-workflow-script-refs.mjs"),
  );

  // A parseable workflow with a real job and a resolvable script passes.
  const valid = {
    ...base,
    ".github/workflows/ci.yml":
      "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: pnpm check:real\n",
  };
  expectPass(
    runCheck(makeGitFixture(valid), "check-workflow-script-refs.mjs"),
  );
});

test("suppression ledger check fails when ledger counts drift from allowlist files", () => {
  const ledger = (headline, heading, row) =>
    [
      "# Suppression Ledger",
      "",
      "## 1. Headline counts",
      `| \`scripts/checks/allowlists/\`    |        **${headline}** |          0 |          0 |        ${headline} | fixture |`,
      "",
      `## 5. \`scripts/checks/allowlists/\` — ${heading}`,
      "",
      `| \`allowlists/demo.json\` | ${row} | fixture row |`,
      "",
    ].join("\n");

  const fixture = (doc) => ({
    "scripts/checks/allowlists/demo.json": JSON.stringify([
      { id: "a", reason: "first" },
      { id: "b", reason: "second" },
    ]),
    "docs/analysis/SUPPRESSION_LEDGER.md": doc,
  });

  // Every count stale (says 1, disk says 2) — fails all three surfaces.
  expectFail(
    runCheck(
      makeGitFixture(fixture(ledger("1", "1 files, 1 entries", "1"))),
      "check-suppression-ledger.mjs",
    ),
  );

  // Matching counts — passes.
  expectPass(
    runCheck(
      makeGitFixture(fixture(ledger("2", "1 files, 2 entries", "2"))),
      "check-suppression-ledger.mjs",
    ),
  );

  // A stale row for a file that no longer exists also fails.
  const staleRow = {
    ...fixture(ledger("2", "1 files, 2 entries", "2")),
    "docs/analysis/SUPPRESSION_LEDGER.md": `${ledger(
      "2",
      "1 files, 2 entries",
      "2",
    )}\n| \`allowlists/gone.json\` | 1 | stale row |\n`,
  };
  expectFail(
    runCheck(makeGitFixture(staleRow), "check-suppression-ledger.mjs"),
  );
});

test("workflow script refs check fails on parseable but structurally invalid workflows", () => {
  const base = {
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n',
    "package.json": JSON.stringify({ scripts: {} }),
  };
  const workflow = (yaml) =>
    makeGitFixture({
      ...base,
      ".github/workflows/ci.yml": yaml,
    });

  // Parses fine but the job has neither steps nor uses.
  expectFail(
    runCheck(
      workflow("name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n"),
      "check-workflow-script-refs.mjs",
    ),
  );

  // Parses fine but the step wires neither uses nor run.
  expectFail(
    runCheck(
      workflow(
        "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - name: hello\n",
      ),
      "check-workflow-script-refs.mjs",
    ),
  );

  // Top-level on missing entirely.
  expectFail(
    runCheck(
      workflow(
        "name: ci\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n",
      ),
      "check-workflow-script-refs.mjs",
    ),
  );

  // matrix.* reference without strategy.matrix.
  expectFail(
    runCheck(
      workflow(
        "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ${{ matrix.os }}\n    steps:\n      - run: echo hi\n",
      ),
      "check-workflow-script-refs.mjs",
    ),
  );

  // Structurally valid workflow passes the gate and the scan.
  expectPass(
    runCheck(
      workflow(
        "name: ci\non: [push]\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo hi\n",
      ),
      "check-workflow-script-refs.mjs",
    ),
  );
});

test("workflow script refs check scopes the pause exemption to allowlisted workflows", () => {
  const base = {
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n',
    "package.json": JSON.stringify({ scripts: {} }),
  };
  const workflow = (file, yaml) =>
    makeGitFixture({ ...base, [`.github/workflows/${file}`]: yaml });

  const paused = (name) =>
    `name: ${name}\n# on:\n#   push:\n# To re-enable, uncomment the \`on:\` block below.\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n`;
  const emptyOn = (name) =>
    `name: ${name}\non:\n# on: paused\njobs:\n  build:\n    runs-on: ubuntu-latest\n    steps:\n      - run: echo hi\n`;

  // Documented pause (absent trigger block + `# on:` marker) passes only
  // for the allowlisted paused workflows.
  expectPass(
    runCheck(
      workflow("deploy.yml", paused("deploy")),
      "check-workflow-script-refs.mjs",
    ),
  );
  expectPass(
    runCheck(
      workflow("db-migrations.yml", paused("db-migrations")),
      "check-workflow-script-refs.mjs",
    ),
  );

  // The identical edit on a non-allowlisted workflow is the content-loss
  // signature: commenting out ci.yml's trigger must fail.
  expectFail(
    runCheck(
      workflow("ci.yml", paused("ci")),
      "check-workflow-script-refs.mjs",
    ),
  );

  // Present-but-empty `on:` fails even with the marker — a pause is an
  // absent trigger block, not an empty one — allowlisted file or not.
  expectFail(
    runCheck(
      workflow("deploy.yml", emptyOn("deploy")),
      "check-workflow-script-refs.mjs",
    ),
  );
  expectFail(
    runCheck(
      workflow("ci.yml", emptyOn("ci")),
      "check-workflow-script-refs.mjs",
    ),
  );
});

test("suppression ledger check scopes section 5 row matching to the section 5 table", () => {
  const fixture = (doc) => ({
    "scripts/checks/allowlists/demo.json": JSON.stringify([
      { id: "a", reason: "first" },
      { id: "b", reason: "second" },
    ]),
    "docs/analysis/SUPPRESSION_LEDGER.md": doc,
  });
  const section1 = [
    "# Suppression Ledger",
    "",
    "## 1. Headline counts",
    "| `scripts/checks/allowlists/` | **2** | 0 | 0 | 2 | fixture |",
    "",
  ];
  const doc = (...blocks) => `${blocks.flat().join("\n")}\n`;

  // An identically-shaped row outside §5 (a §1 note naming a file that
  // does not exist) is ignored: it is neither a §5 requirement nor a
  // stale §5 entry.
  expectPass(
    runCheck(
      makeGitFixture(
        fixture(
          doc(
            section1,
            ["| `allowlists/rogue.json` | 9 | note outside section 5 |", ""],
            [
              "## 5. `scripts/checks/allowlists/` — 1 files, 2 entries",
              "",
              "| `allowlists/demo.json` | 2 | fixture row |",
              "",
            ],
          ),
        ),
      ),
      "check-suppression-ledger.mjs",
    ),
  );

  // The required §5 row placed only outside §5 does not satisfy §5: the
  // section-scoped match finds no row for demo.json and fails.
  expectFail(
    runCheck(
      makeGitFixture(
        fixture(
          doc(
            section1,
            ["| `allowlists/demo.json` | 2 | misplaced outside section 5 |", ""],
            [
              "## 5. `scripts/checks/allowlists/` — 1 files, 2 entries",
              "",
              "## 6. Notes",
              "",
            ],
          ),
        ),
      ),
      "check-suppression-ledger.mjs",
    ),
  );
});

test("script name refs check fails on missing chained and documented pnpm scripts", () => {
  // A root chain referencing a script that does not exist (the
  // `check:worker-size:landing` class) plus a stale documented name.
  const broken = {
    "package.json": JSON.stringify({
      scripts: {
        "check:real": "node scripts/real.mjs",
        "check:chain": "pnpm check:real && pnpm check:ghost",
      },
    }),
    "docs/commands.md": "Run `pnpm check:renamed-away` to verify.",
  };
  expectFail(runCheck(makeGitFixture(broken), "check-script-name-refs.mjs"));

  // Fixed: the chained script exists, the doc name exists (as a sub-package
  // shorthand), builtins and glob placeholders are skipped, and a filtered
  // reference resolves against the target package.
  const fixed = {
    "pnpm-workspace.yaml": 'packages:\n  - "apps/*"\n  - "packages/*"\n',
    "package.json": JSON.stringify({
      scripts: {
        "check:real": "node scripts/real.mjs",
        "check:chain": "pnpm check:real",
        "check:union": "node scripts/union.mjs",
      },
    }),
    "apps/app/package.json": JSON.stringify({
      name: "@docita/app",
      scripts: { test: "vitest run", build: "vite build" },
    }),
    "docs/commands.md": [
      "Run `pnpm check:union`.",
      "```bash",
      "pnpm install --frozen-lockfile",
      "pnpm --filter @docita/app run test",
      "pnpm check:*-imports  # glob placeholder",
      "```",
    ].join("\n"),
  };
  expectPass(runCheck(makeGitFixture(fixed), "check-script-name-refs.mjs"));
});

test("JSX escape literal check fails on unprocessed escapes and passes on JS positions", () => {
  // Attribute strings and children text: escapes are NOT processed in JSX.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/internal/src/features/demo/page.tsx": `export function Page() {\n  return (\n    <>\n      <LoadingState message="Loading\\u2026" />\n      <div>Loading\\u2026</div>\n    </>\n  );\n}\n`,
      }),
      "check-jsx-escape-literals.mjs",
    ),
  );

  // JS-string escapes (processed), fixed JSX, and a .ts file are all fine.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/internal/src/features/demo/page.tsx": `const s = "\\u2026";\nconst re = /[\\u00a0]/;\nconst t = \`x\\u00b7\${y}\`;\nexport function Page() {\n  return (\n    <>\n      <LoadingState message="Loading…" />\n      <div>Loading…</div>\n      <div>{hasAccess ? "\\u2713" : "\\u2717"}</div>\n    </>\n  );\n}\n`,
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
        "apps/api/src/domains/demo/presentation/controllers/param.controller.ts":
          paramController,
        "apps/api/src/domains/demo/presentation/controllers/literal.controller.ts":
          literalController,
      }),
      "check-route-shadowing.mjs",
    ),
  );

  // Literal registered first -> no shadowing.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/domains/demo/demo.module.ts": moduleOrdered,
        "apps/api/src/domains/demo/presentation/controllers/param.controller.ts":
          paramController,
        "apps/api/src/domains/demo/presentation/controllers/literal.controller.ts":
          literalController,
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
        "apps/api/src/domains/demo/presentation/controllers/clinics.controller.ts":
          sameController,
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
        "apps/api/src/domains/demo/presentation/controllers/clinics.controller.ts":
          reordered,
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
    "apps/api/src/domains/param/presentation/controllers/param.controller.ts":
      paramController,
    "apps/api/src/domains/literal/literal.module.ts": literalModule,
    "apps/api/src/domains/literal/presentation/controllers/literal.controller.ts":
      literalController,
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
    "apps/api/src/domains/param/presentation/controllers/param.controller.ts":
      paramController,
    "apps/api/src/domains/literal/literal.module.ts": literalModule,
    "apps/api/src/domains/literal/presentation/controllers/literal.controller.ts":
      literalController,
  };

  // Multi-line ParamModule before LiteralModule: literal is shadowed.
  expectFail(runCheck(makeGitFixture(fixture), "check-route-shadowing.mjs"));

  // Same multi-line arrays, LiteralModule first: no shadowing.
  const reordered = {
    ...fixture,
    "apps/api/src/app.module.ts": appModule.replace(
      "ParamModule,\n    LiteralModule,",
      "LiteralModule,\n    ParamModule,",
    ),
  };
  expectPass(runCheck(makeGitFixture(reordered), "check-route-shadowing.mjs"));
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
        "apps/worker/src/domains/thing/worker-thing.module.ts":
          workerModule.replace(
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

test("unicode escape literal check fails on UI backslash-u escapes and passes on literal glyphs", () => {
  // UI source with \u escapes for typographic characters fails under --enforce.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/internal/src/features/demo/page.tsx": `export function Page() {\n  return <div>{"Loading\\u2026"}</div>;\n}\n`,
      }),
      "check-unicode-escape-literals.mjs",
      ["--enforce"],
    ),
  );

  // Literal glyphs in the same fixture pass.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/internal/src/features/demo/page.tsx": `export function Page() {\n  return <div>{"Loading\u2026"}</div>;\n}\n`,
      }),
      "check-unicode-escape-literals.mjs",
      ["--enforce"],
    ),
  );

  // Allow-listed pictographs (check mark, ballot x) are permitted.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/page.tsx": `export function Page() {\n  return <div>{hasAccess ? "\\u2713" : "\\u2717"}</div>;\n}\n`,
      }),
      "check-unicode-escape-literals.mjs",
      ["--enforce"],
    ),
  );

  // Non-UI files (api, packages, scripts) are exempt even with escapes.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/api/src/shared/utils/string.ts": `export const re = /[\\u00a0\\u2026]/;\n`,
        "packages/types/src/sanitization.ts": `export const map = { "\\u00a9": "" };\n`,
        "scripts/checks/demo.ts": `const x = "\\u2026";\n`,
      }),
      "check-unicode-escape-literals.mjs",
      ["--enforce"],
    ),
  );

  // File-level opt-out marker exempts a UI file with escapes.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/page.tsx": `// unicode-escape-allow-file: domain content needs literal codepoints\nexport const x = "\\u2026";\n`,
      }),
      "check-unicode-escape-literals.mjs",
      ["--enforce"],
    ),
  );
});

test("workspace-resolution check fails when a config surface drops a src alias", () => {
  // Recreates the #237 alias-gap class: tsconfig/vite alias all packages to
  // src, but vitest aliases only ui+types — so utils/data-access imports
  // would resolve via node_modules -> dist in tests, which CI no longer
  // builds for app/internal. The check must fail.
  const tsconfig = JSON.stringify({
    compilerOptions: {
      paths: {
        "@workspace/ui": ["../../packages/ui/src/index"],
        "@workspace/ui/*": ["../../packages/ui/src/*"],
        "@workspace/utils": ["../../packages/utils/src/index"],
        "@workspace/utils/*": ["../../packages/utils/src/*"],
        "@workspace/data-access": ["../../packages/data-access/src/index"],
        "@workspace/data-access/*": ["../../packages/data-access/src/*"],
      },
    },
  });
  const vite = `import path from "path";\nexport default {\n  resolve: {\n    alias: {\n      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),\n      "@workspace/utils": path.resolve(__dirname, "../../packages/utils/src"),\n      "@workspace/data-access": path.resolve(__dirname, "../../packages/data-access/src"),\n    },\n  },\n};\n`;
  const vitestMissingAliases = `import path from "path";\nexport default {\n  resolve: {\n    alias: {\n      "@workspace/ui": path.resolve(__dirname, "../../packages/ui/src"),\n    },\n  },\n};\n`;
  const fixture = {
    "apps/internal/tsconfig.json": tsconfig,
    "apps/internal/vite.config.ts": vite,
    "apps/internal/vitest.config.ts": vitestMissingAliases,
    "apps/internal/src/features/demo/page.tsx": `import { usePatients } from "@workspace/data-access";\nexport function Page() { return null; }\n`,
  };
  expectFail(
    runCheck(makeGitFixture(fixture), "check-workspace-resolution.mjs"),
  );
});

test("workspace-resolution check passes when every surface src-aliases the imports", () => {
  // App/internal style: all config surfaces alias the package to src, so no
  // CI build is required (post-#236 app-quality/internal-quality build
  // nothing).
  const tsconfig = JSON.stringify({
    compilerOptions: {
      paths: {
        "@workspace/ui": ["../../packages/ui/src/index"],
        "@workspace/ui/*": ["../../packages/ui/src/*"],
        "@workspace/utils": ["../../packages/utils/src/index"],
        "@workspace/utils/*": ["../../packages/utils/src/*"],
        "@workspace/data-access": ["../../packages/data-access/src/index"],
        "@workspace/data-access/*": ["../../packages/data-access/src/*"],
      },
    },
  });
  const allAliases = (pkg) =>
    `"@workspace/${pkg}": path.resolve(__dirname, "../../packages/${pkg}/src"),`;
  const vite = `import path from "path";\nexport default {\n  resolve: {\n    alias: {\n      ${allAliases("ui")}\n      ${allAliases("utils")}\n      ${allAliases("data-access")}\n    },\n  },\n};\n`;
  const fixture = {
    "apps/internal/tsconfig.json": tsconfig,
    "apps/internal/vite.config.ts": vite,
    "apps/internal/vitest.config.ts": vite,
    "apps/internal/src/features/demo/page.tsx": `import { usePatients } from "@workspace/data-access";\nimport { cn } from "@workspace/utils";\nexport function Page() { return null; }\n`,
  };
  expectPass(
    runCheck(makeGitFixture(fixture), "check-workspace-resolution.mjs"),
  );
});

test("workspace-resolution check passes when the package dist is CI-built", () => {
  // API style: no @workspace aliases in tsconfig (resolves via node_modules
  // -> dist), but the package is built by the app's quality job per the
  // hardcoded CI_BUILT map (fixture has no ci.yml, so the map stands alone).
  const fixture = {
    "apps/api/tsconfig.json": JSON.stringify({ compilerOptions: {} }),
    "apps/api/src/domains/demo/demo.service.ts": `import { PrismaClient } from "@workspace/db";\nexport class DemoService { constructor(private db: PrismaClient) {} }\n`,
  };
  expectPass(
    runCheck(makeGitFixture(fixture), "check-workspace-resolution.mjs"),
  );
});

test("workspace-resolution check fails when an app imports an unbuilt package", () => {
  // apps/landing builds only types/utils/hooks/ui; importing data-access must
  // fail (no src aliases in landing's surfaces, no CI build for it).
  const fixture = {
    "apps/landing/tsconfig.json": JSON.stringify({
      compilerOptions: { paths: { "@/*": ["src/*"] } },
    }),
    "apps/landing/astro.config.mjs": `import { defineConfig } from "astro/config";\nexport default defineConfig({ vite: { resolve: { alias: { "@": "./src" } } } });\n`,
    "apps/landing/src/pages/demo.astro": `import { usePatients } from "@workspace/data-access";\n---\n`,
  };
  expectFail(
    runCheck(makeGitFixture(fixture), "check-workspace-resolution.mjs"),
  );
});

test("feature-test-density ratchet applies to internal (grandfathered allowlist + new untested feature fails)", () => {
  const appAllowlist = JSON.stringify([]);
  const internalAllowlist = JSON.stringify(["feedback"]);
  // New internal feature with no tests and no allowlist entry fails (app stays clean).
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/covered/Page.test.tsx":
          "import { test } from 'vitest'; test('x', () => {});\n",
        "apps/internal/src/features/newbie/Page.tsx":
          "export function Page() { return null; }\n",
        "scripts/checks/allowlists/feature-test-density-zero.json":
          appAllowlist,
        "scripts/checks/allowlists/feature-test-density-zero-internal.json":
          internalAllowlist,
      }),
      "check-feature-test-density.mjs",
    ),
  );
  // Grandfathered internal feature passes; covered feature passes. App untouched.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/covered/Page.test.tsx":
          "import { test } from 'vitest'; test('x', () => {});\n",
        "apps/internal/src/features/feedback/Page.tsx":
          "export function Page() { return null; }\n",
        "apps/internal/src/features/covered/Page.test.tsx":
          "import { test } from 'vitest'; test('x', () => {});\n",
        "scripts/checks/allowlists/feature-test-density-zero.json":
          appAllowlist,
        "scripts/checks/allowlists/feature-test-density-zero-internal.json":
          internalAllowlist,
      }),
      "check-feature-test-density.mjs",
    ),
  );
});

const INDEX_DRIFT_CASES = [
  [
    "check-ad-hoc-service-cache.mjs",
    "apps/api/src/domains/x/application/services/x.service.ts",
  ],
  ["check-client-storage-usage.mjs", "apps/app/src/lib/x.ts"],
  ["check-cron-heartbeat-coverage.mjs", "apps/api/src/shared/modules/x.ts"],
  ["check-legacy-app-api-hooks.mjs", "apps/app/src/shared/hooks/api/x.ts"],
  ["check-query-key-factory.mjs", "packages/data-access/src/hooks/x.ts"],
  ["check-require-feature-guard.mjs", "apps/api/src/domains/x/x.controller.ts"],
  [
    "check-use-case-loc.mjs",
    "apps/api/src/domains/x/application/use-cases/x.use-case.ts",
  ],
];

test("checks skip files the index lists after they were deleted", () => {
  for (const [checkName, file] of INDEX_DRIFT_CASES) {
    const root = makeGitFixture({ [file]: "export const value = 1;\n" });
    // makeGitFixture stages the file; deleting it leaves the index ahead of
    // the working tree, which is what an agent's unstaged deletion looks like.
    rmSync(path.join(root, file));

    const result = runCheck(root, checkName);
    assert.ok(
      !/ENOENT/.test(result.stderr ?? ""),
      `${checkName} crashed reading a deleted-but-tracked file:\n${result.stderr}`,
    );
  }
});

test("native button types are not masked by arrow-function props", () => {
  // An inline ref/onClick arrow before `type` must not read as the tag close.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/forms/typed.tsx": [
          "export function Typed() {",
          "  return (",
          "    <button",
          "      ref={(node) => assign(node)}",
          "      onClick={() => handle()}",
          '      type="button"',
          "    >",
          "      Save",
          "    </button>",
          "  );",
          "}",
        ].join("\n"),
      }),
      "check-native-button-types.mjs",
    ),
  );

  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/forms/untyped.tsx": [
          "export function Untyped() {",
          "  return (",
          "    <button",
          "      ref={(node) => assign(node)}",
          "      onClick={() => handle()}",
          "    >",
          "      Save",
          "    </button>",
          "  );",
          "}",
        ].join("\n"),
      }),
      "check-native-button-types.mjs",
    ),
  );
});

test("UTC instant storage check guards timestamptz columns and UTC pool sessions", () => {
  const schema = (column) =>
    [
      "generator client {",
      '  provider = "prisma-client-js"',
      "}",
      "",
      "model Appointment {",
      "  id        String   @id",
      column,
      "}",
      "",
    ].join("\n");

  const timestamptzColumn = "  startTime DateTime @db.Timestamptz(3)";
  const bareColumn = "  startTime DateTime";
  const wrongPrecisionColumn =
    "  startTime DateTime @default(now()) @db.Timestamptz(6)";
  // Attributes wrapping onto their own line are still part of the field.
  const wrappedColumn =
    "  startTime DateTime @default(now())\n    @db.Timestamptz(3)";

  const rawPool = `import { Pool } from "pg";
const pool = new Pool({ connectionString: url });
export { pool };
`;
  const utcPool = `import { Pool } from "pg";
import { createUtcPoolConfig } from "@workspace/db";
const pool = new Pool(createUtcPoolConfig(url));
export { pool };
`;
  // A Pool built with the factory nested inside a wider config object is
  // still compliant; the argument starts at the factory call.
  const inlineUtcPool = `import { Pool } from "pg";
const pool = new Pool(createUtcPoolConfig({ connectionString: url, max: 2 }));
export { pool };
`;

  // A bare DateTime column drops the offset entirely.
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(bareColumn),
      }),
      "check-utc-instant-storage.mjs",
    ),
  );

  // Timestamptz at a precision other than the documented (3) changes the
  // stored precision and must be called out separately.
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(wrongPrecisionColumn),
      }),
      "check-utc-instant-storage.mjs",
    ),
  );

  // A calendar date carries no instant, so it is the one legitimate exception
  // to the Timestamptz requirement.
  expectPass(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(
          "  tokenDay DateTime? @db.Date",
        ),
      }),
      "check-utc-instant-storage.mjs",
    ),
  );

  // The exception is only for `@db.Date` itself: another non-Timestamptz
  // DateTime type is still a violation, so the carve-out cannot quietly widen.
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(
          "  tokenDay DateTime? @db.SmallDateTime",
        ),
      }),
      "check-utc-instant-storage.mjs",
    ),
  );

  // A Pool on the server's default session zone is the other half of the
  // contract, even when every column is compliant.
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(timestamptzColumn),
        "packages/db/scripts/prisma-script-client.ts": rawPool,
      }),
      "check-utc-instant-storage.mjs",
    ),
  );

  // Compliant column + factory-built pool passes.
  expectPass(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(timestamptzColumn),
        "packages/db/scripts/prisma-script-client.ts": utcPool,
      }),
      "check-utc-instant-storage.mjs",
    ),
  );

  expectPass(
    runCheck(
      makeGitFixture({
        "packages/db/prisma/schema.prisma": schema(wrappedColumn),
        "apps/api/src/prisma/prisma.service.ts": inlineUtcPool,
      }),
      "check-utc-instant-storage.mjs",
    ),
  );
});

test("UTC instant storage check reports a missing schema instead of crashing", () => {
  const result = runCheck(
    makeGitFixture({
      "apps/api/src/prisma/prisma.service.ts": `import { Pool } from "pg";
const pool = new Pool({ connectionString: url });
export { pool };
`,
    }),
    "check-utc-instant-storage.mjs",
  );
  expectFail(result);
  assert.ok(
    !/ENOENT/.test(result.stderr ?? ""),
    `check crashed on a missing schema:\n${result.stderr}`,
  );
  assert.match(result.stderr, /schema\.prisma is missing/);
});

test("ARIA naming target check rejects a label on a role-less container and accepts a role", () => {
  const wrapper = (body) =>
    `export function Row() {\n  return (\n    <div className="x">\n${body}\n    </div>\n  );\n}\n`;

  // A bare div: assistive tech discards aria-label, so the name never reaches
  // a screen reader. This is the pattern fixed in five places.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": wrapper(
          '      <span aria-label="Security and privacy" />',
        ),
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Same attribute with a role is exposed and must pass.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": wrapper(
          '      <span role="listitem" aria-label="Waiting" />',
        ),
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // aria-describedby is discarded the same way, and a role satisfies it too.
  expectFail(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": wrapper(
          '      <p aria-describedby="hint" />',
        ),
      }),
      "check-aria-naming-target.mjs",
    ),
  );
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": wrapper(
          '      <p role="note" aria-describedby="hint" />',
        ),
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Elements that only look generic map to roles that support naming, so they
  // must not be flagged. Verified against testing-library's accessible-name
  // computation rather than assumed.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/page.tsx": [
          "export function Page() {",
          "  return (",
          '    <section aria-label="Region">',
          '      <section aria-labelledby="h">',
          '        <h2 id="h">Heading</h2>',
          "      </section>",
          '      <aside aria-label="Rail" />',
          '      <ol aria-label="Steps"><li>a</li></ol>',
          '      <label htmlFor="upload">Attach report</label>',
          "    </section>",
          "  );",
          "}",
        ].join("\n"),
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Shared UI primitives are covered, not just app code.
  expectFail(
    runCheck(
      makeGitFixture({
        "packages/ui/src/components/layout/dock.tsx": `export function Dock() {
  return <div aria-label="Next patient in queue" />;
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Tests and stories are not scanned: fixtures assert on markup by design.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.test.tsx": `export const fixture = <div aria-label="x" />;\n`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );
});

test("ARIA naming target check rejects aria-label on a label (WCAG 2.5.3)", () => {
  // Unlike rule 1 this attribute is NOT discarded: it becomes the accessible
  // name of the control the label wraps, overriding the visible words. When
  // they differ voice control cannot invoke the control by what is on screen.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/row.tsx": `export function Row() {
  return (
    <label htmlFor="upload" aria-label="Attach a report or scan">
      Attach report
    </label>
  );
}
`,
    }),
    "check-aria-naming-target.mjs",
  );
  expectFail(result);
  assert.match(result.stderr, /WCAG 2\.5\.3/);
  assert.match(result.stderr, /Attach a report or scan/);

  // A plain label names its own control: always correct, never flagged.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": `export function Row() {
  return (
    <label htmlFor="upload">
      Attach report
      <input id="upload" type="file" />
    </label>
  );
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Only the opening tag matters. An aria-label on the nested control is the
  // documented pattern and must stay allowed.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": `export function Row() {
  return (
    <label htmlFor="upload">
      Attach report
      <input id="upload" type="file" aria-label="Attach a report or scan" />
    </label>
  );
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );
});

test("ARIA naming target check enforces WCAG 2.5.3 for literal aria-labels", () => {
  // The name must contain the words on screen, or voice control cannot invoke
  // the control by what the user can read.
  const result = runCheck(
    makeGitFixture({
      "apps/app/src/features/demo/row.tsx": `export function Row() {
  return (
    <Button aria-label="Select any available doctor">Any doctor</Button>
  );
}
`,
    }),
    "check-aria-naming-target.mjs",
  );
  expectFail(result);
  assert.match(result.stderr, /WCAG 2\.5\.3 Label in Name/);
  assert.match(result.stderr, /shows "Any doctor"/);
  assert.match(result.stderr, /"Select any available doctor"/);

  // Contained visible words pass, punctuation and case differences included.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": `export function Row() {
  return (
    <Button aria-label="Start next consultation: Asha Rao">Start next</Button>
  );
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // A descendant owns its own visible text, so the button's label is not
  // compared against a nested caption. Icon-only buttons have no text at all.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": `export function Row() {
  return (
    <div>
      <Button aria-label="Your request summary">
        <span>Your visit</span>
        <ChevronDown aria-hidden />
      </Button>
      <Button aria-label="Clear search">
        <XIcon aria-hidden />
      </Button>
    </div>
  );
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Interpolated text is unresolvable statically and must stay silent rather
  // than report something nobody can act on.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": `export function Row({ name }: { name: string }) {
  return (
    <Button aria-label={\`Select \${name}\`}>{name}</Button>
  );
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );
});

test("ARIA naming target check resolves translated names from the English catalog", () => {
  const catalog = {
    "apps/app/src/messages/en/Demo.json": JSON.stringify({
      actions: {
        // Diverges from the visible words — the defect this rule exists for.
        vitalsAction: "Record vital signs",
        // Contains them, in a different order and with a colon suffix.
        nextAction: "Start next consultation: Asha Rao",
      },
    }),
  };

  const source = (key) => `import { useTranslation } from "react-i18next";
export function Row() {
  const { t } = useTranslation("Demo");
  return (
    <Button aria-label={t("${key}")}>Start next</Button>
  );
}
`;

  const result = runCheck(
    makeGitFixture({
      ...catalog,
      "apps/app/src/features/demo/row.tsx": source("actions.vitalsAction"),
    }),
    "check-aria-naming-target.mjs",
  );
  expectFail(result);
  assert.match(result.stderr, /Record vital signs/);

  expectPass(
    runCheck(
      makeGitFixture({
        ...catalog,
        "apps/app/src/features/demo/row.tsx": source("actions.nextAction"),
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // Without the catalog the key is unresolvable: report nothing rather than
  // compare a translation key against a sentence.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": source("actions.vitalsAction"),
      }),
      "check-aria-naming-target.mjs",
    ),
  );

  // An explicit namespace must win: the same key with a different sentence in
  // an unrelated namespace cannot mask a real defect.
  expectFail(
    runCheck(
      makeGitFixture({
        ...catalog,
        "apps/app/src/messages/en/Other.json": JSON.stringify({
          actions: { vitalsAction: "Start next" },
        }),
        "apps/app/src/features/demo/row.tsx": source(
          "Demo:actions.vitalsAction",
        ),
      }),
      "check-aria-naming-target.mjs",
    ),
  );
});

test("ARIA naming target check ignores the forbidden shapes inside comments", () => {
  // Explaining a rule by quoting what it forbids is the natural way to write
  // the comment, so a scanner that reads prose as markup invents a defect
  // that does not exist — including in its own documentation.
  expectPass(
    runCheck(
      makeGitFixture({
        "apps/app/src/features/demo/row.tsx": `export function Row() {
  // Never write: <div aria-label="Security and privacy" />
  // Never write: <label aria-label="Attach a report or scan" />
  /* Also forbidden: <span aria-describedby="hint" /> */
  return (
    <div>
      {/* And inside JSX: <p aria-label="x" /> */}
      <span role="listitem" aria-label="Waiting" />
    </div>
  );
}
`,
      }),
      "check-aria-naming-target.mjs",
    ),
  );
});
