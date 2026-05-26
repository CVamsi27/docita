# Branch consolidation playbook

This playbook is the recovery procedure for when the repository drifts past the **`main` + `staging` + 2 open feature/hotfix PRs** cap defined in [`AGENTS.md`](../../AGENTS.md) §11.3.

Use it only when consolidation is genuinely needed (3+ open PRs, mutually conflicting, or all stale). The cap is enforced by convention; the playbook below restores compliance without losing work.

## When to consolidate

Trigger consolidation when **any** of these are true:

- More than two open feature/hotfix PRs exist (excluding `staging` infra PRs).
- Two or more PRs touch overlapping primitives (same `@workspace/ui` component, same domain service, same Prisma model) and cannot be landed independently without breaking each other.
- One or more PRs are stale for **14+ days** with merge conflicts against `main`.
- A codex / automation run produced multiple draft PRs that need a single review surface.

If none of the above apply, just land or close the extra PRs the normal way. Do not invent consolidation work.

## Pre-consolidation audit (mandatory)

Before opening a consolidation branch, run this audit to decide which PRs are actually worth folding in:

```bash
# 1. List every open feature/hotfix PR (exclude main/staging infra PRs)
gh pr list --state open --base main --json number,headRefName,title,updatedAt \
  --jq '.[] | "#\(.number) \(.headRefName) — \(.title) (updated \(.updatedAt))"'

# 2. For each candidate branch, classify it:
git fetch origin
for branch in <each-head-ref>; do
  total=$(git rev-list --count "origin/main..origin/$branch")
  absorbed=$(git cherry origin/main "origin/$branch" 2>/dev/null | grep -c '^-' || echo 0)
  unique=$((total - absorbed))
  echo "$branch: total=$total absorbed=$absorbed unique=$unique"
done
```

Three outcomes per branch:

- **`unique == 0`** — every commit is already in `main` via a patch-equivalent. Close the PR, delete the branch. Do not include in consolidation.
- **`unique > 0` and intent is still valid** — include in consolidation.
- **`unique > 0` but intent is obsolete / superseded by main** — close the PR with a comment explaining what superseded it. Do not include in consolidation.

Only the surviving "include in consolidation" set proceeds.

## Consolidation procedure

### 1. Start from a clean `main`

```bash
git fetch origin
git checkout main
git pull --ff-only origin main
git status --short        # must be empty
```

If a half-merged state exists, `git merge --abort` first.

### 2. Create the consolidation branch

Naming: `consolidation/<scope>-<YYYY-MM-DD>` (for example `consolidation/audit-overhaul-2026-05-26`). The date pins the consolidation in time so the branch name stays unique if another consolidation is needed later.

```bash
git checkout -b consolidation/<scope>-$(date +%F)
```

### 3. Merge each included PR branch in PR-number order

PR-number order is predictable and reproducible. Use `git merge --no-ff -X theirs` so the incoming branch wins inside conflict regions (preserving its intent):

```bash
for pr in <pr-numbers-ascending>; do
  branch=$(gh pr view "$pr" --json headRefName --jq .headRefName)
  git merge --no-ff --no-edit -X theirs \
    -m "merge: PR #$pr ($branch)" "origin/$branch"

  # Auto-resolve residual rename/AU/UA conflicts:
  # add files that exist on disk, remove files that don't.
  if [ -f .git/MERGE_HEAD ]; then
    git ls-files -u | awk '{print $4}' | sort -u | while read f; do
      if [ -f "$f" ]; then git add "$f"; else git rm -f "$f"; fi
    done
    git commit --no-edit -m "merge: PR #$pr ($branch)"
  fi
done
```

If a merge produces too many semantic conflicts to auto-resolve, **stop** and resolve that one manually before continuing. Do not power through.

### 4. Repair the merge tree

The raw merge will produce a tree that probably doesn't type-check. Apply repairs in this order; commit each category separately so review can follow the reasoning:

1. **Schema / Prisma duplicates**: dedupe fields, enum values, indexes that two branches added independently.
2. **Lockfile refresh**: `pnpm install` (let it succeed; if Prisma generate fails, fix the schema first).
3. **Stale-file reversion**: any file where one branch's version contradicts a different branch's refactor — prefer `git checkout origin/main -- <file>` if `main` already has the canonical version.
4. **Zombie file removal**: files created on one branch that reference symbols that no longer exist (typically WIP commits). Remove them if not imported anywhere outside docs / themselves.
5. **Missing exports / type fields**: add the schema / type / barrel exports the consumers expect.
6. **Spec compatibility**: adjust spec arguments / mocks to match the current implementation signatures (or revert spec files to `main` if they were branch-local fixtures).

After each category, run:

```bash
pnpm turbo check-types --continue --force | grep -c 'error TS'
```

The count should monotonically decrease. If it doesn't, your last commit broke something — fix or revert it before adding more.

### 5. Verify before push

The branch must compile cleanly before opening the consolidation PR:

```bash
pnpm install
pnpm turbo check-types --continue   # must report 0 errors
```

Optional but strongly recommended:

```bash
pnpm lint
pnpm test
pnpm build
pnpm knip
pnpm verify:standard
```

### 6. Open the consolidation PR and close the originals

```bash
git push -u origin consolidation/<scope>-<YYYY-MM-DD>
gh pr create --base main --draft \
  --title "consolidation: <one-line summary>" \
  --body "$(cat <<'EOF'
## Summary
<what was merged and why>

## Branches folded in (in merge order)
| Order | PR | Branch | Strategy |
|---|---|---|---|
| 1 | #... | ... | clean / N conflicts auto-resolved |
...

## Post-merge repairs
<numbered list of repair commits>

## Stats
- commits ahead of main: ...
- files changed vs main: ...
- type-check errors: 0

## Remaining gates
- [ ] pnpm lint
- [ ] pnpm test
- [ ] pnpm build
- [ ] pnpm knip
- [ ] pnpm verify:standard
EOF
)"

# Close every included PR, point reviewers at the consolidation
for pr in <included-pr-numbers>; do
  gh pr close "$pr" --comment "Superseded by #<consolidation-pr> (consolidation/<scope>-<date>); commits are merged in (verified via git cherry). Closing to remove duplicate review surface."
  branch=$(gh pr view "$pr" --json headRefName --jq .headRefName)
  git push origin --delete "$branch" || true
done
```

After this step the open-PR count must be `1` (the consolidation) plus the `staging` infra PR. Confirm:

```bash
gh pr list --state open --base main --json number,headRefName --jq 'length'
# expect: 1
```

### 7. Land the consolidation PR like any other PR

Once the remaining gates (lint, test, build, knip, verify:standard) pass, mark the PR ready for review, get approval, and merge into `main`. Delete the consolidation branch after merge.

## What not to do

- **Do not** merge consolidation branches into other consolidation branches. Always start fresh from `main`.
- **Do not** rebase a consolidation branch onto `main`; the merge commits document which PRs were included and why. Squashing on merge is fine if a flat history is preferred.
- **Do not** include a PR in consolidation without first verifying its intent is still valid (use `git cherry` and read the PR description).
- **Do not** leave the closed branches as tombstones — delete the remote refs.
- **Do not** treat consolidation as a regular flow. It is a recovery operation. The default flow is "one PR, land it, delete the branch."

## Reference

- AGENTS.md §11.3 — Branch model and concurrent branch / PR cap
- AGENTS.md §14 — Agent final checklist (branch cap line)
- Last full consolidation: 2026-05-26 ([PR #159](https://github.com/CVamsi27/docita/pull/159), 15 stale PRs folded into one, 106 type errors repaired)
