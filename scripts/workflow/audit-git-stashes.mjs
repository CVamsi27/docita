#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const enforce = process.argv.includes("--enforce");

function runGit(args, { allowFailure = false } = {}) {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return null;
    }
    throw error;
  }
}

function parseStashEntries(listOutput) {
  if (!listOutput) {
    return [];
  }

  const entries = [];
  const lineRe = /^stash@\{(\d+)\}:\s+(?:WIP on|On)\s+([^:]+):\s*(.*)$/;

  for (const line of listOutput.split("\n")) {
    const match = lineRe.exec(line);
    if (!match) {
      entries.push({
        index: entries.length,
        raw: line,
        branch: null,
        subject: line,
      });
      continue;
    }

    entries.push({
      index: Number(match[1]),
      raw: line,
      branch: match[2].trim(),
      subject: match[3].trim(),
    });
  }

  return entries;
}

function branchExists(branch) {
  return (
    runGit(["show-ref", "--verify", "--quiet", `refs/heads/${branch}`], {
      allowFailure: true,
    }) !== null
  );
}

function parseStashBaseCommit(subject) {
  const match = /^([0-9a-f]{7,40})\b/i.exec(subject ?? "");
  return match?.[1] ?? null;
}

function isCommitOnMain(commit) {
  if (!commit) {
    return null;
  }

  const resolved = runGit(["rev-parse", "--verify", `${commit}^{commit}`], {
    allowFailure: true,
  });
  if (!resolved) {
    return null;
  }

  return (
    runGit(["merge-base", "--is-ancestor", resolved, "main"], {
      allowFailure: true,
    }) !== null
  );
}

function isBranchMergedIntoMain(branch) {
  if (!branchExists(branch)) {
    return null;
  }

  return (
    runGit(["merge-base", "--is-ancestor", branch, "main"], {
      allowFailure: true,
    }) !== null
  );
}

function countUniquePatches(branch) {
  if (!branchExists(branch)) {
    return null;
  }

  const cherry = runGit(["cherry", "main", branch], { allowFailure: true });
  if (cherry === null) {
    return null;
  }
  if (!cherry) {
    return 0;
  }

  return cherry.split("\n").filter((line) => line.startsWith("+")).length;
}

function stashHasWorkingTreeChanges(index) {
  const stat = runGit(["stash", "show", `stash@{${index}}`, "--stat"], {
    allowFailure: true,
  });
  return Boolean(stat && stat.length > 0);
}

function wasBranchMergedViaGithub(branch) {
  if (!branch || branch === "main" || branch === "staging") {
    return null;
  }

  try {
    const raw = execFileSync(
      "gh",
      [
        "pr",
        "list",
        "--state",
        "merged",
        "--head",
        branch,
        "--json",
        "number",
      ],
      {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "pipe"],
      },
    ).trim();
    const prs = JSON.parse(raw);
    return Array.isArray(prs) && prs.length > 0;
  } catch {
    return null;
  }
}

let listOutput = "";
try {
  listOutput = runGit(["stash", "list"]);
} catch {
  console.error("Failed to read git stash list.");
  process.exit(1);
}

const entries = parseStashEntries(listOutput);

if (entries.length === 0) {
  console.log("Git stash audit passed (no stashes).");
  process.exit(0);
}

console.log(`Git stash audit: ${entries.length} stash(es) found.\n`);

const stale = [];

for (const entry of entries) {
  const hasChanges = stashHasWorkingTreeChanges(entry.index);
  let status = "review";
  let detail = entry.subject || entry.raw;

  if (entry.branch === "main") {
    status = "review";
    detail = "base was main; verify patch before dropping";
  } else if (entry.branch) {
    const merged = isBranchMergedIntoMain(entry.branch);
    const unique = countUniquePatches(entry.branch);
    const baseCommit = parseStashBaseCommit(entry.subject);
    const baseOnMain = isCommitOnMain(baseCommit);
    const mergedPr = wasBranchMergedViaGithub(entry.branch);

    if (merged === true) {
      status = "stale";
      detail = `branch ${entry.branch} is fully merged into main`;
    } else if (merged === false && unique === 0) {
      status = "stale";
      detail = `branch ${entry.branch} patches are already on main`;
    } else if (mergedPr === true) {
      status = "stale";
      detail = `branch ${entry.branch} has a merged PR on GitHub`;
    } else if (merged === null && baseOnMain === true) {
      status = "stale";
      detail = `stash base ${baseCommit} is already on main (branch ${entry.branch} deleted)`;
    } else if (merged === null && unique === null) {
      status = "review";
      detail = `branch ${entry.branch} no longer exists locally; inspect stash@{${entry.index}}`;
    } else if (typeof unique === "number" && unique > 0) {
      status = "review";
      detail = `branch ${entry.branch} has ${unique} patch(es) not on main`;
    }
  }

  if (!hasChanges) {
    detail = `${detail} (index-only / empty tree)`;
    if (status !== "review") {
      status = "stale";
    }
  }

  console.log(`stash@{${entry.index}}: ${status.toUpperCase()} — ${detail}`);

  if (status === "stale") {
    stale.push(entry.index);
  }
}

console.log("\nRecommendations:");
console.log("- STALE: safe to drop after a quick `git stash show -p stash@{n}` sanity check.");
console.log("- REVIEW: may contain unmerged work; recover onto a fresh branch from main before dropping.");
console.log("- Drop one: `git stash drop stash@{n}`");
console.log("- Drop all stale after review: `git stash clear` (destructive)\n");

if (stale.length > 0) {
  console.log(`Stale stash indices: ${stale.join(", ")}`);
}

if (enforce && stale.length > 0) {
  console.error(
    `\nGit stash audit failed (--enforce): remove ${stale.length} stale stash(es).`,
  );
  process.exit(1);
}

if (enforce && entries.some((entry) => entry.branch !== "main")) {
  const needsReview = entries.length - stale.length;
  if (needsReview > 0) {
    console.error(
      `\nGit stash audit failed (--enforce): ${needsReview} stash(es) still need manual review.`,
    );
    process.exit(1);
  }
}

console.log("Git stash audit finished (advisory).");
process.exit(0);
