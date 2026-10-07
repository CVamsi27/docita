#!/usr/bin/env node

// Validates that docs/analysis/SUPPRESSION_LEDGER.md stays in sync with
// scripts/checks/allowlists/ on disk: the §1 headline row total, the §5
// heading (files + entries), and one §5 table row per file carrying the
// exact entry count (plus no stale rows for files that no longer exist).
// §5 rows are matched only between the §5 heading and the next top-level
// heading, so an identically-shaped row outside §5 can neither satisfy a §5
// requirement nor register a phantom stale entry.
//
// Count/consistency only — reviewing whether each entry's rationale is
// still justified stays a human job (ledger §7). This check exists because
// the ledger is hand-maintained: every prior drift (the §1 total stuck at 6
// while 14 files accumulated) was invisible until an audit read the doc.
//
// Allowlist files are JSON arrays; the entry count is the array length.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { reportFindingsAndExit } from "../lib/check-runner.mjs";

const ROOT = process.cwd();
const ALLOWLISTS_DIR = path.join(ROOT, "scripts", "checks", "allowlists");
const LEDGER_PATH = path.join(ROOT, "docs", "analysis", "SUPPRESSION_LEDGER.md");

const findings = [];

// Disk: file name -> entry count.
const diskCounts = new Map();
for (const file of readdirSync(ALLOWLISTS_DIR).sort()) {
  if (!file.endsWith(".json")) continue;
  const rel = path.posix.join("scripts/checks/allowlists", file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path.join(ALLOWLISTS_DIR, file), "utf8"));
  } catch (err) {
    findings.push(`${rel} — not valid JSON: ${String(err.message).split("\n")[0]}`);
    continue;
  }
  if (!Array.isArray(parsed)) {
    findings.push(
      `${rel} — not a JSON array; the ledger's entry counts assume array-shaped allowlists.`,
    );
    continue;
  }
  diskCounts.set(file, parsed.length);
}
const totalEntries = [...diskCounts.values()].reduce((sum, n) => sum + n, 0);

const ledger = readFileSync(LEDGER_PATH, "utf8");

// §5 heading: "## 5. `scripts/checks/allowlists/` — N files, M entries"
const heading = ledger.match(
  /^## 5\. `scripts\/checks\/allowlists\/` — (\d+) files, (\d+) entries$/m,
);
if (!heading) {
  findings.push(
    "§5 heading not found in the expected form: `## 5. `scripts/checks/allowlists/` — <files> files, <entries> entries`",
  );
} else {
  if (Number(heading[1]) !== diskCounts.size) {
    findings.push(
      `§5 heading says ${heading[1]} files but scripts/checks/allowlists/ holds ${diskCounts.size}`,
    );
  }
  if (Number(heading[2]) !== totalEntries) {
    findings.push(
      `§5 heading says ${heading[2]} entries but the allowlist files hold ${totalEntries}`,
    );
  }
}

// §5 rows: "| `allowlists/<file>` | <count> | ..." — scoped to the §5 table
// region (§5 heading → next top-level heading). Document-global matching
// was last-match-wins across sections: a stray row elsewhere could satisfy
// or shadow a §5 row. Row validation runs only when the heading parsed;
// a missing heading already fails the check above.
const rowCounts = new Map();
if (heading) {
  const afterHeading = ledger.slice(heading.index + heading[0].length);
  const nextHeading = afterHeading.search(/^## /m);
  const section5 =
    nextHeading === -1 ? afterHeading : afterHeading.slice(0, nextHeading);
  for (const match of section5.matchAll(/^\| `allowlists\/([^`]+)`\s*\|\s*(\d+)\s*\|/gm)) {
    rowCounts.set(match[1], Number(match[2]));
  }
  for (const [file, count] of diskCounts) {
    if (!rowCounts.has(file)) {
      findings.push(`§5 has no row for allowlists/${file} (${count} entries)`);
    } else if (rowCounts.get(file) !== count) {
      findings.push(
        `§5 row for allowlists/${file} says ${rowCounts.get(file)} but the file holds ${count}`,
      );
    }
  }
  for (const file of rowCounts.keys()) {
    if (!diskCounts.has(file)) {
      findings.push(`§5 row allowlists/${file} has no matching file on disk (stale row)`);
    }
  }
}

// §1 headline row: "| `scripts/checks/allowlists/` | **N** | ..."
const headline = ledger.match(
  /^\| `scripts\/checks\/allowlists\/`\s*\|\s*\*\*(\d+)\*\*\s*\|/m,
);
if (!headline) {
  findings.push(
    "§1 headline row not found in the expected form: `| `scripts/checks/allowlists/` | **N** | ...`",
  );
} else if (Number(headline[1]) !== totalEntries) {
  findings.push(
    `§1 headline total is ${headline[1]} but the allowlist files hold ${totalEntries} entries`,
  );
}

reportFindingsAndExit("Suppression ledger check", findings, {
  failAlways: true,
  extraMessage:
    "SUPPRESSION_LEDGER.md counts must match scripts/checks/allowlists/ on disk. Recount (refresh procedure § step 6) and update the ledger in the same change that adds, empties, or deletes an allowlist file.",
});
