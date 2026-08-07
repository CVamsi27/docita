# Per-Feature i18n Message Files Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split `apps/app/src/messages/en.json` + `hi.json` (3,608 lines each, 51 top-level namespaces, always edited in lockstep) into per-namespace file pairs so a feature's copy lives in its own file (architecture Candidate C).

**Architecture:** New layout `apps/app/src/messages/en/<Namespace>.json` + `hi/<Namespace>.json` (file name = exact top-level namespace key, casing preserved, e.g. `Auth.json`). A single `messages/index.ts` merges the glob-loaded files back into the full trees (`enMessages`/`hiMessages`) consumed by the i18n init and test utilities — one merge point, no duplicated logic. `buildResources` behavior is unchanged (it walks object children registering nested namespaces), so i18next resolution is byte-identical. The parity gate reads the dirs instead of the two files.

**Tech Stack:** Vite `import.meta.glob` (eager), i18next, Vitest, `check-i18next-parity.mjs` + `standard-checks.test.mjs`.

## Global Constraints

- **Zero behavioral change**: the merged trees must be byte-identical to the originals (the split script asserts round-trip equality); namespace registration and `t()` resolution are untouched.
- File names must match the top-level namespace keys exactly (`Auth.json`, `Patients.json`, …) so the merge key equals the namespace.
- `check-i18n-translation-keys.mjs` needs NO change — `APP_TO_MESSAGES` is empty (Vite apps use i18next, not next-intl).
- Scope is `apps/app` only; `apps/internal` has no en/hi bundle (English-only admin portal, documented in PORTING_PLAN_APP_VITE.md).
- Parity must stay exact (en leaves = hi leaves); the gate is wired into `verify:standard`.

---

### Task 1: Split the message files

**Files:**
- Create: `apps/app/src/messages/en/<Ns>.json` + `hi/<Ns>.json` for all 51 namespaces
- Delete: `apps/app/src/messages/en.json`, `apps/app/src/messages/hi.json`

- [x] **Step 1: Run the split script (one-time, deletes originals after round-trip verify)**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita && node -e '
const fs = require("fs");
const path = require("path");
const M = "apps/app/src/messages";
const en = JSON.parse(fs.readFileSync(`${M}/en.json`, "utf8"));
const hi = JSON.parse(fs.readFileSync(`${M}/hi.json`, "utf8"));
const enKeys = Object.keys(en).sort();
const hiKeys = Object.keys(hi).sort();
if (JSON.stringify(enKeys) !== JSON.stringify(hiKeys)) throw new Error("top-level namespace mismatch");
fs.mkdirSync(`${M}/en`, { recursive: true });
fs.mkdirSync(`${M}/hi`, { recursive: true });
for (const ns of enKeys) {
  fs.writeFileSync(`${M}/en/${ns}.json`, JSON.stringify(en[ns], null, 2) + "\n");
  fs.writeFileSync(`${M}/hi/${ns}.json`, JSON.stringify(hi[ns], null, 2) + "\n");
}
// round-trip verify
const mergedEn = {}, mergedHi = {};
for (const f of fs.readdirSync(`${M}/en`)) mergedEn[f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(`${M}/en/${f}`, "utf8"));
for (const f of fs.readdirSync(`${M}/hi`)) mergedHi[f.replace(/\.json$/, "")] = JSON.parse(fs.readFileSync(`${M}/hi/${f}`, "utf8"));
if (JSON.stringify(mergedEn) !== JSON.stringify(en)) throw new Error("en round-trip mismatch");
if (JSON.stringify(mergedHi) !== JSON.stringify(hi)) throw new Error("hi round-trip mismatch");
fs.unlinkSync(`${M}/en.json`); fs.unlinkSync(`${M}/hi.json`);
console.log(`split ${enKeys.length} namespaces into en/ and hi/ dirs (${fs.readdirSync(`${M}/en`).length} files each)`);
'
```

Expected: prints the namespace count; `ls apps/app/src/messages/` shows `en/` and `hi/` dirs only.

- [x] **Step 2: Verify file count + spot-check**

```bash
ls apps/app/src/messages/en/ | wc -l   # expect 51
ls apps/app/src/messages/hi/ | wc -l   # expect 51
node -e 'const a=require("./apps/app/src/messages/en/Auth.json"); console.log(a.signIn.welcomeTitle)'
```

Expected: `Welcome to Docita`.

---

### Task 2: Create the merge module

**Files:**
- Create: `apps/app/src/messages/index.ts`

- [x] **Step 1: Write `index.ts`**

```ts
import { isMessageTree, type MessageTree } from "@/i18n/locale-utils";

const enModules = import.meta.glob("./en/*.json", { eager: true, import: "default" });
const hiModules = import.meta.glob("./hi/*.json", { eager: true, import: "default" });

function mergeFiles(files: Record<string, unknown>): MessageTree {
  const tree: Record<string, unknown> = {};
  for (const [filePath, value] of Object.entries(files)) {
    const ns = filePath.split("/").pop()?.replace(/\.json$/, "") ?? "";
    tree[ns] = value;
  }
  return isMessageTree(tree) ? tree : {};
}

export const enMessages = mergeFiles(enModules);
export const hiMessages = mergeFiles(hiModules);
```

- [x] **Step 2: Sanity-check the merged tree**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita/apps/app && node -e 'console.log("check via vitest instead — glob is vite-only")'
```

(Glob is Vite-only; verified by Task 5's vitest run instead of node.)

---

### Task 3: Point the init and test utilities at the merge module

**Files:**
- Modify: `apps/app/src/i18n/index.ts`
- Modify: `apps/app/src/test-utils/i18n-mock.ts`
- Modify: `apps/app/src/test-utils/en-message-resolver.ts`
- Modify: `apps/app/src/i18n/__tests__/namespace-registration.test.ts`

- [x] **Step 1: `i18n/index.ts`** — replace the two JSON imports with the merged trees:

```ts
import { enMessages, hiMessages } from "../messages";
```

and in `i18n.init`: `resources: { en: buildResources(enMessages), hi: buildResources(hiMessages) }`.

- [x] **Step 2: `i18n-mock.ts`** — `import en from "@/messages/en.json"` → `import { enMessages } from "@/messages"`; use `enMessages` for `resources`.

- [x] **Step 3: `en-message-resolver.ts`** — `import en from "@/messages/en.json"` → `import { enMessages } from "@/messages"`; use `enMessages` in the resolver.

- [x] **Step 4: `namespace-registration.test.ts`** — `import en from "@/messages/en.json"` / `import hi from "@/messages/hi.json"` → `import { enMessages, hiMessages } from "@/messages"`; use them in place of `en`/`hi` (the `buildResources(en)` calls become `buildResources(enMessages)`).

- [x] **Step 5: Verify no direct JSON imports remain**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
grep -rn "messages/en.json\|messages/hi.json" apps/app/src --include="*.ts" --include="*.tsx" || echo "SRC_CLEAN"
```

Expected: `SRC_CLEAN` (scripts/checks references remain, handled next).

---

### Task 4: Update the parity gate + its test

**Files:**
- Modify: `scripts/checks/check-i18next-parity.mjs`
- Modify: `scripts/checks/standard-checks.test.mjs`

- [x] **Step 1: `check-i18next-parity.mjs`** — load the dirs instead of the two files:

```js
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MESSAGES_DIR = join(process.cwd(), "apps/app/src/messages");
function loadTree(dir) {
  const tree = {};
  for (const file of readdirSync(join(MESSAGES_DIR, dir))) {
    if (!file.endsWith(".json")) continue;
    tree[file.replace(/\.json$/, "")] = JSON.parse(readFileSync(join(MESSAGES_DIR, dir, file), "utf8"));
  }
  return tree;
}
const en = loadTree("en");
const hi = loadTree("hi");
```

Keep `collectLeaves` and the comparison identical; update the error-message wording (`en.json`/`hi.json` → `en/`/`hi/` message dirs) and the final log line stays `(en N = hi N leaves)`.

- [x] **Step 2: `standard-checks.test.mjs`** — update the three parity fixtures from `apps/app/src/messages/en.json`/`hi.json` to `apps/app/src/messages/en/Demo.json`/`hi/Demo.json` (same JSON bodies, new paths). The two `expectFail` cases + the `expectPass` case all move.

- [x] **Step 3: Run the gate tests**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
node --test scripts/checks/standard-checks.test.mjs 2>&1 | tail -6
```

Expected: all tests pass, including the three parity fixtures.

- [x] **Step 4: Run the parity gate against the real repo**

```bash
pnpm check:i18next-parity --enforce
```

Expected: `i18next parity check passed (en 2970 = hi 2970 leaves)` (count unchanged — proof of zero drift).

---

### Task 5: Validate

- [x] **Step 1: App unit tests + typecheck + lint**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita/apps/app
npx vitest run src/i18n src/components/i18n src/test-utils 2>&1 | tail -4   # namespace test + real-i18next spec
pnpm run check-types    # expect 0 errors
pnpm run lint           # expect 0 errors
```

- [x] **Step 2: Full app suite**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita/apps/app && npx vitest run 2>&1 | tail -4
```

Expected: all pass (previously 141 files / 724+ tests).

- [x] **Step 3: Repo gates**

```bash
cd /Users/vamsikrishnachandaluri/repos/docita
pnpm check:i18n-translation-keys --enforce
pnpm check:i18next-parity --enforce
pnpm check:i18n-coverage
pnpm verify:standard     # expect exit 0
```

- [x] **Step 4: Review pass**

Dispatch `code-reviewer-deepseek-flash` over the split (merge module, glob typing, gate rewrite, test fixtures), fix findings, re-run affected checks.

---

## Self-Review

**1. Spec coverage (Candidate C):** per-feature file pairs (Task 1), single merge point + glob init (Tasks 2–3), parity gate + its test adapted (Task 4), full validation (Task 5). `check:i18n-translation-keys` correctly untouched (no next-intl apps).

**2. Placeholder scan:** every step has concrete commands/code; no TBDs. The round-trip assertion in Task 1 is the no-drift guarantee.

**3. Type consistency:** `enMessages`/`hiMessages` are `MessageTree` (same type as the old JSON imports); `buildResources` signature unchanged; resolver/mock APIs unchanged — only the import source moves.
